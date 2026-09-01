import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  IoChevronBack, IoChevronForward, IoGameControllerOutline, IoMusicalNotesOutline,
  IoPause, IoPlay, IoPlayBack, IoPlayForward, IoPowerOutline, IoRefresh,
  IoSettingsOutline, IoSunnyOutline, IoVolumeHighOutline,
} from "react-icons/io5";
import type { SpotifyController } from "../../hooks/useSpotify";
import type { App } from "../../types";
import { useSystemControls } from "../../hooks/useSystemControls";
import { getBestGamepad, readGpState, shouldHandleDirectionRepeat, type GpState } from "../../utils/gamepad";
import { useTheme } from "../../contexts/ThemeContext";
import { GamepadBtn } from "../GamepadBtn";

type HelperBarMode = "full" | "minimal" | "hidden";

interface HelperTrayProps {
  open: boolean;
  mode: HelperBarMode;
  spotify: SpotifyController;
  pinnedApps: App[];
  pinnedArtwork?: Record<string, string>;
  repeatSpeed?: "slow" | "normal" | "fast";
  onClose: () => void;
  onOpenPlaylists: () => void;
  onConnectSpotify: () => void;
  onOpenSettings: () => void;
  onOpenPower: () => void;
  onRefreshLibrary: () => void;
  onOpenControls: () => void;
  onOpenPinned: (app: App) => void;
}

type FocusItem = { key: string; row: number; column: number; app?: App };

const formatTime = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export function HelperTray({
  open,
  mode,
  spotify,
  pinnedApps,
  pinnedArtwork = {},
  repeatSpeed = "normal",
  onClose,
  onOpenPlaylists,
  onConnectSpotify,
  onOpenSettings,
  onOpenPower,
  onRefreshLibrary,
  onOpenControls,
  onOpenPinned,
}: HelperTrayProps) {
  const { t } = useTranslation();
  const { glassBar, accent, theme, isDark, surfaceStyle, surface, resolvedTheme } = useTheme();
  const { volume, brightness, requestVolume, requestBrightness } = useSystemControls(open);
  const track = spotify.track;
  const [focusKey, setFocusKey] = useState("settings");
  const focusKeyRef = useRef("settings");
  const [seekDraft, setSeekDraft] = useState<number | null>(null);
  const seekDraftRef = useRef<number | null>(null);
  const [adjustmentKey, setAdjustmentKey] = useState<string | null>(null);
  const adjustmentKeyRef = useRef<string | null>(null);
  const closedRef = useRef(false);
  const pinnedRowRef = useRef<HTMLDivElement | null>(null);
  const pinnedButtonRefs = useRef(new Map<string, HTMLButtonElement>());

  const focusItems = useMemo<FocusItem[]>(() => {
    const pinnedRow = pinnedApps.length > 0 ? 2 : null;
    const musicRow = pinnedRow == null ? 2 : 3;
    const music = track
      ? [
          { key: "previous", row: musicRow, column: 0 },
          { key: "play", row: musicRow, column: 1 },
          { key: "next", row: musicRow, column: 2 },
          { key: "seek", row: musicRow, column: 3 },
          { key: "playlists", row: musicRow, column: 4 },
        ]
      : [{ key: "playlists", row: musicRow, column: 0 }];
    const sliders = [
      { key: "volume", row: 1, column: 0 },
      ...(brightness != null && brightness >= 0 ? [{ key: "brightness", row: 1, column: 1 }] : []),
    ];
    const pinned = pinnedRow == null ? [] : pinnedApps.map((app, column) => ({
      key: `pinned:${app.id}`,
      row: pinnedRow,
      column,
      app,
    }));
    return [
      { key: "settings", row: 0, column: 0 },
      { key: "power", row: 0, column: 1 },
      { key: "refresh", row: 0, column: 2 },
      { key: "controls", row: 0, column: 3 },
      ...sliders,
      ...pinned,
      ...music,
    ];
  }, [track, brightness, pinnedApps]);
  const focusItemsRef = useRef(focusItems);
  useEffect(() => { focusItemsRef.current = focusItems; }, [focusItems]);

  const setFocus = (key: string) => {
    focusKeyRef.current = key;
    setFocusKey(key);
    if (key.startsWith("pinned:")) {
      const row = pinnedRowRef.current;
      const button = pinnedButtonRefs.current.get(key);
      if (row && button) {
        const rowRect = row.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        if (buttonRect.left < rowRect.left) {
          row.scrollTo({ left: Math.max(0, row.scrollLeft + buttonRect.left - rowRect.left - 2), behavior: "smooth" });
        } else if (buttonRect.right > rowRect.right) {
          row.scrollTo({ left: row.scrollLeft + buttonRect.right - rowRect.right + 2, behavior: "smooth" });
        }
      }
    }
  };

  const setAdjustment = (key: string | null) => {
    adjustmentKeyRef.current = key;
    setAdjustmentKey(key);
  };

  useEffect(() => {
    if (!open) return;
    setFocus("settings");
    setAdjustment(null);
    setSeekDraft(null);
    seekDraftRef.current = null;
  }, [open, track?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const activate = (key: string) => {
    if (key === "seek" || key === "volume" || key === "brightness") {
      const finishing = adjustmentKeyRef.current === key;
      if (finishing && key === "seek" && track && seekDraftRef.current != null) {
        spotify.seek(seekDraftRef.current);
        seekDraftRef.current = null;
        setSeekDraft(null);
      }
      setAdjustment(finishing ? null : key);
      return;
    }
    if (key === "previous") spotify.previous();
    if (key === "play") track?.isPlaying ? spotify.pause() : spotify.play();
    if (key === "next") spotify.next();
    if (key === "playlists") {
      if (spotify.status.connected) onOpenPlaylists();
      else onConnectSpotify();
    }
    if (key === "settings") onOpenSettings();
    if (key === "power") onOpenPower();
    if (key === "refresh") onRefreshLibrary();
    if (key === "controls") onOpenControls();
    const pinned = focusItemsRef.current.find((item) => item.key === key)?.app;
    if (pinned) onOpenPinned(pinned);
  };
  const activateRef = useRef(activate);
  useEffect(() => { activateRef.current = activate; });

  const adjustFocused = (direction: -1 | 1) => {
    const key = focusKeyRef.current;
    if (key === "volume") requestVolume((volume?.percent ?? 0) + direction * 5);
    if (key === "brightness" && brightness != null && brightness >= 0) requestBrightness(brightness + direction * 5);
    if (key === "seek" && track) {
      const next = Math.max(0, Math.min(track.durationMs, (seekDraftRef.current ?? track.progressMs) + direction * 10_000));
      seekDraftRef.current = next;
      setSeekDraft(next);
    }
  };
  const adjustRef = useRef(adjustFocused);
  useEffect(() => { adjustRef.current = adjustFocused; });

  const move = (direction: "up" | "down" | "left" | "right") => {
    const items = focusItemsRef.current;
    const current = items.find((item) => item.key === focusKeyRef.current) ?? items[0];
    if (!current) return;
    if (adjustmentKeyRef.current === current.key) {
      if (direction === "left" || direction === "right") adjustRef.current(direction === "left" ? -1 : 1);
      return;
    }
    if (direction === "left" || direction === "right") {
      const row = items.filter((item) => item.row === current.row);
      const index = row.findIndex((item) => item.key === current.key);
      const next = row[Math.max(0, Math.min(row.length - 1, index + (direction === "left" ? -1 : 1)))];
      if (next) setFocus(next.key);
      return;
    }
    const targetRow = current.row + (direction === "up" ? -1 : 1);
    const row = items.filter((item) => item.row === targetRow);
    if (row.length === 0) return;
    const next = row.reduce((best, item) => Math.abs(item.column - current.column) < Math.abs(best.column - current.column) ? item : best, row[0]);
    setFocus(next.key);
  };
  const moveRef = useRef(move);
  useEffect(() => { moveRef.current = move; });

  useEffect(() => {
    if (!open) return;
    closedRef.current = false;
    const close = () => {
      if (closedRef.current) return;
      closedRef.current = true;
      onClose();
    };
    const handle = (key: string) => {
      if (key === "Escape" && adjustmentKeyRef.current) activateRef.current(adjustmentKeyRef.current);
      else if (key === "Escape") close();
      else if (key === "Enter") activateRef.current(focusKeyRef.current);
      else if (key === "ArrowUp") moveRef.current("up");
      else if (key === "ArrowDown") moveRef.current("down");
      else if (key === "ArrowLeft") moveRef.current("left");
      else if (key === "ArrowRight") moveRef.current("right");
    };
    const onKey = (event: KeyboardEvent) => {
      const accepted = ["Escape", "Enter", " ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (!accepted.includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      handle(event.key === " " ? "Enter" : event.key);
    };
    window.addEventListener("keydown", onKey, true);

    const delays = repeatSpeed === "slow" ? [500, 170] : repeatSpeed === "fast" ? [240, 65] : [350, 100];
    let raf = 0;
    const last: Partial<GpState> = {};
    const pressTime: Record<string, number> = {};
    const repeating: Record<string, boolean> = {};
    let enterReleased = false;
    let escapeReleased = false;
    const poll = (now: number) => {
      if (closedRef.current) return;
      const gp = getBestGamepad();
      if (gp) {
        const base = readGpState(gp);
        if (!base.Enter) enterReleased = true;
        if (!base.Escape) escapeReleased = true;
        const state = { ...base, Enter: enterReleased && base.Enter, Escape: escapeReleased && base.Escape };
        let directionHandled = false;
        (Object.keys(state) as (keyof GpState)[]).forEach((key) => {
          const pressed = state[key];
          const wasPressed = last[key];
          if (key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight") {
            if (!directionHandled && shouldHandleDirectionRepeat(key, state, last, now, pressTime, repeating, delays[0], delays[1])) {
              directionHandled = true;
              handle(key);
            }
          } else if (pressed && !wasPressed) {
            handle(key);
          }
          last[key] = pressed;
        });
      }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => {
      closedRef.current = true;
      window.removeEventListener("keydown", onKey, true);
      cancelAnimationFrame(raf);
    };
  }, [open, repeatSpeed]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const squareCorners = resolvedTheme === "cyberpunk" || surfaceStyle === "win9x";
  const shellStyle: CSSProperties = {
    ...glassBar,
    background: surfaceStyle === "material" || surfaceStyle === "win9x"
      ? surface.panelBg
      : `color-mix(in srgb, ${accent.primary} 6%, ${isDark ? "#090b10" : "#f7f7f9"} 94%)`,
    width: "min(980px, calc(100vw - 32px))",
    maxHeight: "calc(100vh - 32px)",
    overflowY: "auto",
    borderRadius: squareCorners ? 0 : surfaceStyle === "material" ? 16 : 22,
    border: `1px solid ${accent.glow}0.34)`,
    boxShadow: "0 -14px 50px rgba(0,0,0,0.48)",
    padding: 18,
    boxSizing: "border-box",
  };
  const focusStyle = (key: string): CSSProperties => ({
    outline: focusKey === key ? `2px solid ${accent.primary}` : "2px solid transparent",
    boxShadow: focusKey === key ? `0 0 18px ${accent.glow}0.24)` : undefined,
  });
  const buttonStyle = (key: string): CSSProperties => ({
    ...focusStyle(key),
    border: `1px solid ${isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)"}`,
    background: focusKey === key ? `${accent.glow}0.16)` : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
    color: theme.text,
    borderRadius: squareCorners ? 0 : 12,
    minHeight: 40,
    font: "inherit",
    cursor: "pointer",
  });
  const transportButton = (key: string, label: string, icon: ReactNode, action: () => void) => (
    <button type="button" aria-label={label} onClick={action} onMouseMove={() => setFocus(key)} style={{ ...buttonStyle(key), width: 42, padding: 0 }}>{icon}</button>
  );
  const progress = seekDraft ?? track?.progressMs ?? 0;
  const shortcut = (key: string, label: string, icon: ReactNode, action: () => void) => (
    <button type="button" onClick={action} onMouseMove={() => setFocus(key)} style={{ ...buttonStyle(key), flex: 1, minWidth: 140, padding: "12px 15px", display: "flex", alignItems: "center", gap: 10, justifyContent: "center", fontWeight: 700 }}>{icon}{label}</button>
  );

  return (
    <div className="lo-anim-overlay" style={{ position: "fixed", inset: 0, zIndex: 9200, background: "rgba(0,0,0,0.56)", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: mode === "full" ? 78 : 18, boxSizing: "border-box" }} onClick={onClose}>
      <div className="lo-anim-modal" style={shellStyle} onClick={(event) => event.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <strong style={{ color: theme.text }}>{t("helper.trayTitle")}</strong>
          {mode !== "full" && <GamepadBtn btn="B" label={t("helper.closeTray")} />}
        </div>

        <div style={{ display: "flex", gap: 10, paddingBottom: 16, flexWrap: "wrap", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)"}` }}>
          {shortcut("settings", t("helper.settings"), <IoSettingsOutline />, onOpenSettings)}
          {shortcut("power", t("helper.power"), <IoPowerOutline />, onOpenPower)}
          {shortcut("refresh", t("helper.refreshLibrary"), <IoRefresh />, onRefreshLibrary)}
          {shortcut("controls", t("helper.controls"), <IoGameControllerOutline />, onOpenControls)}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: brightness != null && brightness >= 0 ? "1fr 1fr" : "1fr", gap: 16, padding: "16px 0", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)"}` }}>
          <SliderControl icon={<IoVolumeHighOutline />} label={t("helper.volume")} focusKey="volume" focused={focusKey === "volume"} editing={adjustmentKey === "volume"} adjustLabel={t("helper.adjust")} doneLabel={t("helper.done")} value={volume?.percent ?? 0} onFocus={setFocus} onChange={requestVolume} accent={accent.primary} text={theme.text} dim={theme.textDim} square={squareCorners} />
          {brightness != null && brightness >= 0 && <SliderControl icon={<IoSunnyOutline />} label={t("helper.brightness")} focusKey="brightness" focused={focusKey === "brightness"} editing={adjustmentKey === "brightness"} adjustLabel={t("helper.adjust")} doneLabel={t("helper.done")} value={brightness} onFocus={setFocus} onChange={requestBrightness} accent={accent.primary} text={theme.text} dim={theme.textDim} square={squareCorners} />}
        </div>

        {pinnedApps.length > 0 && (
          <div style={{ padding: "14px 0 16px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)"}` }}>
            <div style={{ color: theme.textDim, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 9 }}>
              {t("helper.pinned")}
            </div>
            <div ref={pinnedRowRef} style={{ display: "flex", gap: 9, overflowX: "auto", padding: "2px", scrollbarWidth: "thin" }}>
              {pinnedApps.map((app) => {
                const key = `pinned:${app.id}`;
                const artwork = pinnedArtwork[app.id];
                return (
                  <button
                    key={app.id}
                    ref={(node) => {
                      if (node) pinnedButtonRefs.current.set(key, node);
                      else pinnedButtonRefs.current.delete(key);
                    }}
                    type="button"
                    data-helper-pinned={app.id}
                    aria-label={app.name}
                    onClick={() => onOpenPinned(app)}
                    onMouseMove={() => setFocus(key)}
                    style={{ ...buttonStyle(key), width: 164, minWidth: 164, padding: "8px 10px", display: "flex", alignItems: "center", gap: 9, textAlign: "left" }}
                  >
                    <span style={{ width: 38, height: 38, borderRadius: squareCorners ? 0 : 8, overflow: "hidden", flexShrink: 0, display: "grid", placeItems: "center", background: `${accent.glow}0.18)`, color: accent.primary, fontWeight: 800 }}>
                      {artwork ? (
                        <img src={artwork} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : app.icon_base64 ? (
                        <img src={`data:image/png;base64,${app.icon_base64}`} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                      ) : app.name.charAt(0).toUpperCase()}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", color: theme.text, fontSize: 12, fontWeight: 750, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.name}</span>
                      <span style={{ display: "block", color: theme.textFaint, fontSize: 10, marginTop: 2 }}>{t(app.app_type === "game" ? "home.game" : "home.app")}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 15 }}>
          {track ? (
            <>
              <div style={{ width: 46, height: 46, borderRadius: squareCorners ? 0 : 9, overflow: "hidden", flexShrink: 0, background: `${accent.glow}0.18)`, display: "grid", placeItems: "center" }}>
                {track.image ? <img src={track.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <IoMusicalNotesOutline color={accent.primary} />}
              </div>
              <div style={{ width: 190, minWidth: 0 }}>
                <div style={{ color: theme.text, fontWeight: 700, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{track.title}</div>
                <div style={{ color: theme.textDim, fontSize: 12, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{track.artist}</div>
              </div>
              <div style={{ display: "flex", gap: 7 }}>
                {transportButton("previous", t("spotify.previous"), <IoPlayBack size={18} />, spotify.previous)}
                {transportButton("play", track.isPlaying ? t("spotify.pause") : t("spotify.play"), track.isPlaying ? <IoPause size={18} /> : <IoPlay size={18} />, () => track.isPlaying ? spotify.pause() : spotify.play())}
                {transportButton("next", t("spotify.next"), <IoPlayForward size={18} />, spotify.next)}
              </div>
              <div style={{ flex: 1, minWidth: 150, ...focusStyle("seek"), borderRadius: squareCorners ? 0 : 10, padding: "6px 8px", background: adjustmentKey === "seek" ? `color-mix(in srgb, ${accent.primary} 14%, transparent)` : undefined }} onMouseMove={() => setFocus("seek")}>
                <input type="range" min={0} max={track.durationMs || 1} value={progress} onChange={(event) => { const value = Number(event.target.value); seekDraftRef.current = value; setSeekDraft(value); }} onPointerUp={() => { spotify.seek(seekDraftRef.current ?? track.progressMs); seekDraftRef.current = null; setSeekDraft(null); }} style={{ width: "100%", accentColor: accent.primary }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", minHeight: 22, color: theme.textFaint, fontSize: 10 }}>
                  <span>{formatTime(progress)}</span>
                  <span style={{ visibility: focusKey === "seek" ? "visible" : "hidden" }}><GamepadBtn btn="A" label={adjustmentKey === "seek" ? t("helper.done") : t("helper.adjust")} /></span>
                  <span style={{ justifySelf: "end" }}>{formatTime(track.durationMs)}</span>
                </div>
              </div>
            </>
          ) : (
            <><IoMusicalNotesOutline size={28} color={theme.textDim} /><div style={{ flex: 1, color: theme.textDim }}>{t("helper.nothingPlaying")}</div></>
          )}
          <button type="button" onClick={spotify.status.connected ? onOpenPlaylists : onConnectSpotify} onMouseMove={() => setFocus("playlists")} style={{ ...buttonStyle("playlists"), padding: "0 15px", fontWeight: 700 }}>
            {t(!spotify.status.connected ? "helper.connectSpotify" : track ? "helper.playlists" : "helper.openSpotify")}
          </button>
        </div>

        {spotify.requiresPremium && <div style={{ color: accent.primary, fontSize: 11, marginTop: 9 }}>{t("spotify.premiumHint")}</div>}
      </div>
    </div>
  );
}

interface SliderControlProps {
  icon: ReactNode;
  label: string;
  focusKey: string;
  focused: boolean;
  editing: boolean;
  adjustLabel: string;
  doneLabel: string;
  value: number;
  onFocus: (key: string) => void;
  onChange: (value: number) => void;
  accent: string;
  text: string;
  dim: string;
  square: boolean;
}

function SliderControl({ icon, label, focusKey, focused, editing, adjustLabel, doneLabel, value, onFocus, onChange, accent, text, dim, square }: SliderControlProps) {
  return (
    <div onMouseMove={() => onFocus(focusKey)} style={{ padding: "9px 11px", borderRadius: square ? 0 : 10, outline: focused ? `2px solid ${accent}` : "2px solid transparent", background: editing ? `color-mix(in srgb, ${accent} 14%, transparent)` : undefined }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 22, marginBottom: 7, color: text, fontSize: 12, fontWeight: 700 }}>{icon}{label}<span style={{ marginLeft: "auto", minWidth: 76, visibility: focused ? "visible" : "hidden" }}><GamepadBtn btn="A" label={editing ? doneLabel : adjustLabel} /></span><span style={{ color: dim }}>{Math.round(value)}%</span></div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <IoChevronBack size={13} color={editing ? accent : dim} />
        <input type="range" min={0} max={100} value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ flex: 1, accentColor: accent }} />
        <IoChevronForward size={13} color={editing ? accent : dim} />
      </div>
    </div>
  );
}
