import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../contexts/ThemeContext";
import { useSettings } from "../contexts/SettingsContext";
import { SURFACE_STYLE_OPTIONS } from "../constants";
import { FocusRing } from "./ui";
import { modalOverlayStyle, modalPanelStyle, modalScrimStyle } from "./modals/modalStyles";

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

export function getMockRowStyle(surface: string, isDark: boolean, accentPrimary: string, accentGlow: string): CSSProperties {
  switch (surface) {
    case "glass":
      return isDark ? {
        background: "rgba(255,255,255,0.12)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: 10,
        color: "rgba(255,255,255,0.88)",
      } : {
        background: "rgba(255,255,255,0.62)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.75)",
        borderRadius: 10,
        color: "rgba(30,24,18,0.88)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)",
      };
    case "aero":
      return isDark ? {
        background: "linear-gradient(180deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.12) 100%)",
        border: "1px solid rgba(255,255,255,0.40)",
        borderRadius: 10,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65), inset 0 -1px 0 rgba(0,0,0,0.10)",
        color: "rgba(255,255,255,0.92)",
      } : {
        background: "linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.55) 100%)",
        border: "1px solid rgba(255,255,255,0.92)",
        borderRadius: 10,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.99), inset 0 -1px 0 rgba(0,0,0,0.06)",
        color: "rgba(30,24,18,0.90)",
      };
    case "material":
      return isDark ? {
        background: "#1e1b17",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.40)",
        color: "rgba(255,255,255,0.86)",
      } : {
        background: "#faf8f2",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(18,18,20,0.12), 0 1px 2px rgba(18,18,20,0.08)",
        color: "#1a1614",
      };
    case "clear":
      return isDark ? {
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 10,
        color: "rgba(255,255,255,0.80)",
      } : {
        background: "transparent",
        border: "1px solid rgba(0,0,0,0.14)",
        borderRadius: 10,
        color: "rgba(30,24,18,0.80)",
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
        background: isDark ? "rgba(8,8,14,0.92)" : "rgba(14,12,20,0.90)",
        border: `1px solid ${accentPrimary}`,
        borderRadius: 10,
        boxShadow: `0 0 12px ${accentGlow}0.50), inset 0 0 8px ${accentGlow}0.08)`,
        color: "rgba(255,255,255,0.88)",
      };
    case "win9x":
      return isDark ? {
        background: "#2f343d",
        border: "2px solid",
        borderColor: "#626b78 #05070a #05070a #626b78",
        borderRadius: 0,
        color: "#f2f4f8",
      } : {
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
  const themeValue = useTheme();
  const { accent, isDark, surfaceStyle, theme, resolvedTheme } = themeValue;
  const { settings, updateSetting } = useSettings();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const focusedCardRef = useRef<HTMLDivElement | null>(null);
  const currentSurface = String(settings.surface_style ?? "glass");
  const motionProfile =
    surfaceStyle === "win9x" || resolvedTheme === "webcore" ? "instant" :
    surfaceStyle === "material" ? "crisp" :
    resolvedTheme === "synthwave" ? "playful" :
    "standard";
  const previewBackdrop = isDark
    ? "linear-gradient(160deg, #080c1c 0%, #0e1428 50%, #080a16 100%)"
    : "linear-gradient(160deg, #e8e2d6 0%, #f2ede2 50%, #e4ddd0 100%)";

  useEffect(() => {
    const card = focusedCardRef.current;
    const panel = panelRef.current;
    if (!card || !panel) return;
    if (focusIndex < SURFACE_PICKER_COLS) {
      panel.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    const pad = 12;
    const cardTop = card.offsetTop;
    const cardBottom = cardTop + card.offsetHeight;
    if (cardTop < panel.scrollTop + pad) {
      panel.scrollTo({ top: cardTop - pad, behavior: "auto" });
    } else if (cardBottom > panel.scrollTop + panel.clientHeight - pad) {
      panel.scrollTo({ top: cardBottom - panel.clientHeight + pad, behavior: "auto" });
    }
  }, [focusIndex]);

  const handleSelect = (key: string) => {
    updateSetting("surface_style", key as any);
    onClose();
  };

  return (
    <div
      data-theme={resolvedTheme}
      data-motion={motionProfile}
      data-ui-motion={settings.ui_motion === false ? "off" : "on"}
      className="lo-anim-overlay"
      onClick={onClose}
      style={modalOverlayStyle()}
    >
      <div style={modalScrimStyle} />
      <div
        data-modal=""
        className="lo-anim-modal"
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        style={modalPanelStyle(themeValue, {
          width: "min(720px, 92vw)",
          maxHeight: "80vh",
          padding: "28px 24px 32px",
        })}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{t("settings.surfacePickerTitle")}</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 20, opacity: 0.5, lineHeight: 1, padding: "2px 6px", color: "inherit" }}>
            x
          </button>
        </div>

        <p style={{ fontSize: 11, color: theme.textDim, margin: "6px 0 20px", lineHeight: 1.5 }}>
          {t("settings.surfacePickerHint")}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${SURFACE_PICKER_COLS}, minmax(0, 1fr))`, gap: 12 }}>
          {SURFACE_KEYS.map((key, idx) => {
            const isActive = currentSurface === key;
            const isFocused = focusIndex === idx;
            const mockRowStyle = getMockRowStyle(key, isDark, accent.primary, accent.glow);
            return (
              <div
                key={key}
                ref={isFocused ? focusedCardRef : undefined}
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
                  transition: "outline 0.12s ease, box-shadow 0.12s ease",
                }}
              >
                <div style={{ height: 80, background: previewBackdrop, display: "flex", alignItems: "center", padding: "0 14px", position: "relative", contain: "strict", transform: "translateZ(0)" }}>
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
                <div style={{ padding: "10px 12px 12px", minHeight: 62, background: isDark ? "rgba(12,14,24,0.88)" : "rgba(245,246,252,0.92)", color: theme.text }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{String(t(`settings.values.${key}`, key))}</div>
                  <div style={{ fontSize: 10, lineHeight: 1.4, marginTop: 3, color: theme.textDim }}>
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
