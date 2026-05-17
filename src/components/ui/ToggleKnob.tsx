import type { CSSProperties } from "react";
import { useTheme } from "../../contexts/ThemeContext";

interface ToggleKnobProps {
  value: boolean;
}

export function ToggleKnob({ value }: ToggleKnobProps) {
  const { accent, isDark, surfaceStyle } = useTheme();
  const isPixel = surfaceStyle === "win9x";
  const lightAccentOnDark = value && isDark && accent.darkText;

  const trackStyle: CSSProperties = {
    width: 44,
    height: 24,
    borderRadius: isPixel ? 0 : 12,
    flexShrink: 0,
    position: "relative",
    transition: "background 0.2s ease, box-shadow 0.2s ease",
    background: lightAccentOnDark
      ? `linear-gradient(135deg, ${accent.dark} 0%, ${accent.primary} 100%)`
      : value
      ? accent.primary
      : isDark
      ? "rgba(255,255,255,0.15)"
      : "rgba(0,0,0,0.15)",
    boxShadow: lightAccentOnDark
      ? `inset 0 0 0 1px rgba(255,255,255,0.32), 0 0 12px ${accent.glow}0.24)`
      : undefined,
  };

  const knobStyle: CSSProperties = {
    width: 18,
    height: 18,
    borderRadius: isPixel ? 0 : "50%",
    background: lightAccentOnDark ? "rgba(18,18,20,0.92)" : "white",
    position: "absolute",
    top: 3,
    left: value ? 23 : 3,
    transition: "left 0.2s ease, background 0.2s ease, box-shadow 0.2s ease",
    boxShadow: lightAccentOnDark
      ? "0 1px 4px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.28)"
      : "0 1px 4px rgba(0,0,0,0.3)",
  };

  return (
    <div style={trackStyle}>
      <div style={knobStyle} />
    </div>
  );
}
