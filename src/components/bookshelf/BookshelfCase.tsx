import { useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { IoPlay } from "react-icons/io5";
import { GamepadBtn } from "../GamepadBtn";
import { StoreBadge } from "../ui/StoreBadge";
import type { App } from "../../types";
import { ManualRocket, SealGlyph, cssUrl } from "./bookshelfParts";

export type BookshelfPage = "about" | "media" | "manage";
export type BookshelfPhase = "opening" | "open" | "closing";
export const BOOKSHELF_MEDIA_LIMIT = 6;

export function bookshelfPages(hasMedia: boolean): BookshelfPage[] {
  return hasMedia ? ["about", "media", "manage"] : ["about", "manage"];
}

export interface BookshelfBadge {
  key: string;
  label: string;
  tone: "ink" | "ok" | "warn" | "muted";
}

export interface BookshelfMediaTile {
  key: string;
  thumb: string;
  trailer: boolean;
}

export interface BookshelfAction {
  key: string;
  label: string;
  danger?: boolean;
  checked?: boolean;
}

// The case is laid out on a fixed 1280x800 stage that is scaled to fit the app root.
const STAGE_W = 1280;
const STAGE_H = 800;
const CASE_W = 480;
const CASE_H = 680;
const CASE_D = 36;
const PERSPECTIVE = 1920;
const CASE_CX = STAGE_W / 2;
const CASE_CY = STAGE_H / 2;

interface Pose {
  tx: number;
  ty: number;
  ry: number;
  s: number;
  sd: number;
}

interface Origin {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: "spine" | "face";
}

const CENTER: Pose = { tx: 0, ty: 0, ry: 0, s: 1, sd: 1 };
const OPEN: Pose = { tx: CASE_W / 2, ty: 0, ry: 0, s: 1, sd: 1 };
const poseTransform = (p: Pose) => `translate3d(${p.tx}px, ${p.ty}px, 0px) rotateY(${p.ry}deg) scale3d(${p.s}, ${p.s}, ${p.sd})`;
const lidTransform = (deg: number) => `translateZ(${CASE_D}px) rotateY(${deg}deg)`;

/** Pose that makes the 3D case project onto the shelf slot it came from. */
function solvePose(o: Origin): Pose {
  const ry = o.kind === "spine" ? 64 : 0;
  const rad = (ry * Math.PI) / 180;
  let s = o.h / CASE_H;
  let sd = s;
  let tx = 0;
  let ty = 0;
  for (let k = 0; k < 3; k += 1) {
    sd = o.kind === "spine" ? (s * (o.w / o.h)) / (CASE_D / CASE_H) : s;
    const lx = (o.kind === "spine" ? -CASE_W / 2 : 0) * s;
    const lz = (o.kind === "spine" ? 0 : CASE_D / 2) * sd;
    const rx = lx * Math.cos(rad) + lz * Math.sin(rad);
    const rz = -lx * Math.sin(rad) + lz * Math.cos(rad);
    const f = PERSPECTIVE / (PERSPECTIVE - (CASE_D / 2 + rz));
    s = o.h / (CASE_H * f);
    if (o.kind !== "spine") sd = s;
    tx = (o.x - CASE_CX) / f - rx;
    ty = (o.y - CASE_CY) / f;
  }
  return { tx, ty, ry, s, sd };
}

function midPose(start: Pose, kind: Origin["kind"]): Pose {
  return kind === "spine"
    ? { tx: start.tx * 0.82, ty: start.ty - 30, ry: 50, s: start.s * 1.22, sd: start.sd * 1.05 }
    : { tx: start.tx * 0.8, ty: start.ty - 24, ry: 0, s: start.s * 1.15, sd: start.sd * 1.15 };
}

const isVisible = (el: HTMLElement) => {
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && (el.hasAttribute("data-bs-lifted") || getComputedStyle(el).visibility !== "hidden");
};

/** The shelf spine or grid case the box was pulled from, if it is on screen. */
function findOrigin(appId: string): HTMLElement | null {
  const id = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(appId) : appId.replace(/"/g, '\\"');
  const sel = `[data-app-id="${id}"]`;
  const preferred = Array.from(document.querySelectorAll<HTMLElement>(`[data-bs-slot].is-focused${sel}, [data-card].focused${sel}`));
  const any = Array.from(document.querySelectorAll<HTMLElement>(`[data-bs-slot]${sel}`));
  return [...preferred, ...any].find(isVisible) ?? null;
}

function toStage(el: HTMLElement, stage: HTMLElement): Origin {
  const r = el.getBoundingClientRect();
  const s = stage.getBoundingClientRect();
  const k = s.width / STAGE_W || 1;
  return {
    x: (r.left - s.left) / k + r.width / k / 2,
    y: (r.top - s.top) / k + r.height / k / 2,
    w: r.width / k,
    h: r.height / k,
    kind: el.dataset.bsSlot === "spine" ? "spine" : "face",
  };
}

const PAGE_LABEL: Record<BookshelfPage, string> = {
  about: "bookshelf.pageAbout",
  media: "bookshelf.pageMedia",
  manage: "bookshelf.pageManage",
};

type Translate = (key: string, options?: Record<string, unknown>) => string;

interface BookshelfCaseProps {
  app: App;
  coverArt: string;
  fallbackCover: string;
  bannerArt?: string;
  media: "disc" | "cartridge";
  installed: boolean;
  primaryLabel: string;
  primaryDisabled: boolean;
  spinning: boolean;
  installing: boolean;
  installPct: number;
  indeterminateInstall: boolean;
  installStatus: string;
  installError: string;
  downloadLabel?: string;
  metaItems: Array<{ label: string; value: string }>;
  badges: BookshelfBadge[];
  byline: string;
  description: string;
  mediaTiles: BookshelfMediaTile[];
  mediaTotal: number;
  actions: BookshelfAction[];
  pages: BookshelfPage[];
  page: BookshelfPage;
  focusIdx: number;
  phase: BookshelfPhase;
  motion: boolean;
  onPrimary: () => void;
  onFocus: (index: number) => void;
  onOpenMedia: (index: number) => void;
  onAction: (index: number) => void;
  onTurnTo: (page: BookshelfPage) => void;
  onRequestClose: () => void;
  onOpened: () => void;
  onClosed: () => void;
  t: Translate;
}

export function BookshelfCase(props: BookshelfCaseProps) {
  const {
    app, coverArt, fallbackCover, bannerArt, media, installed, primaryLabel, primaryDisabled, spinning,
    installing, installPct, indeterminateInstall, installStatus, installError, downloadLabel,
    metaItems, badges, byline, description, mediaTiles, mediaTotal, actions, pages, page, focusIdx,
    phase, motion, onPrimary, onFocus, onOpenMedia, onAction, onTurnTo, onRequestClose, t,
  } = props;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const caseRef = useRef<HTMLDivElement | null>(null);
  const lidRef = useRef<HTMLDivElement | null>(null);
  const scrimRef = useRef<HTMLDivElement | null>(null);
  const pageBodyRef = useRef<HTMLDivElement | null>(null);
  const originRef = useRef<HTMLElement | null>(null);
  const animationsRef = useRef<Animation[]>([]);
  const callbacksRef = useRef({ onOpened: props.onOpened, onClosed: props.onClosed });
  callbacksRef.current = { onOpened: props.onOpened, onClosed: props.onClosed };
  const [fit, setFit] = useState(1);
  const [flip, setFlip] = useState<{ from: BookshelfPage; dir: 1 | -1 } | null>(null);
  const prevPageRef = useRef(page);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => setFit(Math.min(host.clientWidth / STAGE_W, host.clientHeight / STAGE_H) || 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const track = (animation: Animation) => {
    animationsRef.current.push(animation);
    return animation.finished.catch(() => undefined);
  };

  // Opening: fly out of the shelf, face the viewer, then swing the lid open.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const caseEl = caseRef.current;
    const lid = lidRef.current;
    const scrim = scrimRef.current;
    if (!stage || !caseEl || !lid || !scrim) return undefined;
    let cancelled = false;
    const origin = findOrigin(app.id);
    originRef.current = origin;
    if (!motion) {
      caseEl.style.transform = poseTransform(OPEN);
      lid.style.transform = lidTransform(-180);
      callbacksRef.current.onOpened();
      return undefined;
    }
    const run = async () => {
      if (origin) {
        const start = solvePose(toStage(origin, stage));
        origin.setAttribute("data-bs-lifted", "");
        caseEl.style.transform = poseTransform(CENTER);
        lid.style.transform = lidTransform(0);
        track(scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 360, easing: "ease-out" }));
        await track(caseEl.animate([
          { transform: poseTransform(start), easing: "cubic-bezier(.2,.7,.3,1)" },
          { transform: poseTransform(midPose(start, origin.dataset.bsSlot === "spine" ? "spine" : "face")), offset: 0.3, easing: "cubic-bezier(.45,0,.2,1)" },
          { transform: poseTransform(CENTER) },
        ], { duration: 460 }));
      } else {
        caseEl.style.transform = poseTransform(CENTER);
        lid.style.transform = lidTransform(0);
        track(scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: "ease-out" }));
        await track(caseEl.animate([
          { opacity: 0, transform: `${poseTransform(CENTER)} scale(0.92)` },
          { opacity: 1, transform: poseTransform(CENTER) },
        ], { duration: 220, easing: "cubic-bezier(.2,.7,.3,1)" }));
      }
      if (cancelled) return;
      caseEl.style.transform = poseTransform(OPEN);
      lid.style.transform = lidTransform(-180);
      await Promise.all([
        track(lid.animate([
          { transform: lidTransform(0) },
          { transform: lidTransform(-180), offset: 0.72 },
          { transform: lidTransform(-172), offset: 0.86 },
          { transform: lidTransform(-180) },
        ], { duration: 560, easing: "cubic-bezier(.35,.05,.25,1)" })),
        track(caseEl.animate([{ transform: poseTransform(CENTER) }, { transform: poseTransform(OPEN) }], { duration: 420, easing: "cubic-bezier(.4,0,.2,1)" })),
      ]);
      if (!cancelled) callbacksRef.current.onOpened();
    };
    void run();
    return () => {
      cancelled = true;
      animationsRef.current.forEach((animation) => animation.cancel());
      animationsRef.current = [];
      originRef.current?.removeAttribute("data-bs-lifted");
    };
    // The opening plays once per mounted case.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Closing: shut the lid, then slide the box back into its slot.
  useLayoutEffect(() => {
    if (phase !== "closing") return undefined;
    const stage = stageRef.current;
    const caseEl = caseRef.current;
    const lid = lidRef.current;
    const scrim = scrimRef.current;
    let cancelled = false;
    animationsRef.current.forEach((animation) => animation.cancel());
    animationsRef.current = [];
    const finish = () => {
      originRef.current?.removeAttribute("data-bs-lifted");
      if (!cancelled) callbacksRef.current.onClosed();
    };
    if (!motion || !stage || !caseEl || !lid || !scrim) {
      finish();
      return () => { cancelled = true; };
    }
    const run = async () => {
      caseEl.style.transform = poseTransform(CENTER);
      lid.style.transform = lidTransform(0);
      await Promise.all([
        track(lid.animate([{ transform: lidTransform(-180) }, { transform: lidTransform(0) }], { duration: 360, easing: "cubic-bezier(.5,0,.3,1)" })),
        track(caseEl.animate([{ transform: poseTransform(OPEN) }, { transform: poseTransform(CENTER) }], { duration: 360, easing: "cubic-bezier(.4,0,.2,1)" })),
      ]);
      if (cancelled) return;
      const origin = originRef.current?.isConnected ? originRef.current : findOrigin(app.id);
      scrim.style.opacity = "0";
      track(scrim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: "ease-in" }));
      if (origin) {
        originRef.current = origin;
        const end = solvePose(toStage(origin, stage));
        caseEl.style.transform = poseTransform(end);
        await track(caseEl.animate([
          { transform: poseTransform(CENTER), easing: "cubic-bezier(.5,0,.6,1)" },
          { transform: poseTransform(midPose(end, origin.dataset.bsSlot === "spine" ? "spine" : "face")), offset: 0.7, easing: "cubic-bezier(.3,0,.2,1)" },
          { transform: poseTransform(end) },
        ], { duration: 400 }));
      } else {
        caseEl.style.opacity = "0";
        await track(caseEl.animate([
          { opacity: 1, transform: poseTransform(CENTER) },
          { opacity: 0, transform: `${poseTransform(CENTER)} scale(0.92)` },
        ], { duration: 200, easing: "ease-in" }));
      }
      finish();
    };
    void run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Page turn: the old page swings away (or the new one swings back in).
  useLayoutEffect(() => {
    const prev = prevPageRef.current;
    if (prev === page) return undefined;
    prevPageRef.current = page;
    if (!motion) return undefined;
    setFlip({ from: prev, dir: pages.indexOf(page) > pages.indexOf(prev) ? 1 : -1 });
    const timer = window.setTimeout(() => setFlip(null), 380);
    return () => window.clearTimeout(timer);
  }, [page, pages, motion]);

  // Keep the focused manual entry inside the page body.
  useLayoutEffect(() => {
    const body = pageBodyRef.current;
    if (!body || focusIdx <= 0) return;
    const target = body.querySelector<HTMLElement>(`[data-bs-item="${focusIdx}"]`);
    if (!target) return;
    const top = target.offsetTop;
    const bottom = top + target.offsetHeight;
    if (top < body.scrollTop) body.scrollTop = top - 6;
    else if (bottom > body.scrollTop + body.clientHeight) body.scrollTop = bottom - body.clientHeight + 6;
  }, [focusIdx, page]);

  const interactive = phase === "open";
  const trayFocused = interactive && focusIdx === 0;
  const hover = (index: number) => (event: ReactMouseEvent) => {
    if (!interactive || (event.movementX === 0 && event.movementY === 0)) return;
    if (focusIdx !== index) onFocus(index);
  };

  const renderPage = (which: BookshelfPage, live: boolean): ReactNode => {
    if (which === "about") {
      return (
        <div className="bs-page-body" ref={live ? pageBodyRef : undefined}>
          <div className="bs-banner" style={{ backgroundImage: cssUrl(bannerArt || coverArt) }} />
          <div className="bs-title-row">
            <h2 className="bs-title">{app.name}</h2>
            <StoreBadge source={app.source} small inline />
          </div>
          {byline && <div className="bs-byline">{byline}</div>}
          {badges.length > 0 && (
            <div className="bs-stamps">
              {badges.map((badge) => <span key={badge.key} className={`bs-stamp bs-stamp--${badge.tone}`}>{badge.label}</span>)}
            </div>
          )}
          {metaItems.length > 0 && (
            <dl className="bs-stats">
              {metaItems.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {description && (
            <>
              <div className="bs-sechead">{t("bookshelf.aboutGame")}</div>
              <p className="bs-desc">{description}</p>
            </>
          )}
        </div>
      );
    }
    if (which === "media") {
      return (
        <div className="bs-page-body" ref={live ? pageBodyRef : undefined}>
          <div className="bs-sechead">{t("bookshelf.mediaHeading")}</div>
          <div className="bs-photos">
            {mediaTiles.map((tile, index) => {
              const focusIndex = index + 1;
              const focused = live && interactive && focusIdx === focusIndex;
              return (
                <figure
                  key={tile.key}
                  data-bs-item={focusIndex}
                  className={`bs-photo${focused ? " is-focused" : ""}`}
                  onClick={() => interactive && onOpenMedia(index)}
                  onMouseMove={live ? hover(focusIndex) : undefined}
                >
                  <div className="bs-photo-img">
                    <img src={tile.thumb} alt="" draggable={false} />
                    {tile.trailer && <span className="bs-photo-play"><IoPlay /></span>}
                  </div>
                  <figcaption>
                    {t("bookshelf.figure", { n: index + 1 })}
                    {tile.trailer ? ` · ${t("bookshelf.trailer")}` : ""}
                  </figcaption>
                </figure>
              );
            })}
          </div>
          {mediaTotal > mediaTiles.length && <p className="bs-note">{t("bookshelf.fullScreenHint", { count: mediaTotal })}</p>}
        </div>
      );
    }
    return (
      <div className="bs-page-body" ref={live ? pageBodyRef : undefined}>
        <div className="bs-sechead">{t("bookshelf.pageManage")}</div>
        <ol className="bs-toc">
          {actions.map((action, index) => {
            const focusIndex = index + 1;
            const focused = live && interactive && focusIdx === focusIndex;
            return (
              <li
                key={action.key}
                data-bs-item={focusIndex}
                className={`bs-act${action.danger ? " is-danger" : ""}${focused ? " is-focused" : ""}`}
                onClick={() => interactive && onAction(index)}
                onMouseMove={live ? hover(focusIndex) : undefined}
              >
                <span className="bs-act-label">{action.label}</span>
                <span className="bs-act-dots" />
                {typeof action.checked === "boolean"
                  ? <span className={`bs-act-check${action.checked ? " is-on" : ""}`} />
                  : <span className="bs-act-arrow">›</span>}
              </li>
            );
          })}
        </ol>
      </div>
    );
  };

  const installBar = installing && (
    <>
      <div className="bs-insert-bar">
        <span className={indeterminateInstall ? "is-indeterminate lo-bs-motion" : undefined} style={{ width: indeterminateInstall ? "36%" : `${installPct}%` }} />
      </div>
      <div className="bs-insert-status">{installStatus}</div>
    </>
  );

  return (
    <div ref={hostRef} className="bs-case-host" data-bs-phase={phase}>
      <div ref={scrimRef} className="bs-case-scrim" onClick={() => interactive && onRequestClose()} />
      <div ref={stageRef} className="bs-case-stage" style={{ transform: `translate(-50%, -50%) scale(${fit})` }}>
        <div className="bs-case-scene">
          <div ref={caseRef} className="bs-case">
            <div className={`bs-face bs-tray${trayFocused ? " is-focused" : ""}${!installed ? " is-sealed" : media === "cartridge" ? " is-cart" : ""}`}>
              {installed && media === "disc" && (
                <>
                  <div className="bs-disc-ring" />
                  <div className={`bs-disc lo-bs-motion${spinning ? " is-spinning" : ""}`} onClick={() => interactive && onPrimary()} onMouseMove={hover(0)}>
                    <div className="bs-disc-data" />
                    <div className="bs-disc-label" style={{ backgroundImage: cssUrl(coverArt) }} />
                    <div className="bs-disc-print">{app.name}</div>
                    <div className="bs-disc-sheen" />
                  </div>
                  <div className="bs-hub" />
                </>
              )}
              {installed && media === "cartridge" && (
                <>
                  <div className="bs-recess" />
                  <div className="bs-cart-ring" />
                  <div className={`bs-cart lo-bs-motion${spinning ? " is-ejecting" : ""}`} onClick={() => interactive && onPrimary()} onMouseMove={hover(0)}>
                    <div className="bs-cart-label" style={{ backgroundImage: cssUrl(coverArt) }} />
                    <div className="bs-cart-ridges" />
                  </div>
                </>
              )}
              {!installed && (
                <>
                  <div className="bs-hub" />
                  <div className="bs-insert" onClick={() => interactive && !primaryDisabled && onPrimary()} onMouseMove={hover(0)}>
                    <div className="bs-insert-top">
                      <span className="bs-insert-seal"><SealGlyph /></span>
                      {t("bookshelf.notInstalled")} · {t("bookshelf.sealed")}
                    </div>
                    <div className="bs-insert-title">{app.name}</div>
                    {downloadLabel && <div className="bs-insert-meta">{downloadLabel}</div>}
                    {installBar}
                    {primaryDisabled && !installing && <div className="bs-insert-meta">{t("bookshelf.noStoreInstall")}</div>}
                  </div>
                </>
              )}
              {installed && installing && <div className="bs-tray-progress">{installBar}</div>}
              <button type="button" className="bs-cta" disabled={primaryDisabled} onClick={() => interactive && onPrimary()} onMouseMove={hover(0)}>
                <GamepadBtn btn="A" label={primaryLabel} />
              </button>
              {installError && <div className="bs-tray-error">{installError}</div>}
            </div>
            <div className="bs-face bs-edge bs-edge--t" />
            <div className="bs-face bs-edge bs-edge--b" />
            <div className="bs-face bs-edge bs-edge--r" />
            <div className="bs-face bs-case-spine" style={{ backgroundImage: cssUrl(coverArt) }}>
              <span className="bs-case-spine-band" />
            </div>
            <div ref={lidRef} className="bs-lid">
              <div className="bs-face bs-lid-front">
                <img
                  src={coverArt}
                  alt=""
                  draggable={false}
                  onError={(event) => {
                    const img = event.currentTarget;
                    if (img.dataset.fallbackApplied === "true") return;
                    img.dataset.fallbackApplied = "true";
                    img.src = fallbackCover;
                  }}
                />
              </div>
              <div className="bs-face bs-lid-back">
                <div className="bs-manual lo-bs-motion">
                  <div className="bs-manual-head">
                    <span>{t("bookshelf.playersGuide")}</span>
                    <span className="bs-manual-brand"><ManualRocket />LiftOff</span>
                  </div>
                  <div className="bs-manual-pages">
                    {flip && flip.dir === -1 && <div className="bs-page">{renderPage(flip.from, false)}</div>}
                    <div className={`bs-page${flip && flip.dir === -1 ? " bs-page--turn-back lo-bs-motion" : ""}`}>{renderPage(page, true)}</div>
                    {flip && flip.dir === 1 && <div className="bs-page bs-page--turn-away lo-bs-motion">{renderPage(flip.from, false)}</div>}
                  </div>
                  <div className="bs-manual-foot">
                    <span className="bs-manual-bumper"><GamepadBtn btn="LB" label="" /></span>
                    <div className="bs-manual-tabs">
                      {pages.map((p) => (
                        <button key={p} type="button" className={`bs-manual-tab${p === page ? " is-on" : ""}`} onClick={() => interactive && onTurnTo(p)}>
                          {t(PAGE_LABEL[p])}
                        </button>
                      ))}
                    </div>
                    <span className="bs-manual-bumper"><GamepadBtn btn="RB" label="" /></span>
                  </div>
                </div>
                <div className="bs-clip bs-clip--tl" />
                <div className="bs-clip bs-clip--tr" />
                <div className="bs-clip bs-clip--bl" />
                <div className="bs-clip bs-clip--br" />
              </div>
            </div>
          </div>
        </div>
        <div className="bs-case-hints" aria-hidden={!interactive}>
          <GamepadBtn btn="A" label={focusIdx === 0 ? primaryLabel : t("smartBar.hint.select")} />
          <GamepadBtn btn="LB" label="" style={{ gap: 0 }} />
          <GamepadBtn btn="RB" label={t("bookshelf.turnPage")} />
          <GamepadBtn btn="B" label={t("smartBar.hint.back")} />
        </div>
      </div>
    </div>
  );
}
