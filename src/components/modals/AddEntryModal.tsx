import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import GamepadKeyboard from "../GamepadKeyboard";
import ModalShell from "./ModalShell";
import { getBestGamepad, readGpState, type GpState } from "../../utils/gamepad";
import { useTheme } from "../../contexts/ThemeContext";
import type { CSSProperties } from "react";

// Built-in game sources (shown as filter tabs in Games, cannot be deleted)
export const BUILTIN_GAME_SOURCES = ["Steam", "Xbox", "Bnet"];

const SECTION_NAME   = 0;
const SECTION_PICKER = 1;

export type PickerOption =
  | { kind: "src";  value: string }
  | { kind: "col";  id: string; name: string }
  | { kind: "new" };

interface EntryFile { name: string; path: string; is_dir?: boolean; }
interface Collection { id: string; name: string; }

interface Props {
  entryFile: EntryFile;
  mode: "folder" | "app";
  appType?: "game" | "app";
  existingSources?: string[];
  collections?: Collection[];
  onConfirm: (result: unknown, colSelection: { colId?: string; newName?: string | null }) => void;
  onClose: () => void;
}

export default function AddEntryModal({
  entryFile, mode, appType = "game",
  existingSources = [], collections = [],
  onConfirm, onClose,
}: Props) {
  const { glass, accent, theme, isDark } = useTheme();
  const { t } = useTranslation();
  const isFolderMode = mode === "folder";
  const isGame       = appType === "game";

  const [name, setName]               = useState(() => entryFile.name.replace(/\.(exe|lnk)$/i, ""));
  const [saving, setSaving]           = useState(false);
  const [picked, setPicked]           = useState<PickerOption | null>(null);
  const [newColName, setNewColName]   = useState("");
  const [gpSection, setGpSection]     = useState(isFolderMode ? SECTION_PICKER : SECTION_NAME);
  const [gpPickIdx, setGpPickIdx]     = useState(0);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [keyboardField, setKeyboardField] = useState<"name" | "new_col">("name");

  const gpSectionRef    = useRef(isFolderMode ? SECTION_PICKER : SECTION_NAME);
  const gpPickIdxRef    = useRef(0);
  const showKeyboardRef = useRef(false);
  const pickedRef       = useRef<PickerOption | null>(null);
  const newColNameRef   = useRef("");
  const nameRef         = useRef<HTMLInputElement>(null);

  useEffect(() => { showKeyboardRef.current = showKeyboard; }, [showKeyboard]);
  useEffect(() => { pickedRef.current = picked; }, [picked]);
  useEffect(() => { newColNameRef.current = newColName; }, [newColName]);

  useEffect(() => {
    if (!isFolderMode && nameRef.current) nameRef.current.focus();
  }, [isFolderMode]);

  // Games: builtin sources + user-defined sources + user collections + "new"
  // Apps:  user collections + "new"
  // Same options regardless of whether it's a folder scan or a single add.
  const pickerOptions: PickerOption[] = isGame
    ? [
        ...BUILTIN_GAME_SOURCES.map(v => ({ kind: "src" as const, value: v })),
        ...existingSources.map(v => ({ kind: "src" as const, value: v })),
        ...collections.map(c => ({ kind: "col" as const, id: c.id, name: c.name })),
        { kind: "new" as const },
      ]
    : [
        ...collections.map(c => ({ kind: "col" as const, id: c.id, name: c.name })),
        { kind: "new" as const },
      ];

  const pickerOptionsRef = useRef(pickerOptions);
  useEffect(() => { pickerOptionsRef.current = pickerOptions; });

  const confirmFnRef = useRef<() => void>(() => {});
  const confirm = () => {
    if (saving) return;
    setSaving(true);
    const sel = pickedRef.current;

    // For folder scans: the source tag stored on the folder is how we later
    // identify which apps came from it so we can assign collection memberships.
    // For single adds: source only matters for BUILTIN (steam/xbox/bnet) picks;
    // collection assignment is handled via membership, not source.
    const src = isFolderMode
      ? (sel?.kind === "src" ? sel.value
       : sel?.kind === "col" ? sel.name
       : sel?.kind === "new" ? (newColNameRef.current.trim() || "Other")
       : "Other")
      : (sel?.kind === "src" ? sel.value : "Other");

    const cmd  = isFolderMode ? "add_custom_folder" : "add_custom_app";
    const args = isFolderMode
      ? { path: entryFile.path, source: src, appType }
      : { name, path: entryFile.path, appType, source: src };

    invoke(cmd, args)
      .then(result => {
        const colSel = sel?.kind === "col" ? { colId: sel.id }
                     : sel?.kind === "new" ? { newName: newColNameRef.current.trim() || null }
                     : {};
        onConfirm(result, colSel);
      })
      .catch(() => setSaving(false));
  };
  useEffect(() => { confirmFnRef.current = confirm; });

  useEffect(() => {
    const last: Partial<GpState> = {};
    let rafId: number;
    let suppressFrames = 20;
    const FIRST = isFolderMode ? SECTION_PICKER : SECTION_NAME;

    const poll = () => {
      if (suppressFrames > 0) { suppressFrames--; rafId = requestAnimationFrame(poll); return; }
      const gp = getBestGamepad();
      const state: Partial<GpState> = gp ? readGpState(gp) : {};
      if (showKeyboardRef.current) { if (gp) Object.assign(last, state); rafId = requestAnimationFrame(poll); return; }

      if (gp) {
        if (state.Escape && !last.Escape) { onClose(); }
        if (state.Start  && !last.Start)  { confirmFnRef.current(); }

        if (state.ArrowDown && !last.ArrowDown && gpSectionRef.current < SECTION_PICKER) {
          const next = gpSectionRef.current + 1;
          setGpSection(next); gpSectionRef.current = next;
          nameRef.current?.blur();
        }
        if (state.ArrowUp && !last.ArrowUp && gpSectionRef.current > FIRST) {
          const next = gpSectionRef.current - 1;
          setGpSection(next); gpSectionRef.current = next;
          if (next === SECTION_NAME) nameRef.current?.focus();
        }

        if (gpSectionRef.current === SECTION_NAME && state.Enter && !last.Enter) {
          setKeyboardField("name"); setShowKeyboard(true); showKeyboardRef.current = true;
        }

        if (gpSectionRef.current === SECTION_PICKER) {
          const opts = pickerOptionsRef.current;
          const setOpt = (opt: PickerOption) => {
            const v: PickerOption = opt.kind === "new" ? { kind: "new" } : opt;
            setPicked(v); pickedRef.current = v;
          };
          if (state.ArrowRight && !last.ArrowRight) {
            const next = Math.min(gpPickIdxRef.current + 1, opts.length - 1);
            setGpPickIdx(next); gpPickIdxRef.current = next;
            setOpt(opts[next]);
          }
          if (state.ArrowLeft && !last.ArrowLeft) {
            const next = Math.max(gpPickIdxRef.current - 1, 0);
            setGpPickIdx(next); gpPickIdxRef.current = next;
            setOpt(opts[next]);
          }
          if (state.Enter && !last.Enter) {
            const opt = opts[gpPickIdxRef.current];
            if (opt?.kind === "new") {
              setOpt(opt);
              setKeyboardField("new_col"); setShowKeyboard(true); showKeyboardRef.current = true;
            } else if (opt) {
              setOpt(opt);
            }
          }
        }

        Object.assign(last, state);
      }
      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isPickFocused = (i: number) => gpSection === SECTION_PICKER && gpPickIdx === i;

  const pillStyle = (active: boolean, focused: boolean): CSSProperties => ({
    padding: "5px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 500,
    background: active
      ? accent.primary
      : focused
        ? (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)")
        : (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"),
    color: active ? (accent.darkText ? "#1a1a1a" : "white") : theme.text,
    border: focused ? `1px solid ${accent.primary}` : `1px solid ${active ? accent.primary : "transparent"}`,
    boxShadow: focused ? `0 0 0 2px ${accent.glow}0.25)` : "none",
    transition: "all 0.15s",
  });

  const isActive = (opt: PickerOption) => {
    if (!picked) return false;
    if (opt.kind === "src" && picked.kind === "src") return opt.value === picked.value;
    if (opt.kind === "col" && picked.kind === "col") return opt.id === picked.id;
    if (opt.kind === "new" && picked.kind === "new") return true;
    return false;
  };

  const sectionActive = gpSection === SECTION_PICKER;

  const shortcuts = showKeyboard ? [] : [
    ...(gpSection === SECTION_PICKER ? [{ btn: "←→", label: t("shortcuts.select") }] : []),
    { btn: "MENU", label: t("common.add") },
    { btn: "B",   label: t("common.cancel") },
  ];

  const modalTitle = isFolderMode
    ? t("addEntry.addFolder")
    : isGame ? t("addEntry.addGame") : t("addEntry.addApp");

  return (
    <>
      <ModalShell
        title={modalTitle} shortcuts={shortcuts}
        width={480} zIndex={1001}
      >
        <div style={{ padding: "16px 28px", display: "flex", flexDirection: "column", gap: 18 }}>

          <div>
            <div style={{ fontSize: 11, color: theme.textDim, marginBottom: 4 }}>{t("addEntry.path")}</div>
            <div style={{ fontSize: 12, color: theme.textFaint, background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", borderRadius: 8, padding: "8px 12px", wordBreak: "break-all" }}>
              {entryFile.path}
            </div>
          </div>

          {!isFolderMode && (
            <div>
              <div style={{ fontSize: 11, color: gpSection === SECTION_NAME ? accent.primary : theme.textDim, marginBottom: 8, fontWeight: gpSection === SECTION_NAME ? 700 : 400, transition: "color 0.15s" }}>
                {t("addEntry.name")}
              </div>
              <input
                ref={nameRef}
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === "Escape") onClose(); }}
                onFocus={() => { setGpSection(SECTION_NAME); gpSectionRef.current = SECTION_NAME; }}
                style={{
                  width: "100%", boxSizing: "border-box", padding: "8px 12px",
                  background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
                  border: `1px solid ${gpSection === SECTION_NAME ? accent.primary : `${accent.glow}0.3)`}`,
                  borderRadius: 8, color: theme.text, fontSize: 13, outline: "none", transition: "border-color 0.15s",
                }}
              />
            </div>
          )}

          <div>
            <div style={{ fontSize: 11, color: sectionActive ? accent.primary : theme.textDim, marginBottom: 8, fontWeight: sectionActive ? 700 : 400, transition: "color 0.15s" }}>
              {t("addEntry.collection")}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: picked?.kind === "new" ? 8 : 0 }}>
              {pickerOptions.map((opt, i) => {
                const label = opt.kind === "src" ? opt.value
                            : opt.kind === "col" ? opt.name
                            : `+ ${t("addEntry.newCollection")}`;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setGpSection(SECTION_PICKER); gpSectionRef.current = SECTION_PICKER;
                      setGpPickIdx(i); gpPickIdxRef.current = i;
                      const v: PickerOption = opt.kind === "new" ? { kind: "new" } : opt;
                      setPicked(v); pickedRef.current = v;
                    }}
                    style={pillStyle(isActive(opt), isPickFocused(i))}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {picked?.kind === "new" && (
              <input
                value={newColName}
                onChange={e => setNewColName(e.target.value)}
                onKeyDown={e => { if (e.key === "Escape") onClose(); }}
                placeholder={t("addEntry.newCollectionPlaceholder")}
                style={{
                  width: "100%", boxSizing: "border-box", padding: "8px 12px",
                  background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
                  border: `1px solid ${sectionActive ? accent.primary : `${accent.glow}0.3)`}`,
                  borderRadius: 8, color: theme.text, fontSize: 13, outline: "none", transition: "border-color 0.15s",
                }}
              />
            )}
          </div>

        </div>
      </ModalShell>

      {showKeyboard && (
        <GamepadKeyboard
          value={keyboardField === "name" ? name : newColName}
          onChange={val => { if (keyboardField === "name") setName(val); else setNewColName(val); }}
          onClose={() => { setShowKeyboard(false); showKeyboardRef.current = false; }}
          title={keyboardField === "name" ? t("addEntry.name") : t("addEntry.newCollection")}
        />
      )}
    </>
  );
}
