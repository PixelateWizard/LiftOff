import { useEffect } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { ACCOUNT_DIALOG_Z, modalSurfaceStyle } from "../modals/modalStyles";
import { getBestGamepad, readGpState, type GpState } from "../../utils/gamepad";
import { QRCodeSVG } from "qrcode.react";
import { IoClose, IoRefresh } from "react-icons/io5";
import type { CSSProperties } from "react";
import type { AccentColors, ThemeColors } from "../../types";

export type SteamQrPhase = "idle" | "starting" | "waiting" | "confirmed" | "expired" | "success" | "error";

interface SteamQrModalProps {
  open: boolean;
  phase: SteamQrPhase;
  qrUrl: string;
  error?: string;
  accent: AccentColors;
  theme: ThemeColors;
  isDark: boolean;
  surfaceStyle: string;
  glass: CSSProperties;
  onBegin: () => void;
  onClose: () => void;
  t: (key: string, options?: any) => string;
}

export function SteamQrModal({
  open,
  phase,
  qrUrl,
  error,
  accent,
  theme,
  isDark,
  surfaceStyle,
  onBegin,
  onClose,
  t,
}: SteamQrModalProps) {
  const themeValue = useTheme();
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Enter" && (phase === "expired" || phase === "error")) onBegin();
    };
    window.addEventListener("keydown", onKeyDown);
    let rafId = 0;
    let enterReleased = false;
    let escapeReleased = false;
    const last: Partial<GpState> = {};
    const poll = () => {
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
        if (state.Escape && !last.Escape) onClose();
        if (state.Enter && !last.Enter && (phase === "expired" || phase === "error")) onBegin();
        Object.assign(last, state);
      }
      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(rafId);
    };
  }, [open, phase, onBegin, onClose]);

  if (!open) return null;

  const isPixel = surfaceStyle === "win9x";
  const primaryText = accent.darkText ? "#161616" : "#fff";
  const phaseText =
    phase === "starting" ? t("steam.qrStarting") :
    phase === "confirmed" ? t("steam.qrConfirmed") :
    phase === "expired" ? t("steam.qrExpired") :
    phase === "error" ? (error || t("steam.qrError")) :
    t("steam.qrWaiting");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: ACCOUNT_DIALOG_Z,
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
      role="dialog"
      aria-modal="true"
      aria-label={t("steam.qrTitle")}
    >
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: isDark ? "rgba(0,0,0,0.58)" : "rgba(10,16,24,0.38)" }} />
      <div data-modal="steam-qr"
        style={{
          width: "min(520px, 100%)",
          ...modalSurfaceStyle(themeValue),
          padding: 24,
          position: "relative",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close", "Close")}
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            width: 34,
            height: 34,
            display: "grid",
            placeItems: "center",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)"}`,
            background: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.58)",
            color: theme.text,
            borderRadius: isPixel ? 0 : 10,
            cursor: "pointer",
          }}
        >
          <IoClose size={18} />
        </button>

        <div style={{ paddingRight: 34 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: theme.text }}>{t("steam.qrTitle")}</div>
          <div style={{ fontSize: 12, color: theme.textDim, marginTop: 6, lineHeight: 1.5 }}>
            {t("steam.qrIntro")}
          </div>
        </div>

        <div
          style={{
            margin: "22px auto 18px",
            width: 248,
            height: 248,
            display: "grid",
            placeItems: "center",
            background: "#fff",
            borderRadius: isPixel ? 0 : 14,
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)",
          }}
        >
          {qrUrl ? (
            <QRCodeSVG value={qrUrl} size={214} level="M" includeMargin={false} />
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: "50%", border: `4px solid ${accent.primary}`, borderTopColor: "transparent" }} />
          )}
        </div>

        <div style={{ textAlign: "center", color: phase === "error" ? "#ff8d8d" : phase === "confirmed" ? accent.primary : theme.textDim, fontSize: 13, fontWeight: 700 }}>
          {phaseText}
        </div>
        <div style={{ textAlign: "center", color: theme.textFaint, fontSize: 11, lineHeight: 1.5, marginTop: 8 }}>
          {t("steam.qrSecurity")}
        </div>

        {(phase === "expired" || phase === "error") && (
          <button
            type="button"
            onClick={onBegin}
            style={{
              margin: "18px auto 0",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              border: `1px solid ${accent.primary}`,
              background: accent.primary,
              color: primaryText,
              borderRadius: isPixel ? 0 : 10,
              padding: "11px 14px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            <IoRefresh size={17} />
            {t("steam.newCode")}
          </button>
        )}
      </div>
    </div>
  );
}
