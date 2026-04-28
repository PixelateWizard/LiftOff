import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getBestGamepad, readGpState } from "../../utils/gamepad";
import ModalShell from "./ModalShell";

interface Collection {
  id: string;
  name: string;
}

interface App {
  id: string;
  name: string;
}

interface Props {
  app: App;
  collections: Collection[];
  memberships: Record<string, string[]>;
  onToggle: (col: Collection) => void;
  onClose: () => void;
  glass: any;
  accent: any;
  theme: any;
  isDark: boolean;
}

export default function ColPickerModal({ app, collections, memberships, onToggle, onClose, glass, accent, theme, isDark }: Props) {
  const { t } = useTranslation();
  const [focusIdx, setFocusIdx] = useState(0);
  const focusIdxRef = useRef(0);
  const colsRef     = useRef(collections);
  useEffect(() => { colsRef.current = collections; }, [collections]);

  useEffect(() => {
    const last: any = {};
    let rafId: number;
    let suppressFrames = 20;
    const poll = () => {
      if (suppressFrames > 0) { suppressFrames--; rafId = requestAnimationFrame(poll); return; }
      const gp = getBestGamepad();
      if (gp) {
        const state = readGpState(gp);
        const total = colsRef.current.length;
        if (state.ArrowDown && !last.ArrowDown) {
          const next = Math.min(focusIdxRef.current + 1, total - 1);
          setFocusIdx(next); focusIdxRef.current = next;
        }
        if (state.ArrowUp && !last.ArrowUp) {
          const next = Math.max(focusIdxRef.current - 1, 0);
          setFocusIdx(next); focusIdxRef.current = next;
        }
        if (state.Enter && !last.Enter) {
          const col = colsRef.current[focusIdxRef.current];
          if (col) onToggle(col);
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
    { btn: "A",  label: t("shortcuts.toggle") },
    { btn: "B",  label: t("common.close") },
  ];

  return (
    <ModalShell
      title={t("collections.assign", { name: app.name })}
      shortcuts={shortcuts}
      glass={glass} accent={accent} theme={theme} isDark={isDark}
      width={380}
      zIndex={2000}
      onOverlayClick={onClose}
    >
      <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
        {collections.length === 0
          ? <div style={{ fontSize: 13, color: theme.textFaint, fontStyle: "italic" }}>{t("collections.none")}</div>
          : collections.map((col, i) => {
              const members = memberships[app.id] || [];
              const inCol   = members.includes(col.id);
              const focused = focusIdx === i;
              return (
                <div
                  key={col.id}
                  onClick={() => onToggle(col)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    cursor: "pointer", padding: "8px 10px", borderRadius: 10,
                    border: focused ? `2px solid ${accent.primary}` : "2px solid transparent",
                    background: focused ? (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)") : "transparent",
                    transition: "all 0.12s",
                  }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 5,
                    border: `2px solid ${inCol ? accent.primary : theme.textFaint}`,
                    background: inCol ? accent.primary : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s", flexShrink: 0,
                  }}>
                    {inCol && (
                      <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                        <path d="M1 4l4 4L11 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: 13, color: theme.text }}>{col.name}</span>
                </div>
              );
            })
        }
      </div>
    </ModalShell>
  );
}
