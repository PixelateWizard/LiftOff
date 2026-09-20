import type { CSSProperties } from "react";
import type { ThemeValue } from "../../contexts/ThemeContext";

/** First-run setup lives outside the scaled app root so it can cover the shell. */
export const ONBOARDING_OVERLAY_Z = 9500;
/** Drop the setup overlay while an account dialog is open so it cannot cover it. */
export const ONBOARDING_BENEATH_ACCOUNT_Z = 1500;
/** Steam, Microsoft, and Spotify connect dialogs must beat onboarding (9500). */
export const ACCOUNT_DIALOG_Z = 10000;

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

// Preserve the selected material's fill, blur, border, and shadow together.
export function modalSurfaceStyle(themeValue: ThemeValue): CSSProperties {
  const { glass, materialTokens, surfaceStyle, resolvedTheme, surface } = themeValue;
  return {
    ...materialTokens,
    ...glass,
    ...(surfaceStyle === "win9x" ? {
      background: surface.panelBg,
      border: "2px solid",
      borderColor: surface.borderRaised,
      boxShadow: surface.panelShadow,
    } : {}),
    borderRadius: resolvedTheme === "cyberpunk" || surfaceStyle === "win9x" ? 0 : surfaceStyle === "material" ? 16 : 24,
  };
}

export function modalPanelStyle(
  themeValue: ThemeValue,
  options: { width: string; maxHeight: string; padding: string }
): CSSProperties {
  const { theme } = themeValue;
  return {
    ...modalSurfaceStyle(themeValue),
    position: "relative",
    zIndex: 1,
    width: options.width,
    maxHeight: options.maxHeight,
    overflowY: "auto",
    boxSizing: "border-box",
    padding: options.padding,
    color: theme.text,
    fontFamily: "'Segoe UI', sans-serif",
  };
}
