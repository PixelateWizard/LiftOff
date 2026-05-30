import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoPower, IoRefresh } from "react-icons/io5";
import { getBestGamepad, readGpState, shouldHandleDirectionRepeat, type GpState } from "../../utils/gamepad";
import { useTheme } from "../../contexts/ThemeContext";
import ModalShell from "./ModalShell";

interface PowerModalProps {
  onClose: () => void;
  onRestartApp: () => void;
  onExitApp: () => void;
}

export default function PowerModal({ onClose, onRestartApp, onExitApp }: PowerModalProps) {
  const { accent, theme, isDark } = useTheme();
  const { t } = useTranslation();
  const [focusIdx, setFocusIdx] = useState(0);
  const focusIdxRef = useRef(0);

  const actions = [
    { key: "restart_app", label: t("power.restartApp"), run: onRestartApp, icon: <IoRefresh size={18} /> },
    { key: "exit_app", label: t("power.exitApp"), run: onExitApp, danger: true, icon: <IoPower size={18} /> },
  ];
  const actionsRef = useRef(actions);
  useEffect(() => { actionsRef.current = actions; });

  useEffect(() => {
    let closed = false;

    const execute = (i: number) => {
      const action = actionsRef.current[i];
      if (!action) return;
      closed = true;
      action.run();
      onClose();
    };

    const handle = (key: string) => {
      if (closed) return;
      const total = actionsRef.current.length;
      if (key === "ArrowDown" || key === "ArrowRight") {
        const next = Math.min(focusIdxRef.current + 1, total - 1);
        setFocusIdx(next);
        focusIdxRef.current = next;
      } else if (key === "ArrowUp" || key === "ArrowLeft") {
        const next = Math.max(focusIdxRef.current - 1, 0);
        setFocusIdx(next);
        focusIdxRef.current = next;
      } else if (key === "Enter") {
        execute(focusIdxRef.current);
      } else if (key === "Escape") {
        closed = true;
        onClose();
      }
    };

    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, string> = {
        ArrowDown: "ArrowDown", ArrowUp: "ArrowUp",
        ArrowLeft: "ArrowLeft", ArrowRight: "ArrowRight",
        Enter: "Enter", Escape: "Escape", " ": "Enter",
      };
      if (map[e.key]) {
        e.preventDefault();
        e.stopPropagation();
        handle(map[e.key]);
      }
    };
    window.addEventListener("keydown", onKey, true);

    let rafId: number;
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const shortcuts = [
    { btn: "A", label: t("common.select") },
    { btn: "B", label: t("common.cancel") },
  ];

  return (
    <ModalShell title={t("power.title")} shortcuts={shortcuts} width={400} zIndex={8600} onOverlayClick={onClose}>
      <div style={{ padding: "8px 0" }}>
        {actions.map((action, i) => {
          const focused = focusIdx === i;
          const color = action.danger ? "#e85a5a" : accent.primary;
          return (
            <div
              key={action.key}
              onClick={() => { setFocusIdx(i); focusIdxRef.current = i; action.run(); onClose(); }}
              onMouseEnter={() => { setFocusIdx(i); focusIdxRef.current = i; }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 24px",
                cursor: "pointer",
                background: focused
                  ? (action.danger ? "rgba(232,90,90,0.12)" : `${accent.glow}0.12)`)
                  : "transparent",
                borderLeft: `3px solid ${focused ? color : "transparent"}`,
                transition: "background 0.1s, border-color 0.1s",
              }}
            >
              <div style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: focused ? color : theme.textDim,
                background: focused ? `${action.danger ? "rgba(232,90,90," : accent.glow}0.18)` : (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"),
              }}>
                {action.icon}
              </div>
              <div style={{
                flex: 1,
                fontSize: 13,
                fontWeight: 600,
                color: action.danger ? "#e85a5a" : focused ? theme.text : theme.textDim,
              }}>
                {action.label}
              </div>
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}
