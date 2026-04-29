import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getBestGamepad, readGpState } from "../../utils/gamepad";
import ModalShell from "./ModalShell";
import GamepadKeyboard from "../GamepadKeyboard";

interface App {
  id: string;
  name: string;
}

interface Props {
  app: App;
  glass: any;
  accent: any;
  theme: any;
  isDark: boolean;
  onConfirm: (name: string) => void;
  onClose: () => void;
}

export default function EditNameModal({ app, glass, accent, theme, isDark, onConfirm, onClose }: Props) {
  const { t } = useTranslation();
  const [kbValue, setKbValue] = useState(app.name);
  const [showKb, setShowKb]   = useState(false);
  const kbValueRef = useRef(app.name);
  const showKbRef  = useRef(false);

  useEffect(() => { kbValueRef.current = kbValue; }, [kbValue]);
  useEffect(() => { showKbRef.current = showKb; }, [showKb]);

  // Auto-open keyboard on mount
  useEffect(() => {
    setShowKb(true);
    showKbRef.current = true;
  }, []);

  useEffect(() => {
    const last: any = {};
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
        if (state.Enter   && !last.Enter)   { const n = kbValueRef.current.trim(); if (n) onConfirm(n); }
        if (state.Escape  && !last.Escape)  { onClose(); }
        if (state.ButtonY && !last.ButtonY) { setShowKb(true); showKbRef.current = true; }
        Object.assign(last, state);
      }
      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const shortcuts = [
    { btn: "A", label: t("shortcuts.confirm") },
    { btn: "Y", label: t("shortcuts.keyboard") },
    { btn: "B", label: t("common.cancel") },
  ];

  return (
    <>
      <ModalShell
        title={t("contextMenu.rename")}
        shortcuts={shortcuts}
        glass={glass} accent={accent} theme={theme} isDark={isDark}
        width={400}
        zIndex={2000}
        onOverlayClick={onClose}
      >
        <div style={{ padding: "16px 24px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 12, color: theme.textFaint }}>{t("contextMenu.rename")}</div>
          <input
            type="text"
            value={kbValue}
            onChange={(e) => { setKbValue(e.target.value); kbValueRef.current = e.target.value; }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { const n = kbValueRef.current.trim(); if (n) onConfirm(n); }
              if (e.key === "Escape") onClose();
            }}
            style={{
              width: "100%",
              boxSizing: "border-box" as const,
              padding: "10px 14px",
              borderRadius: 10,
              border: `1.5px solid ${accent.primary}`,
              background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
              color: theme.text,
              fontSize: 14,
              fontFamily: "'Segoe UI', sans-serif",
              outline: "none",
            }}
          />
        </div>
      </ModalShell>

      {showKb && (
        <GamepadKeyboard
          value={kbValue}
          onChange={(v: string) => { setKbValue(v); kbValueRef.current = v; }}
          onClose={() => {
            setShowKb(false);
            showKbRef.current = false;
          }}
          title={t("contextMenu.rename")}
          accent={accent} theme={theme} isDark={isDark} glass={glass}
        />
      )}
    </>
  );
}
