import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getBestGamepad, readGpState, type GpState } from "../../utils/gamepad";
import ConfirmModal from "./ConfirmModal";
import GamepadKeyboard from "../GamepadKeyboard";
import ModalShell from "./ModalShell";
import { useTheme } from "../../contexts/ThemeContext";

interface Collection {
  id: string;
  name: string;
}

// Unified list item: either a proper collection or a custom source
type ListItem =
  | { type: "collection"; id: string; name: string }
  | { type: "source"; id?: undefined; name: string };

interface Props {
  collections: Collection[];
  onCreateCollection: (name: string) => void;
  onDeleteCollection: (id: string) => void;
  onClose: () => void;
  title?: string;
  customSources?: string[];
  onDeleteCustomSource?: (source: string) => void;
}

export default function CollectionManagerModal({ collections, onCreateCollection, onDeleteCollection, onClose, title, customSources, onDeleteCustomSource }: Props) {
  const { accent, theme, isDark } = useTheme();
  const { t } = useTranslation();
  const [showKb, setShowKb]         = useState(false);
  const [kbValue, setKbValue]       = useState("");
  const [confirmDelete, setConfirmDelete] = useState<ListItem | null>(null);
  const [focusIdx, setFocusIdx]     = useState(0);

  const focusIdxRef      = useRef(0);
  const showKbRef        = useRef(false);
  const kbValueRef       = useRef("");
  const confirmDeleteRef = useRef<ListItem | null>(null);
  const onCreateRef      = useRef(onCreateCollection);
  const onDeleteColRef   = useRef(onDeleteCollection);
  const onDeleteSrcRef   = useRef(onDeleteCustomSource);

  // Unified list: proper collections first, then custom sources
  const allItems: ListItem[] = [
    ...collections.map(c => ({ type: "collection" as const, id: c.id, name: c.name })),
    ...(customSources ?? []).map(s => ({ type: "source" as const, name: s })),
  ];
  const allItemsRef = useRef(allItems);

  useEffect(() => { allItemsRef.current = allItems; });
  useEffect(() => { showKbRef.current = showKb; }, [showKb]);
  useEffect(() => { kbValueRef.current = kbValue; }, [kbValue]);
  useEffect(() => { confirmDeleteRef.current = confirmDelete; }, [confirmDelete]);
  useEffect(() => { onCreateRef.current = onCreateCollection; }, [onCreateCollection]);
  useEffect(() => { onDeleteColRef.current = onDeleteCollection; }, [onDeleteCollection]);
  useEffect(() => { onDeleteSrcRef.current = onDeleteCustomSource; }, [onDeleteCustomSource]);

  // total = all items + 1 "add" row
  const totalRows = () => allItemsRef.current.length + 1;
  const isAddRow  = (i: number) => i === allItemsRef.current.length;

  useEffect(() => {
    const last: Partial<GpState> = {};
    let rafId: number;
    let suppressFrames = 20;

    const poll = () => {
      if (suppressFrames > 0) { suppressFrames--; rafId = requestAnimationFrame(poll); return; }
      const gp = getBestGamepad();
      if (showKbRef.current || confirmDeleteRef.current) {
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
          if (isAddRow(i)) { setShowKb(true); showKbRef.current = true; }
        }
        if (state.ButtonX && !last.ButtonX) {
          const i = focusIdxRef.current;
          const item = allItemsRef.current[i];
          if (item) { setConfirmDelete(item); confirmDeleteRef.current = item; }
        }
        if (state.Escape && !last.Escape) { onClose(); }
        Object.assign(last, state);
      }
      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onItemRow = focusIdx < allItems.length;

  const shortcuts = [
    ...(onItemRow ? [{ btn: "X", label: t("common.delete") }] : [{ btn: "A", label: t("common.add") }]),
    { btn: "B", label: t("common.close") },
  ];

  const handleDelete = (item: ListItem) => {
    if (item.type === "collection") {
      onDeleteColRef.current(item.id);
    } else {
      onDeleteSrcRef.current?.(item.name);
    }
    setConfirmDelete(null);
    confirmDeleteRef.current = null;
  };

  return (
    <>
      <ModalShell
        title={title || t("collections.manage")}
        shortcuts={shortcuts}
        width={320}
        zIndex={2000}
        onOverlayClick={onClose}
      >
        <div style={{ padding: "8px 0" }}>
          {allItems.map((item, i) => {
            const focused = focusIdx === i;
            return (
              <div
                key={item.type === "collection" ? item.id : `src-${item.name}`}
                onClick={() => {
                  if (focusIdxRef.current === i) {
                    setConfirmDelete(item); confirmDeleteRef.current = item;
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
                <span>{item.name}</span>
              </div>
            );
          })}

          {allItems.length === 0 && (
            <div style={{ padding: "8px 24px 4px", fontSize: 13, color: theme.textFaint, fontStyle: "italic" }}>
              {t("collections.empty")}
            </div>
          )}

          {/* Add row */}
          <div
            onClick={() => { setShowKb(true); showKbRef.current = true; }}
            onMouseEnter={() => { const i = allItems.length; setFocusIdx(i); focusIdxRef.current = i; }}
            style={{
              padding: "12px 24px",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              color: focusIdx === allItems.length ? accent.primary : theme.textFaint,
              background: focusIdx === allItems.length
                ? (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)")
                : "transparent",
              borderLeft: `3px solid ${focusIdx === allItems.length ? accent.primary : "transparent"}`,
              transition: "background 0.1s, border-color 0.1s, color 0.1s",
            }}
          >
            + {t("collections.newPlaceholder")}
          </div>
        </div>
      </ModalShell>

      {confirmDelete && (
        <ConfirmModal
          message={
            confirmDelete.type === "collection"
              ? t("confirm.deleteCollection", { name: confirmDelete.name })
              : t("confirm.deleteSource", { name: confirmDelete.name })
          }
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => { setConfirmDelete(null); confirmDeleteRef.current = null; }}
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
            if (name) onCreateRef.current(name);
          }}
          title={t("collections.newPlaceholder")}
        />
      )}
    </>
  );
}
