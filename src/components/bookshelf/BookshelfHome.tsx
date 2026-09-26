import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type MouseEvent as ReactMouseEvent, type MutableRefObject } from "react";
import type { App } from "../../types";
import { FULL_BAR_CLEARANCE, normalizeBottomBarMode } from "../../utils/smartBar";
import { formatPlaytime, formatRelativeTime } from "../../utils/timeFormat";
import {
  SHELF_ROW_PAD,
  buildLibraryShelves,
  buildRecentShelf,
  nearestIndex,
  reconcileShelfFocus,
  spineArtOffset,
  type Shelf,
  type ShelfFocus,
} from "./bookshelfLayout";
import { SealGlyph, ShelfFigurine, cssUrl } from "./bookshelfParts";

export type BookshelfDirection = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

/** Imperative handle the main gamepad loop drives while Home is the active tab. */
export interface BookshelfHomeHandle {
  move: (direction: BookshelfDirection) => boolean;
  focusedApp: () => App | null;
}

interface RecentEntry {
  id: string;
  launched_at?: number;
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

interface BookshelfHomeProps {
  active: boolean;
  apps: App[];
  recentGames: App[];
  recent: RecentEntry[];
  customArt: Record<string, string | undefined>;
  gameArt: Record<string, string | undefined>;
  accentName: string;
  showRecentShelf: boolean;
  showUninstalled: boolean;
  bottomBarMode: string | undefined;
  bottomBarAlignment: string | undefined;
  isRunning?: (id: string) => boolean;
  focusedCardRef: MutableRefObject<HTMLElement | null>;
  handleRef: MutableRefObject<BookshelfHomeHandle | null>;
  onActivate: (app: App) => void;
  onFocusedAppChange?: (id: string | null) => void;
  RunningBadge?: ComponentType<{ show?: boolean; small?: boolean }>;
  t: Translate;
}

const PLAQUE_RESERVE = 70;
const slotKey = (shelf: number, item: number) => `${shelf}:${item}`;

export function BookshelfHome({
  active,
  apps,
  recentGames,
  recent,
  customArt,
  gameArt,
  accentName,
  showRecentShelf,
  showUninstalled,
  bottomBarMode,
  bottomBarAlignment,
  isRunning,
  focusedCardRef,
  handleRef,
  onActivate,
  onFocusedAppChange,
  RunningBadge,
  t,
}: BookshelfHomeProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const shelfEls = useRef(new Map<number, HTMLElement>());
  const slotEls = useRef(new Map<string, HTMLElement>());
  const markerRef = useRef<HTMLDivElement | null>(null);
  const poolRef = useRef<HTMLDivElement | null>(null);
  const haloRef = useRef<HTMLDivElement | null>(null);
  const [rowWidth, setRowWidth] = useState(0);
  const [focus, setFocusState] = useState<ShelfFocus>({ shelf: 0, item: 0 });
  const focusRef = useRef(focus);
  const barMode = normalizeBottomBarMode(bottomBarMode);
  const bottomReserve = barMode === "smart" ? 0 : PLAQUE_RESERVE;

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const measure = () => setRowWidth(Math.max(0, content.clientWidth - SHELF_ROW_PAD * 2));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  const shelves = useMemo<Shelf[]>(() => {
    const byId = new Map(apps.map((app) => [app.id, app]));
    const recentShelf = showRecentShelf
      ? buildRecentShelf(
        recentGames.map((entry) => byId.get(entry.id)).filter((app): app is App => !!app && app.app_type === "game"),
        t("bookshelf.recentlyPlayed"),
      )
      : null;
    const games = apps.filter((app) => app.app_type === "game" && (showUninstalled || app.installed !== false));
    const library = rowWidth > 0 ? buildLibraryShelves(games, rowWidth) : [];
    return recentShelf ? [recentShelf, ...library] : library;
  }, [apps, recentGames, showRecentShelf, showUninstalled, rowWidth, t]);
  const shelvesRef = useRef(shelves);
  shelvesRef.current = shelves;

  const focusedApp = shelves[focus.shelf]?.items[focus.item] ?? null;
  const focusedAppRef = useRef<App | null>(focusedApp);
  focusedAppRef.current = focusedApp;

  const setFocus = useCallback((next: ShelfFocus) => {
    focusRef.current = next;
    setFocusState(next);
  }, []);

  // Keep focus on the same game when the library, art, or width changes.
  useLayoutEffect(() => {
    const next = reconcileShelfFocus(shelves, focusRef.current, focusedAppRef.current?.id ?? null);
    if (next.shelf !== focusRef.current.shelf || next.item !== focusRef.current.item) setFocus(next);
  }, [shelves, setFocus]);

  const centerOf = useCallback((shelf: number, item: number) => {
    const el = slotEls.current.get(slotKey(shelf, item));
    return el ? SHELF_ROW_PAD + el.offsetLeft + el.offsetWidth / 2 : 0;
  }, []);

  const move = useCallback((direction: BookshelfDirection) => {
    const list = shelvesRef.current;
    const { shelf, item } = focusRef.current;
    if (!list[shelf]) return false;
    let next: ShelfFocus = { shelf, item };
    if (direction === "ArrowLeft") next = { shelf, item: Math.max(0, item - 1) };
    else if (direction === "ArrowRight") next = { shelf, item: Math.min(list[shelf].items.length - 1, item + 1) };
    else {
      const target = shelf + (direction === "ArrowDown" ? 1 : -1);
      if (target < 0 || target >= list.length) return false;
      const x = centerOf(shelf, item);
      const centers = list[target].items.map((_, index) => centerOf(target, index));
      next = { shelf: target, item: nearestIndex(centers, x) };
    }
    if (next.shelf === shelf && next.item === item) return false;
    setFocus(next);
    return true;
  }, [centerOf, setFocus]);

  useEffect(() => {
    handleRef.current = { move, focusedApp: () => focusedAppRef.current };
    return () => {
      handleRef.current = null;
    };
  }, [handleRef, move]);

  // Position the light, marker, and scroll after every focus or layout change.
  useLayoutEffect(() => {
    const shelfEl = shelfEls.current.get(focus.shelf);
    const slotEl = slotEls.current.get(slotKey(focus.shelf, focus.item));
    if (active && slotEl) focusedCardRef.current = slotEl;
    if (!shelfEl || !slotEl) return;
    const shelfTop = shelfEl.offsetTop;
    const x = SHELF_ROW_PAD + slotEl.offsetLeft + slotEl.offsetWidth / 2;
    const w = slotEl.offsetWidth;
    if (markerRef.current) {
      markerRef.current.style.width = `${w}px`;
      markerRef.current.style.transform = `translate(${x - w / 2}px, ${shelfTop + 197}px)`;
    }
    if (poolRef.current) poolRef.current.style.transform = `translate(${x - 105}px, ${shelfTop + 180}px)`;
    if (haloRef.current) haloRef.current.style.transform = `translate(${x - 130}px, ${shelfTop - 30}px)`;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const top = shelfTop - 8;
    const bottom = shelfTop + shelfEl.offsetHeight + bottomReserve;
    if (top < scroller.scrollTop) scroller.scrollTop = Math.max(0, top);
    else if (bottom > scroller.scrollTop + scroller.clientHeight) scroller.scrollTop = bottom - scroller.clientHeight;
  }, [focus, shelves, active, bottomReserve, focusedCardRef]);

  const focusedId = focusedApp?.id ?? null;
  useEffect(() => {
    if (active) onFocusedAppChange?.(focusedId);
  }, [active, focusedId, onFocusedAppChange]);

  const lastPlayedAt = (app: App) => {
    const hit = recent.find((entry) => entry.id === app.id);
    return Math.max(Number(hit?.launched_at ?? 0), Number(app.last_played ?? 0));
  };

  const plaqueMeta = (app: App) => {
    const parts: string[] = [];
    const minutes = typeof app.playtime_minutes === "number" ? app.playtime_minutes : 0;
    if (app.installed === false) parts.push(t("bookshelf.notInstalled"));
    else {
      const at = lastPlayedAt(app);
      // Store playtime can exist without a launch date; "Never" next to hours played reads wrong.
      if (at) parts.push(t("bookshelf.lastPlayed", { when: formatRelativeTime(at, t("details.never")) }));
      else if (minutes <= 0) parts.push(t("details.never"));
    }
    if (minutes > 0) parts.push(t("bookshelf.timePlayed", { time: formatPlaytime(minutes) }));
    return parts.join(" · ");
  };

  const fallbackCover = `/assets/liftoff_cover_${accentName}.svg`;
  const artFor = (app: App) => customArt[app.id] || gameArt[app.id] || fallbackCover;

  const selectSlot = (shelf: number, item: number) => {
    if (focusRef.current.shelf === shelf && focusRef.current.item === item) return;
    setFocus({ shelf, item });
  };

  const renderSlot = (shelf: Shelf, shelfIndex: number, app: App, itemIndex: number) => {
    const focused = focus.shelf === shelfIndex && focus.item === itemIndex;
    const sealed = app.installed === false;
    const running = !!isRunning?.(app.id);
    const art = artFor(app);
    const classes = [
      "bs-slot",
      shelf.itemKind === "face" ? "bs-slot--face" : "bs-slot--spine",
      focused ? "is-focused" : "",
      sealed ? "is-sealed" : "",
      running ? "is-running" : "",
    ].filter(Boolean).join(" ");
    const register = (el: HTMLDivElement | null) => {
      const key = slotKey(shelfIndex, itemIndex);
      if (el) slotEls.current.set(key, el);
      else slotEls.current.delete(key);
    };
    const common = {
      ref: register,
      className: classes,
      "data-app-id": app.id,
      "data-bs-slot": shelf.itemKind,
      onClick: () => {
        if (focused) onActivate(app);
        else selectSlot(shelfIndex, itemIndex);
      },
      onMouseMove: (event: ReactMouseEvent) => {
        // Content can scroll under a still pointer; only real movement may move focus.
        if (event.movementX === 0 && event.movementY === 0) return;
        selectSlot(shelfIndex, itemIndex);
      },
    };
    if (shelf.itemKind === "face") {
      return (
        <div key={app.id} {...common}>
          <div className="bs-cover lo-bs-motion">
            <img
              src={art}
              alt={app.name}
              draggable={false}
              onError={(event) => {
                const img = event.currentTarget;
                if (img.dataset.fallbackApplied === "true") return;
                img.dataset.fallbackApplied = "true";
                img.src = fallbackCover;
              }}
            />
            {sealed && <span className="bs-seal" aria-hidden="true"><SealGlyph /></span>}
            {RunningBadge && <RunningBadge show={running} small />}
          </div>
        </div>
      );
    }
    return (
      <div key={app.id} {...common}>
        <div className="bs-spine lo-bs-motion">
          <div className="bs-spine-face" style={{ backgroundImage: cssUrl(art), backgroundPosition: `${spineArtOffset(app.id)}% 50%` }}>
            <span className="bs-spine-band" />
            <span className={`bs-spine-title${String(app.name ?? "").length > 15 ? " bs-spine-title--long" : ""}`}>{app.name}</span>
            <span className="bs-spine-foot"><i /></span>
          </div>
          <div className="bs-spine-cover" style={{ backgroundImage: cssUrl(art) }} />
        </div>
      </div>
    );
  };

  const plaqueApp = focusedApp;
  const plaqueBottom = barMode === "full" ? FULL_BAR_CLEARANCE + 8 : 18;
  const plaqueOnLeft = barMode === "smart" && bottomBarAlignment === "right";

  return (
    <div
      data-bs-home=""
      className="bs-home"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: active ? 2 : 0,
        visibility: active ? "visible" : "hidden",
        pointerEvents: active ? "auto" : "none",
        paddingTop: "var(--header-height)",
        paddingBottom: "var(--bottom-bar-height)",
        boxSizing: "border-box",
      }}
    >
      <div ref={scrollerRef} className="bs-home-scroller">
        <div ref={contentRef} className="bs-home-content" style={{ paddingBottom: 24 + bottomReserve }}>
          <div className="bs-rails" aria-hidden="true" />
          {shelves.length === 0 && rowWidth > 0 && (
            <div className="bs-empty">{t("bookshelf.emptyShelves")}</div>
          )}
          {shelves.map((shelf, shelfIndex) => (
            <section
              key={shelf.key}
              className={`bs-shelf bs-shelf--${shelf.kind}`}
              aria-label={shelf.label}
              ref={(el) => {
                if (el) shelfEls.current.set(shelfIndex, el);
                else shelfEls.current.delete(shelfIndex);
              }}
            >
              <div className="bs-shelf-shade" />
              <div className="bs-shelf-row">
                {shelf.entries.map((entry) => entry.type === "divider"
                  ? <div key={`divider-${entry.letter}`} className="bs-divider" aria-hidden="true"><span>{entry.letter}</span></div>
                  : renderSlot(shelf, shelfIndex, entry.app, entry.itemIndex))}
                {shelf.kind === "library" && <div className="bs-bookend" aria-hidden="true" />}
                {shelf.kind === "recent" && (
                  <>
                    <div className="bs-spacer" />
                    <ShelfFigurine />
                  </>
                )}
              </div>
              <div className="bs-plank" aria-hidden="true">
                <div className="bs-plank-top" />
                <div className="bs-plank-front"><span className="bs-plate">{shelf.label}</span></div>
              </div>
            </section>
          ))}
          <div ref={haloRef} className="bs-halo lo-bs-motion" aria-hidden="true" />
          <div ref={poolRef} className="bs-pool lo-bs-motion" aria-hidden="true" />
          <div ref={markerRef} className="bs-marker lo-bs-motion" aria-hidden="true" />
        </div>
      </div>
      {plaqueApp && (
        <div
          className={`bs-plaque${plaqueOnLeft ? " bs-plaque--left" : ""}`}
          style={{ bottom: plaqueBottom }}
          aria-live="polite"
        >
          <div className="bs-plaque-title">{plaqueApp.name}</div>
          <div className="bs-plaque-meta">{plaqueMeta(plaqueApp)}</div>
        </div>
      )}
    </div>
  );
}
