import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getBestGamepad, readGpState, type GpState } from "../../utils/gamepad";
import ModalShell from "./ModalShell";
import { useTheme } from "../../contexts/ThemeContext";

interface Props {
  tab: string;
  onAddFile: () => void;
  onAddFolder: () => void;
  onManage: () => void;
  onCollections: () => void;
  onClose: () => void;
}

export default function LibraryActionsModal({ tab, onAddFile, onAddFolder, onManage, onCollections, onClose }: Props) {
  const { accent, theme, isDark } = useTheme();
  const { t } = useTranslation();
  const [focusIdx, setFocusIdx] = useState(0);
  const focusIdxRef = useRef(0);

  const isGames = tab === "Games";

  const actions = [
    {
      key: "add_file",
      label: isGames ? t("addEntry.addGame") : t("addEntry.addApp"),
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="2" y="1" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M9 5.5v7M5.5 9h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      action: onAddFile,
    },
    {
      key: "add_folder",
      label: t("addEntry.addFolder"),
      icon: (
        <svg width="18" height="16" viewBox="0 0 18 16" fill="none">
          <path d="M1 4.5a1 1 0 011-1h4.2l1.5 1.7H16a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1V4.5z" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M9 7.5v3M7.5 9h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      ),
      action: onAddFolder,
    },
    {
      key: "manage",
      label: isGames ? t("hideModal.manageGames") : t("hideModal.manageApps"),
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="2" y="4" width="14" height="2" rx="1" fill="currentColor"/>
          <rect x="2" y="8" width="14" height="2" rx="1" fill="currentColor"/>
          <rect x="2" y="12" width="14" height="2" rx="1" fill="currentColor"/>
        </svg>
      ),
      action: onManage,
    },
    {
      key: "collections",
      label: isGames ? t("collections.manageGames") : t("collections.manageApps"),
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="1" y="1" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.3"/>
          <rect x="10" y="1" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.3"/>
          <rect x="1" y="10" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.3"/>
          <rect x="10" y="10" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.3"/>
        </svg>
      ),
      action: onCollections,
    },
  ];

  const actionsRef = useRef(actions);
  useEffect(() => { actionsRef.current = actions; });

  useEffect(() => {
    let closed = false;

    const execute = (i: number) => {
      const a = actionsRef.current[i];
      if (!a) return;
      closed = true;
      onClose();
      a.action();
    };

    const handle = (key: string) => {
      if (closed) return;
      const total = actionsRef.current.length;
      if (key === "ArrowDown" || key === "ArrowRight") {
        const ni = Math.min(focusIdxRef.current + 1, total - 1);
        setFocusIdx(ni); focusIdxRef.current = ni;
      } else if (key === "ArrowUp" || key === "ArrowLeft") {
        const ni = Math.max(focusIdxRef.current - 1, 0);
        setFocusIdx(ni); focusIdxRef.current = ni;
      } else if (key === "Enter") {
        execute(focusIdxRef.current);
      } else if (key === "Escape") {
        closed = true; onClose();
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (closed) return;
      const map: Record<string, string> = {
        ArrowDown: "ArrowDown", ArrowUp: "ArrowUp",
        ArrowLeft: "ArrowLeft", ArrowRight: "ArrowRight",
        Enter: "Enter", Escape: "Escape", " ": "Enter",
      };
      if (map[e.key]) { e.preventDefault(); e.stopPropagation(); handle(map[e.key]); }
    };
    window.addEventListener("keydown", onKey, true);

    let rAF: number;
    const lastBtn: Partial<GpState> = {};
    const pressTime: Record<string, number> = {};
    const repeating: Record<string, boolean> = {};
    const DIRS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
    const INIT_MS = 350;
    const RPT_MS  = 100;
    let enterReleased = false;

    const poll = (now: number) => {
      if (closed) return;
      const gp = getBestGamepad();
      if (gp) {
        const base = readGpState(gp);
        if (!base.Enter) enterReleased = true;
        const state = { ...base, Enter: enterReleased && base.Enter };
        Object.keys(state).forEach(k => {
          const pressed = state[k as keyof GpState];
          const was = lastBtn[k as keyof GpState];
          if (pressed && !was) {
            handle(k); pressTime[k] = now; repeating[k] = false;
          } else if (pressed && was && DIRS.has(k)) {
            const held = now - (pressTime[k] || now);
            if (!repeating[k] && held >= INIT_MS) { repeating[k] = true; pressTime[k] = now; handle(k); }
            else if (repeating[k] && held >= RPT_MS) { pressTime[k] = now; handle(k); }
          } else if (!pressed && was) {
            pressTime[k] = 0; repeating[k] = false;
          }
          lastBtn[k as keyof GpState] = pressed;
        });
      }
      rAF = requestAnimationFrame(poll);
    };
    rAF = requestAnimationFrame(poll);

    return () => { closed = true; window.removeEventListener("keydown", onKey, true); cancelAnimationFrame(rAF); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const shortcuts = [
    { btn: "A",   label: t("common.select") },
    { btn: "B",   label: t("common.cancel") },
  ];

  return (
    <ModalShell
      title={isGames ? t("hideModal.manageGames") : t("hideModal.manageApps")}
      shortcuts={shortcuts}
      width={400}
      zIndex={8500}
      onOverlayClick={onClose}
    >
      <div style={{ padding: "8px 0" }}>
        {actions.map((action, i) => {
          const focused = focusIdx === i;
          return (
            <div
              key={action.key}
              onClick={() => { setFocusIdx(i); focusIdxRef.current = i; onClose(); action.action(); }}
              style={{
                display: "flex", alignItems: "center", gap: 16,
                padding: "14px 24px", cursor: "pointer",
                background: focused ? `${accent.glow}0.12)` : "transparent",
                borderLeft: `3px solid ${focused ? accent.primary : "transparent"}`,
                transition: "all 0.1s ease",
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: focused ? `${accent.glow}0.18)` : (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"),
                display: "flex", alignItems: "center", justifyContent: "center",
                color: focused ? accent.primary : theme.textDim,
                transition: "all 0.1s ease",
              }}>
                {action.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: focused ? theme.text : theme.textDim }}>
                  {action.label}
                </div>
              </div>
              {focused && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: accent.primary, flexShrink: 0 }}>
                  <path d="M4 7h6M7 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}
