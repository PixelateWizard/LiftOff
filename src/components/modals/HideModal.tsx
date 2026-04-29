import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getBestGamepad, readGpState, type GpState } from "../../utils/gamepad";
import ModalShell from "./ModalShell";
import { useTheme } from "../../contexts/ThemeContext";
import type { App } from "../../types";

type HideableApp = App & { _hidden: boolean };

interface Props {
  tab: string;
  appsRef: React.RefObject<App[]>;
  hiddenRef: React.RefObject<string[]>;
  allAppsRef: React.RefObject<App[]>;
  closeHideModal: () => void;
  toggleHidden: (id: string) => void;
}

export default function HideModal({ tab, appsRef, hiddenRef, allAppsRef, closeHideModal, toggleHidden }: Props) {
  const { accent, theme, isDark } = useTheme();
  const { t } = useTranslation();
  const visibleApps = appsRef.current.filter(a => tab === "Games" ? a.app_type === "game" : a.app_type === "app");
  const hiddenIds   = hiddenRef.current;

  const [localChecked, setLocalChecked] = useState(() => new Set(visibleApps.map(a => a.id)));
  const [focusIdx, setFocusIdx] = useState(0);
  const focusIdxRef = useRef(0);
  const listRef     = useRef<HTMLDivElement>(null);

  const hiddenApps = hiddenIds.map(id => {
    const full = allAppsRef.current.find(a => a.id === id);
    return (full ? { ...full, _hidden: true } : { id, name: id, _hidden: true }) as HideableApp;
  }).filter(a => tab === "Games" ? a.app_type === "game" : a.app_type === "app" || !a.app_type);
  const allItems: HideableApp[] = [...visibleApps.map(a => ({ ...a, _hidden: false } as HideableApp)), ...hiddenApps];

  const allItemsRef     = useRef(allItems);
  const localCheckedRef = useRef(localChecked);
  useEffect(() => { allItemsRef.current     = allItems;     });
  useEffect(() => { localCheckedRef.current = localChecked; });

  useEffect(() => {
    if (listRef.current) {
      const rows = listRef.current.querySelectorAll("[data-modal-row]");
      if (rows[focusIdx]) (rows[focusIdx] as HTMLElement).scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [focusIdx]);

  useEffect(() => {
    let closed = false;

    const toggleItem = (i: number) => {
      const item = allItemsRef.current[i];
      if (!item) return;
      setLocalChecked(prev => { const n = new Set(prev); n.has(item.id) ? n.delete(item.id) : n.add(item.id); return n; });
    };

    const doClose = () => { closed = true; closeHideModal(); };

    const doConfirm = () => {
      closed = true;
      const checked = localCheckedRef.current;
      const items   = allItemsRef.current;
      items.filter(a => !a._hidden && !checked.has(a.id)).forEach(a => toggleHidden(a.id));
      items.filter(a =>  a._hidden &&  checked.has(a.id)).forEach(a => toggleHidden(a.id));
      closeHideModal();
    };

    const handle = (key: string) => {
      if (closed) return;
      const total = allItemsRef.current.length;
      if      (key === "ArrowDown" || key === "ArrowRight") { const ni = Math.min(focusIdxRef.current + 1, total - 1); setFocusIdx(ni); focusIdxRef.current = ni; }
      else if (key === "ArrowUp"   || key === "ArrowLeft")  { const ni = Math.max(focusIdxRef.current - 1, 0);         setFocusIdx(ni); focusIdxRef.current = ni; }
      else if (key === "Enter")  toggleItem(focusIdxRef.current);
      else if (key === "Start")  doConfirm();
      else if (key === "Escape") doClose();
    };

    const onKey = (e: KeyboardEvent) => {
      if (closed) return;
      const map: Record<string, string> = { ArrowDown:"ArrowDown", ArrowUp:"ArrowUp", ArrowLeft:"ArrowLeft", ArrowRight:"ArrowRight", Enter:"Enter", Escape:"Escape", " ":"Enter" };
      if (map[e.key]) { e.preventDefault(); e.stopPropagation(); handle(map[e.key]); }
    };
    window.addEventListener("keydown", onKey, true);

    let rAF: number;
    const lastBtn: Partial<GpState>      = {};
    const pressTime: Record<string, number>  = {};
    const repeating: Record<string, boolean> = {};
    const DIRS      = new Set(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"]);
    const INIT_MS   = 400;
    const RPT_MS    = 100;
    let startReleased = false;
    let enterReleased = false;

    const pollModal = (now: number) => {
      if (closed) return;
      const gp  = getBestGamepad();
      if (gp) {
        const base = readGpState(gp);
        if (!base.Start) startReleased = true;
        if (!base.Enter) enterReleased = true;
        const state = { ...base, Start: startReleased && base.Start, Enter: enterReleased && base.Enter };
        Object.keys(state).forEach(k => {
          const pressed = state[k as keyof GpState], was = lastBtn[k as keyof GpState];
          if (pressed && !was) {
            handle(k); pressTime[k] = now; repeating[k] = false;
          } else if (pressed && was && DIRS.has(k)) {
            const held = now - (pressTime[k] || now);
            if (!repeating[k] && held >= INIT_MS) { repeating[k] = true; pressTime[k] = now; handle(k); }
            else if (repeating[k] && held >= RPT_MS) { pressTime[k] = now; handle(k); }
          } else if (!pressed && was) { pressTime[k] = 0; repeating[k] = false; }
          lastBtn[k as keyof GpState] = pressed;
        });
      }
      rAF = requestAnimationFrame(pollModal);
    };
    rAF = requestAnimationFrame(pollModal);

    return () => { closed = true; window.removeEventListener("keydown", onKey, true); cancelAnimationFrame(rAF); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const shortcuts = [
    { btn: "A",   label: t("hideModal.shortcutToggle") },
    { btn: "MENU", label: t("shortcuts.save") },
    { btn: "B",   label: t("common.cancel") },
  ];

  return (
    <ModalShell
      title={tab === "Games" ? t("hideModal.manageGames") : t("hideModal.manageApps")}
      shortcuts={shortcuts}
      width={600}
      maxHeight="75vh"
      zIndex={8500}
    >
      <div ref={listRef} style={{ overflowY: "auto", padding: "8px 0" }}>
        {allItems.length === 0 && (
          <div style={{ padding: "40px 24px", textAlign: "center", color: theme.textFaint, fontSize: 13 }}>{t("hideModal.noApps")}</div>
        )}
        {allItems.map((item, i) => {
          const checked  = localChecked.has(item.id);
          const rowFocus = focusIdx === i;
          const isHidden = item._hidden;
          return (
            <div key={item.id} data-modal-row
              onClick={() => { setFocusIdx(i); focusIdxRef.current = i; setLocalChecked(prev => { const n = new Set(prev); checked ? n.delete(item.id) : n.add(item.id); return n; }); }}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 24px", cursor: "pointer",
                background: rowFocus ? `${accent.glow}0.12)` : "transparent",
                borderLeft: `3px solid ${rowFocus ? accent.primary : "transparent"}`,
                opacity: isHidden && !checked ? 0.5 : 1,
                transition: "all 0.1s ease" }}>
              <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                border: `2px solid ${checked ? accent.primary : (isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)")}`,
                background: checked ? accent.primary : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.1s ease" }}>
                {checked && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke={accent.darkText ? "#1a1a1a" : "white"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              {item.icon_base64
                ? <div style={{ width: 28, height: 28, borderRadius: 6, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <img src={`data:image/png;base64,${item.icon_base64}`} alt={item.name} style={{ width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%", objectFit: "contain", objectPosition: "center", display: "block" }} />
                  </div>
                : <div style={{ width: 28, height: 28, borderRadius: 6, background: `${accent.glow}0.15)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: accent.primary, flexShrink: 0 }}>{(item.name || "?")[0]}</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item.name || item.id}
                </div>
                <div style={{ fontSize: 10, color: theme.textFaint, textTransform: "capitalize" }}>
                  {isHidden ? `${item.source || "hidden"}` : item.source}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}
