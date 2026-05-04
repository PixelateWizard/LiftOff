import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CSSProperties } from "react";
import type { AccentColors, App, ThemeColors } from "../../types";
import { getBestGamepad, readGpState, type GpState } from "../../utils/gamepad";

type CropMode = "portrait" | "square";

interface ArtPickerModalProps {
  app: App;
  currentArt?: string | null;
  hasCustomArt: boolean;
  cropMode?: CropMode;
  accent: AccentColors;
  theme: ThemeColors;
  isDark: boolean;
  glass: CSSProperties;
  onClose: () => void;
  onSet: (id: string, dataUrl: string) => void;
  onReset: (id: string) => void;
}

export function ArtPickerModal({ app, currentArt, hasCustomArt, cropMode = "portrait", accent, theme, isDark: _isDark, glass, onClose, onSet, onReset }: ArtPickerModalProps) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(currentArt || null);
  const [pendingData, setPendingData] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [focusedBtn, setFocusedBtn] = useState("browse");

  const pendingDataRef = useRef<string | null>(null);
  const focusedBtnRef = useRef("browse");
  const lastBtnRef = useRef<Partial<GpState>>({});

  const getButtons = () => {
    const btns = ["browse"];
    if (pendingDataRef.current) btns.push("save");
    if (hasCustomArt && !pendingDataRef.current) btns.push("reset");
    btns.push("cancel");
    return btns;
  };

  const handleSave = () => {
    if (!pendingDataRef.current) return;
    setSaving(true);
    invoke("set_custom_art", { id: app.id, data: pendingDataRef.current })
      .then(() => { onSet(app.id, pendingDataRef.current!); onClose(); })
      .catch(console.error)
      .finally(() => setSaving(false));
  };
  const handleReset = () => {
    invoke("clear_custom_art", { id: app.id })
      .then(() => { onReset(app.id); onClose(); })
      .catch(console.error);
  };

  const handleSaveRef = useRef(handleSave);
  const handleResetRef = useRef(handleReset);
  useEffect(() => { handleSaveRef.current = handleSave; });
  useEffect(() => { handleResetRef.current = handleReset; });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const TW = cropMode === "square" ? 500 : 600;
        const TH = cropMode === "square" ? 500 : 900;
        const canvas = document.createElement("canvas");
        canvas.width = TW; canvas.height = TH;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const scale = Math.max(TW / img.width, TH / img.height);
        const sw = TW / scale, sh = TH / scale;
        const sx = (img.width - sw) / 2;
        const sy = (img.height - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, TW, TH);
        const url = canvas.toDataURL("image/jpeg", 0.88);
        setPreview(url);
        setPendingData(url);
        pendingDataRef.current = url;
        setFocusedBtn("save"); focusedBtnRef.current = "save";
      };
      img.src = String(ev.target?.result ?? "");
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    let rAFId = 0;
    const poll = () => {
      const gp = getBestGamepad();
      if (gp) {
        const state = readGpState(gp);
        const btns = getButtons();

        if (state.ArrowDown && !lastBtnRef.current.ArrowDown) {
          const i = btns.indexOf(focusedBtnRef.current);
          const next = btns[Math.min(i + 1, btns.length - 1)];
          if (next !== focusedBtnRef.current) { setFocusedBtn(next); focusedBtnRef.current = next; }
        }
        if (state.ArrowUp && !lastBtnRef.current.ArrowUp) {
          const i = btns.indexOf(focusedBtnRef.current);
          const next = btns[Math.max(i - 1, 0)];
          if (next !== focusedBtnRef.current) { setFocusedBtn(next); focusedBtnRef.current = next; }
        }
        if (state.Enter && !lastBtnRef.current.Enter) {
          const btn = focusedBtnRef.current;
          if (btn === "browse") fileRef.current?.click();
          else if (btn === "save") handleSaveRef.current();
          else if (btn === "reset") handleResetRef.current();
          else if (btn === "cancel") onClose();
        }
        if (state.Escape && !lastBtnRef.current.Escape) onClose();

        lastBtnRef.current = state;
      }
      rAFId = requestAnimationFrame(poll);
    };
    rAFId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rAFId);
  }, []);

  const btnStyle = (key: string, bg: string, color: string, extra: CSSProperties = {}) => {
    const focused = focusedBtn === key;
    return {
      padding: "10px 20px", borderRadius: 10, cursor: "pointer",
      fontFamily: "'Segoe UI', sans-serif", fontSize: 14, fontWeight: 600,
      border: focused ? `2px solid ${accent.primary}` : "2px solid transparent",
      width: "100%", background: bg, color,
      transition: "all 0.15s ease",
      boxShadow: focused ? `0 0 0 2px ${accent.glow}0.4), 0 0 16px ${accent.glow}0.2)` : "none",
      transform: focused ? "scale(1.02)" : "scale(1)",
      ...extra,
    };
  };

  return (
    <div data-modal-overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
      <div style={{ ...glass, borderRadius: 20, padding: 24, width: 380 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: theme.text, marginBottom: 4 }}>{app.name}</div>
        <div style={{ fontSize: 12, color: theme.textDim, marginBottom: 16 }}>{t("artPicker.replaceCoverArt")}</div>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ flexShrink: 0, width: 110 }}>
            {preview
              ? <img src={preview} alt="" style={{ width: "100%", aspectRatio: cropMode === "square" ? "1" : "2/3", objectFit: "cover", borderRadius: 10, display: "block" }} />
              : <div style={{ width: "100%", aspectRatio: cropMode === "square" ? "1" : "2/3", borderRadius: 10, background: `${accent.glow}0.1)`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 10, color: theme.textDim, textAlign: "center" }}>{t("artPicker.noArt")}</span></div>
            }
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
            <button onClick={() => fileRef.current?.click()} style={btnStyle("browse", `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`, accent.darkText ? "#1a1a1a" : "white")}>{t("artPicker.browseImage")}</button>
            {pendingData && <button onClick={handleSave} disabled={saving} style={btnStyle("save", "#4a9c4a", "white", { opacity: saving ? 0.6 : 1 })}>{saving ? t("artPicker.saving") : t("common.save")}</button>}
            {hasCustomArt && !pendingData && <button onClick={handleReset} style={btnStyle("reset", "rgba(255,255,255,0.08)", theme.text)}>{t("artPicker.resetToDefault")}</button>}
            <button onClick={onClose} style={btnStyle("cancel", "rgba(255,255,255,0.05)", theme.textDim)}>{t("common.cancel")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
