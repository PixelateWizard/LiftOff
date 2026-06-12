import type { CSSProperties } from "react";
import type { ThemeValue } from "../../contexts/ThemeContext";

export function modalOverlayStyle(zIndex = 9000): CSSProperties {
  return {
    position: "fixed",
    inset: 0,
    zIndex,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    isolation: "isolate",
    fontFamily: "'Segoe UI', sans-serif",
  };
}

export const modalScrimStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 0,
  background: "rgba(0,0,0,0.85)",
};

export function modalPanelStyle(
  themeValue: ThemeValue,
  options: { width: string; maxHeight: string; padding: string }
): CSSProperties {
  const { accent, glass, materialTokens, surfaceStyle, theme, resolvedTheme } = themeValue;
  return {
    ...materialTokens,
    ...glass,
    position: "relative",
    zIndex: 1,
    width: options.width,
    maxHeight: options.maxHeight,
    overflowY: "auto",
    boxSizing: "border-box",
    borderRadius: resolvedTheme === "cyberpunk" ? 0 : surfaceStyle === "win9x" ? 0 : surfaceStyle === "material" ? 16 : 24,
    padding: options.padding,
    color: theme.text,
    fontFamily: "'Segoe UI', sans-serif",
    boxShadow: `${String(glass.boxShadow ?? "0 8px 40px rgba(0,0,0,0.3)")}, 0 20px 80px rgba(0,0,0,0.45)`,
    outline: surfaceStyle === "material" ? undefined : `1px solid ${accent.glow}0.10)`,
  };
}
