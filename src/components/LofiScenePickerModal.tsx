import { useEffect, useRef } from "react";
import type { CSSProperties, RefObject } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../contexts/ThemeContext";
import { useSettings } from "../contexts/SettingsContext";
import { FocusRing } from "./ui";
import { modalOverlayStyle, modalPanelStyle, modalScrimStyle } from "./modals/modalStyles";
import { LOFI_SCENE_OPTIONS, LOFI_SCENE_PICKER_COLS } from "../constants";
import type { LofiScene } from "../types";
import { LOFI_SCENE_POSTERS, resolveLofiScene } from "../theme/lofiScenes";

interface LofiSceneGridProps {
  selected: LofiScene;
  focusedIndex: number;
  onFocus: (index: number) => void;
  onSelect: (scene: LofiScene) => void;
  onActivate?: (scene: LofiScene) => void;
  cardClassName?: string;
  focusedCardRef?: RefObject<HTMLDivElement | null>;
  showFocusRing?: boolean;
}

export function LofiSceneGrid({
  selected,
  focusedIndex,
  onFocus,
  onSelect,
  onActivate,
  cardClassName,
  focusedCardRef,
  showFocusRing = true,
}: LofiSceneGridProps) {
  const { t } = useTranslation();
  const { accent, isDark, surfaceStyle } = useTheme();

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${LOFI_SCENE_PICKER_COLS}, minmax(0, 1fr))`, gap: 10 }}>
      {LOFI_SCENE_OPTIONS.map((key, idx) => {
        const isActive = selected === key;
        const isFocused = focusedIndex === idx;
        return (
          <div
            key={key}
            className={cardClassName}
            ref={isFocused ? focusedCardRef : undefined}
            onClick={() => onSelect(key)}
            onDoubleClick={() => onActivate?.(key)}
            onMouseMove={() => onFocus(idx)}
            style={{
              position: "relative",
              overflow: "hidden",
              cursor: "pointer",
              borderRadius: surfaceStyle === "win9x" ? 0 : 12,
              outline: (isFocused || isActive) ? `2px solid ${accent.primary}` : "2px solid transparent",
              outlineOffset: isFocused ? 3 : 2,
              boxShadow: isActive ? `0 4px 20px ${accent.glow}0.45)` : "0 2px 8px rgba(0,0,0,0.28)",
              background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
            }}
          >
            <img
              src={LOFI_SCENE_POSTERS[key]}
              alt=""
              style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }}
            />
            {isActive && (
              <div style={{
                position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: "50%",
                background: accent.primary, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, color: accent.darkText ? "#1a1a1a" : "white",
                boxShadow: `0 2px 8px ${accent.glow}0.6)`, zIndex: 2,
              }}>
                {"\u2713"}
              </div>
            )}
            <div style={{
              padding: "9px 11px 11px",
              background: isDark ? "rgba(10,12,22,0.90)" : "rgba(255,255,255,0.78)",
              color: isDark ? "rgba(255,255,255,0.90)" : "#1a1614",
              fontSize: 12, fontWeight: 700,
            }}>
              {String(t(`settings.values.${key}`, key))}
            </div>
            {showFocusRing && <FocusRing focused={isFocused} variant="glow" elementRadius={12} />}
          </div>
        );
      })}
    </div>
  );
}

interface LofiScenePickerModalProps {
  onClose: () => void;
  focusIndex: number;
  setFocusIndex: (n: number) => void;
}

export function LofiScenePickerModal({ onClose, focusIndex, setFocusIndex }: LofiScenePickerModalProps) {
  const { t } = useTranslation();
  const themeValue = useTheme();
  const { surfaceStyle, resolvedTheme } = themeValue;
  const { settings, updateSetting } = useSettings();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const focusedCardRef = useRef<HTMLDivElement | null>(null);
  const currentScene = resolveLofiScene(settings.lofi_scene);
  const motionProfile =
    surfaceStyle === "win9x" || resolvedTheme === "webcore" ? "instant" :
    surfaceStyle === "material" ? "crisp" :
    resolvedTheme === "synthwave" ? "playful" :
    "standard";

  useEffect(() => {
    const card = focusedCardRef.current;
    const panel = panelRef.current;
    if (!card || !panel) return;
    if (focusIndex < LOFI_SCENE_PICKER_COLS) {
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

  const handleSelect = (key: LofiScene) => {
    updateSetting("lofi_scene", key);
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
      style={modalOverlayStyle()}
      onClick={onClose}
    >
      <div className="lo-anim-overlay" style={modalScrimStyle} />
      <div data-modal="" className="lo-anim-modal" ref={panelRef} style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{t("settings.lofiScenePickerTitle")}</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 20, opacity: 0.5, lineHeight: 1, padding: "2px 6px", color: "inherit" }}>
            x
          </button>
        </div>
        <LofiSceneGrid
          selected={currentScene}
          focusedIndex={focusIndex}
          onFocus={setFocusIndex}
          onSelect={handleSelect}
          focusedCardRef={focusedCardRef}
        />
      </div>
    </div>
  );
}
