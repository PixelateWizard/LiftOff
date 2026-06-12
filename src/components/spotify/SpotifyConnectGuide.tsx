import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { openUrl } from "@tauri-apps/plugin-opener";
import { IoClipboardOutline, IoOpenOutline, IoWifiOutline } from "react-icons/io5";
import ModalShell from "../modals/ModalShell";
import { useTheme } from "../../contexts/ThemeContext";
import { getBestGamepad, readGpState, shouldHandleDirectionRepeat, type GpState } from "../../utils/gamepad";
import type { SpotifyController } from "../../hooks/useSpotify";
import { SPOTIFY_DASHBOARD_URL, SPOTIFY_REDIRECT_URI } from "./constants";

interface SpotifyConnectGuideProps {
  open: boolean;
  spotify: SpotifyController;
  onClose: () => void;
}

export function SpotifyConnectGuide({ open, spotify, onClose }: SpotifyConnectGuideProps) {
  const { t } = useTranslation();
  const { accent, theme, isDark, surfaceStyle } = useTheme();
  const [clientId, setClientId] = useState("");
  const [focusIdx, setFocusIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const focusIdxRef = useRef(0);
  const clientInputRef = useRef<HTMLInputElement | null>(null);
  const clientIdRef = useRef("");

  useEffect(() => {
    clientIdRef.current = clientId;
  }, [clientId]);

  useEffect(() => {
    if (!open) return;
    setFocusIdx(0);
    focusIdxRef.current = 0;
    setLocalError(null);
  }, [open]);

  const setFocus = (idx: number) => {
    focusIdxRef.current = idx;
    setFocusIdx(idx);
  };

  const copyRedirect = async () => {
    try {
      await navigator.clipboard.writeText(SPOTIFY_REDIRECT_URI);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setLocalError(t("spotify.copyFailed"));
    }
  };

  const connect = async () => {
    const id = clientIdRef.current.trim();
    if (!id) {
      setLocalError(t("spotify.clientIdRequired"));
      return;
    }
    try {
      setLocalError(null);
      await spotify.connect(id);
      onClose();
    } catch (err) {
      setLocalError(String(err ?? t("spotify.connectFailed")));
    }
  };

  const actions = [
    () => openUrl(SPOTIFY_DASHBOARD_URL).catch(() => setLocalError(t("spotify.dashboardFailed"))),
    copyRedirect,
    () => clientInputRef.current?.focus(),
    connect,
  ];

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
      if (key === "ArrowDown" || key === "ArrowRight") setFocus(Math.min(focusIdxRef.current + 1, actions.length - 1));
      if (key === "ArrowUp" || key === "ArrowLeft") setFocus(Math.max(focusIdxRef.current - 1, 0));
      if (key === "Enter") actions[focusIdxRef.current]?.();
    };
    const onKey = (event: KeyboardEvent) => {
      const active = document.activeElement;
      if (active === clientInputRef.current && event.key !== "Escape") return;
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
  }, [open, onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const buttonStyle = (idx: number, filled = false) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: `1px solid ${focusIdx === idx ? accent.primary : isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)"}`,
    background: filled
      ? accent.primary
      : focusIdx === idx
      ? `${accent.glow}0.14)`
      : isDark
      ? "rgba(255,255,255,0.06)"
      : "rgba(0,0,0,0.045)",
    color: filled ? (accent.darkText ? "#161616" : "#fff") : theme.text,
    borderRadius: surfaceStyle === "win9x" || surfaceStyle === "cyberpunk" ? 0 : 8,
    padding: "9px 12px",
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
    boxShadow: focusIdx === idx && !filled ? `0 0 18px ${accent.glow}0.20)` : undefined,
  });

  const steps = [1, 2, 3].map((step) => t(`spotify.guideStep${step}`));

  return (
    <ModalShell
      title={t("spotify.connectTitle")}
      shortcuts={[
        { btn: "A", label: t("common.select") },
        { btn: "B", label: t("common.cancel") },
      ]}
      width={620}
      zIndex={8700}
      onOverlayClick={onClose}
    >
      <div style={{ padding: "18px 24px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: theme.textDim }}>{t("spotify.guideIntro")}</div>
        <div style={{ display: "grid", gap: 10 }}>
          {steps.map((label, idx) => (
            <div key={idx} style={{ display: "flex", gap: 10, alignItems: "flex-start", color: theme.text }}>
              <span style={{ color: accent.primary, fontWeight: 800, minWidth: 18 }}>{idx + 1}</span>
              <span style={{ fontSize: 13, lineHeight: 1.45 }}>{label}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => openUrl(SPOTIFY_DASHBOARD_URL).catch(() => setLocalError(t("spotify.dashboardFailed")))} onMouseEnter={() => setFocus(0)} style={buttonStyle(0)}>
            <IoOpenOutline size={16} />
            {t("spotify.openDashboard")}
          </button>
          <button type="button" onClick={copyRedirect} onMouseEnter={() => setFocus(1)} style={buttonStyle(1)}>
            <IoClipboardOutline size={16} />
            {copied ? t("spotify.copied") : t("spotify.copyRedirect")}
          </button>
        </div>
        <div style={{ padding: 12, borderRadius: surfaceStyle === "win9x" || surfaceStyle === "cyberpunk" ? 0 : 8, background: isDark ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.04)", border: `1px solid ${isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)"}` }}>
          <div style={{ fontSize: 10, color: theme.textFaint, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{t("spotify.redirectUri")}</div>
          <code style={{ fontSize: 13, color: accent.primary, userSelect: "text" }}>{SPOTIFY_REDIRECT_URI}</code>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: focusIdx === 2 ? accent.primary : theme.textDim }}>{t("spotify.clientId")}</span>
          <input
            ref={clientInputRef}
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            onFocus={() => setFocus(2)}
            placeholder={t("spotify.clientIdPlaceholder")}
            spellCheck={false}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: isDark ? "rgba(0,0,0,0.24)" : "rgba(255,255,255,0.76)",
              color: theme.text,
              border: `1px solid ${focusIdx === 2 ? accent.primary : isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.14)"}`,
              outline: "none",
              borderRadius: surfaceStyle === "win9x" || surfaceStyle === "cyberpunk" ? 0 : 8,
              padding: "10px 12px",
              fontFamily: "'Segoe UI', sans-serif",
              fontSize: 13,
            }}
          />
        </label>
        {(localError || spotify.error) && (
          <div style={{ fontSize: 12, color: "#ff8a8a" }}>
            {localError ?? t(`spotify.errors.${spotify.error?.key}`, { message: spotify.error?.message ?? "" })}
          </div>
        )}
        <button type="button" disabled={spotify.connecting} onClick={connect} onMouseEnter={() => setFocus(3)} style={{ ...buttonStyle(3, true), justifyContent: "center", opacity: spotify.connecting ? 0.72 : 1 }}>
          <IoWifiOutline size={16} />
          {spotify.connecting ? t("spotify.waitingForBrowser") : t("spotify.connect")}
        </button>
      </div>
    </ModalShell>
  );
}
