import type { CSSProperties } from "react";
import { useTheme } from "../../contexts/ThemeContext";

interface ToggleKnobProps {
  value: boolean;
}

export function ToggleKnob({ value }: ToggleKnobProps) {
  const { accent, isDark } = useTheme();

  const trackStyle: CSSProperties = {
    width: 44,
    height: 24,
    borderRadius: 12,
    flexShrink: 0,
    position: "relative",
    transition: "background 0.2s ease",
    background: value
      ? accent.primary
      : isDark
      ? "rgba(255,255,255,0.15)"
      : "rgba(0,0,0,0.15)",
  };

  const knobStyle: CSSProperties = {
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "white",
    position: "absolute",
    top: 3,
    left: value ? 23 : 3,
    transition: "left 0.2s ease",
    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
  };

  return (
    <div style={trackStyle}>
      <div style={knobStyle} />
    </div>
  );
}
