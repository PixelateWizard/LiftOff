import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { IoChevronDownOutline } from "react-icons/io5";
import { StoreBadge } from "./ui/StoreBadge";
import { getBestGamepad, readGpState, shouldHandleDirectionRepeat, rumble, type GpState } from "../utils/gamepad";
import type { AccentColors, App, ThemeColors } from "../types";

type SizeBytes = number | "loading" | undefined;
interface InstallProgress {
  appid?: string;
  pct?: number;
  bytesDone?: number;
  bytesTotal?: number;
  state?: string;
  phase?: string;
  live?: boolean;
}

interface DetailAction {
  key: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  checked?: boolean;
  sublabel?: string;
}

interface GameDetailsModalProps {
  app: App;
  heroAnimated?: string;
  heroStatic?: string;
  coverArt?: string;
  animatedHeroes: "static" | "animated" | "custom";
  effectsEnabled: boolean;
  lastPlayedAt?: number;
  playtimeMinutes?: number;
  sizeBytes?: SizeBytes;
  installed: boolean;
  canInstall?: boolean;
  installProgress?: InstallProgress;
  installError?: string;
  running?: boolean;
  onPlay: () => void;
  onCloseGame?: () => void;
  onInstall?: () => void;
  onCancelInstall?: () => void;
  onUninstall?: () => void;
  onVerify?: () => void;
  onTogglePin: () => void;
  isPinned: boolean;
  onToggleHidden: () => void;
  isHidden: boolean;
  onRunAsAdminToggle: () => void;
  runAsAdmin: boolean;
  onChangeArt: () => void;
  onChangeHeroArt: () => void;
  onCollections: () => void;
  onRename: () => void;
  onMoveToApps: () => void;
  onDelete?: () => void;
  onResetCategory?: () => void;
  onClose: () => void;
  hapticEnabled?: boolean;
  accent: AccentColors;
  accentName: string;
  theme: ThemeColors;
  isDark: boolean;
  surfaceStyle: string;
  glass: CSSProperties;
  t: (k: string, o?: any) => string;
}

const isAnimatedImageUrl = (url?: string) => /\.(gif|webp)(?:$|\?)/i.test(url ?? "");
const isVideoUrl = (url?: string) => /\.(webm|mp4)(?:$|\?)/i.test(url ?? "");

const PNG_ACCENTS = ["ember", "ocean", "neon", "rose", "midnight", "nova", "steel", "lunar", "atomic", "aqua", "sage", "copper"];
const getHeroPlaceholder = (accent: string) =>
  PNG_ACCENTS.includes(accent) ? `/assets/liftoff_hero_${accent}.png` : `/assets/liftoff_hero_${accent}.svg`;

function normalizeEpochMs(value?: number) {
  if (!value) return undefined;
  return value < 100000000000 ? value * 1000 : value;
}

function formatRelativeTime(value: number, never: string) {
  const ms = normalizeEpochMs(value);
  if (!ms) return never;
  const diff = Date.now() - ms;
  if (diff < 60_000) return "Just now";
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 365 * 24 * 60 * 60_000],
    ["month", 30 * 24 * 60 * 60_000],
    ["week", 7 * 24 * 60 * 60_000],
    ["day", 24 * 60 * 60_000],
    ["hour", 60 * 60_000],
    ["minute", 60_000],
  ];
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, unitMs] of units) {
    if (diff >= unitMs) return rtf.format(-Math.floor(diff / unitMs), unit);
  }
  return never;
}

function formatPlaytime(minutes: number) {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}m`;
  const hours = Math.floor(minutes / 60);
  const rem = Math.round(minutes % 60);
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}

export function GameDetailsModal({
  app,
  heroAnimated,
  heroStatic,
  coverArt,
  animatedHeroes,
  effectsEnabled,
  lastPlayedAt,
  playtimeMinutes,
  sizeBytes,
  installed,
  canInstall = false,
  installProgress,
  installError,
  running = false,
  onPlay,
  onCloseGame,
  onInstall,
  onCancelInstall,
  onUninstall,
  onVerify,
  onTogglePin,
  isPinned,
  onToggleHidden,
  isHidden,
  onRunAsAdminToggle,
  runAsAdmin,
  onChangeArt,
  onChangeHeroArt,
  onCollections,
  onRename,
  onMoveToApps,
  onDelete,
  onResetCategory,
  onClose,
  hapticEnabled = true,
  accent,
  accentName,
  theme,
  isDark,
  surfaceStyle,
  glass,
  t,
}: GameDetailsModalProps) {
  const [focusIdx, setFocusIdx] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [controlsRevealed, setControlsRevealed] = useState(false);
  const focusIdxRef = useRef(0);
  const controlsRevealedRef = useRef(false);
  const focusCountRef = useRef(1);
  const actionsRef = useRef<DetailAction[]>([]);
  const primaryActionRef = useRef<() => void>(() => {});
  const closeRef = useRef<() => void>(() => {});
  const hapticEnabledRef = useRef(hapticEnabled);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const focusRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const coverFallback = `/assets/liftoff_cover_${accentName}.svg`;
  const canAnimate = animatedHeroes !== "static" && effectsEnabled && !!heroAnimated;
  const heroMedia = canAnimate ? heroAnimated : heroStatic || heroAnimated;
  const renderVideo = canAnimate && isVideoUrl(heroAnimated);
  const renderAnimatedImage = canAnimate && isAnimatedImageUrl(heroAnimated);
  const primaryText = accent.darkText ? "#1a1a1a" : "white";
  const isPixel = surfaceStyle === "win9x";
  const panelRadius =
    isPixel ? 0 :
    surfaceStyle === "material" ? 14 :
    surfaceStyle === "clear" ? 10 :
    surfaceStyle === "neon" ? 6 :
    surfaceStyle === "obsidian" ? 12 :
    surfaceStyle === "aero" ? 18 :
    20;
  const mediaRadius =
    isPixel ? 0 :
    surfaceStyle === "material" || surfaceStyle === "clear" ? 8 :
    surfaceStyle === "neon" ? 4 :
    12;
  const controlRadius =
    isPixel ? 0 :
    surfaceStyle === "material" || surfaceStyle === "clear" ? 8 :
    surfaceStyle === "neon" ? 4 :
    surfaceStyle === "obsidian" ? 10 :
    12;
  const chipRadius = isPixel ? 0 : surfaceStyle === "material" || surfaceStyle === "clear" ? 8 : 10;
  const installing = !!installProgress && installProgress.state !== "complete";
  const uninstalling = installProgress?.state === "uninstalling";
  const installPhase = installProgress?.phase ?? "downloading";
  const liveInstall = installProgress?.live === true;
  const indeterminateInstall = liveInstall || uninstalling;
  const installPhaseLabel = installPhase === "preparing"
    ? "install.preparing"
    : installPhase === "staging"
      ? "install.staging"
      : installPhase === "paused"
        ? "install.paused"
        : "install.downloading";
  const installPct = Math.max(0, Math.min(100, Number(installProgress?.pct ?? 0)));
  const installErrorText = installError ? t(`install.${installError}`, { defaultValue: t("install.generic") }) : "";
  const source = app.source?.toLowerCase() ?? "";
  const isCloud = source === "cloud";
  const isSteam = source === "steam";

  const handlePrimaryAction = useCallback(() => {
    if (uninstalling) return;
    if (installed) {
      onPlay();
      return;
    }
    if (installing) {
      onCancelInstall?.();
      return;
    }
    if (canInstall) {
      onInstall?.();
    }
  }, [canInstall, installed, installing, onCancelInstall, onInstall, onPlay, uninstalling]);

  const actions = useMemo<DetailAction[]>(() => [
    ...(running && onCloseGame ? [{ key: "close-game", label: t("home.close"), onClick: onCloseGame, danger: true }] : []),
    ...(installed && onVerify && isSteam ? [{ key: "verify", label: t("install.verify"), onClick: onVerify }] : []),
    ...(installed && onUninstall && isSteam ? [{ key: "uninstall", label: t("install.uninstall"), onClick: onUninstall, danger: true }] : []),
    { key: "pin", label: t(isPinned ? "contextMenu.unpin" : "contextMenu.pin"), onClick: onTogglePin, checked: isPinned },
    { key: "hide", label: t(isHidden ? "contextMenu.show" : "contextMenu.hide"), onClick: onToggleHidden, checked: isHidden },
    ...(!isCloud ? [{
      key: "admin",
      label: "Run as Administrator",
      sublabel: "Game will request elevated privileges via UAC on launch",
      onClick: onRunAsAdminToggle,
      checked: runAsAdmin,
    }] : []),
    { key: "art", label: t("contextMenu.changeArt"), onClick: onChangeArt },
    { key: "hero", label: t("contextMenu.changeHeroArt"), onClick: onChangeHeroArt },
    { key: "collections", label: t("contextMenu.collections"), onClick: onCollections },
    { key: "rename", label: t("contextMenu.rename"), onClick: onRename },
    { key: "move", label: t("contextMenu.moveToApps"), onClick: onMoveToApps },
    ...(onResetCategory ? [{ key: "reset", label: t("contextMenu.resetCategory"), onClick: onResetCategory }] : []),
    ...(onDelete ? [{ key: "delete", label: t(isCloud ? "contextMenu.removeCloudGame" : "contextMenu.delete"), onClick: onDelete, danger: true }] : []),
  ], [
    isPinned,
    isHidden,
    runAsAdmin,
    onTogglePin,
    onToggleHidden,
    onRunAsAdminToggle,
    onChangeArt,
    onChangeHeroArt,
    onCollections,
    onRename,
    onMoveToApps,
    onResetCategory,
    onDelete,
    t,
    installed,
    onVerify,
    onUninstall,
    isCloud,
    isSteam,
    running,
    onCloseGame,
  ]);

  const focusCount = 1 + actions.length;
  focusCountRef.current = focusCount;
  actionsRef.current = actions;
  primaryActionRef.current = handlePrimaryAction;
  closeRef.current = onClose;
  hapticEnabledRef.current = hapticEnabled;

  const setFocusedIndex = (index: number) => {
    const bounded = Math.max(0, Math.min(focusCountRef.current - 1, index));
    setFocusIdx(bounded);
    focusIdxRef.current = bounded;
  };

  const revealControls = () => {
    controlsRevealedRef.current = true;
    setControlsRevealed(true);
  };

  const collapseControls = () => {
    controlsRevealedRef.current = false;
    setControlsRevealed(false);
    setFocusedIndex(0);
  };

  useEffect(() => {
    controlsRevealedRef.current = false;
    setControlsRevealed(false);
    setFocusedIndex(0);
  }, [app.id]);

  useEffect(() => {
    if (!renderVideo || !videoRef.current) return;
    const video = videoRef.current;
    const playPromise = video.play();
    if (playPromise) playPromise.catch(() => {});
    return () => {
      video.pause();
    };
  }, [heroAnimated, renderVideo]);

  useEffect(() => {
    const focused = focusRefs.current[focusIdx];
    const scroller = scrollRef.current;
    if (!focused || !scroller) return;
    focused.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [focusIdx]);

  useEffect(() => {
    const last: Partial<GpState> = {};
    const pressTime: Record<string, number> = {};
    const repeating: Record<string, boolean> = {};
    let rafId: number;
    let suppressFrames = 20;
    const poll = (now: number) => {
      if (suppressFrames > 0) {
        suppressFrames -= 1;
        rafId = requestAnimationFrame(poll);
        return;
      }
      const gp = getBestGamepad();
      if (gp) {
        const state = readGpState(gp);
        const cols = 3;
        const move = (next: number) => {
          setFocusedIndex(next);
        };
        if (controlsRevealedRef.current && shouldHandleDirectionRepeat("ArrowRight", state, last, now, pressTime, repeating)) move(focusIdxRef.current + 1);
        if (controlsRevealedRef.current && shouldHandleDirectionRepeat("ArrowLeft", state, last, now, pressTime, repeating)) move(focusIdxRef.current - 1);
        if (shouldHandleDirectionRepeat("ArrowDown", state, last, now, pressTime, repeating)) {
          if (!controlsRevealedRef.current && focusIdxRef.current === 0) {
            revealControls();
            move(1);
          } else {
            move(focusIdxRef.current === 0 ? 1 : focusIdxRef.current + cols);
          }
        }
        if (shouldHandleDirectionRepeat("ArrowUp", state, last, now, pressTime, repeating)) {
          if (controlsRevealedRef.current && focusIdxRef.current > 0 && focusIdxRef.current <= cols) {
            collapseControls();
          } else {
            move(focusIdxRef.current <= cols ? 0 : focusIdxRef.current - cols);
          }
        }
        if (state.Enter && !last.Enter) {
          if (focusIdxRef.current === 0) primaryActionRef.current();
          else if (controlsRevealedRef.current) {
            rumble("confirm", hapticEnabledRef.current);
            actionsRef.current[focusIdxRef.current - 1]?.onClick();
          }
        }
        if (state.Escape && !last.Escape) closeRef.current();
        Object.assign(last, state);
      }
      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const primaryLabel = running
    ? t("home.resume")
    : installed
      ? t("details.play")
      : installing
        ? (uninstalling ? t("install.uninstalling") : t("install.cancel"))
        : t("install.install");
  const primaryDisabled = !installed && (uninstalling || (!installing && !canInstall));

  const metaItems = [
    { label: t("details.lastPlayed"), value: lastPlayedAt ? formatRelativeTime(lastPlayedAt, t("details.never")) : t("details.never") },
    ...(typeof playtimeMinutes === "number" ? [{ label: t("details.playtime"), value: formatPlaytime(playtimeMinutes) }] : []),
    ...(sizeBytes !== undefined ? [{
      label: t("details.sizeOnDisk"),
      value: sizeBytes === "loading" ? t("common.loading", { defaultValue: "Loading..." }) : formatBytes(sizeBytes),
    }] : []),
  ];

  return (
    <div
      className="lo-anim-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        boxSizing: "border-box",
        fontFamily: "'Segoe UI', sans-serif",
        userSelect: "none",
      }}
      onClick={onClose}
    >
      <section
        className="lo-anim-modal"
        data-modal=""
        style={{
          ...glass,
          width: "min(1040px, 94vw)",
          height: "min(680px, 90vh)",
          borderRadius: panelRadius,
          overflow: "hidden",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          border: surfaceStyle === "material" ? "1px solid var(--material-border-subtle)" : `1px solid ${accent.glow}0.35)`,
          boxShadow: surfaceStyle === "material" ? "var(--material-shadow-high)" : "0 28px 90px rgba(0,0,0,0.62)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes detailsScrollHint {
            0%, 100% { transform: translateY(0); opacity: 0.72; }
            50% { transform: translateY(5px); opacity: 1; }
          }
          @media (prefers-reduced-motion: reduce) {
            .lo-anim-modal * {
              transition-duration: 1ms !important;
              animation-duration: 1ms !important;
              animation-iteration-count: 1 !important;
            }
          }
        `}</style>
        <div style={{
          position: "relative",
          height: controlsRevealed ? 112 : "44%",
          minHeight: controlsRevealed ? 112 : 250,
          maxHeight: controlsRevealed ? 112 : 330,
          flexShrink: 0,
          overflow: "hidden",
          background: isDark ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.18)",
          transition: "height 360ms cubic-bezier(0.16, 1, 0.3, 1), min-height 360ms cubic-bezier(0.16, 1, 0.3, 1), max-height 360ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          {heroMedia && !renderVideo && (
            <img
              src={renderAnimatedImage ? heroAnimated : heroMedia}
              alt=""
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
            />
          )}
          {renderVideo && (
            <video
              ref={videoRef}
              src={heroAnimated}
              muted
              loop
              playsInline
              preload="auto"
              onPlaying={() => setVideoReady(true)}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center top",
                opacity: videoReady ? 1 : 0,
                transition: "opacity 180ms ease",
              }}
            />
          )}
          {!heroMedia && (
            <img
              src={getHeroPlaceholder(accentName)}
              alt=""
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
            />
          )}
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, ${isDark ? "rgba(0,0,0,0.76)" : "rgba(255,255,255,0.58)"} 0%, rgba(0,0,0,0.08) 45%, rgba(0,0,0,0.22) 100%)` }} />
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(0deg, ${isDark ? "rgba(13,12,14,0.98)" : "rgba(248,246,242,0.98)"} 0%, rgba(0,0,0,0) 46%)` }} />
        </div>

        <div style={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          padding: controlsRevealed ? "14px 34px 28px 34px" : "0 34px 32px 34px",
          display: "grid",
          gridTemplateColumns: controlsRevealed ? "116px minmax(0, 1fr)" : "180px minmax(0, 1fr)",
          gridTemplateRows: controlsRevealed ? "auto minmax(0, 1fr)" : "1fr auto",
          columnGap: 28,
          rowGap: controlsRevealed ? 18 : 12,
          transition: "grid-template-columns 360ms cubic-bezier(0.16, 1, 0.3, 1), padding 360ms cubic-bezier(0.16, 1, 0.3, 1), row-gap 360ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          <div style={{ position: "relative", minHeight: controlsRevealed ? 116 : 218, transition: "min-height 360ms cubic-bezier(0.16, 1, 0.3, 1)" }}>
            <div style={{
              width: controlsRevealed ? 96 : 164,
              aspectRatio: "2/3",
              borderRadius: mediaRadius,
              overflow: "hidden",
              position: "absolute",
              left: 0,
              top: controlsRevealed ? 0 : -86,
              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
              border: surfaceStyle === "material" ? "1px solid var(--material-border-subtle)" : "1px solid rgba(255,255,255,0.16)",
              boxShadow: controlsRevealed ? "0 10px 22px rgba(0,0,0,0.34)" : "0 16px 38px rgba(0,0,0,0.42)",
              transition: "width 360ms cubic-bezier(0.16, 1, 0.3, 1), top 360ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 360ms ease",
            }}>
              <img
                src={coverArt || coverFallback}
                alt=""
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.dataset.fallbackApplied === "true") return;
                  img.dataset.fallbackApplied = "true";
                  img.src = coverFallback;
                }}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          </div>

          <div style={{
            minWidth: 0,
            alignSelf: controlsRevealed ? "start" : "center",
            display: "flex",
            flexDirection: "column",
            gap: controlsRevealed ? 10 : 16,
            paddingTop: controlsRevealed ? 0 : 20,
            transition: "gap 360ms cubic-bezier(0.16, 1, 0.3, 1), padding 360ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <StoreBadge source={app.source} inline />
              <h2 style={{
                margin: 0,
                fontSize: controlsRevealed ? 24 : 30,
                lineHeight: 1.05,
                color: theme.text,
                fontWeight: 800,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                transition: "font-size 360ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}>
                {app.name}
              </h2>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {metaItems.map((item) => (
                <div key={item.label} style={{
                  borderRadius: chipRadius,
                  border: surfaceStyle === "material" ? "1px solid var(--material-border-subtle)" : `1px solid ${accent.glow}0.18)`,
                  background: surfaceStyle === "material" ? "var(--material-elevation-1)" : (isDark ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.58)"),
                  padding: "8px 10px",
                  minWidth: 112,
                }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em", color: theme.textFaint }}>{item.label}</div>
                  <div style={{ marginTop: 3, fontSize: 13, fontWeight: 700, color: theme.text }}>{item.value}</div>
                </div>
              ))}
            </div>

            <button
              ref={(node) => { focusRefs.current[0] = node; }}
              onClick={primaryDisabled ? undefined : handlePrimaryAction}
              disabled={primaryDisabled}
              onMouseEnter={() => setFocusedIndex(0)}
              style={{
                alignSelf: "flex-start",
                minWidth: controlsRevealed ? 142 : 180,
                height: controlsRevealed ? 42 : 46,
                borderRadius: controlRadius,
                border: focusIdx === 0 ? `2px solid ${accent.primary}` : "1px solid transparent",
                background: installed || (!primaryDisabled && !uninstalling) ? `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` : "rgba(255,255,255,0.12)",
                color: installed || (!primaryDisabled && !uninstalling) ? primaryText : theme.textFaint,
                fontSize: 15,
                fontWeight: 900,
                cursor: primaryDisabled ? "default" : "pointer",
                boxShadow: focusIdx === 0 ? `0 0 0 3px ${accent.glow}0.24), 0 10px 28px rgba(0,0,0,0.28)` : "0 6px 18px rgba(0,0,0,0.22)",
                transition: "min-width 360ms cubic-bezier(0.16, 1, 0.3, 1), height 360ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 160ms ease, border-color 160ms ease",
              }}
            >
              {primaryLabel}
            </button>
            {installing && (
              <div style={{ width: controlsRevealed ? 170 : 220, display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{
                  height: 6,
                  borderRadius: 999,
                  overflow: "hidden",
                  background: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)",
                }}>
                  <div style={{
                    height: "100%",
                    width: indeterminateInstall ? "36%" : `${installPct}%`,
                    background: indeterminateInstall
                      ? `linear-gradient(90deg, ${accent.primary}, ${accent.light})`
                      : `linear-gradient(90deg, ${accent.primary} 0%, ${accent.light} 40%, rgba(255,255,255,0.9) 50%, ${accent.light} 60%, ${accent.primary} 100%)`,
                    backgroundSize: indeterminateInstall ? undefined : "220% 100%",
                    transition: "width 180ms ease",
                    ...(effectsEnabled
                      ? { animation: indeterminateInstall ? "steamInstallIndeterminate 1.15s ease-in-out infinite" : undefined }
                      : {}),
                  }} />
                </div>
                <div style={{ fontSize: 11, color: theme.textFaint, fontWeight: 700 }}>
                  {uninstalling
                    ? t("install.uninstalling")
                    : liveInstall
                      ? t(installPhaseLabel)
                      : `${t(installPhaseLabel)} ${installPct}%`}
                </div>
              </div>
            )}
            {installErrorText && (
              <div style={{ maxWidth: 360, fontSize: 12, lineHeight: 1.35, color: "#e85a5a", fontWeight: 650 }}>
                {installErrorText}
              </div>
            )}
          </div>

          {!controlsRevealed && (
            <button
              type="button"
              onClick={() => {
                revealControls();
                setFocusedIndex(1);
              }}
              aria-label={t("common.more", { defaultValue: "More" })}
              style={{
                gridColumn: "1 / -1",
                justifySelf: "center",
                alignSelf: "end",
                width: 46,
                height: 30,
                borderRadius: controlRadius,
                border: `1px solid ${isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)"}`,
                background: surfaceStyle === "material" ? "var(--material-elevation-1)" : (isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.44)"),
                color: accent.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: `0 0 0 1px ${accent.glow}0.08), 0 12px 24px rgba(0,0,0,0.20)`,
                animation: "detailsScrollHint 1.6s ease-in-out infinite",
              }}
            >
              <IoChevronDownOutline size={18} />
            </button>
          )}

          <div
            ref={scrollRef}
            style={{
              gridColumn: "1 / -1",
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              alignContent: "start",
              gap: 10,
              overflowY: "auto",
              minHeight: 0,
              maxHeight: controlsRevealed ? 330 : 0,
              padding: controlsRevealed ? "0 4px 2px 0" : 0,
              scrollPaddingBlock: 10,
              opacity: controlsRevealed ? 1 : 0,
              transform: controlsRevealed ? "translateY(0) scale(1)" : "translateY(26px) scale(0.985)",
              pointerEvents: controlsRevealed ? "auto" : "none",
              transition: "max-height 360ms cubic-bezier(0.16, 1, 0.3, 1), padding 360ms cubic-bezier(0.16, 1, 0.3, 1), opacity 280ms ease, transform 360ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {actions.map((action, idx) => {
              const focused = focusIdx === idx + 1;
              return (
                <button
                  key={action.key}
                  ref={(node) => { focusRefs.current[idx + 1] = node; }}
                  onClick={action.onClick}
                  onMouseEnter={() => setFocusedIndex(idx + 1)}
                  style={{
                    minHeight: action.sublabel ? 64 : 50,
                    borderRadius: controlRadius,
                    border: focused ? `2px solid ${action.danger ? "#e85a5a" : accent.primary}` : `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                    background: focused
                      ? (action.danger ? "rgba(232,90,90,0.16)" : `${accent.glow}0.20)`)
                      : surfaceStyle === "material" ? "var(--material-elevation-1)" : (isDark ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.60)"),
                    color: action.danger ? "#e85a5a" : theme.text,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    textAlign: "left",
                    padding: "10px 12px",
                    cursor: "pointer",
                    fontWeight: 750,
                    fontSize: 13,
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{action.label}</span>
                    {action.sublabel && (
                      <span style={{ display: "block", marginTop: 3, fontSize: 11, lineHeight: 1.15, color: theme.textFaint, fontWeight: 500 }}>{action.sublabel}</span>
                    )}
                  </span>
                  {typeof action.checked === "boolean" && (
                    <span style={{
                      width: 34,
                      height: 20,
                      borderRadius: 999,
                      flexShrink: 0,
                      padding: 2,
                      boxSizing: "border-box",
                      display: "inline-flex",
                      alignItems: "center",
                      background: action.checked ? accent.primary : (isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.14)"),
                    }}>
                      <span style={{
                        display: "block",
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: action.checked ? primaryText : "rgba(255,255,255,0.88)",
                        transform: action.checked ? "translateX(14px)" : "translateX(0)",
                        transition: "transform 120ms ease",
                      }} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
