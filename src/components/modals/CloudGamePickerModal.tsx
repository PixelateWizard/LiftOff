import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { IoRefreshOutline } from "react-icons/io5";
import GamepadKeyboard from "../GamepadKeyboard";
import { useTheme } from "../../contexts/ThemeContext";
import { getBestGamepad, readGpState, shouldHandleDirectionRepeat, type GpState } from "../../utils/gamepad";
import ModalShell from "./ModalShell";
import xcloudGames from "../../data/xcloudGames.json";

export interface CloudGameSeed {
  name: string;
  slug: string;
  productId: string;
}

interface Props {
  onConfirm: (game: CloudGameSeed) => void;
  onClose: () => void;
}

interface CloudGameListResponse {
  games: CloudGameSeed[];
  fetchedAt?: number;
  source: "remote" | "cache" | "stale-cache" | "bundled";
  refreshError?: string;
}

function CloudIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.5 18.5h9a4.2 4.2 0 0 0 .5-8.36A6.1 6.1 0 0 0 5.4 8.05 5.3 5.3 0 0 0 7.5 18.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CloudGamePickerModal({ onConfirm, onClose }: Props) {
  const { t } = useTranslation();
  const { accent, theme, isDark } = useTheme();
  const [query, setQuery] = useState("");
  const [games, setGames] = useState<CloudGameSeed[]>(xcloudGames as CloudGameSeed[]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [fetchedAt, setFetchedAt] = useState<number | undefined>();
  const [listSource, setListSource] = useState<CloudGameListResponse["source"]>("bundled");
  const [focusIdx, setFocusIdx] = useState(0);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const focusIdxRef = useRef(0);
  const listRef = useRef<CloudGameSeed[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const showKeyboardRef = useRef(false);
  const refreshingRef = useRef(false);

  const refreshGames = useCallback(async (force: boolean) => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    if (force) setRefreshError("");
    try {
      const response = await invoke<CloudGameListResponse>("get_xcloud_games", { force });
      if (response.games.length > 0) setGames(response.games);
      setFetchedAt(response.fetchedAt);
      setListSource(response.source);
      setRefreshError(response.refreshError ?? "");
    } catch (error) {
      setRefreshError(String(error));
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void refreshGames(false); }, [refreshGames]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return games;
    return games.filter((game) => game.name.toLowerCase().includes(q));
  }, [games, query]);

  useEffect(() => {
    listRef.current = results;
    const next = Math.min(focusIdxRef.current, Math.max(0, results.length - 1));
    if (next !== focusIdxRef.current) {
      focusIdxRef.current = next;
      setFocusIdx(next);
    }
  }, [results]);

  useEffect(() => { showKeyboardRef.current = showKeyboard; }, [showKeyboard]);

  useEffect(() => {
    const el = scrollRef.current?.querySelector(`[data-cloud-idx="${focusIdx}"]`);
    if (!el || !scrollRef.current) return;
    const c = scrollRef.current;
    const er = el.getBoundingClientRect();
    const cr = c.getBoundingClientRect();
    if (er.bottom > cr.bottom) c.scrollTop += er.bottom - cr.bottom + 8;
    else if (er.top < cr.top) c.scrollTop = Math.max(0, c.scrollTop + er.top - cr.top - 8);
  }, [focusIdx]);

  const selectFocused = () => {
    const game = listRef.current[focusIdxRef.current];
    if (game) onConfirm(game);
  };
  const selectFocusedRef = useRef(selectFocused);
  useEffect(() => { selectFocusedRef.current = selectFocused; });

  useEffect(() => {
    const last: Partial<GpState> = {};
    const pressTime: Record<string, number> = {};
    const repeating: Record<string, boolean> = {};
    let rafId = 0;
    let suppressFrames = 18;

    const move = (dir: -1 | 1) => {
      const total = listRef.current.length;
      if (!total) return;
      const next = Math.max(0, Math.min(total - 1, focusIdxRef.current + dir));
      if (next === focusIdxRef.current) return;
      focusIdxRef.current = next;
      setFocusIdx(next);
    };

    const poll = (now: number) => {
      if (suppressFrames > 0) {
        suppressFrames--;
        rafId = requestAnimationFrame(poll);
        return;
      }
      const gp = getBestGamepad();
      if (gp) {
        const state = readGpState(gp);
        if (!showKeyboardRef.current) {
          if (shouldHandleDirectionRepeat("ArrowDown", state, last, now, pressTime, repeating)) move(1);
          if (shouldHandleDirectionRepeat("ArrowUp", state, last, now, pressTime, repeating)) move(-1);
          if (state.Enter && !last.Enter) selectFocusedRef.current();
          if (state.Escape && !last.Escape) onClose();
          if (state.ButtonY && !last.ButtonY) setShowKeyboard(true);
          if (state.ButtonX && !last.ButtonX) void refreshGames(true);
        }
        Object.assign(last, state);
      }
      rafId = requestAnimationFrame(poll);
    };

    rafId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId);
  }, [onClose, refreshGames]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (showKeyboardRef.current) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "Enter") {
        event.preventDefault();
        selectFocusedRef.current();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        const next = Math.min(focusIdxRef.current + 1, listRef.current.length - 1);
        focusIdxRef.current = next;
        setFocusIdx(next);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        const next = Math.max(0, focusIdxRef.current - 1);
        focusIdxRef.current = next;
        setFocusIdx(next);
      } else if (event.key.toLowerCase() === "y") {
        event.preventDefault();
        setShowKeyboard(true);
      } else if (event.key.toLowerCase() === "x") {
        event.preventDefault();
        void refreshGames(true);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, refreshGames]);

  const shortcuts = showKeyboard ? [] : [
    { btn: "A", label: t("common.select") },
    { btn: "X", label: t("addEntry.cloudRefresh") },
    { btn: "Y", label: t("addEntry.cloudSearch") },
    { btn: "B", label: t("common.cancel") },
  ];

  return (
    <>
      <ModalShell
        title={t("addEntry.addCloudGame")}
        shortcuts={shortcuts}
        width={520}
        zIndex={1001}
        onOverlayClick={onClose}
      >
        <div style={{ padding: "14px 22px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            onClick={() => setShowKeyboard(true)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 8,
              border: `1px solid ${accent.glow}0.28)`,
              background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
              color: query ? theme.text : theme.textDim,
              fontSize: 13,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <CloudIcon size={17} />
            <span style={{ flex: 1 }}>{query || t("addEntry.cloudSearch")}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: accent.primary }}>Y</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 28 }}>
            <button
              type="button"
              onClick={() => void refreshGames(true)}
              disabled={refreshing}
              title={t("addEntry.cloudRefresh")}
              style={{
                width: 28,
                height: 28,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1px solid ${accent.glow}0.28)`,
                borderRadius: 8,
                background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                color: accent.primary,
                cursor: refreshing ? "default" : "pointer",
                opacity: refreshing ? 0.6 : 1,
                flexShrink: 0,
              }}
            >
              <IoRefreshOutline
                size={16}
                style={{ animation: refreshing ? "spin 0.8s linear infinite" : "none" }}
              />
            </button>
            <span style={{ color: refreshError ? "#ef8a8a" : theme.textDim, fontSize: 11, lineHeight: 1.3 }}>
              {refreshError
                ? t("addEntry.cloudRefreshFailed")
                : fetchedAt
                  ? t("addEntry.cloudUpdated", { date: new Date(fetchedAt * 1000).toLocaleString() })
                  : t(listSource === "bundled" ? "addEntry.cloudBundled" : "addEntry.cloudRefresh")}
            </span>
          </div>

          <div ref={scrollRef} style={{ maxHeight: 330, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, paddingRight: 2 }}>
            {results.map((game, index) => {
              const focused = focusIdx === index;
              return (
                <button
                  key={game.productId}
                  data-cloud-idx={index}
                  onMouseMove={() => { focusIdxRef.current = index; setFocusIdx(index); }}
                  onClick={() => onConfirm(game)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    minHeight: 54,
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: focused ? `1px solid ${accent.primary}` : "1px solid transparent",
                    background: focused ? `${accent.glow}0.15)` : (isDark ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.045)"),
                    boxShadow: focused ? `0 0 0 2px ${accent.glow}0.18)` : "none",
                    color: theme.text,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: focused ? accent.primary : theme.textDim,
                    background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                    flexShrink: 0,
                  }}>
                    <CloudIcon />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: focused ? theme.text : theme.textDim }}>
                      {game.name}
                    </span>
                  </span>
                  {focused && <span style={{ color: accent.primary, fontSize: 13, fontWeight: 700 }}>A</span>}
                </button>
              );
            })}
            {results.length === 0 && (
              <div style={{ padding: "28px 12px", color: theme.textDim, fontSize: 13, textAlign: "center" }}>
                {t("addEntry.cloudEmpty")}
              </div>
            )}
          </div>
        </div>
      </ModalShell>

      {showKeyboard && (
        <GamepadKeyboard
          value={query}
          onChange={(value) => {
            setQuery(value);
            focusIdxRef.current = 0;
            setFocusIdx(0);
          }}
          onClose={() => setShowKeyboard(false)}
          title={t("addEntry.cloudSearch")}
        />
      )}
    </>
  );
}
