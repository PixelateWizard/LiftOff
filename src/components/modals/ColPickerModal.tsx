import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getBestGamepad, readGpState, type GpState } from "../../utils/gamepad";
import ModalShell from "./ModalShell";
import GamepadKeyboard from "../GamepadKeyboard";
import { useTheme } from "../../contexts/ThemeContext";

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
  onCreateCollection?: (name: string) => void;
}

export default function ColPickerModal({ app, collections, memberships, onToggle, onClose, onCreateCollection }: Props) {
  const { glass, accent, theme, isDark } = useTheme();
  const { t } = useTranslation();
  const [focusIdx, setFocusIdx] = useState(0);
  const [showKb, setShowKb] = useState(false);
  const [kbValue, setKbValue] = useState("");
  const focusIdxRef = useRef(0);
  const colsRef     = useRef(collections);
  const showKbRef   = useRef(false);
  const kbValueRef  = useRef("");
  const onCreateCollectionRef = useRef(onCreateCollection);

  useEffect(() => { colsRef.current = collections; }, [collections]);
  useEffect(() => { showKbRef.current = showKb; }, [showKb]);
  useEffect(() => { onCreateCollectionRef.current = onCreateCollection; }, [onCreateCollection]);

  // total rows = collections + optional "new collection" row
  const totalRows = () => colsRef.current.length + (onCreateCollectionRef.current ? 1 : 0);
  const isAddRow  = (i: number) => !!onCreateCollectionRef.current && i === colsRef.current.length;

  useEffect(() => {
    const last: Partial<GpState> = {};
    let rafId: number;
    let suppressFrames = 20;
    const poll = () => {
      if (suppressFrames > 0) { suppressFrames--; rafId = requestAnimationFrame(poll); return; }
      if (showKbRef.current) {
        const gp = getBestGamepad();
        if (gp) Object.assign(last, readGpState(gp));
        rafId = requestAnimationFrame(poll); return;
      }
      const gp = getBestGamepad();
      if (gp) {
        const state = readGpState(gp);
        const total = totalRows();
        if (state.ArrowDown && !last.ArrowDown) {
          const next = Math.min(focusIdxRef.current + 1, total - 1);
          setFocusIdx(next); focusIdxRef.current = next;
        }
        if (state.ArrowUp && !last.ArrowUp) {
          const next = Math.max(focusIdxRef.current - 1, 0);
          setFocusIdx(next); focusIdxRef.current = next;
        }
        if (state.Enter && !last.Enter) {
          const i = focusIdxRef.current;
          if (isAddRow(i)) {
            setShowKb(true); showKbRef.current = true;
          } else {
            const col = colsRef.current[i];
            if (col) onToggle(col);
          }
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
    <>
      <ModalShell
        title={t("collections.assign", { name: app.name })}
        shortcuts={shortcuts}
        width={380}
        zIndex={2000}
        onOverlayClick={onClose}
      >
        <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
          {collections.length === 0 && !onCreateCollection
            ? <div style={{ fontSize: 13, color: theme.textFaint, fontStyle: "italic" }}>{t("collections.none")}</div>
            : collections.map((col, i) => {
                const members = memberships[app.id] || [];
                const inCol   = members.includes(col.id);
                const focused = focusIdx === i;
                return (
                  <div
                    key={col.id}
                    onClick={() => onToggle(col)}
                    onMouseEnter={() => { setFocusIdx(i); focusIdxRef.current = i; }}
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
                          <path d="M1 4l4 4L11 1" stroke={accent.darkText ? "#1a1a1a" : "white"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span style={{ fontSize: 13, color: theme.text }}>{col.name}</span>
                  </div>
                );
              })
          }

          {/* "New collection" row shown when onCreateCollection is provided */}
          {onCreateCollection && (
            <div
              onClick={() => { setShowKb(true); showKbRef.current = true; }}
              onMouseEnter={() => { const i = collections.length; setFocusIdx(i); focusIdxRef.current = i; }}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                cursor: "pointer", padding: "8px 10px", borderRadius: 10,
                border: focusIdx === collections.length ? `2px solid ${accent.primary}` : "2px solid transparent",
                background: focusIdx === collections.length ? (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)") : "transparent",
                transition: "all 0.12s",
                marginTop: collections.length > 0 ? 4 : 0,
                borderTop: collections.length > 0 ? `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"}` : undefined,
              }}>
              <span style={{ fontSize: 13, color: focusIdx === collections.length ? accent.primary : theme.textFaint, fontStyle: "italic" }}>
                + {t("collections.newPlaceholder")}
              </span>
            </div>
          )}
        </div>
      </ModalShell>

      {showKb && (
        <GamepadKeyboard
          value={kbValue}
          onChange={(v: string) => { setKbValue(v); kbValueRef.current = v; }}
          onClose={() => {
            setShowKb(false);
            showKbRef.current = false;
            const name = kbValueRef.current.trim();
            setKbValue("");
            kbValueRef.current = "";
            if (name && onCreateCollectionRef.current) onCreateCollectionRef.current(name);
          }}
          title={t("collections.newPlaceholder")}
        />
      )}
    </>
  );
}
