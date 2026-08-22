import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { IoChevronBackOutline, IoChevronForwardOutline, IoPlay, IoRefreshOutline } from "react-icons/io5";
import { MdGridView, MdViewList } from "react-icons/md";
import GamepadKeyboard from "../GamepadKeyboard";
import { useTheme } from "../../contexts/ThemeContext";
import { useStoreMetadata } from "../../hooks/useStoreMetadata";
import { getBestGamepad, readGpState, shouldHandleDirectionRepeat, type GpState } from "../../utils/gamepad";
import type { StoreMovie, StoreScreenshot } from "../../types";
import ModalShell from "./ModalShell";
import xcloudGames from "../../data/xcloudGames.json";

export interface CloudGameSeed {
  name: string;
  slug: string;
  productId: string;
  boxArtUrl?: string;
}

interface Props {
  onConfirm: (game: CloudGameSeed) => void;
  onRemove?: (game: CloudGameSeed) => void;
  isInLibrary?: (game: CloudGameSeed) => boolean;
  onClose: () => void;
  storeMetaEnabled?: boolean;
}

interface CloudGameListResponse {
  games: CloudGameSeed[];
  fetchedAt?: number;
  source: "remote" | "cache" | "stale-cache" | "bundled";
  refreshError?: string;
}

const COLS = 5;

type PreviewMedia =
  | { type: "screenshot"; title: string; thumb: string; full: string; screenshot: StoreScreenshot }
  | { type: "trailer"; title: string; thumb: string; full: string; movie: StoreMovie };

function plainText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMediaUrl(url?: string | null) {
  if (!url) return undefined;
  return url.startsWith("http://") ? `https://${url.slice("http://".length)}` : url;
}

function playableMediaUrl(url?: string | null) {
  const normalized = normalizeMediaUrl(url);
  if (!normalized) return undefined;
  const path = normalized.split("?")[0].toLowerCase();
  return /\.(mp4|webm|m3u8)$/.test(path) ? normalized : undefined;
}

function isHlsMediaUrl(url?: string) {
  return !!url && url.split("?")[0].toLowerCase().endsWith(".m3u8");
}

function movieSource(movie: StoreMovie) {
  return playableMediaUrl(movie.mp4)
    || playableMediaUrl(movie.webm)
    || playableMediaUrl(movie.hlsH264)
    || playableMediaUrl(movie.dashH264)
    || playableMediaUrl(movie.dashAv1);
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

export default function CloudGamePickerModal({ onConfirm, onRemove, isInLibrary, onClose, storeMetaEnabled = true }: Props) {
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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedGame, setSelectedGame] = useState<CloudGameSeed | null>(null);
  const [previewFocus, setPreviewFocus] = useState<"media" | "primary" | "back">("primary");
  const [mediaIdx, setMediaIdx] = useState(0);
  const [mediaOverlay, setMediaOverlay] = useState(false);
  const focusIdxRef = useRef(0);
  const listRef = useRef<CloudGameSeed[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const showKeyboardRef = useRef(false);
  const refreshingRef = useRef(false);
  const viewModeRef = useRef<"grid" | "list">("grid");
  const selectedGameRef = useRef<CloudGameSeed | null>(null);
  const previewFocusRef = useRef<"media" | "primary" | "back">("primary");
  const mediaReturnFocusRef = useRef<"primary" | "back">("primary");
  const mediaIdxRef = useRef(0);
  const mediaCountRef = useRef(0);
  const mediaOverlayRef = useRef(false);
  const overlayVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => { showKeyboardRef.current = showKeyboard; }, [showKeyboard]);
  useEffect(() => { viewModeRef.current = viewMode; }, [viewMode]);
  useEffect(() => { selectedGameRef.current = selectedGame; }, [selectedGame]);
  useEffect(() => { previewFocusRef.current = previewFocus; }, [previewFocus]);
  useEffect(() => { mediaIdxRef.current = mediaIdx; }, [mediaIdx]);
  useEffect(() => { mediaOverlayRef.current = mediaOverlay; }, [mediaOverlay]);

  const store = useStoreMetadata(
    "xbox",
    undefined,
    selectedGame?.productId,
    storeMetaEnabled && !!selectedGame,
  );
  const storeData = store.data?.appId === selectedGame?.productId ? store.data : null;
  const detailsLoading = !!selectedGame && storeMetaEnabled && !storeData && !store.error;
  const previewMedia = useMemo<PreviewMedia[]>(() => [
    ...(storeData?.screenshots ?? []).map((screenshot, index) => ({
      type: "screenshot" as const,
      title: t("details.screenshot", { defaultValue: "Screenshot" }) + ` ${index + 1}`,
      thumb: screenshot.thumb,
      full: screenshot.full,
      screenshot,
    })),
    ...(storeData?.movies ?? []).filter((movie) => !!movie.thumbnail).map((movie, index) => ({
      type: "trailer" as const,
      title: movie.name || t("details.trailer", { defaultValue: "Trailer" }) + ` ${index + 1}`,
      thumb: movie.thumbnail,
      full: movieSource(movie) || movie.thumbnail,
      movie,
    })),
  ], [storeData, t]);
  const selectedMedia = previewMedia[mediaIdx] ?? null;
  const selectedIsInLibrary = !!selectedGame && !!isInLibrary?.(selectedGame);
  const overlayMovieSrc = selectedMedia?.type === "trailer" ? movieSource(selectedMedia.movie) : undefined;
  const overlayMovieUsesHls = isHlsMediaUrl(overlayMovieSrc);
  const overlayNativeSrc = overlayMovieSrc && !overlayMovieUsesHls ? overlayMovieSrc : undefined;
  const description = plainText(storeData?.shortDescription || storeData?.aboutHtml || "");
  mediaCountRef.current = previewMedia.length;

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

  useEffect(() => {
    const el = scrollRef.current?.querySelector(`[data-cloud-idx="${focusIdx}"]`);
    if (!el || !scrollRef.current) return;
    const c = scrollRef.current;
    const er = el.getBoundingClientRect();
    const cr = c.getBoundingClientRect();
    if (er.bottom > cr.bottom) c.scrollTop += er.bottom - cr.bottom + 12;
    else if (er.top < cr.top) c.scrollTop = Math.max(0, c.scrollTop + er.top - cr.top - 12);
  }, [focusIdx]);

  const openPreview = useCallback((game: CloudGameSeed) => {
    selectedGameRef.current = game;
    setSelectedGame(game);
    previewFocusRef.current = "primary";
    mediaReturnFocusRef.current = "primary";
    setPreviewFocus("primary");
    mediaIdxRef.current = 0;
    setMediaIdx(0);
  }, []);

  const closePreview = useCallback(() => {
    mediaOverlayRef.current = false;
    setMediaOverlay(false);
    selectedGameRef.current = null;
    setSelectedGame(null);
  }, []);

  const selectFocused = () => {
    const selected = selectedGameRef.current;
    if (selected) {
      if (previewFocusRef.current === "media" && mediaCountRef.current > 0) {
        mediaOverlayRef.current = true;
        setMediaOverlay(true);
      } else if (previewFocusRef.current === "back") {
        closePreview();
      } else if (isInLibrary?.(selected)) {
        onRemove?.(selected);
      } else {
        onConfirm(selected);
      }
      return;
    }
    const game = listRef.current[focusIdxRef.current];
    if (game) openPreview(game);
  };
  const selectFocusedRef = useRef(selectFocused);
  useEffect(() => { selectFocusedRef.current = selectFocused; });

  useEffect(() => {
    if (!mediaOverlay || selectedMedia?.type !== "trailer" || !overlayMovieSrc) return;
    const video = overlayVideoRef.current;
    if (!video) return;
    let hls: import("hls.js").default | null = null;
    let cancelled = false;
    let playTimer: number | undefined;
    const play = () => { void video.play().catch(() => {}); };

    if (isHlsMediaUrl(overlayMovieSrc)) {
      void import("hls.js").then(({ default: Hls }) => {
        if (cancelled) return;
        if (!Hls.isSupported()) {
          video.src = overlayMovieSrc;
          video.load();
          playTimer = window.setTimeout(play, 0);
          return;
        }
        hls = new Hls({ enableWorker: false });
        hls.loadSource(overlayMovieSrc);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, play);
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal || !hls) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else hls.destroy();
        });
      }).catch(() => {
        if (cancelled) return;
        video.src = overlayMovieSrc;
        video.load();
        playTimer = window.setTimeout(play, 0);
      });
    } else {
      video.src = overlayMovieSrc;
      video.load();
      playTimer = window.setTimeout(play, 0);
    }

    return () => {
      cancelled = true;
      if (playTimer !== undefined) window.clearTimeout(playTimer);
      hls?.destroy();
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [mediaOverlay, overlayMovieSrc, selectedMedia]);

  const moveFocus = useCallback((delta: number) => {
    const total = listRef.current.length;
    if (!total) return;
    const next = Math.max(0, Math.min(total - 1, focusIdxRef.current + delta));
    if (next === focusIdxRef.current) return;
    focusIdxRef.current = next;
    setFocusIdx(next);
  }, []);

  const moveMedia = useCallback((delta: number) => {
    const total = mediaCountRef.current;
    if (!total) return;
    const next = (mediaIdxRef.current + delta + total) % total;
    mediaIdxRef.current = next;
    setMediaIdx(next);
  }, []);

  const handleBack = useCallback(() => {
    if (mediaOverlayRef.current) {
      mediaOverlayRef.current = false;
      setMediaOverlay(false);
    } else if (selectedGameRef.current) {
      closePreview();
    } else {
      onClose();
    }
  }, [closePreview, onClose]);

  useEffect(() => {
    const last: Partial<GpState> = {};
    const pressTime: Record<string, number> = {};
    const repeating: Record<string, boolean> = {};
    let rafId = 0;
    let suppressFrames = 18;

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
          const selected = selectedGameRef.current;
          if (selected) {
            if (mediaOverlayRef.current) {
              if (shouldHandleDirectionRepeat("ArrowRight", state, last, now, pressTime, repeating)) moveMedia(1);
              if (shouldHandleDirectionRepeat("ArrowLeft", state, last, now, pressTime, repeating)) moveMedia(-1);
            } else {
              if (state.ArrowUp && !last.ArrowUp && previewFocusRef.current === "back") {
                previewFocusRef.current = "primary";
                setPreviewFocus("primary");
              }
              if (state.ArrowDown && !last.ArrowDown && previewFocusRef.current === "primary") {
                previewFocusRef.current = "back";
                setPreviewFocus("back");
              }
              if (state.ArrowRight && !last.ArrowRight && previewFocusRef.current !== "media" && mediaCountRef.current > 0) {
                mediaReturnFocusRef.current = previewFocusRef.current;
                previewFocusRef.current = "media";
                setPreviewFocus("media");
              }
              if (state.ArrowLeft && !last.ArrowLeft && previewFocusRef.current === "media") {
                previewFocusRef.current = mediaReturnFocusRef.current;
                setPreviewFocus(mediaReturnFocusRef.current);
              }
              if (state.BumperLeft && !last.BumperLeft) moveMedia(-1);
              if (state.BumperRight && !last.BumperRight) moveMedia(1);
            }
          } else {
            const columns = viewModeRef.current === "grid" ? COLS : 1;
            if (shouldHandleDirectionRepeat("ArrowDown", state, last, now, pressTime, repeating)) moveFocus(columns);
            if (shouldHandleDirectionRepeat("ArrowUp", state, last, now, pressTime, repeating)) moveFocus(-columns);
            if (shouldHandleDirectionRepeat("ArrowRight", state, last, now, pressTime, repeating)) moveFocus(1);
            if (shouldHandleDirectionRepeat("ArrowLeft", state, last, now, pressTime, repeating)) moveFocus(-1);
          }
          if (state.Enter && !last.Enter) selectFocusedRef.current();
          if (state.Escape && !last.Escape) handleBack();
          if (!selected) {
            if (state.ButtonY && !last.ButtonY) setShowKeyboard(true);
            if (state.ButtonX && !last.ButtonX) void refreshGames(true);
            if (state.BumperLeft && !last.BumperLeft) setViewMode("list");
            if (state.BumperRight && !last.BumperRight) setViewMode("grid");
          }
        } else if (state.Escape && !last.Escape) {
          setShowKeyboard(false);
        }
        Object.assign(last, state);
      }
      rafId = requestAnimationFrame(poll);
    };

    rafId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId);
  }, [handleBack, refreshGames, moveFocus, moveMedia]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (showKeyboardRef.current) return;
      const isTypingSearch = event.target instanceof HTMLInputElement
        && event.target.dataset.cloudSearch === "true";
      if (isTypingSearch && (event.key.length === 1 || event.key === "Backspace" || event.key === "Delete")) {
        return;
      }
      const columns = viewModeRef.current === "grid" ? COLS : 1;
      if (event.key === "Escape") {
        event.preventDefault();
        handleBack();
      } else if (event.key === "Enter") {
        event.preventDefault();
        selectFocusedRef.current();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        if (selectedGameRef.current) {
          if (previewFocusRef.current === "primary") {
            previewFocusRef.current = "back";
            setPreviewFocus("back");
          }
        } else moveFocus(columns);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        if (selectedGameRef.current) {
          if (previewFocusRef.current === "back") {
            previewFocusRef.current = "primary";
            setPreviewFocus("primary");
          }
        } else moveFocus(-columns);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        if (selectedGameRef.current) {
          if (previewFocusRef.current !== "media" && mediaCountRef.current > 0) {
            mediaReturnFocusRef.current = previewFocusRef.current;
            previewFocusRef.current = "media";
            setPreviewFocus("media");
          }
        }
        else moveFocus(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (selectedGameRef.current) {
          if (previewFocusRef.current === "media") {
            previewFocusRef.current = mediaReturnFocusRef.current;
            setPreviewFocus(mediaReturnFocusRef.current);
          }
        }
        else moveFocus(-1);
      } else if (event.key.toLowerCase() === "y") {
        if (selectedGameRef.current) return;
        event.preventDefault();
        setShowKeyboard(true);
      } else if (event.key.toLowerCase() === "x") {
        if (selectedGameRef.current) return;
        event.preventDefault();
        void refreshGames(true);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [handleBack, refreshGames, moveFocus, moveMedia]);

  const primaryActionLabel = selectedIsInLibrary
    ? t("addEntry.cloudRemoveFromLibrary")
    : t("addEntry.cloudAddToLibrary");
  const shortcuts = showKeyboard ? [] : selectedGame ? [
    { btn: "A", label: previewFocus === "media"
      ? t("common.select")
      : previewFocus === "back" ? t("addEntry.cloudBackToGames") : primaryActionLabel },
    { btn: "D-PAD", label: t("addEntry.cloudNavigate") },
    ...(previewMedia.length > 1 ? [{ btn: "LB RB", label: t("addEntry.cloudBrowseMedia") }] : []),
    { btn: "B", label: t("common.back") },
  ] : [
    { btn: "A", label: t("addEntry.cloudViewDetails") },
    { btn: "Y", label: t("addEntry.cloudSearch") },
    { btn: "X", label: t("addEntry.cloudRefresh") },
    { btn: "LB RB", label: t("addEntry.cloudViewToggle") },
    { btn: "B", label: t("common.cancel") },
  ];

  const statusLine = refreshError
    ? t("addEntry.cloudRefreshFailed")
    : fetchedAt
      ? t("addEntry.cloudUpdated", { date: new Date(fetchedAt * 1000).toLocaleString() })
      : t(listSource === "bundled" ? "addEntry.cloudBundled" : "addEntry.cloudRefresh");

  return (
    <>
      <ModalShell
        title={selectedGame?.name ?? t("addEntry.addCloudGame")}
        shortcuts={shortcuts}
        width={860}
        zIndex={1001}
        onOverlayClick={handleBack}
      >
        {selectedGame ? (
          <div style={{ padding: "18px 22px 22px", display: "grid", gridTemplateColumns: "190px minmax(0, 1fr)", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{
                width: "100%",
                aspectRatio: "2 / 3",
                overflow: "hidden",
                borderRadius: 12,
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                display: "grid",
                placeItems: "center",
                color: accent.primary,
              }}>
                {selectedGame.boxArtUrl ? (
                  <img src={selectedGame.boxArtUrl} alt={selectedGame.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <CloudIcon size={34} />
                )}
              </div>
              <button
                type="button"
                data-cloud-preview-focus="primary"
                aria-current={previewFocus === "primary" ? "true" : undefined}
                onMouseMove={() => { previewFocusRef.current = "primary"; setPreviewFocus("primary"); }}
                onClick={() => selectedIsInLibrary ? onRemove?.(selectedGame) : onConfirm(selectedGame)}
                style={{
                  position: "relative",
                  minHeight: 46,
                  borderRadius: 10,
                  border: previewFocus === "primary" ? "3px solid white" : "3px solid transparent",
                  background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`,
                  color: accent.darkText ? "#1a1a1a" : "white",
                  boxShadow: previewFocus === "primary" ? `0 0 0 3px ${accent.primary}, 0 0 18px ${accent.glow}0.72)` : "none",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  transform: previewFocus === "primary" ? "scale(1.025)" : "none",
                  transition: "transform 0.1s, border 0.1s, box-shadow 0.1s",
                }}
              >
                {primaryActionLabel}
                {previewFocus === "primary" && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11 }}>A</span>}
              </button>
              <button
                type="button"
                data-cloud-preview-focus="back"
                aria-current={previewFocus === "back" ? "true" : undefined}
                onMouseMove={() => { previewFocusRef.current = "back"; setPreviewFocus("back"); }}
                onClick={closePreview}
                style={{
                  position: "relative",
                  minHeight: 36,
                  borderRadius: 9,
                  border: previewFocus === "back"
                    ? `2px solid ${accent.primary}`
                    : `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
                  background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                  color: previewFocus === "back" ? theme.text : theme.textDim,
                  boxShadow: previewFocus === "back" ? `0 0 0 3px ${accent.glow}0.3)` : "none",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {t("addEntry.cloudBackToGames")}
                {previewFocus === "back" && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: accent.primary }}>A</span>}
              </button>
            </div>

            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: accent.primary, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>
                  {t("details.about")}
                </div>
                {detailsLoading ? (
                  <div style={{ color: theme.textDim, fontSize: 13 }}>{t("addEntry.cloudDetailsLoading")}</div>
                ) : (
                  <div style={{
                    color: description ? theme.textDim : theme.textFaint,
                    fontSize: 13,
                    lineHeight: 1.55,
                    minHeight: 48,
                    maxHeight: 86,
                    overflowY: "auto",
                    paddingRight: 4,
                  }}>
                    {description || t(storeMetaEnabled ? "addEntry.cloudDetailsUnavailable" : "addEntry.cloudDetailsDisabled")}
                  </div>
                )}
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: accent.primary, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {t("details.media")}
                  </div>
                  {previewMedia.length > 1 && (
                    <span style={{ color: theme.textFaint, fontSize: 10 }}>
                      {mediaIdx + 1} / {previewMedia.length}
                    </span>
                  )}
                </div>
                {selectedMedia ? (
                  <button
                    type="button"
                    data-cloud-preview-focus="media"
                    aria-current={previewFocus === "media" ? "true" : undefined}
                    onMouseMove={() => { previewFocusRef.current = "media"; setPreviewFocus("media"); }}
                    onClick={() => { mediaOverlayRef.current = true; setMediaOverlay(true); }}
                    style={{
                      position: "relative",
                      width: "100%",
                      height: 230,
                      overflow: "hidden",
                      borderRadius: 12,
                      border: previewFocus === "media" ? `2px solid ${accent.primary}` : `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                      background: "#000",
                      boxShadow: previewFocus === "media" ? `0 0 0 3px ${accent.glow}0.2)` : "none",
                      padding: 0,
                      cursor: "pointer",
                    }}
                  >
                    <img src={selectedMedia.thumb || selectedMedia.full} alt={selectedMedia.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 55%, rgba(0,0,0,0.78))" }} />
                    {selectedMedia.type === "trailer" && (
                      <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "white", fontSize: 36, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.8))" }}>
                        <IoPlay />
                      </span>
                    )}
                    <span style={{ position: "absolute", left: 12, right: 12, bottom: 10, color: "white", fontSize: 12, fontWeight: 700, textAlign: "left" }}>
                      {selectedMedia.title}
                    </span>
                  </button>
                ) : (
                  <div style={{
                    height: 180,
                    borderRadius: 12,
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                    display: "grid",
                    placeItems: "center",
                    color: theme.textFaint,
                    fontSize: 12,
                  }}>
                    {detailsLoading ? t("addEntry.cloudDetailsLoading") : t("addEntry.cloudMediaUnavailable")}
                  </div>
                )}
                {previewMedia.length > 1 && (
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 8, color: theme.textDim, fontSize: 12 }}>
                    <button type="button" onClick={() => moveMedia(-1)} aria-label={t("common.back")} style={{ border: "none", background: "transparent", color: "inherit", cursor: "pointer", fontSize: 18 }}><IoChevronBackOutline /></button>
                    <span>{selectedMedia?.title}</span>
                    <button type="button" onClick={() => moveMedia(1)} aria-label={t("common.select")} style={{ border: "none", background: "transparent", color: "inherit", cursor: "pointer", fontSize: 18 }}><IoChevronForwardOutline /></button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
        <div style={{ display: "flex", flexDirection: "column", padding: "14px 22px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 8,
                height: 38,
                padding: "0 12px",
                borderRadius: 10,
                border: query
                  ? `1px solid ${accent.primary}`
                  : `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
                background: query
                  ? `${accent.glow}0.08)`
                  : isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                color: query ? theme.text : theme.textDim,
                fontSize: 13,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                data-cloud-search="true"
                type="text"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  focusIdxRef.current = 0;
                  setFocusIdx(0);
                }}
                placeholder={t("addEntry.cloudSearch")}
                aria-label={t("addEntry.cloudSearch")}
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: query ? theme.text : theme.textDim,
                  font: "inherit",
                }}
              />
              <button
                type="button"
                onClick={() => setShowKeyboard(true)}
                title={t("addEntry.cloudSearch")}
                style={{
                  border: "none",
                  background: "transparent",
                  color: accent.primary,
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: "4px 2px",
                }}
              >
                Y
              </button>
            </div>

            <div style={{
              display: "flex",
              background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
              borderRadius: 8,
              padding: 2,
              gap: 2,
              flexShrink: 0,
            }}>
              {(["grid", "list"] as const).map((mode) => {
                const active = viewMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    title={mode === "grid" ? t("addEntry.cloudViewGrid") : t("addEntry.cloudViewList")}
                    style={{
                      width: 30,
                      height: 26,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 6,
                      border: "none",
                      background: active ? `${accent.glow}0.2)` : "transparent",
                      color: active ? accent.primary : theme.textDim,
                      cursor: "pointer",
                      transition: "all 0.1s",
                    }}
                  >
                    {mode === "grid" ? <MdGridView size={16} /> : <MdViewList size={16} />}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => void refreshGames(true)}
              disabled={refreshing}
              title={t("addEntry.cloudRefresh")}
              style={{
                width: 34,
                height: 34,
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
              <IoRefreshOutline size={16} style={{ animation: refreshing ? "spin 0.8s linear infinite" : "none" }} />
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: theme.textDim }}>
              {results.length} {t("addEntry.cloudResultsCount")}
            </span>
            <span style={{ fontSize: 10, color: refreshError ? "#ef8a8a" : theme.textDim, textAlign: "right" }}>
              {statusLine}
            </span>
          </div>

          <div
            ref={scrollRef}
            style={{ overflowY: "auto", maxHeight: "calc(100vh - 280px)", minHeight: 200, padding: 4, boxSizing: "border-box" }}
          >
            {viewMode === "grid" ? (
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, gap: 10 }}>
                {results.map((game, index) => {
                  const focused = focusIdx === index;
                  return (
                    <button
                      key={game.productId}
                      data-cloud-idx={index}
                      type="button"
                      onMouseMove={() => { focusIdxRef.current = index; setFocusIdx(index); }}
                      onClick={() => openPreview(game)}
                      style={{
                        position: "relative",
                        aspectRatio: "2 / 3",
                        borderRadius: 10,
                        overflow: "hidden",
                        border: focused
                          ? `2px solid ${accent.primary}`
                          : `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
                        background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                        boxShadow: focused
                          ? `inset 0 0 0 1px ${accent.primary}, 0 4px 16px rgba(0,0,0,0.4)`
                          : "none",
                        cursor: "pointer",
                        padding: 0,
                        transform: "none",
                        transition: "transform 0.1s, border 0.1s, box-shadow 0.1s",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-end",
                      }}
                    >
                      {game.boxArtUrl ? (
                        <img
                          src={game.boxArtUrl}
                          alt={game.name}
                          loading="lazy"
                          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: `linear-gradient(145deg, ${accent.glow}0.15), rgba(0,0,0,0.5))`,
                          color: `${accent.primary}66`,
                        }}>
                          <CloudIcon size={28} />
                        </div>
                      )}

                      <div style={{
                        position: "relative",
                        zIndex: 2,
                        background: "linear-gradient(transparent, rgba(0,0,0,0.82) 55%)",
                        padding: "20px 8px 8px",
                      }}>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "rgba(255,255,255,0.95)",
                          lineHeight: 1.3,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                        } as React.CSSProperties}>
                          {game.name}
                        </span>
                      </div>

                      {focused && (
                        <div style={{
                          position: "absolute",
                          top: 6,
                          right: 6,
                          zIndex: 3,
                          background: accent.primary,
                          borderRadius: 4,
                          fontSize: 9,
                          fontWeight: 700,
                          color: accent.darkText ? "#1a1a1a" : "white",
                          padding: "2px 5px",
                        }}>
                          A
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {results.map((game, index) => {
                  const focused = focusIdx === index;
                  return (
                    <button
                      key={game.productId}
                      data-cloud-idx={index}
                      type="button"
                      onMouseMove={() => { focusIdxRef.current = index; setFocusIdx(index); }}
                      onClick={() => openPreview(game)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        width: "100%",
                        minHeight: 58,
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: focused ? `1px solid ${accent.primary}` : "1px solid transparent",
                        background: focused
                          ? `${accent.glow}0.12)`
                          : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                        boxShadow: focused ? `0 0 0 2px ${accent.glow}0.15)` : "none",
                        color: theme.text,
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.1s",
                      }}
                    >
                      <div style={{
                        width: 40,
                        height: 56,
                        borderRadius: 6,
                        overflow: "hidden",
                        flexShrink: 0,
                        background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: focused ? accent.primary : theme.textDim,
                      }}>
                        {game.boxArtUrl ? (
                          <img
                            src={game.boxArtUrl}
                            alt={game.name}
                            loading="lazy"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <CloudIcon size={17} />
                        )}
                      </div>
                      <span style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 13,
                        fontWeight: 600,
                        color: theme.text,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {game.name}
                      </span>
                      {focused && (
                        <span style={{ color: accent.primary, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>A</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {results.length === 0 && (
              <div style={{ padding: "48px 12px", color: theme.textDim, fontSize: 13, textAlign: "center" }}>
                {t("addEntry.cloudEmpty")}
              </div>
            )}
          </div>
        </div>
        )}
      </ModalShell>

      {mediaOverlay && selectedMedia && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 3200,
            background: "rgba(0,0,0,0.94)",
            display: "grid",
            placeItems: "center",
            padding: 32,
          }}
          onClick={() => { mediaOverlayRef.current = false; setMediaOverlay(false); }}
        >
          {selectedMedia.type === "trailer" && overlayMovieSrc ? (
            <video
              ref={overlayVideoRef}
              src={overlayNativeSrc}
              controls
              autoPlay
              playsInline
              preload="metadata"
              onCanPlay={(event) => { void event.currentTarget.play().catch(() => {}); }}
              onClick={(event) => event.stopPropagation()}
              style={{ width: "min(1040px, 92%)", aspectRatio: "16 / 9", background: "#000", borderRadius: 12 }}
            />
          ) : selectedMedia.type === "trailer" ? (
            <div
              onClick={(event) => event.stopPropagation()}
              style={{
                width: "min(1040px, 92%)",
                aspectRatio: "16 / 9",
                borderRadius: 12,
                background: `linear-gradient(rgba(0,0,0,0.48), rgba(0,0,0,0.78)), url(${JSON.stringify(selectedMedia.thumb)}) center / cover`,
                color: "rgba(255,255,255,0.78)",
                display: "grid",
                placeItems: "center",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {t("details.trailerUnavailable", { defaultValue: "Trailer unavailable" })}
            </div>
          ) : (
            <img
              src={selectedMedia.full}
              alt={selectedMedia.title}
              onClick={(event) => event.stopPropagation()}
              style={{ width: "min(1100px, 94%)", maxHeight: "86%", objectFit: "contain", borderRadius: 12 }}
            />
          )}
          {previewMedia.length > 1 && (
            <div style={{ position: "absolute", bottom: 24, color: "rgba(255,255,255,0.78)", fontSize: 13 }}>
              <IoChevronBackOutline style={{ verticalAlign: "middle" }} /> {mediaIdx + 1} / {previewMedia.length} <IoChevronForwardOutline style={{ verticalAlign: "middle" }} />
            </div>
          )}
        </div>
      )}

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
