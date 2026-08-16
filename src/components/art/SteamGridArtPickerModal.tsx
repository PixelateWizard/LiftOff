import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CSSProperties } from "react";
import type { AccentColors, App, ThemeColors, RepeatSpeed } from "../../types";
import { getBestGamepad, readGpState, shouldHandleDirectionRepeat, type GpState } from "../../utils/gamepad";
import { ThumbnailCard, type SgdbArtResult } from "./ThumbnailCard";
import { useTheme } from "../../contexts/ThemeContext";
import { useSettings } from "../../contexts/SettingsContext";
import GamepadKeyboard from "../GamepadKeyboard";

type ArtType = "grid" | "hero";
type CropMode = "portrait" | "square" | "hero";
type ModalTab = "browse" | "upload";

interface ArtPickerProps {
  app: App;
  currentArt?: string | null;
  hasCustomArt: boolean;
  cropMode?: CropMode;
  artType?: ArtType;
  repeatSpeed?: RepeatSpeed;
  accent: AccentColors;
  theme: ThemeColors;
  isDark: boolean;
  glass: CSSProperties;
  surfaceStyle?: string;
  onClose: () => void;
  onSet: (id: string, result: string) => void;
  onReset: (id: string) => void;
}

const HERO_FILTERS = ["all", "animated", "static"] as const;
type HeroFilter = typeof HERO_FILTERS[number];

interface SgdbGameHit {
  id: number;
  name: string;
  release_date?: number | null;
  verified?: boolean;
}

function SgdbBrowser({ app, artType, accent, theme, isDark, surfaceStyle = "glass", onSet, onClose, repeatSpeed = "normal" }: {
  app: App;
  artType: ArtType;
  accent: AccentColors;
  theme: ThemeColors;
  isDark: boolean;
  surfaceStyle?: string;
  onSet: (id: string, path: string) => void;
  onClose: () => void;
  repeatSpeed?: RepeatSpeed;
}) {
  const { t } = useTranslation();
  const [results, setResults] = useState<SgdbArtResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [heroFilter, setHeroFilter] = useState<HeroFilter>("all");
  const [downloading, setDownloading] = useState(false);
  const [query, setQuery] = useState(app.name);
  const [gameHits, setGameHits] = useState<SgdbGameHit[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [gameSearchFailed, setGameSearchFailed] = useState(false);
  const [selectedGameIdx, setSelectedGameIdx] = useState<number | null>(null);
  const [gameFocusIdx, setGameFocusIdx] = useState(0);
  const [navSection, setNavSection] = useState<"search" | "games" | "grid">("grid");
  const [showKb, setShowKb] = useState(false);

  const selectedIdxRef = useRef<number | null>(null);
  const heroFilterRef = useRef<HeroFilter>("all");
  const lastBtnRef = useRef<Partial<GpState>>({});
  const btnPressTimeRef = useRef<Record<string, number>>({});
  const btnRepeatingRef = useRef<Record<string, boolean>>({});
  const btnRepeatTimeRef = useRef<Record<string, number>>({});
  const filteredResultsRef = useRef<SgdbArtResult[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const gamesRowRef = useRef<HTMLDivElement | null>(null);
  const queryRef = useRef(app.name);
  const gameHitsRef = useRef<SgdbGameHit[]>([]);
  const selectedGameIdxRef = useRef<number | null>(null);
  const gameFocusIdxRef = useRef(0);
  const navSectionRef = useRef<"search" | "games" | "grid">("grid");
  const showKbRef = useRef(false);
  const suppressAfterKeyboardRef = useRef(false);
  const artRequestRef = useRef(0);
  const searchRequestRef = useRef(0);

  const filteredResults = useMemo(() => {
    if (artType !== "hero" || heroFilter === "all") return results;
    if (heroFilter === "animated") return results.filter(r => r.is_animated);
    return results.filter(r => !r.is_animated);
  }, [results, heroFilter, artType]);

  useEffect(() => { filteredResultsRef.current = filteredResults; }, [filteredResults]);
  useEffect(() => { heroFilterRef.current = heroFilter; }, [heroFilter]);
  useEffect(() => { queryRef.current = query; }, [query]);
  useEffect(() => { gameHitsRef.current = gameHits; }, [gameHits]);
  useEffect(() => { selectedGameIdxRef.current = selectedGameIdx; }, [selectedGameIdx]);
  useEffect(() => { gameFocusIdxRef.current = gameFocusIdx; }, [gameFocusIdx]);
  useEffect(() => { navSectionRef.current = navSection; }, [navSection]);
  useEffect(() => { showKbRef.current = showKb; }, [showKb]);
  useEffect(() => {
    if (selectedIdx === null || !scrollContainerRef.current) return;
    const el = scrollContainerRef.current.querySelector(`[data-sgdb-idx="${selectedIdx}"]`);
    if (!el) return;
    const c = scrollContainerRef.current;
    const elRect = el.getBoundingClientRect();
    const cRect = c.getBoundingClientRect();
    const elTop = elRect.top - cRect.top;
    const elBottom = elRect.bottom - cRect.top;
    if (elBottom > c.clientHeight) c.scrollTop += elBottom - c.clientHeight + 8;
    else if (elTop < 0) c.scrollTop = Math.max(0, c.scrollTop + elTop - 8);
  }, [selectedIdx, filteredResults]);

  useEffect(() => {
    if (!gamesRowRef.current || navSection !== "games") return;
    const el = gamesRowRef.current.querySelector(`[data-sgdb-game-idx="${gameFocusIdx}"]`);
    if (!el) return;
    const c = gamesRowRef.current;
    const elRect = el.getBoundingClientRect();
    const cRect = c.getBoundingClientRect();
    const elLeft = elRect.left - cRect.left;
    const elRight = elRect.right - cRect.left;
    if (elRight > c.clientWidth) c.scrollLeft += elRight - c.clientWidth + 8;
    else if (elLeft < 0) c.scrollLeft = Math.max(0, c.scrollLeft + elLeft - 8);
  }, [gameFocusIdx, navSection, gameHits]);

  const loadArt = (gameId: number) => {
    const requestId = ++artRequestRef.current;
    setLoading(true);
    setError(false);
    setResults([]);
    setSelectedIdx(null);
    selectedIdxRef.current = null;
    invoke<SgdbArtResult[]>("search_sgdb_art", { gameName: app.name, artType, gameId })
      .then(data => {
        if (artRequestRef.current !== requestId) return;
        setResults(data);
        setLoading(false);
      })
      .catch(() => {
        if (artRequestRef.current !== requestId) return;
        setError(true);
        setLoading(false);
      });
  };

  const selectGame = (idx: number, hits?: SgdbGameHit[]) => {
    const list = hits ?? gameHitsRef.current;
    const hit = list[idx];
    if (!hit) return;
    setSelectedGameIdx(idx);
    selectedGameIdxRef.current = idx;
    loadArt(hit.id);
  };

  const runGameSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const requestId = ++searchRequestRef.current;
    ++artRequestRef.current;
    setGamesLoading(true);
    setGameSearchFailed(false);
    setError(false);
    setLoading(false);
    setResults([]);
    setGameHits([]);
    gameHitsRef.current = [];
    setSelectedGameIdx(null);
    selectedGameIdxRef.current = null;
    setSelectedIdx(null);
    selectedIdxRef.current = null;
    invoke<SgdbGameHit[]>("search_sgdb_games", { query: trimmed })
      .then(hits => {
        if (searchRequestRef.current !== requestId) return;
        setGameHits(hits);
        gameHitsRef.current = hits;
        setGamesLoading(false);
        setGameFocusIdx(0);
        gameFocusIdxRef.current = 0;
        if (hits.length > 0) {
          setNavSection("games");
          navSectionRef.current = "games";
          selectGame(0, hits);
        } else {
          setNavSection("search");
          navSectionRef.current = "search";
        }
      })
      .catch(() => {
        if (searchRequestRef.current !== requestId) return;
        setGamesLoading(false);
        setGameSearchFailed(true);
        setError(true);
        setLoading(false);
      });
  };

  const selectGameRef = useRef(selectGame);
  const runGameSearchRef = useRef(runGameSearch);
  useEffect(() => { selectGameRef.current = selectGame; });
  useEffect(() => { runGameSearchRef.current = runGameSearch; });
  useEffect(() => { runGameSearchRef.current(app.name); }, []);

  const GRID_COLS = artType === "grid" ? 6 : 3;
  const THUMB_ASPECT = artType === "grid" ? "2/3" : "16/9";

  const handleSelect = () => {
    const idx = selectedIdxRef.current;
    const list = filteredResultsRef.current;
    if (idx === null || idx >= list.length) return;
    const chosen = list[idx];
    setDownloading(true);
    invoke<string | null>("download_sgdb_art", { gameName: app.name, url: chosen.url, artType })
      .then(path => {
        if (path) { onSet(app.id, path); onClose(); }
        else setDownloading(false);
      })
      .catch(() => setDownloading(false));
  };
  const handleSelectRef = useRef(handleSelect);
  useEffect(() => { handleSelectRef.current = handleSelect; });

  useEffect(() => {
    let rAFId = 0;
    const poll = (now: number) => {
      const gp = getBestGamepad();
      if (gp) {
        const state = readGpState(gp);
        if (suppressAfterKeyboardRef.current) {
          lastBtnRef.current = state;
          if (!Object.values(state).some(pressed => pressed)) {
            suppressAfterKeyboardRef.current = false;
          }
          rAFId = requestAnimationFrame(poll);
          return;
        }
        if (showKbRef.current) {
          lastBtnRef.current = state;
          rAFId = requestAnimationFrame(poll);
          return;
        }
        const iDelay = repeatSpeed === "slow" ? 500 : repeatSpeed === "fast" ? 250 : 400;
        const rDelay = repeatSpeed === "slow" ? 150 : repeatSpeed === "fast" ? 60 : 100;

        const fireDir = (key: string) => {
          const section = navSectionRef.current;
          const c = selectedIdxRef.current;
          const l = filteredResultsRef.current;
          if (section === "games") {
            const hits = gameHitsRef.current;
            if (key === "ArrowLeft" || key === "ArrowRight") {
              if (hits.length === 0) return;
              const delta = key === "ArrowLeft" ? -1 : 1;
              const next = Math.max(0, Math.min(gameFocusIdxRef.current + delta, hits.length - 1));
              if (next !== gameFocusIdxRef.current) {
                setGameFocusIdx(next);
                gameFocusIdxRef.current = next;
              }
            } else if (key === "ArrowUp") {
              setNavSection("search");
              navSectionRef.current = "search";
            } else if (key === "ArrowDown") {
              setNavSection("grid");
              navSectionRef.current = "grid";
              if (l.length > 0) {
                setSelectedIdx(0);
                selectedIdxRef.current = 0;
              }
            }
            return;
          }
          if (section === "search") {
            if (key === "ArrowDown") {
              if (gameHitsRef.current.length > 0) {
                setNavSection("games");
                navSectionRef.current = "games";
              } else if (l.length > 0) {
                setNavSection("grid");
                navSectionRef.current = "grid";
              }
            }
            return;
          }
          if (key === "ArrowRight") {
            const next = c === null ? 0 : Math.min(c + 1, l.length - 1);
            if (l.length > 0 && next !== c) { setSelectedIdx(next); selectedIdxRef.current = next; }
          } else if (key === "ArrowLeft") {
            if (c === null && l.length > 0) { setSelectedIdx(0); selectedIdxRef.current = 0; }
            else if (c !== null && c > 0) { setSelectedIdx(c - 1); selectedIdxRef.current = c - 1; }
          } else if (key === "ArrowDown") {
            if (c === null && l.length > 0) { setSelectedIdx(0); selectedIdxRef.current = 0; }
            else if (c !== null) {
              const next = Math.min(c + GRID_COLS, l.length - 1);
              if (next !== c) { setSelectedIdx(next); selectedIdxRef.current = next; }
            }
          } else if (key === "ArrowUp") {
            if (c !== null && c - GRID_COLS >= 0) {
              const next = c - GRID_COLS;
              setSelectedIdx(next); selectedIdxRef.current = next;
            } else {
              const nextSection = gameHitsRef.current.length > 0 ? "games" : "search";
              setNavSection(nextSection);
              navSectionRef.current = nextSection;
              const nextGame = selectedGameIdxRef.current ?? 0;
              setGameFocusIdx(nextGame);
              gameFocusIdxRef.current = nextGame;
            }
          }
        };

        for (const key of ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"]) {
          const pressed = state[key as keyof typeof state], wasPressed = lastBtnRef.current[key];
          if (pressed && !wasPressed) {
            btnPressTimeRef.current[key] = now;
            btnRepeatingRef.current[key] = false;
            btnRepeatTimeRef.current[key] = now;
            fireDir(key);
          } else if (pressed && wasPressed) {
            const held = now - (btnPressTimeRef.current[key] || now);
            if (!btnRepeatingRef.current[key] && held >= iDelay) {
              btnRepeatingRef.current[key] = true;
              btnRepeatTimeRef.current[key] = now;
              fireDir(key);
            } else if (btnRepeatingRef.current[key] && now - (btnRepeatTimeRef.current[key] || 0) >= rDelay) {
              btnRepeatTimeRef.current[key] = now;
              fireDir(key);
            }
          } else if (!pressed) {
            btnPressTimeRef.current[key] = 0;
            btnRepeatingRef.current[key] = false;
          }
        }

        if (state.Enter && !lastBtnRef.current.Enter) {
          if (navSectionRef.current === "search") {
            setShowKb(true);
            showKbRef.current = true;
          } else if (navSectionRef.current === "games") {
            selectGameRef.current(gameFocusIdxRef.current);
          } else {
            handleSelectRef.current();
          }
        }
        if (state.ButtonY && !lastBtnRef.current.ButtonY) {
          setNavSection("search");
          navSectionRef.current = "search";
          setShowKb(true);
          showKbRef.current = true;
        }
        if (state.Escape && !lastBtnRef.current.Escape) onClose();
        if (artType === "hero" && navSectionRef.current !== "search") {
          if (state.TriggerLeft && !lastBtnRef.current.TriggerLeft) {
            const i = HERO_FILTERS.indexOf(heroFilterRef.current);
            const next = HERO_FILTERS[Math.max(i - 1, 0)];
            if (next !== heroFilterRef.current) { setHeroFilter(next); heroFilterRef.current = next; setSelectedIdx(null); selectedIdxRef.current = null; }
          }
          if (state.TriggerRight && !lastBtnRef.current.TriggerRight) {
            const i = HERO_FILTERS.indexOf(heroFilterRef.current);
            const next = HERO_FILTERS[Math.min(i + 1, HERO_FILTERS.length - 1)];
            if (next !== heroFilterRef.current) { setHeroFilter(next); heroFilterRef.current = next; setSelectedIdx(null); selectedIdxRef.current = null; }
          }
        }

        lastBtnRef.current = state;
      }
      rAFId = requestAnimationFrame(poll);
    };
    rAFId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rAFId);
  }, [artType, GRID_COLS, repeatSpeed, onClose]);

  const isPixel = surfaceStyle === "win9x";
  const retry = () => {
    if (gameHitsRef.current.length === 0) runGameSearch(queryRef.current);
    else selectGame(selectedGameIdxRef.current ?? 0);
  };
  const sectionFrame = (section: "search" | "games" | "grid"): CSSProperties => {
    const active = navSection === section;
    return {
      border: `1px solid ${active ? `${accent.glow}0.72)` : "transparent"}`,
      borderRadius: isPixel ? 0 : 10,
      boxShadow: active ? `inset 0 0 0 1px ${accent.glow}0.10)` : "none",
      transition: "border-color 0.12s, box-shadow 0.12s",
      boxSizing: "border-box",
    };
  };

  return (
    <>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ ...sectionFrame("search"), display: "flex", gap: 8, padding: 3, marginBottom: 5, flexShrink: 0 }}>
        <input
          type="text"
          value={query}
          placeholder={t("sgdb.searchPlaceholder")}
          onFocus={() => { setNavSection("search"); navSectionRef.current = "search"; }}
          onChange={(e) => { setQuery(e.target.value); queryRef.current = e.target.value; }}
          onKeyDown={(e) => {
            if (e.key === "Enter") runGameSearch(queryRef.current);
            if (e.key === "Escape") onClose();
          }}
          style={{
            flex: 1,
            boxSizing: "border-box",
            padding: "8px 12px",
            borderRadius: isPixel ? 0 : 8,
            border: `1.5px solid ${navSection === "search" ? accent.primary : `${accent.glow}0.25)`}`,
            background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
            color: theme.text,
            fontSize: 13,
            fontFamily: "'Segoe UI', sans-serif",
            outline: "none",
          }}
        />
        <button
          onFocus={() => { setNavSection("search"); navSectionRef.current = "search"; }}
          onClick={() => {
            setNavSection("search"); navSectionRef.current = "search";
            runGameSearch(queryRef.current);
          }}
          style={{
            padding: "8px 16px",
            borderRadius: isPixel ? 0 : 8,
            background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`,
            color: accent.darkText ? "#1a1a1a" : "white",
            fontWeight: 600,
            fontSize: 13,
            border: navSection === "search" ? `1.5px solid ${accent.primary}` : "1.5px solid transparent",
            cursor: "pointer",
          }}
        >
          {t("sgdb.search")}
        </button>
      </div>
      <div
        ref={gamesRowRef}
        style={{ ...sectionFrame("games"), display: "flex", alignItems: "center", gap: 6, minHeight: 39, padding: 3, marginBottom: 5, overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none", flexShrink: 0 }}
      >
        {gamesLoading ? (
          <span style={{ color: theme.textDim, fontSize: 13, padding: "6px 2px" }}>…</span>
        ) : gameSearchFailed ? null : gameHits.length === 0 ? (
          <span style={{ color: theme.textDim, fontSize: 13, padding: "6px 2px" }}>{t("sgdb.noGamesFound")}</span>
        ) : gameHits.map((g, i) => {
          const isSelected = selectedGameIdx === i;
          const isFocused = navSection === "games" && gameFocusIdx === i;
          return (
            <button
              key={g.id}
              data-sgdb-game-idx={i}
              onFocus={() => {
                setNavSection("games"); navSectionRef.current = "games";
                setGameFocusIdx(i); gameFocusIdxRef.current = i;
              }}
              onClick={() => {
                setNavSection("games"); navSectionRef.current = "games";
                setGameFocusIdx(i); gameFocusIdxRef.current = i;
                selectGame(i);
              }}
              style={{
                flexShrink: 0,
                padding: "6px 12px",
                borderRadius: isPixel ? 0 : 999,
                fontSize: 12,
                cursor: "pointer",
                whiteSpace: "nowrap",
                border: `2.5px solid ${isFocused ? accent.primary : "transparent"}`,
                background: isSelected
                  ? `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`
                  : isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                color: isSelected ? (accent.darkText ? "#1a1a1a" : "white") : theme.text,
                boxShadow: isFocused ? `0 0 0 1px rgba(0,0,0,0.8), 0 0 12px ${accent.glow}0.65)` : "none",
                transform: isFocused ? "scale(1.025)" : "scale(1)",
                transition: "border-color 0.1s, box-shadow 0.1s, transform 0.1s",
              }}
            >
              {g.name}{g.release_date ? ` · ${new Date(g.release_date * 1000).getFullYear()}` : ""}
            </button>
          );
        })}
      </div>
      {artType === "hero" && (
        <div style={{ display: "flex", gap: 6, paddingBottom: 10 }}>
          {HERO_FILTERS.map(f => (
            <button key={f}
              onClick={() => { setHeroFilter(f); setSelectedIdx(null); selectedIdxRef.current = null; }}
              style={{ padding: "4px 12px", borderRadius: isPixel ? 0 : 6, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
                background: heroFilter === f ? accent.primary : (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"),
                color: heroFilter === f ? (accent.darkText ? "#1a1a1a" : "white") : theme.text }}>
              {t(`sgdb.filter.${f}`)}
            </button>
          ))}
        </div>
      )}
      <div ref={scrollContainerRef} style={{ ...sectionFrame("grid"), flex: 1, overflowY: "auto", minHeight: 0, padding: 4 }}>
        {loading ? (
          <div style={{ flex: 1, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="splash-dots" style={{ opacity: 1 }}>
              <div className="splash-dot" /><div className="splash-dot" /><div className="splash-dot" />
            </div>
          </div>
        ) : error ? (
          <div style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <span style={{ color: theme.textDim, fontSize: 13 }}>{t("sgdb.failedToLoad")}</span>
            <button onClick={retry}
              style={{ padding: "8px 20px", borderRadius: isPixel ? 0 : 8, background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`, color: accent.darkText ? "#1a1a1a" : "white", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer" }}>
              {t("common.retry")}
            </button>
          </div>
        ) : gameHits.length > 0 ? (
          <div style={{ display: "grid",
            gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`, width: "100%", gap: 8, alignContent: "start", paddingBottom: 4 }}>
            {filteredResults.map((r, i) => (
              <ThumbnailCard key={r.url} result={r} selected={selectedIdx === i} isSelected={selectedIdx === i}
                accent={accent} theme={theme} thumbW="100%" aspect={THUMB_ASPECT}
                focused={navSection === "grid" && selectedIdx === i}
                data-sgdb-idx={i}
                onClick={() => {
                  setNavSection("grid"); navSectionRef.current = "grid";
                  setSelectedIdx(i); selectedIdxRef.current = i;
                }} />
            ))}
            {filteredResults.length === 0 && (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", color: theme.textDim, fontSize: 13, padding: 24 }}>
                {t("sgdb.noResults")}
              </div>
            )}
          </div>
        ) : null}
      </div>
      <div style={{ paddingTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", gap: 12, marginRight: "auto" }}>
          {[{ bg: "#4a9c4a", label: t("gamepad.aSelect") }, { bg: "#d5b22b", label: t("gamepad.yKeyboard") }, { bg: "#b03030", label: t("gamepad.bCancel") }].map(({ bg, label }) => (
            <span key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: theme.textDim }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "white", flexShrink: 0 }}>{label[0]}</span>
              {label.slice(1)}
            </span>
          ))}
          {artType === "hero" && (
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: theme.textDim }}>
              <span style={{ height: 18, minWidth: 20, borderRadius: 4, background: "rgba(255,255,255,0.52)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 700, color: "white", padding: "0 3px" }}>LT</span>
              <span style={{ height: 18, minWidth: 20, borderRadius: 4, background: "rgba(255,255,255,0.52)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 700, color: "white", padding: "0 3px" }}>RT</span>
              {t("sgdb.filter.label")}
            </span>
          )}
        </div>
        <button onClick={onClose}
          style={{ padding: "8px 16px", borderRadius: isPixel ? 0 : 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none",
            background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", color: theme.text }}>
          {t("common.cancel")}
        </button>
        <button onClick={handleSelect} disabled={selectedIdx === null || downloading}
          style={{ padding: "8px 20px", borderRadius: isPixel ? 0 : 8, fontSize: 13, fontWeight: 600,
            cursor: selectedIdx !== null && !downloading ? "pointer" : "default", border: "none",
            background: selectedIdx !== null && !downloading
              ? `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`
              : (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"),
            color: selectedIdx !== null && !downloading ? (accent.darkText ? "#1a1a1a" : "white") : theme.textDim, transition: "all 0.15s" }}>
          {downloading ? t("sgdb.downloading") : t("common.select")}
        </button>
      </div>
      </div>
      {showKb && (
        <GamepadKeyboard
          value={query}
          onChange={(v: string) => { setQuery(v); queryRef.current = v; }}
          onClose={() => {
            suppressAfterKeyboardRef.current = true;
            setShowKb(false);
            showKbRef.current = false;
            runGameSearch(queryRef.current);
          }}
          title={t("sgdb.searchPlaceholder")}
        />
      )}
    </>
  );
}

function UploadTab({ app, currentArt, hasCustomArt, cropMode = "portrait", accent, theme, onClose, onSet, onReset }: {
  app: App;
  currentArt?: string | null;
  hasCustomArt: boolean;
  cropMode?: CropMode;
  accent: AccentColors;
  theme: ThemeColors;
  onClose: () => void;
  onSet: (id: string, dataUrl: string) => void;
  onReset: (id: string) => void;
}) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(currentArt || null);
  const [pendingData, setPendingData] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [focusedBtn, setFocusedBtn] = useState("browse");

  const pendingDataRef = useRef<string | null>(null);
  const focusedBtnRef = useRef("browse");
  const lastBtnRef = useRef<Partial<GpState>>({});
  const pressTimeRef = useRef<Record<string, number>>({});
  const repeatingRef = useRef<Record<string, boolean>>({});

  const getButtons = () => {
    const btns = ["browse"];
    if (pendingDataRef.current) btns.push("save");
    if (hasCustomArt && !pendingDataRef.current) btns.push("reset");
    btns.push("cancel");
    return btns;
  };

  const handleSave = () => {
    if (!pendingDataRef.current) return;
    setSaving(true);
    const storageId = cropMode === "hero" ? "hero:" + app.id : app.id;
    invoke("set_custom_art", { id: storageId, data: pendingDataRef.current })
      .then(() => { onSet(app.id, pendingDataRef.current!); onClose(); })
      .catch(console.error)
      .finally(() => setSaving(false));
  };
  const handleReset = () => {
    const storageId = cropMode === "hero" ? "hero:" + app.id : app.id;
    invoke("clear_custom_art", { id: storageId })
      .then(() => { onReset(app.id); onClose(); })
      .catch(console.error);
  };

  const handleSaveRef = useRef(handleSave);
  const handleResetRef = useRef(handleReset);
  useEffect(() => { handleSaveRef.current = handleSave; });
  useEffect(() => { handleResetRef.current = handleReset; });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const TW = cropMode === "square" ? 500 : cropMode === "hero" ? 1920 : 600;
        const TH = cropMode === "square" ? 500 : cropMode === "hero" ? 620 : 900;
        const canvas = document.createElement("canvas");
        canvas.width = TW; canvas.height = TH;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const scale = Math.max(TW / img.width, TH / img.height);
        const sw = TW / scale, sh = TH / scale;
        const sx = (img.width - sw) / 2;
        const sy = (img.height - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, TW, TH);
        const url = canvas.toDataURL("image/jpeg", 0.88);
        setPreview(url);
        setPendingData(url);
        pendingDataRef.current = url;
        setFocusedBtn("save"); focusedBtnRef.current = "save";
      };
      img.src = String(ev.target?.result ?? "");
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const gp0 = getBestGamepad();
    if (gp0) lastBtnRef.current = readGpState(gp0);

    let rAFId = 0;
    const poll = (now: number) => {
      const gp = getBestGamepad();
      if (gp) {
        const state = readGpState(gp);
        const btns = getButtons();

        if (shouldHandleDirectionRepeat("ArrowDown", state, lastBtnRef.current, now, pressTimeRef.current, repeatingRef.current)) {
          const i = btns.indexOf(focusedBtnRef.current);
          const next = btns[Math.min(i + 1, btns.length - 1)];
          if (next !== focusedBtnRef.current) { setFocusedBtn(next); focusedBtnRef.current = next; }
        }
        if (shouldHandleDirectionRepeat("ArrowUp", state, lastBtnRef.current, now, pressTimeRef.current, repeatingRef.current)) {
          const i = btns.indexOf(focusedBtnRef.current);
          const next = btns[Math.max(i - 1, 0)];
          if (next !== focusedBtnRef.current) { setFocusedBtn(next); focusedBtnRef.current = next; }
        }
        if (state.Enter && !lastBtnRef.current.Enter) {
          const btn = focusedBtnRef.current;
          if (btn === "browse") fileRef.current?.click();
          else if (btn === "save") handleSaveRef.current();
          else if (btn === "reset") handleResetRef.current();
          else if (btn === "cancel") onClose();
        }
        if (state.Escape && !lastBtnRef.current.Escape) onClose();

        lastBtnRef.current = state;
      }
      rAFId = requestAnimationFrame(poll);
    };
    rAFId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rAFId);
  }, []);

  const btnStyle = (key: string, bg: string, color: string, extra: CSSProperties = {}) => {
    const focused = focusedBtn === key;
    return {
      padding: "10px 20px", borderRadius: 10, cursor: "pointer",
      fontFamily: "'Segoe UI', sans-serif", fontSize: 14, fontWeight: 600,
      border: focused ? `2px solid ${accent.primary}` : "2px solid transparent",
      width: "100%", background: bg, color,
      transition: "all 0.15s ease",
      boxShadow: focused ? `0 0 0 2px ${accent.glow}0.4), 0 0 16px ${accent.glow}0.2)` : "none",
      transform: focused ? "scale(1.02)" : "scale(1)",
      ...extra,
    };
  };

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 380 }}>
        <div style={{ fontSize: 12, color: theme.textDim, marginBottom: 16 }}>{t("artPicker.uploadCustomImage")}</div>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ flexShrink: 0, width: cropMode === "hero" ? 220 : 110 }}>
            {preview
              ? <img src={preview} alt="" style={{ width: "100%", aspectRatio: cropMode === "square" ? "1" : cropMode === "hero" ? "1920/620" : "2/3", objectFit: "cover", borderRadius: 10, display: "block" }} />
              : <div style={{ width: "100%", aspectRatio: cropMode === "square" ? "1" : cropMode === "hero" ? "1920/620" : "2/3", borderRadius: 10, background: `${accent.glow}0.1)`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 10, color: theme.textDim, textAlign: "center" }}>{t("artPicker.noArt")}</span></div>
            }
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
            <button onClick={() => fileRef.current?.click()} style={btnStyle("browse", `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`, accent.darkText ? "#1a1a1a" : "white")}>{t("artPicker.browseImage")}</button>
            {pendingData && <button onClick={handleSave} disabled={saving} style={btnStyle("save", "#4a9c4a", "white", { opacity: saving ? 0.6 : 1 })}>{saving ? t("artPicker.saving") : t("common.save")}</button>}
            {hasCustomArt && !pendingData && <button onClick={handleReset} style={btnStyle("reset", "rgba(255,255,255,0.08)", theme.text)}>{t("artPicker.resetToDefault")}</button>}
            <button onClick={onClose} style={btnStyle("cancel", "rgba(255,255,255,0.05)", theme.textDim)}>{t("common.cancel")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SteamGridArtPickerModal({ app, currentArt, hasCustomArt, cropMode = "portrait", artType = "grid", repeatSpeed = "normal", accent, theme, isDark, glass, surfaceStyle = "glass", onClose, onSet, onReset }: ArtPickerProps) {
  const { t } = useTranslation();
  const { surface } = useTheme();
  const { settings } = useSettings();
  const uiScale = settings.ui_scale ?? 1;
  const scaledViewportW = `${100 / uiScale}vw`;
  const scaledViewportH = `${100 / uiScale}vh`;
  const isPixel = surfaceStyle === "win9x";
  const pixelShell = isPixel ? {
    background: surface.panelBg,
    border: "2px solid",
    borderColor: surface.borderRaised,
    boxShadow: surface.panelShadow,
  } : {};
  const showSgdb = app?.app_type === "game";
  const [activeTab, setActiveTab] = useState<ModalTab>(showSgdb ? "browse" : "upload");
  const lastBtnRef = useRef<Partial<GpState>>({});

  useEffect(() => {
    let rAFId = 0;
    const poll = () => {
      const gp = getBestGamepad();
      if (gp) {
        const state = readGpState(gp);
        if (state.BumperLeft && !lastBtnRef.current.BumperLeft && showSgdb) setActiveTab("browse");
        if (state.BumperRight && !lastBtnRef.current.BumperRight && showSgdb) setActiveTab("upload");
        lastBtnRef.current = state;
      }
      rAFId = requestAnimationFrame(poll);
    };
    rAFId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rAFId);
  }, []);

  const badgeStyle = {
    height: 18, minWidth: 24, borderRadius: 4,
    background: isDark ? "rgba(255,255,255,0.52)" : "rgba(0,0,0,0.15)",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontSize: 8, fontWeight: 700, color: isDark ? "white" : "#333", padding: "0 4px",
  };

  const tabBtnStyle = (tab: ModalTab) => ({
    padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: "pointer", border: "none",
    background: activeTab === tab ? `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` : "transparent",
    color: activeTab === tab ? (accent.darkText ? "#1a1a1a" : "white") : theme.textDim,
    transition: "all 0.15s",
  });

  return (
    <div data-modal-overlay className="lo-anim-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 24, boxSizing: "border-box" }}>
      <div data-modal="" className="lo-anim-modal" style={{ ...glass, borderRadius: isPixel ? 0 : surfaceStyle === "material" ? 16 : 24, padding: isPixel ? 0 : 20, width: `calc(${scaledViewportW} - 48px)`, height: `calc(${scaledViewportH} - 48px)`, maxWidth: `calc(${scaledViewportW} - 48px)`, maxHeight: `calc(${scaledViewportH} - 48px)`, boxSizing: "border-box", display: "flex", flexDirection: "column", overflow: "hidden",
        border: `1px solid ${accent.glow}0.25)`, boxShadow: `0 8px 40px rgba(0,0,0,0.4)`, fontFamily: "'Segoe UI', sans-serif", ...pixelShell }}>
        {isPixel && (
          <div style={{ margin: 3, height: 22, padding: "0 5px 0 7px", boxSizing: "border-box", background: surface.titleBarBg, borderBottom: surface.titleBarBorder, color: surface.titleBarText, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "Tahoma, Arial, sans-serif" }}>{app.name}</div>
            <span style={{ width: 14, height: 14, background: surface.buttonBg, border: "1px solid", borderColor: surface.buttonBorder, boxShadow: surface.buttonShadow, color: surface.buttonText, fontSize: 10, fontWeight: 700, lineHeight: "12px", textAlign: "center", fontFamily: "monospace" }}>x</span>
          </div>
        )}
        <div style={{ padding: isPixel ? 20 : undefined, display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
        <div style={{ marginBottom: 4 }}>
          {!isPixel && <div style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>{app.name}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, paddingBottom: 10,
          borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` }}>
          {showSgdb && <span style={badgeStyle}>LB</span>}
          {showSgdb && <button onClick={() => setActiveTab("browse")} style={tabBtnStyle("browse")}>{t("artModal.browseSgdb")}</button>}
          <button onClick={() => setActiveTab("upload")} style={tabBtnStyle("upload")}>{t("artModal.uploadFile")}</button>
          {showSgdb && <span style={badgeStyle}>RB</span>}
        </div>
        {showSgdb && activeTab === "browse"
          ? <SgdbBrowser app={app} artType={artType} repeatSpeed={repeatSpeed} accent={accent} theme={theme} isDark={isDark}
              surfaceStyle={surfaceStyle} onSet={onSet} onClose={onClose} />
          : <UploadTab app={app} currentArt={currentArt} hasCustomArt={hasCustomArt} cropMode={cropMode}
              accent={accent} theme={theme}
              onClose={onClose} onSet={onSet} onReset={onReset} />
        }
        </div>
      </div>
    </div>
  );
}

export { SteamGridArtPickerModal as SgdbBrowserModal };
