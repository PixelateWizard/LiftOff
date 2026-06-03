import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../contexts/ThemeContext";
import { useSettings } from "../contexts/SettingsContext";
import { FocusRing } from "./ui";
import { normalizeThemeKey, THEME_OPTIONS } from "../constants";
import type { AccentColors } from "../types";
import lofiBg from "../assets/themes/lofi/cozy_moonlit_study_night_scene.mp4";
import {
  SpaceBg,
  SkyBg,
  PlasmaBg,
  CinderBg,
  WashBg,
  AuroraBg,
  SynthwaveBg,
  CyberpunkBg,
  LofiBg,
  ForestBg,
  WebcoreBg,
} from "./backgrounds";

export const THEME_KEYS = [...THEME_OPTIONS];
export const THEME_PICKER_COLS = 3;

const SIM_W = 1280;
const SIM_H = 720;
const PREVIEW_W = 240;
const PREVIEW_H = 100;
const SCALE = PREVIEW_W / SIM_W;

export const THEME_METADATA: Record<string, {
  fallbackBg: string;
  light?: boolean;
  render: (accent: AccentColors, isLive: boolean) => ReactNode;
}> = {
  space: { fallbackBg: "#070910", render: () => <SpaceBg /> },
  sky: { fallbackBg: "#9ecae4", light: true, render: () => <SkyBg /> },
  plasma: { fallbackBg: "#05050b", render: (accent) => <PlasmaBg accent={accent} /> },
  cinder: { fallbackBg: "#100806", render: (accent) => <CinderBg accent={accent} /> },
  wash: { fallbackBg: "#f8f5f0", light: true, render: (accent) => <WashBg accent={accent} washPink={accent.glow} /> },
  aurora: { fallbackBg: "#020b14", render: (accent) => <AuroraBg accent={accent} /> },
  synthwave: { fallbackBg: "#07020e", render: (accent) => <SynthwaveBg accent={accent} /> },
  cyberpunk: { fallbackBg: "#01040a", render: (accent, isLive) => <CyberpunkBg accent={accent} effectsEnabled={isLive} /> },
  lofi: {
    fallbackBg: "#1e1108",
    render: (_accent, isLive) => <LofiPreview isLive={isLive} />,
  },
  forest: { fallbackBg: "#010a04", render: (accent) => <ForestBg accent={accent} /> },
  webcore: { fallbackBg: "#5c9dc8", light: true, render: (accent, isLive) => <WebcoreBg accent={accent} effectsEnabled={isLive} /> },
  onyx: { fallbackBg: "#060b18", render: () => null },
};

function LofiPreview({ isLive }: { isLive: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  return <LofiBg lofiVideoRef={videoRef} lofiBg={lofiBg} lofiEffectsEnabled={isLive} appPaused={!isLive} />;
}

interface ThemePreviewProps {
  keyName: string;
  isLive: boolean;
  accent: AccentColors;
}

function ThemePreview({ keyName, isLive, accent }: ThemePreviewProps) {
  const meta = THEME_METADATA[keyName];
  const preview = meta.render(accent, isLive);
  return (
    <div style={{
      height: PREVIEW_H,
      overflow: "hidden",
      position: "relative",
      isolation: "isolate",
      background: meta.fallbackBg,
    }}>
      {preview && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: SIM_W,
          height: SIM_H,
          transform: `scale(${SCALE})`,
          transformOrigin: "0 0",
          pointerEvents: "none",
        }}>
          {preview}
        </div>
      )}
    </div>
  );
}

interface ThemePickerModalProps {
  onClose: () => void;
  focusIndex: number;
  setFocusIndex: (n: number) => void;
}

export function ThemePickerModal({ onClose, focusIndex, setFocusIndex }: ThemePickerModalProps) {
  const { t } = useTranslation();
  const { accent, isDark, surfaceStyle } = useTheme();
  const { settings, updateSetting } = useSettings();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const currentTheme = normalizeThemeKey(String(settings.theme ?? "space"));

  const handleSelect = (key: string) => {
    updateSetting("theme", key as any);
    onClose();
  };

  const backdropStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 9000,
    background: "rgba(0,0,0,0.72)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const panelStyle: CSSProperties = {
    position: "relative",
    width: "min(800px, 94vw)",
    maxHeight: "84vh",
    overflowY: "auto",
    borderRadius: surfaceStyle === "win9x" ? 0 : 20,
    padding: "28px 24px 32px",
    background: isDark ? "rgba(14,16,28,0.95)" : "rgba(240,242,250,0.96)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)"}`,
    boxShadow: "0 32px 80px rgba(0,0,0,0.60)",
  };

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{t("settings.themePickerTitle")}</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 20, opacity: 0.5, lineHeight: 1, padding: "2px 6px", color: "inherit" }}>
            x
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${THEME_PICKER_COLS}, minmax(0, 1fr))`, gap: 10 }}>
          {THEME_KEYS.map((key, idx) => {
            const meta = THEME_METADATA[key];
            const isActive = currentTheme === key;
            const isFocused = focusIndex === idx;
            const isLive = key === hoveredKey || isFocused || isActive;
            return (
              <div
                key={key}
                onClick={() => handleSelect(key)}
                onMouseEnter={() => {
                  setHoveredKey(key);
                  setFocusIndex(idx);
                }}
                onMouseLeave={() => setHoveredKey(null)}
                style={{
                  position: "relative",
                  borderRadius: surfaceStyle === "win9x" ? 0 : 12,
                  overflow: "hidden",
                  cursor: "pointer",
                  outline: (isFocused || isActive) ? `2px solid ${accent.primary}` : "2px solid transparent",
                  outlineOffset: isFocused ? 3 : 2,
                  boxShadow: isActive ? `0 4px 20px ${accent.glow}0.45)` : "0 2px 8px rgba(0,0,0,0.28)",
                  transition: "outline 0.12s ease, box-shadow 0.12s ease, transform 0.1s ease",
                  transform: isFocused ? "scale(1.03)" : "scale(1)",
                }}
              >
                <ThemePreview keyName={key} isLive={isLive} accent={accent} />
                {isActive && (
                  <div style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: "50%", background: accent.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: accent.darkText ? "#1a1a1a" : "white", boxShadow: `0 2px 8px ${accent.glow}0.6)`, zIndex: 2 }}>
                    {"\u2713"}
                  </div>
                )}
                <div style={{
                  padding: "9px 11px 11px",
                  minHeight: 58,
                  background: meta.light
                    ? (isDark ? "rgba(240,235,225,0.92)" : "rgba(245,240,232,0.96)")
                    : (isDark ? "rgba(10,12,22,0.90)" : "rgba(20,22,34,0.88)"),
                  color: meta.light ? "#1a1614" : "rgba(255,255,255,0.90)",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {String(t(`settings.values.${key}`, key))}
                  </div>
                  <div style={{ fontSize: 10, lineHeight: 1.35, marginTop: 3, opacity: 0.58 }}>
                    {String(t(`settings.themeDesc.${key}`))}
                  </div>
                </div>
                <FocusRing focused={isFocused} variant="glow" elementRadius={12} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
