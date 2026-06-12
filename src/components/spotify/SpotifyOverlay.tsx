import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  repeatSpeed?: "slow" | "normal" | "fast";
  onClose: () => void;
}

const formatTime = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

export function SpotifyOverlay({ open, spotify, webPlayer, repeatSpeed = "normal", onClose }: SpotifyOverlayProps) {
  const { t } = useTranslation();
  const { accent, theme, isDark, surfaceStyle } = useTheme();
  const [focusIdx, setFocusIdx] = useState(2);
  const focusIdxRef = useRef(2);
  const playlistGridRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const deviceSectionRef = useRef<HTMLDivElement | null>(null);
  const playlistSectionRef = useRef<HTMLDivElement | null>(null);
  const focusRefs = useRef<Record<number, HTMLElement | null>>({});
  const actionBusyRef = useRef(false);
  const [seekDraft, setSeekDraft] = useState<number | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const track = webPlayer?.track
    ? {
        ...webPlayer.track,
        shuffle: spotify.track?.shuffle ?? webPlayer.track.shuffle,
        repeat: spotify.track?.repeat ?? webPlayer.track.repeat,
      }
    : spotify.track;
  const deviceCards = useMemo(() => spotify.devices.slice(0, 6), [spotify.devices]);
  const playlistCards = useMemo(() => spotify.playlists.slice(0, 12), [spotify.playlists]);
  const activeDevice = spotify.activeDevice;
  const preferredDeviceId = useMemo(() => {
    const computer = spotify.devices.find((device) => device.type.toLowerCase() === "computer");
    return computer?.id ?? activeDevice?.id ?? spotify.devices[0]?.id ?? null;
  }, [activeDevice?.id, spotify.devices]);

  // Focus order mirrors the visual layout top-to-bottom: transport row
  // (shuffle, prev, play, next, repeat, close), then the scrubber, then
  // devices, then playlists. Close lives in the top row, not at the end.
  const closeIndex = 5;
  const seekIndex = 6;
  const deviceStart = 7;
  const playlistStart = deviceStart + deviceCards.length;
  const actionsCount = playlistStart + playlistCards.length;
  const setFocus = (idx: number) => {
    const next = Math.max(0, Math.min(actionsCount - 1, idx));
    focusIdxRef.current = next;
    setFocusIdx(next);
  };
  const registerFocus = (idx: number) => (node: HTMLElement | null) => {
    focusRefs.current[idx] = node;
  };

  useEffect(() => {
    if (!open) return;
    setFocus(2);
    spotify.refreshPlayback();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Opening transition: the modal grows out of the now-playing mini-player
  // (FLIP - measure both rects, start the panel at the mini-player's position
  // and size, then release it to its natural centered layout).
  useLayoutEffect(() => {
    if (!open) return;
    const panel = contentRef.current?.closest("[data-modal]") as HTMLElement | null;
    const source = document.querySelector("[data-spotify-minibar]") as HTMLElement | null;
    if (!panel || !source) return;
    const panelRect = panel.getBoundingClientRect();
    const sourceRect = source.getBoundingClientRect();
    if (panelRect.width === 0 || sourceRect.width === 0) return;
    // Visual rects include the app root's UI scale; transforms apply in the
    // panel's local space, so translate deltas must be unscaled.
    const parentScale = panel.offsetWidth > 0 ? panelRect.width / panel.offsetWidth : 1;
    const dx = (sourceRect.left + sourceRect.width / 2 - (panelRect.left + panelRect.width / 2)) / parentScale;
    const dy = (sourceRect.top + sourceRect.height / 2 - (panelRect.top + panelRect.height / 2)) / parentScale;
    panel.style.transition = "none";
    panel.style.transform = `translate(${dx}px, ${dy}px) scale(${sourceRect.width / panelRect.width}, ${sourceRect.height / panelRect.height})`;
    panel.style.opacity = "0.35";
    panel.getBoundingClientRect(); // commit the start state before transitioning
    const raf = requestAnimationFrame(() => {
      panel.style.transition = "transform 0.30s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.20s ease";
      panel.style.transform = "";
      panel.style.opacity = "";
    });
    const settle = window.setTimeout(() => { panel.style.transition = ""; }, 420);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
      panel.style.transition = "";
      panel.style.transform = "";
      panel.style.opacity = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const target = focusRefs.current[focusIdx];
    const scroller = contentRef.current?.parentElement;
    const content = contentRef.current;
    if (!target || !scroller || !content) return;
    if (focusIdx < deviceStart) {
      scroller.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const cols = getPlaylistCols();
    const sectionTarget = focusIdx >= playlistStart && focusIdx < playlistStart + cols
      ? playlistSectionRef.current
      : focusIdx >= deviceStart && focusIdx < playlistStart
      ? deviceSectionRef.current
      : null;
    const targetRect = (sectionTarget ?? target).getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    const topPad = 24;
    const bottomPad = 24;
    if (targetRect.top < scrollerRect.top + topPad) {
      scroller.scrollTo({ top: scroller.scrollTop - (scrollerRect.top + topPad - targetRect.top), behavior: "smooth" });
    } else if (targetRect.bottom > scrollerRect.bottom - bottomPad) {
      scroller.scrollTo({ top: scroller.scrollTop + targetRect.bottom - (scrollerRect.bottom - bottomPad), behavior: "smooth" });
    }
  }, [focusIdx, open, playlistStart]);

  useEffect(() => {
    setSeekDraft(null);
  }, [track?.id]);

  useEffect(() => {
    if (!open) return;
    if (selectedDeviceId && spotify.devices.some((device) => device.id === selectedDeviceId)) return;
    setSelectedDeviceId(preferredDeviceId);
  }, [open, preferredDeviceId, selectedDeviceId, spotify.devices]);

  const targetDeviceId = webPlayer?.ready ? webPlayer.deviceId : selectedDeviceId ?? preferredDeviceId;
  const premiumAction = async (action: (deviceId?: string | null) => void | Promise<void>) => {
    if (actionBusyRef.current) return;
    actionBusyRef.current = true;
    try {
      if (webPlayer) await webPlayer.activate();
      await action(targetDeviceId);
      window.setTimeout(() => {
        webPlayer?.sync();
        actionBusyRef.current = false;
      }, 250);
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
    if (idx === closeIndex) {
      onClose();
      return;
    }
    if (idx === seekIndex && track) premiumAction(() => spotify.seek(track.progressMs));
    if (idx >= deviceStart && idx < playlistStart) {
      const device = deviceCards[idx - deviceStart];
      if (device) {
        setSelectedDeviceId(device.id);
        premiumAction(() => spotify.transfer(device.id));
      }
    }
    if (idx >= playlistStart && idx < actionsCount) premiumAction((deviceId) => spotify.playContext(playlistCards[idx - playlistStart].uri, deviceId));
  };

  const navigate = (key: string) => {
    if (key === "Escape") {
      onClose();
      return;
    }
    if (key === "ArrowRight") setFocus(focusIdxRef.current + 1);
    if (key === "ArrowLeft") setFocus(focusIdxRef.current - 1);
    if (key === "ArrowDown") {
      const cols = getPlaylistCols();
      const idx = focusIdxRef.current;
      if (idx <= closeIndex) {
        // Transport row (including close) drops to the scrubber.
        setFocus(seekIndex);
      } else if (idx === seekIndex) {
        if (deviceCards.length > 0) setFocus(deviceStart);
        else if (playlistCards.length > 0) setFocus(playlistStart);
      } else if (idx < playlistStart) {
        if (playlistCards.length > 0) setFocus(playlistStart + Math.min(idx - deviceStart, cols - 1, playlistCards.length - 1));
      } else {
        setFocus(idx + cols);
      }
    }
    if (key === "ArrowUp") {
      const cols = getPlaylistCols();
      const idx = focusIdxRef.current;
      if (idx >= playlistStart + cols) setFocus(idx - cols);
      else if (idx >= playlistStart) {
        if (deviceCards.length > 0) setFocus(deviceStart + Math.min(idx - playlistStart, deviceCards.length - 1));
        else setFocus(seekIndex);
      } else if (idx >= deviceStart) setFocus(seekIndex);
      else if (idx === seekIndex) setFocus(2);
    }
    if (key === "Enter") runFocused();
  };
  // Latest-render navigation handler, read by the long-lived input effect so
  // re-renders (progress ticks, device refreshes, play state flips) do not
  // tear down the listeners and reset held-button/repeat state. Those resets
  // previously made a held stick read as a fresh press and skip controls.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    if (!open) return;
    let closed = false;
    const handle = (key: string) => {
      if (closed) return;
      if (key === "Escape") closed = true;
      navigateRef.current(key);
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
    // Match the main app's hold-repeat pacing instead of the helper's fast
    // defaults, so a firm stick push does not zip across the controls.
    const initialDelay = repeatSpeed === "slow" ? 800 : repeatSpeed === "fast" ? 400 : 600;
    const repeatDelay = repeatSpeed === "slow" ? 300 : repeatSpeed === "fast" ? 100 : 200;
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
        // Only one direction per frame, so a hard diagonal stick push cannot
        // fire two moves at once and skip over controls.
        let dirHandled = false;
        (Object.keys(state) as (keyof GpState)[]).forEach((key) => {
          const pressed = state[key];
          const wasPressed = last[key];
          if (key === "ArrowDown" || key === "ArrowUp" || key === "ArrowLeft" || key === "ArrowRight") {
            if (shouldHandleDirectionRepeat(key, state, last, now, pressTime, repeating, initialDelay, repeatDelay) && !dirHandled) {
              dirHandled = true;
              handle(key);
            }
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
  }, [open, repeatSpeed]); // eslint-disable-line react-hooks/exhaustive-deps

  const progressMs = seekDraft ?? track?.progressMs ?? 0;
  const commitSeek = () => {
    if (!track || seekDraft == null) return;
    spotify.seek(seekDraft);
    setSeekDraft(null);
  };
  const premiumHint = spotify.requiresPremium ? t("spotify.premiumHint") : null;
  const noDeviceHint = spotify.error?.key === "noDevice" ? t("spotify.errors.noDevice") : null;
  const errorText = spotify.error && spotify.error.key !== "noDevice"
    ? t(`spotify.errors.${spotify.error.key}`, { message: spotify.error.message ?? "" })
    : null;
  const webPlayerStatus = webPlayer?.error
    ? t("spotify.localDeviceError", { message: webPlayer.error })
    : webPlayer?.ready
    ? t("spotify.localDeviceReady")
    : webPlayer
    ? t("spotify.localDeviceConnecting")
    : null;

  const controlButton = (idx: number, label: string, icon: ReactNode, onClick: () => void, active = false) => {
    const focused = focusIdx === idx;
    return (
      <button
        type="button"
        ref={registerFocus(idx)}
        title={label}
        onClick={onClick}
        onMouseMove={() => setFocus(idx)}
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
      <div ref={contentRef} style={{ padding: 24, display: "grid", gap: 20 }}>
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
              <button type="button" ref={registerFocus(closeIndex)} onClick={onClose} onMouseMove={() => setFocus(closeIndex)} style={{
                marginLeft: "auto",
                width: 42,
                height: 42,
                borderRadius: surfaceStyle === "win9x" || surfaceStyle === "cyberpunk" ? 0 : 12,
                border: `1px solid ${focusIdx === closeIndex ? accent.primary : isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)"}`,
                background: focusIdx === closeIndex ? `${accent.glow}0.16)` : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                color: theme.text,
                cursor: "pointer",
              }}>
                <IoClose size={20} />
              </button>
            </div>

            <div style={{ marginTop: 22 }}>
              <input
                type="range"
                ref={registerFocus(seekIndex)}
                min={0}
                max={track?.durationMs ?? 1}
                value={progressMs}
                disabled={spotify.requiresPremium || !track}
                onMouseMove={() => setFocus(seekIndex)}
                onChange={(event) => setSeekDraft(Number(event.target.value))}
                onPointerUp={commitSeek}
                onPointerCancel={() => setSeekDraft(null)}
                onKeyUp={(event) => {
                  if (event.key === "Enter" || event.key === " ") commitSeek();
                }}
                style={{ width: "100%", accentColor: accent.primary }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", color: focusIdx === seekIndex ? accent.primary : theme.textFaint, fontSize: 11, marginTop: 4 }}>
                <span>{formatTime(progressMs)}</span>
                <span>{track ? formatTime(track.durationMs) : "0:00"}</span>
              </div>
            </div>
          </div>
        </div>

        {deviceCards.length > 0 && (
          <div ref={deviceSectionRef}>
            <div style={{ fontSize: 13, fontWeight: 800, color: theme.text, marginBottom: 10 }}>{t("spotify.devices")}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {deviceCards.map((device, idx) => {
                const focusIndex = deviceStart + idx;
                const focused = focusIdx === focusIndex;
                const selected = selectedDeviceId === device.id || (!selectedDeviceId && preferredDeviceId === device.id);
                return (
                  <button
                    type="button"
                    ref={registerFocus(focusIndex)}
                    key={device.id}
                    title={t("spotify.selectDevice", { name: device.name })}
                    onClick={() => {
                      setSelectedDeviceId(device.id);
                      premiumAction(() => spotify.transfer(device.id));
                    }}
                    onMouseMove={() => setFocus(focusIndex)}
                    style={{
                      minWidth: 140,
                      maxWidth: 220,
                      display: "grid",
                      gridTemplateColumns: "auto minmax(0, 1fr)",
                      alignItems: "center",
                      gap: 9,
                      padding: "9px 11px",
                      borderRadius: surfaceStyle === "win9x" || surfaceStyle === "cyberpunk" ? 0 : 8,
                      border: `1px solid ${focused || selected ? accent.primary : isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)"}`,
                      background: selected ? `${accent.glow}0.18)` : focused ? `${accent.glow}0.12)` : isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                      color: theme.text,
                      cursor: "pointer",
                      boxShadow: focused ? `0 0 18px ${accent.glow}0.18)` : undefined,
                    }}
                  >
                    <IoVolumeHighOutline size={16} color={selected ? accent.primary : theme.textDim} />
                    <span style={{ minWidth: 0, display: "grid", gap: 1 }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, fontWeight: 800 }}>{device.name}</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10, color: theme.textDim }}>
                        {device.is_active ? t("spotify.deviceActive") : selected ? t("spotify.deviceSelected") : device.type}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div ref={playlistSectionRef}>
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
                const focusIndex = playlistStart + idx;
                const focus = focusIdx === focusIndex;
                return (
                  <button
                    type="button"
                    ref={registerFocus(focusIndex)}
                    key={playlist.id}
                    onClick={() => premiumAction((deviceId) => spotify.playContext(playlist.uri, deviceId))}
                    onMouseMove={() => setFocus(focusIndex)}
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
          {webPlayerStatus && <span>{webPlayerStatus}</span>}
          <span>{activeDevice ? t("spotify.device", { name: activeDevice.name, type: activeDevice.type }) : t("spotify.noActiveDevice")}</span>
        </div>
      </div>
    </ModalShell>
  );
}
