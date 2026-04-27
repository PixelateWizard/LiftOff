import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { getBestGamepad, readGpState } from "../../utils/gamepad";
import ModalShell from "./ModalShell";

interface MenuItem {
  label: string;
  action: () => void;
  danger?: boolean;
}

interface App {
  id: string;
  name: string;
  [key: string]: any;
}

interface Props {
  app: App;
  items: MenuItem[];
  glass: any;
  accent: any;
  theme: any;
  isDark: boolean;
  onClose: () => void;
}

export default function ContextMenuModal({ app, items, glass, accent, theme, isDark, onClose }: Props) {
  const { t } = useTranslation();
  const [focusIdx, setFocusIdx] = useState(0);
  const focusIdxRef = useRef(0);
  const itemsRef    = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  useEffect(() => {
    const last: any = {};
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
      glass={glass} accent={accent} theme={theme} isDark={isDark}
      width={280}
      zIndex={9000}
      onOverlayClick={onClose}
    >
      <div style={{ padding: "8px 0" }}>
        {items.map(({ label, action, danger }, i) => {
          const focused = focusIdx === i;
          return (
            <div
              key={label}
              onClick={action}
              onMouseEnter={() => { setFocusIdx(i); focusIdxRef.current = i; }}
              style={{
                padding: "12px 24px",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
                color: danger ? "#e85a5a" : theme.text,
                background: focused
                  ? (danger ? "rgba(232,90,90,0.1)" : (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)"))
                  : "transparent",
                borderLeft: `3px solid ${focused ? (danger ? "#e85a5a" : accent.primary) : "transparent"}`,
                transition: "background 0.1s, border-color 0.1s",
              }}
            >
              {label}
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}
