import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { getBestGamepad, readGpState, type GpState } from "../../utils/gamepad";
import ModalShell from "./ModalShell";
import { useTheme } from "../../contexts/ThemeContext";
import type { App } from "../../types";

interface MenuItem {
  label: string;
  action: () => void;
  danger?: boolean;
  sublabel?: string;
  checked?: boolean;
}

interface Props {
  app: App;
  items: MenuItem[];
  onClose: () => void;
}

export default function ContextMenuModal({ app, items, onClose }: Props) {
  const { glass, accent, theme, isDark } = useTheme();
  const { t } = useTranslation();
  const [focusIdx, setFocusIdx] = useState(0);
  const focusIdxRef = useRef(0);
  const itemsRef    = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  useEffect(() => {
    const last: Partial<GpState> = {};
    let rafId: number;
    let suppressFrames = 20;
    const poll = () => {
      if (suppressFrames > 0) { suppressFrames--; rafId = requestAnimationFrame(poll); return; }
      const gp = getBestGamepad();
      if (gp) {
        const state = readGpState(gp);
        if (state.ArrowDown && !last.ArrowDown) {
          const next = Math.min(focusIdxRef.current + 1, itemsRef.current.length - 1);
          setFocusIdx(next); focusIdxRef.current = next;
        }
        if (state.ArrowUp && !last.ArrowUp) {
          const next = Math.max(focusIdxRef.current - 1, 0);
          setFocusIdx(next); focusIdxRef.current = next;
        }
        if (state.Enter && !last.Enter) {
          itemsRef.current[focusIdxRef.current]?.action();
        }
        if (state.Escape && !last.Escape) { onClose(); }
        Object.assign(last, state);
      }
      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const shortcuts = [
    { btn: "A",  label: t("gamepad.aSelect") },
    { btn: "B",  label: t("common.close") },
  ];

  return (
    <ModalShell
      title={app.name}
      shortcuts={shortcuts}
      width={280}
      zIndex={9000}
      onOverlayClick={onClose}
    >
      <div style={{ padding: "8px 0" }}>
        {items.map(({ label, action, danger, sublabel, checked }, i) => {
          const focused = focusIdx === i;
          return (
            <div
              key={label}
              onClick={action}
              onMouseEnter={() => { setFocusIdx(i); focusIdxRef.current = i; }}
              style={{
                padding: sublabel ? "10px 18px 10px 24px" : "12px 24px",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
                color: danger ? "#e85a5a" : theme.text,
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: focused
                  ? (danger ? "rgba(232,90,90,0.1)" : (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)"))
                  : "transparent",
                borderLeft: `3px solid ${focused ? (danger ? "#e85a5a" : accent.primary) : "transparent"}`,
                transition: "background 0.1s, border-color 0.1s",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div>{label}</div>
                {sublabel && (
                  <div style={{ marginTop: 3, fontSize: 11, lineHeight: 1.25, fontWeight: 400, color: theme.textFaint }}>
                    {sublabel}
                  </div>
                )}
              </div>
              {typeof checked === "boolean" && (
                <div
                  aria-hidden="true"
                  style={{
                    width: 34,
                    height: 18,
                    borderRadius: 999,
                    flexShrink: 0,
                    padding: 2,
                    background: checked ? accent.primary : (isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.14)"),
                    transition: "background 0.12s",
                  }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: checked ? "#fff" : (isDark ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.95)"),
                      transform: checked ? "translateX(16px)" : "translateX(0)",
                      transition: "transform 0.12s",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}
