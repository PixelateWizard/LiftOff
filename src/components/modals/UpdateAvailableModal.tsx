import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { IoCloudDownloadOutline, IoTimeOutline, IoCloseCircleOutline } from "react-icons/io5";
import { getBestGamepad, readGpState, type GpState } from "../../utils/gamepad";
import { useTheme } from "../../contexts/ThemeContext";
import ModalShell from "./ModalShell";
import type { UpdateRelease } from "../../hooks/useUpdateCheck";

interface UpdateAvailableModalProps {
  release: UpdateRelease;
  currentVersion: string;
  channel: string;
  onClose: () => void;
  onSkipVersion: () => void;
}

export default function UpdateAvailableModal({
  release,
  currentVersion,
  channel,
  onClose,
  onSkipVersion,
}: UpdateAvailableModalProps) {
  const { accent, theme, isDark } = useTheme();
  const { t } = useTranslation();
  const [focusIdx, setFocusIdx] = useState(0);
  const focusIdxRef = useRef(0);

  const openReleasePage = () => {
    invoke("launch_app", {
      path: release.htmlUrl,
      id: "liftoff_update",
      name: "LiftOff Release",
      appType: "app",
      source: "",
      runAsAdmin: false,
    }).catch(() => {});
  };

  const actions = [
    {
      key: "download",
      label: t("update.download"),
      run: openReleasePage,
      icon: <IoCloudDownloadOutline size={18} />,
    },
    {
      key: "later",
      label: t("update.later"),
      run: () => {},
      icon: <IoTimeOutline size={18} />,
    },
    {
      key: "skip",
      label: t("update.skip"),
      run: onSkipVersion,
      icon: <IoCloseCircleOutline size={18} />,
    },
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
        // B behaves as "remind me later": dismiss without persisting a skip.
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
    let enterReleased = false;
    let escapeReleased = false;

    const poll = () => {
      if (closed) return;
      const gp = getBestGamepad();
      if (gp) {
        const base = readGpState(gp);
        // Latch until released, so a button held when the modal appeared
        // cannot immediately trigger an action the user never intended.
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
          if (pressed && !wasPressed) handle(key);
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

  const channelLabel = channel === "prerelease"
    ? t("update.channelPrerelease")
    : t("update.channelStable");

  return (
    <ModalShell
      title={t("update.availableTitle")}
      shortcuts={shortcuts}
      width={440}
      zIndex={8600}
      onOverlayClick={onClose}
    >
      <div style={{ padding: "16px 24px 4px" }}>
        <div style={{
          fontSize: 15,
          fontWeight: 700,
          color: theme.text,
          marginBottom: 6,
        }}>
          {t("update.availableBody", { version: release.version })}
        </div>
        <div style={{ fontSize: 12, color: theme.textDim, marginBottom: 10 }}>
          {t("update.currentVersion", { version: currentVersion })}
        </div>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "3px 10px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 600,
          color: accent.primary,
          background: `${accent.glow}0.14)`,
          border: `1px solid ${accent.glow}0.3)`,
        }}>
          {channelLabel}
        </div>
      </div>

      <div style={{ padding: "10px 0 8px" }}>
        {actions.map((action, i) => {
          const focused = focusIdx === i;
          const color = accent.primary;
          return (
            <div
              key={action.key}
              onClick={() => {
                setFocusIdx(i);
                focusIdxRef.current = i;
                action.run();
                onClose();
              }}
              onMouseEnter={() => { setFocusIdx(i); focusIdxRef.current = i; }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 24px",
                cursor: "pointer",
                background: focused ? `${accent.glow}0.12)` : "transparent",
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
                background: focused
                  ? `${accent.glow}0.18)`
                  : (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"),
              }}>
                {action.icon}
              </div>
              <div style={{
                flex: 1,
                fontSize: 13,
                fontWeight: 600,
                color: focused ? theme.text : theme.textDim,
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
