import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getBestGamepad, readGpState } from "../../utils/gamepad";
import ConfirmModal from "./ConfirmModal";
import GamepadKeyboard from "../GamepadKeyboard";
import ModalShell from "./ModalShell";

interface Collection {
  id: string;
  name: string;
}

interface Props {
  glass: any;
  accent: any;
  theme: any;
  isDark: boolean;
  collections: Collection[];
  onCreateCollection: (name: string) => void;
  onDeleteCollection: (id: string) => void;
  onClose: () => void;
  title?: string;
}

export default function CollectionManagerModal({ glass, accent, theme, isDark, collections, onCreateCollection, onDeleteCollection, onClose, title }: Props) {
  const { t } = useTranslation();
  const [showKb, setShowKb]                     = useState(false);
  const [kbValue, setKbValue]                   = useState("");
  const [confirmDeleteCol, setConfirmDeleteCol] = useState<Collection | null>(null);
  const [focusIdx, setFocusIdx]                 = useState(0);

  const focusIdxRef             = useRef(0);
  const colsRef                 = useRef(collections);
  const showKbRef               = useRef(false);
  const kbValueRef              = useRef("");
  const confirmDeleteColRef     = useRef<Collection | null>(null);
  const onCreateCollectionRef   = useRef(onCreateCollection);
  const onDeleteCollectionRef   = useRef(onDeleteCollection);

  useEffect(() => { colsRef.current = collections; },                  [collections]);
  useEffect(() => { showKbRef.current = showKb; },                     [showKb]);
  useEffect(() => { kbValueRef.current = kbValue; },                   [kbValue]);
  useEffect(() => { confirmDeleteColRef.current = confirmDeleteCol; }, [confirmDeleteCol]);
  useEffect(() => { onCreateCollectionRef.current = onCreateCollection; }, [onCreateCollection]);
  useEffect(() => { onDeleteCollectionRef.current = onDeleteCollection; }, [onDeleteCollection]);

  // total = collections + 1 "add" row
  const totalRows = () => colsRef.current.length + 1;
  const isAddRow  = (i: number) => i === colsRef.current.length;

  useEffect(() => {
    const last: any = {};
    let rafId: number;
    let suppressFrames = 20;

    const poll = () => {
      if (suppressFrames > 0) { suppressFrames--; rafId = requestAnimationFrame(poll); return; }
      const gp = getBestGamepad();
      if (showKbRef.current || confirmDeleteColRef.current) {
        // keep tracking state so resumed polling doesn't re-fire held buttons
        if (gp) Object.assign(last, readGpState(gp));
        rafId = requestAnimationFrame(poll); return;
      }
      if (gp) {
        const state = readGpState(gp);
        if (state.ArrowDown && !last.ArrowDown) {
          const next = Math.min(focusIdxRef.current + 1, totalRows() - 1);
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
          }
        }
        if (state.ButtonX && !last.ButtonX) {
          const i = focusIdxRef.current;
          const col = colsRef.current[i];
          if (col) { setConfirmDeleteCol(col); confirmDeleteColRef.current = col; }
        }
        if (state.Escape && !last.Escape) { onClose(); }
        Object.assign(last, state);
      }
      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onColRow = focusIdx < collections.length;

  const shortcuts = [
    ...(onColRow ? [{ btn: "X", label: t("common.delete") }] : [{ btn: "A", label: t("common.add") }]),
    { btn: "B", label: t("common.close") },
  ];

  return (
    <>
      <ModalShell
        title={title || t("collections.manage")}
        shortcuts={shortcuts}
        glass={glass} accent={accent} theme={theme} isDark={isDark}
        width={320}
        zIndex={2000}
        onOverlayClick={onClose}
      >
        <div style={{ padding: "8px 0" }}>
          {collections.map((col, i) => {
            const focused = focusIdx === i;
            return (
              <div
                key={col.id}
                onClick={() => {
                  if (focusIdxRef.current === i) {
                    setConfirmDeleteCol(col); confirmDeleteColRef.current = col;
                  } else {
                    setFocusIdx(i); focusIdxRef.current = i;
                  }
                }}
                onMouseEnter={() => { setFocusIdx(i); focusIdxRef.current = i; }}
                style={{
                  padding: "12px 24px",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                  color: theme.text,
                  background: focused
                    ? (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)")
                    : "transparent",
                  borderLeft: `3px solid ${focused ? accent.primary : "transparent"}`,
                  transition: "background 0.1s, border-color 0.1s",
                }}
              >
                <span>{col.name}</span>
              </div>
            );
          })}

          {collections.length === 0 && (
            <div style={{ padding: "8px 24px 4px", fontSize: 13, color: theme.textFaint, fontStyle: "italic" }}>
              {t("collections.empty")}
            </div>
          )}

          {/* Add row */}
          <div
            onClick={() => { setShowKb(true); showKbRef.current = true; }}
            onMouseEnter={() => { const i = collections.length; setFocusIdx(i); focusIdxRef.current = i; }}
            style={{
              padding: "12px 24px",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              color: focusIdx === collections.length ? accent.primary : theme.textFaint,
              background: focusIdx === collections.length
                ? (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)")
                : "transparent",
              borderLeft: `3px solid ${focusIdx === collections.length ? accent.primary : "transparent"}`,
              transition: "background 0.1s, border-color 0.1s, color 0.1s",
            }}
          >
            + {t("collections.newPlaceholder")}
          </div>
        </div>
      </ModalShell>

      {confirmDeleteCol && (
        <ConfirmModal
          message={t("confirm.deleteCollection", { name: confirmDeleteCol.name })}
          onConfirm={() => {
            onDeleteCollectionRef.current(confirmDeleteCol!.id);
            setConfirmDeleteCol(null);
            confirmDeleteColRef.current = null;
          }}
          onCancel={() => { setConfirmDeleteCol(null); confirmDeleteColRef.current = null; }}
          glass={glass} accent={accent} theme={theme} isDark={isDark}
        />
      )}

      {showKb && (
        <GamepadKeyboard
          value={kbValue}
          onChange={(v) => { setKbValue(v); kbValueRef.current = v; }}
          onClose={() => {
            setShowKb(false);
            showKbRef.current = false;
            const name = kbValueRef.current.trim();
            setKbValue("");
            kbValueRef.current = "";
            if (name) onCreateCollectionRef.current(name);
          }}
          title={t("collections.newPlaceholder")}
          accent={accent} theme={theme} isDark={isDark} glass={glass}
        />
      )}
    </>
  );
}
