import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { IoClose, IoPause, IoPlay, IoPlayBack, IoPlayForward, IoRepeat, IoShuffle, IoVolumeHighOutline } from "react-icons/io5";
import ModalShell from "../modals/ModalShell";
import { useTheme } from "../../contexts/ThemeContext";
import { getBestGamepad, readGpState, shouldHandleDirectionRepeat, type GpState } from "../../utils/gamepad";
import type { SpotifyController } from "../../hooks/useSpotify";
import type { SpotifyWebPlayerState } from "../../hooks/useSpotifyWebPlayer";

interface SpotifyOverlayProps {
  open: boolean;
  spotify: SpotifyController;
  webPlayer?: SpotifyWebPlayerState;
  onClose: () => void;
}

const formatTime = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

export function SpotifyOverlay({ open, spotify, webPlayer, onClose }: SpotifyOverlayProps) {
  const { t } = useTranslation();
  const { accent, theme, isDark, surfaceStyle } = useTheme();
  const [focusIdx, setFocusIdx] = useState(2);
  const focusIdxRef = useRef(2);
  const playlistGridRef = useRef<HTMLDivElement | null>(null);
  const actionBusyRef = useRef(false);
  const [seekDraft, setSeekDraft] = useState<number | null>(null);
  const track = webPlayer?.track
    ? {
        ...webPlayer.track,
        shuffle: spotify.track?.shuffle ?? webPlayer.track.shuffle,
        repeat: spotify.track?.repeat ?? webPlayer.track.repeat,
      }
    : spotify.track;
  const playlistCards = useMemo(() => spotify.playlists.slice(0, 12), [spotify.playlists]);

  const actionsCount = 6 + playlistCards.length + 1;
  const setFocus = (idx: number) => {
    const next = Math.max(0, Math.min(actionsCount - 1, idx));
    focusIdxRef.current = next;
    setFocusIdx(next);
  };

  useEffect(() => {
    if (!open) return;
    setFocus(2);
    spotify.refreshPlayback();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const targetDeviceId = webPlayer?.ready ? webPlayer.deviceId : null;
  const premiumAction = async (action: (deviceId?: string | null) => void | Promise<void>) => {
    if (actionBusyRef.current) return;
    actionBusyRef.current = true;
    try {
      await webPlayer?.activate();
      await action(targetDeviceId);
      window.setTimeout(() => {
        webPlayer?.sync();
        actionBusyRef.current = false;
      }, 700);
    } catch {
      actionBusyRef.current = false;
    }
  };
  const getPlaylistCols = () => {
    const children = Array.from(playlistGridRef.current?.children ?? []) as HTMLElement[];
    if (children.length === 0) return 1;
    const firstTop = children[0].getBoundingClientRect().top;
    return Math.max(1, children.filter((child) => Math.abs(child.getBoundingClientRect().top - firstTop) < 2).length);
  };

  const runFocused = () => {
    const idx = focusIdxRef.current;
    if (idx === 0) premiumAction(() => spotify.setShuffle(!track?.shuffle));
    if (idx === 1) premiumAction(spotify.previous);
    if (idx === 2) premiumAction((deviceId) => track?.isPlaying ? spotify.pause() : spotify.play(deviceId));
    if (idx === 3) premiumAction(spotify.next);
    if (idx === 4) {
      const next = track?.repeat === "off" ? "context" : track?.repeat === "context" ? "track" : "off";
      premiumAction(() => spotify.setRepeat(next));
    }
    if (idx === 5 && track) premiumAction(() => spotify.seek(track.progressMs));
    if (idx >= 6 && idx < 6 + playlistCards.length) premiumAction((deviceId) => spotify.playContext(playlistCards[idx - 6].uri, deviceId));
    if (idx === 6 + playlistCards.length) onClose();
  };

  useEffect(() => {
    if (!open) return;
    let closed = false;
    const handle = (key: string) => {
      if (closed) return;
      if (key === "Escape") {
        closed = true;
        onClose();
        return;
      }
      if (key === "ArrowRight") setFocus(focusIdxRef.current + 1);
      if (key === "ArrowLeft") setFocus(focusIdxRef.current - 1);
      if (key === "ArrowDown") {
        const cols = getPlaylistCols();
        const idx = focusIdxRef.current;
        setFocus(idx < 6 ? 6 + Math.min(idx, Math.max(playlistCards.length - 1, 0), cols - 1) : idx + cols);
      }
      if (key === "ArrowUp") {
        const cols = getPlaylistCols();
        const idx = focusIdxRef.current;
        if (idx >= 6 + cols) setFocus(idx - cols);
        else if (idx >= 6) setFocus(Math.min(5, idx - 6));
        else setFocus(idx - 1);
      }
      if (key === "Enter") runFocused();
    };
    const onKey = (event: KeyboardEvent) => {
      const map: Record<string, string> = {
        ArrowDown: "ArrowDown",
        ArrowUp: "ArrowUp",
        ArrowLeft: "ArrowLeft",
        ArrowRight: "ArrowRight",
        Enter: "Enter",
        Escape: "Escape",
        " ": "Enter",
      };
      if (map[event.key]) {
        event.preventDefault();
        event.stopPropagation();
        handle(map[event.key]);
      }
    };
    window.addEventListener("keydown", onKey, true);
    let rafId = 0;
    const last: Partial<GpState> = {};
    const pressTime: Record<string, number> = {};
    const repeating: Record<string, boolean> = {};
    let enterReleased = false;
    let escapeReleased = false;
    const poll = (now: number) => {
      if (closed) return;
      const gp = getBestGamepad();
      if (gp) {
        const base = readGpState(gp);
        if (!base.Enter) enterReleased = true;
        if (!base.Escape) escapeReleased = true;
        const state = {
          ...base,
          Enter: enterReleased && base.Enter,
          Escape: escapeReleased && base.Escape,
        };
        (Object.keys(state) as (keyof GpState)[]).forEach((key) => {
          const pressed = state[key];
          const wasPressed = last[key];
          if (key === "ArrowDown" || key === "ArrowUp" || key === "ArrowLeft" || key === "ArrowRight") {
            if (shouldHandleDirectionRepeat(key, state, last, now, pressTime, repeating)) handle(key);
          } else if (pressed && !wasPressed) {
            handle(key);
          }
          last[key] = pressed;
        });
      }
      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);
    return () => {
      closed = true;
      window.removeEventListener("keydown", onKey, true);
      cancelAnimationFrame(rafId);
    };
  }, [open, onClose, playlistCards.length, track?.isPlaying, track?.repeat, track?.shuffle]); // eslint-disable-line react-hooks/exhaustive-deps

  const progressMs = seekDraft ?? track?.progressMs ?? 0;
  const activeDevice = spotify.activeDevice;
  const premiumHint = spotify.requiresPremium ? t("spotify.premiumHint") : null;
  const noDeviceHint = spotify.error?.key === "noDevice" ? t("spotify.errors.noDevice") : null;
  const errorText = spotify.error && spotify.error.key !== "noDevice"
    ? t(`spotify.errors.${spotify.error.key}`, { message: spotify.error.message ?? "" })
    : null;
  const webPlayerStatus = webPlayer?.error
    ? t("spotify.localDeviceError", { message: webPlayer.error })
    : webPlayer?.ready
    ? t("spotify.localDeviceReady")
    : t("spotify.localDeviceConnecting");

  const controlButton = (idx: number, label: string, icon: ReactNode, onClick: () => void, active = false) => {
    const focused = focusIdx === idx;
    return (
      <button
        type="button"
        title={label}
        onClick={onClick}
        onMouseEnter={() => setFocus(idx)}
        style={{
          width: 42,
          height: 42,
          borderRadius: surfaceStyle === "win9x" || surfaceStyle === "cyberpunk" ? 0 : 12,
          border: `1px solid ${focused || active ? accent.primary : isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)"}`,
          background: active ? accent.primary : focused ? `${accent.glow}0.16)` : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
          color: active ? (accent.darkText ? "#161616" : "#fff") : spotify.requiresPremium ? theme.textFaint : theme.text,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          opacity: !spotify.requiresPremium || idx === 5 ? 1 : 0.62,
          boxShadow: focused ? `0 0 22px ${accent.glow}0.22)` : undefined,
        }}
      >
        {icon}
      </button>
    );
  };

  if (!open) return null;

  return (
    <ModalShell
      title={t("spotify.overlayTitle")}
      shortcuts={[
        { btn: "A", label: t("common.select") },
        { btn: "B", label: t("common.close") },
      ]}
      width={900}
      maxHeight="88vh"
      zIndex={8650}
      onOverlayClick={onClose}
    >
      <div style={{ padding: 24, display: "grid", gap: 20 }}>
        {(premiumHint || noDeviceHint || errorText) && (
          <div style={{ padding: "10px 12px", borderRadius: surfaceStyle === "win9x" || surfaceStyle === "cyberpunk" ? 0 : 8, background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.055)", color: noDeviceHint ? theme.textDim : "#ffb2b2", fontSize: 12 }}>
            {noDeviceHint ?? errorText ?? premiumHint}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 260px) minmax(0, 1fr)", gap: 24, alignItems: "center" }}>
          <div style={{ aspectRatio: "1 / 1", background: `${accent.glow}0.13)`, borderRadius: surfaceStyle === "win9x" || surfaceStyle === "cyberpunk" ? 0 : 12, overflow: "hidden", border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)"}` }}>
            {track?.image && <img src={track.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: accent.primary, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
              {track?.isPlaying ? t("spotify.nowPlaying") : t("spotify.ready")}
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, color: theme.text, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {track?.title ?? t("spotify.noTrack")}
            </div>
            <div style={{ fontSize: 15, color: theme.textDim, marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {track?.artist ?? t("spotify.noTrackHint")}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20, alignItems: "center", flexWrap: "wrap" }}>
              {controlButton(0, t("spotify.shuffle"), <IoShuffle size={18} />, () => premiumAction(() => spotify.setShuffle(!track?.shuffle)), !!track?.shuffle)}
              {controlButton(1, t("spotify.previous"), <IoPlayBack size={19} />, () => premiumAction(spotify.previous))}
              {controlButton(2, track?.isPlaying ? t("spotify.pause") : t("spotify.play"), track?.isPlaying ? <IoPause size={21} /> : <IoPlay size={21} />, () => premiumAction((deviceId) => track?.isPlaying ? spotify.pause() : spotify.play(deviceId)), !!track?.isPlaying)}
              {controlButton(3, t("spotify.next"), <IoPlayForward size={19} />, () => premiumAction(spotify.next))}
              {controlButton(4, t("spotify.repeat"), <IoRepeat size={18} />, () => {
                const next = track?.repeat === "off" ? "context" : track?.repeat === "context" ? "track" : "off";
                premiumAction(() => spotify.setRepeat(next));
              }, track?.repeat !== "off")}
              <button type="button" onClick={onClose} onMouseEnter={() => setFocus(6 + playlistCards.length)} style={{
                marginLeft: "auto",
                width: 42,
                height: 42,
                borderRadius: surfaceStyle === "win9x" || surfaceStyle === "cyberpunk" ? 0 : 12,
                border: `1px solid ${focusIdx === 6 + playlistCards.length ? accent.primary : isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)"}`,
                background: focusIdx === 6 + playlistCards.length ? `${accent.glow}0.16)` : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                color: theme.text,
                cursor: "pointer",
              }}>
                <IoClose size={20} />
              </button>
            </div>

            <div style={{ marginTop: 22 }}>
              <input
                type="range"
                min={0}
                max={track?.durationMs ?? 1}
                value={progressMs}
                disabled={spotify.requiresPremium || !track}
                onMouseEnter={() => setFocus(5)}
                onChange={(event) => setSeekDraft(Number(event.target.value))}
                onMouseUp={() => {
                  if (seekDraft != null) {
                    spotify.seek(seekDraft);
                    window.setTimeout(() => webPlayer?.sync(), 700);
                  }
                  setSeekDraft(null);
                }}
                style={{ width: "100%", accentColor: accent.primary }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", color: focusIdx === 5 ? accent.primary : theme.textFaint, fontSize: 11, marginTop: 4 }}>
                <span>{formatTime(progressMs)}</span>
                <span>{track ? formatTime(track.durationMs) : "0:00"}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: theme.text }}>{t("spotify.playlists")}</div>
            {activeDevice && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: theme.textDim, fontSize: 12 }}>
                <IoVolumeHighOutline size={15} color={accent.primary} />
                {activeDevice.name}
              </div>
            )}
          </div>
          {playlistCards.length === 0 ? (
            <div style={{ fontSize: 13, color: theme.textDim, padding: "16px 0" }}>{spotify.loading ? t("spotify.loading") : t("spotify.noPlaylists")}</div>
          ) : (
            <div ref={playlistGridRef} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
              {playlistCards.map((playlist, idx) => {
                const focus = focusIdx === idx + 6;
                return (
                  <button
                    type="button"
                    key={playlist.id}
                    onClick={() => premiumAction((deviceId) => spotify.playContext(playlist.uri, deviceId))}
                    onMouseEnter={() => setFocus(idx + 6)}
                    style={{
                      minWidth: 0,
                      textAlign: "left",
                      display: "grid",
                      gridTemplateColumns: "48px minmax(0, 1fr)",
                      gap: 10,
                      alignItems: "center",
                      padding: 9,
                      borderRadius: surfaceStyle === "win9x" || surfaceStyle === "cyberpunk" ? 0 : 8,
                      border: `1px solid ${focus ? accent.primary : isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)"}`,
                      background: focus ? `${accent.glow}0.15)` : isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                      color: theme.text,
                      cursor: "pointer",
                    }}
                  >
                    {playlist.image ? (
                      <img src={playlist.image} alt="" style={{ width: 48, height: 48, objectFit: "cover", display: "block", borderRadius: surfaceStyle === "win9x" || surfaceStyle === "cyberpunk" ? 0 : 6 }} />
                    ) : (
                      <div style={{ width: 48, height: 48, background: `${accent.glow}0.16)`, borderRadius: surfaceStyle === "win9x" || surfaceStyle === "cyberpunk" ? 0 : 6 }} />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{playlist.name}</div>
                      <div style={{ fontSize: 11, color: theme.textDim }}>{playlist.trackCount ? t("spotify.trackCount", { count: playlist.trackCount }) : t("spotify.playlist")}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`, paddingTop: 12, color: theme.textDim, fontSize: 12 }}>
          <span>{spotify.status.product ? t("spotify.product", { product: spotify.status.product }) : t("spotify.connected")}</span>
          <span>{webPlayerStatus}</span>
          <span>{activeDevice ? t("spotify.device", { name: activeDevice.name, type: activeDevice.type }) : t("spotify.noActiveDevice")}</span>
        </div>
      </div>
    </ModalShell>
  );
}
