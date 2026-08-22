import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoHardwareChipOutline, IoPower, IoPowerOutline, IoRefresh, IoRefreshCircle } from "react-icons/io5";
import { getBestGamepad, readGpState, shouldHandleDirectionRepeat, type GpState } from "../../utils/gamepad";
import { useTheme } from "../../contexts/ThemeContext";
import ModalShell from "./ModalShell";
import ConfirmModal from "./ConfirmModal";

interface PowerModalProps {
  onClose: () => void;
  onRestartApp: () => void;
  onExitApp: () => void;
  onRestartDevice: () => void;
  onShutdownDevice: () => void;
}

export default function PowerModal({
  onClose,
  onRestartApp,
  onExitApp,
  onRestartDevice,
  onShutdownDevice,
}: PowerModalProps) {
  const { accent, theme, isDark } = useTheme();
  const { t } = useTranslation();
  const [focusIdx, setFocusIdx] = useState(0);
  const focusIdxRef = useRef(0);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const confirmKeyRef = useRef<string | null>(null);
  const suppressAfterConfirmRef = useRef(false);
  const closedRef = useRef(false);

  const actions = [
    {
      key: "restart_app",
      group: "app" as const,
      label: t("power.restartApp"),
      run: onRestartApp,
      icon: <IoRefresh size={18} />,
    },
    {
      key: "exit_app",
      group: "app" as const,
      label: t("power.exitApp"),
      run: onExitApp,
      danger: true,
      icon: <IoPower size={18} />,
    },
    {
      key: "restart_device",
      group: "device" as const,
      label: t("power.restartDevice"),
      run: onRestartDevice,
      danger: true,
      icon: <IoRefreshCircle size={18} />,
      confirm: {
        message: t("power.confirmRestartDevice"),
        label: t("power.confirmRestartAction"),
      },
    },
    {
      key: "shutdown_device",
      group: "device" as const,
      label: t("power.shutdownDevice"),
      run: onShutdownDevice,
      danger: true,
      icon: <IoPowerOutline size={18} />,
      confirm: {
        message: t("power.confirmShutdownDevice"),
        label: t("power.confirmShutdownAction"),
      },
    },
  ];
  const actionsRef = useRef(actions);
  useEffect(() => { actionsRef.current = actions; });

  const execute = (i: number) => {
    const action = actionsRef.current[i];
    if (!action) return;
    if (action.confirm) {
      // Hand control to the nested ConfirmModal. This modal's poll gates on
      // confirmKeyRef so the two RAF loops never read the same button press.
      setConfirmKey(action.key);
      confirmKeyRef.current = action.key;
      return;
    }
    closedRef.current = true;
    action.run();
    onClose();
  };

  useEffect(() => {
    closedRef.current = false;

    const handle = (key: string) => {
      if (closedRef.current) return;
      if (confirmKeyRef.current) return;
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
        closedRef.current = true;
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
      if (closedRef.current) return;
      if (confirmKeyRef.current) {
        rafId = requestAnimationFrame(poll);
        return;
      }
      const gp = getBestGamepad();
      if (suppressAfterConfirmRef.current) {
        if (gp) {
          const state = readGpState(gp);
          Object.assign(last, state);
          if (!state.Enter && !state.Escape) suppressAfterConfirmRef.current = false;
        } else {
          suppressAfterConfirmRef.current = false;
        }
        rafId = requestAnimationFrame(poll);
        return;
      }
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
      closedRef.current = true;
      window.removeEventListener("keydown", onKey, true);
      cancelAnimationFrame(rafId);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const shortcuts = [
    { btn: "A", label: t("common.select") },
    { btn: "B", label: t("common.cancel") },
  ];

  return (
    <>
    <ModalShell title={t("power.title")} shortcuts={shortcuts} width={400} zIndex={8600} onOverlayClick={onClose}>
      <div style={{ padding: "8px 0" }}>
        {actions.map((action, i) => {
          const focused = focusIdx === i;
          const color = action.danger ? "#e85a5a" : accent.primary;
          const groupHeader = i === 0 || actions[i - 1].group !== action.group;
          return (
            <div key={action.key}>
            {groupHeader && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: i === 0 ? "2px 24px 8px" : "16px 24px 8px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: theme.textFaint,
              }}>
                {action.group === "device" && <IoHardwareChipOutline size={12} />}
                {action.group === "device" ? t("power.groupDevice") : t("power.groupApp")}
              </div>
            )}
            <div
              onClick={() => { setFocusIdx(i); focusIdxRef.current = i; execute(i); }}
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
            </div>
          );
        })}
      </div>
    </ModalShell>

    {confirmKey && (() => {
      const pending = actions.find((action) => action.key === confirmKey);
      if (!pending || !pending.confirm) return null;
      return (
        <ConfirmModal
          message={pending.confirm.message}
          confirmLabel={pending.confirm.label}
          zIndex={8700}
          onConfirm={() => {
            setConfirmKey(null);
            confirmKeyRef.current = null;
            closedRef.current = true;
            pending.run();
            onClose();
          }}
          onCancel={() => {
            setConfirmKey(null);
            confirmKeyRef.current = null;
            // Wait for the confirm/cancel button to be released before the
            // power menu resumes reading gamepad input.
            suppressAfterConfirmRef.current = true;
          }}
        />
      );
    })()}
    </>
  );
}
