import { useEffect, useRef, useState } from "react";
import { IoPersonCircleOutline, IoWifiOutline } from "react-icons/io5";
import ModalShell from "../modals/ModalShell";
import { useTheme } from "../../contexts/ThemeContext";
import { getBestGamepad, readGpState, shouldHandleDirectionRepeat, type GpState } from "../../utils/gamepad";

export type XboxAuthPhase = "idle" | "waiting" | "error";

interface XboxConnectGuideProps {
  open: boolean;
  phase: XboxAuthPhase;
  error?: string;
  onBegin: () => void;
  onClose: () => void;
  t: (key: string, options?: any) => string;
}

export function XboxConnectGuide({
  open,
  phase,
  error,
  onBegin,
  onClose,
  t,
}: XboxConnectGuideProps) {
  const { accent, theme, isDark, surfaceStyle } = useTheme();
  const [focusIdx, setFocusIdx] = useState(0);
  const focusIdxRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    focusIdxRef.current = 0;
    setFocusIdx(0);
  }, [open]);

  const setFocus = (idx: number) => {
    focusIdxRef.current = idx;
    setFocusIdx(idx);
  };

  const actions = [
    () => {
      if (phase !== "waiting") onBegin();
    },
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
  }, [open, onBegin, onClose, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const isPixel = surfaceStyle === "win9x";
  const isCyber = surfaceStyle === "cyberpunk";
  const buttonRadius = isPixel || isCyber ? 0 : 8;
  const primaryText = accent.darkText ? "#161616" : "#fff";
  const statusText =
    phase === "waiting" ? t("xbox.waitingForBrowser") :
    phase === "error" ? (error || t("xbox.connectFailed")) :
    "";

  return (
    <ModalShell
      title={t("xbox.title")}
      shortcuts={[
        { btn: "A", label: t("common.select") },
        { btn: "B", label: t("common.cancel") },
      ]}
      width={560}
      zIndex={8700}
      onOverlayClick={onClose}
    >
      <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: isPixel || isCyber ? 0 : 12,
              display: "grid",
              placeItems: "center",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.11)"}`,
              background: isDark ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.045)",
              color: accent.primary,
              flexShrink: 0,
            }}
          >
            <IoPersonCircleOutline size={25} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: theme.text }}>
              {t("xbox.guideIntro")}
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: theme.textDim, marginTop: 7 }}>
              {t("xbox.securityHint")}
            </div>
          </div>
        </div>

        {statusText && (
          <div style={{ fontSize: 12, color: phase === "error" ? "#ff8a8a" : theme.textDim, fontWeight: 700 }}>
            {statusText}
          </div>
        )}

        <button
          type="button"
          disabled={phase === "waiting"}
          onClick={onBegin}
          onMouseEnter={() => setFocus(0)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            border: `1px solid ${focusIdx === 0 ? accent.primary : "transparent"}`,
            background: accent.primary,
            color: primaryText,
            borderRadius: buttonRadius,
            padding: "11px 14px",
            fontWeight: 800,
            fontSize: 13,
            cursor: phase === "waiting" ? "default" : "pointer",
            opacity: phase === "waiting" ? 0.72 : 1,
          }}
        >
          <IoWifiOutline size={16} />
          {phase === "waiting" ? t("xbox.waitingForBrowser") : t("xbox.connect")}
        </button>
      </div>
    </ModalShell>
  );
}
