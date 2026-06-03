import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../contexts/ThemeContext";
import { useSettings } from "../contexts/SettingsContext";
import { SURFACE_STYLE_OPTIONS } from "../constants";
import { FocusRing } from "./ui";

export const SURFACE_KEYS = [...SURFACE_STYLE_OPTIONS];
export const SURFACE_PICKER_COLS = 3;

export const SURFACE_METADATA: Record<string, { descriptionKey: string }> = {
  glass: { descriptionKey: "settings.surfaceDesc.glass" },
  aero: { descriptionKey: "settings.surfaceDesc.aero" },
  material: { descriptionKey: "settings.surfaceDesc.material" },
  clear: { descriptionKey: "settings.surfaceDesc.clear" },
  obsidian: { descriptionKey: "settings.surfaceDesc.obsidian" },
  neon: { descriptionKey: "settings.surfaceDesc.neon" },
  win9x: { descriptionKey: "settings.surfaceDesc.win9x" },
};

export function getMockRowStyle(surface: string, accentPrimary: string, accentGlow: string): CSSProperties {
  switch (surface) {
    case "glass":
      return {
        background: "rgba(255,255,255,0.12)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: 10,
        color: "rgba(255,255,255,0.88)",
      };
    case "aero":
      return {
        background: "linear-gradient(180deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.12) 100%)",
        border: "1px solid rgba(255,255,255,0.40)",
        borderRadius: 10,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65), inset 0 -1px 0 rgba(0,0,0,0.10)",
        color: "rgba(255,255,255,0.92)",
      };
    case "material":
      return {
        background: "#faf8f2",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.10)",
        color: "#1a1614",
      };
    case "clear":
      return {
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 10,
        color: "rgba(255,255,255,0.80)",
      };
    case "obsidian":
      return {
        background: "rgba(18,18,26,0.88)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 10,
        boxShadow: "0 2px 10px rgba(0,0,0,0.40)",
        color: "rgba(255,255,255,0.80)",
      };
    case "neon":
      return {
        background: "rgba(8,8,14,0.92)",
        border: `1px solid ${accentPrimary}`,
        borderRadius: 10,
        boxShadow: `0 0 12px ${accentGlow}0.50), inset 0 0 8px ${accentGlow}0.08)`,
        color: "rgba(255,255,255,0.88)",
      };
    case "win9x":
      return {
        background: "#c0c0c0",
        border: "2px solid",
        borderColor: "#ffffff #808080 #808080 #ffffff",
        borderRadius: 0,
        color: "#000000",
      };
    default:
      return { background: "rgba(255,255,255,0.08)", borderRadius: 10, color: "white" };
  }
}

function MockToggle({ surface, accent }: { surface: string; accent: string }) {
  const isWin9x = surface === "win9x";
  const isMaterial = surface === "material";
  return (
    <div style={{ width: 36, height: 20, borderRadius: isWin9x ? 0 : 12, background: accent, border: isWin9x ? "2px inset #808080" : "none", position: "relative", flexShrink: 0, boxShadow: isMaterial ? "0 1px 3px rgba(0,0,0,0.20)" : undefined }}>
      <div style={{ position: "absolute", right: 3, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, borderRadius: isWin9x ? 0 : "50%", background: isWin9x ? "#c0c0c0" : "white", boxShadow: isWin9x ? "1px 1px 0 #fff, -1px -1px 0 #808080" : "0 1px 4px rgba(0,0,0,0.35)" }} />
    </div>
  );
}

interface SurfacePickerModalProps {
  onClose: () => void;
  focusIndex: number;
  setFocusIndex: (n: number) => void;
}

export function SurfacePickerModal({ onClose, focusIndex, setFocusIndex }: SurfacePickerModalProps) {
  const { t } = useTranslation();
  const { accent, isDark, surfaceStyle } = useTheme();
  const { settings, updateSetting } = useSettings();
  const currentSurface = String(settings.surface_style ?? "glass");

  const handleSelect = (key: string) => {
    updateSetting("surface_style", key as any);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "min(720px, 92vw)",
          maxHeight: "80vh",
          overflowY: "auto",
          borderRadius: surfaceStyle === "win9x" ? 0 : 20,
          padding: "28px 24px 32px",
          background: isDark ? "rgba(14,16,28,0.92)" : "rgba(240,242,250,0.94)",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)"}`,
          boxShadow: "0 32px 80px rgba(0,0,0,0.55)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{t("settings.surfacePickerTitle")}</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 20, opacity: 0.5, lineHeight: 1, padding: "2px 6px", color: "inherit" }}>
            x
          </button>
        </div>

        <p style={{ fontSize: 11, opacity: 0.5, margin: "6px 0 20px", lineHeight: 1.5 }}>
          {t("settings.surfacePickerHint")}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${SURFACE_PICKER_COLS}, minmax(0, 1fr))`, gap: 12 }}>
          {SURFACE_KEYS.map((key, idx) => {
            const isActive = currentSurface === key;
            const isFocused = focusIndex === idx;
            const mockRowStyle = getMockRowStyle(key, accent.primary, accent.glow);
            return (
              <div
                key={key}
                onClick={() => handleSelect(key)}
                onMouseEnter={() => setFocusIndex(idx)}
                style={{
                  position: "relative",
                  borderRadius: surfaceStyle === "win9x" ? 0 : 14,
                  overflow: "hidden",
                  cursor: "pointer",
                  outline: (isFocused || isActive) ? `2px solid ${accent.primary}` : "2px solid transparent",
                  outlineOffset: isFocused ? 3 : 2,
                  boxShadow: isActive ? `0 4px 20px ${accent.glow}0.40)` : "0 2px 8px rgba(0,0,0,0.25)",
                  transition: "outline 0.12s ease, transform 0.1s ease",
                  transform: isFocused ? "scale(1.03)" : "scale(1)",
                }}
              >
                <div style={{ height: 80, background: key === "material" ? "linear-gradient(135deg, #e8e0d0 0%, #d8d0c0 100%)" : "linear-gradient(160deg, #080c1c 0%, #0e1428 50%, #080a16 100%)", display: "flex", alignItems: "center", padding: "0 14px", position: "relative" }}>
                  <div style={{ ...mockRowStyle, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", width: "100%", fontSize: 11, fontWeight: 600 }}>
                    <span style={{ opacity: 0.80 }}>{t("settings.surfacePickerSample")}</span>
                    <MockToggle surface={key} accent={accent.primary} />
                  </div>
                  {isActive && (
                    <div style={{ position: "absolute", top: 7, right: 7, width: 20, height: 20, borderRadius: "50%", background: accent.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: accent.darkText ? "#1a1a1a" : "white", boxShadow: `0 2px 6px ${accent.glow}0.5)` }}>
                      {"\u2713"}
                    </div>
                  )}
                </div>
                <div style={{ padding: "10px 12px 12px", minHeight: 62, background: isDark ? "rgba(12,14,24,0.88)" : "rgba(245,246,252,0.92)" }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{String(t(`settings.values.${key}`, key))}</div>
                  <div style={{ fontSize: 10, lineHeight: 1.4, marginTop: 3, opacity: 0.60 }}>
                    {String(t(SURFACE_METADATA[key].descriptionKey))}
                  </div>
                </div>
                <FocusRing focused={isFocused} variant="glow" elementRadius={14} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
