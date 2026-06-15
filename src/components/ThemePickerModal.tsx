import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../contexts/ThemeContext";
import { useSettings } from "../contexts/SettingsContext";
import { FocusRing } from "./ui";
import { modalOverlayStyle, modalPanelStyle, modalScrimStyle } from "./modals/modalStyles";
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
      contain: "strict",
      transform: "translateZ(0)",
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
  const themeValue = useTheme();
  const { accent, isDark, surfaceStyle, resolvedTheme } = themeValue;
  const { settings, updateSetting } = useSettings();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const focusedCardRef = useRef<HTMLDivElement | null>(null);
  const currentTheme = normalizeThemeKey(String(settings.theme ?? "space"));
  const motionProfile =
    surfaceStyle === "win9x" || resolvedTheme === "webcore" ? "instant" :
    surfaceStyle === "material" ? "crisp" :
    resolvedTheme === "synthwave" ? "playful" :
    "standard";

  useEffect(() => {
    const card = focusedCardRef.current;
    const panel = panelRef.current;
    if (!card || !panel) return;
    if (focusIndex < THEME_PICKER_COLS) {
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
    updateSetting("theme", key as any);
    onClose();
  };

  const panelStyle: CSSProperties = modalPanelStyle(themeValue, {
    width: "min(800px, 94vw)",
    maxHeight: "84vh",
    padding: "28px 24px 32px",
  });

  return (
    <div
      data-theme={resolvedTheme}
      data-motion={motionProfile}
      data-ui-motion={settings.ui_motion === false ? "off" : "on"}
      className="lo-anim-overlay"
      style={modalOverlayStyle()}
      onClick={onClose}
    >
      <div style={modalScrimStyle} />
      <div data-modal="" className="lo-anim-modal" ref={panelRef} style={panelStyle} onClick={(e) => e.stopPropagation()}>
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
            return (
              <div
                key={key}
                ref={isFocused ? focusedCardRef : undefined}
                onClick={() => handleSelect(key)}
                onMouseEnter={() => {
                  setFocusIndex(idx);
                }}
                style={{
                  position: "relative",
                  borderRadius: surfaceStyle === "win9x" ? 0 : 12,
                  overflow: "hidden",
                  cursor: "pointer",
                  outline: (isFocused || isActive) ? `2px solid ${accent.primary}` : "2px solid transparent",
                  outlineOffset: isFocused ? 3 : 2,
                  boxShadow: isActive ? `0 4px 20px ${accent.glow}0.45)` : "0 2px 8px rgba(0,0,0,0.28)",
                  transition: "outline 0.12s ease, box-shadow 0.12s ease",
                }}
              >
                <ThemePreview keyName={key} isLive={key === currentTheme} accent={accent} />
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
                  <div style={{ fontSize: 10, lineHeight: 1.35, marginTop: 3, color: meta.light ? "rgba(26,22,20,0.62)" : "rgba(255,255,255,0.58)" }}>
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
