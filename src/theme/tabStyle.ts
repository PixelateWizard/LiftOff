import type { CSSProperties } from "react";
import type { AccentColors } from "../types";

export interface TabPillStyleArgs {
  active: boolean;
  hovered?: boolean;
  surfaceStyle: string;
  resolvedTheme: string;
  accent: AccentColors;
  isDark: boolean;
  activeTextColor: string;
  textDim: string;
  glassEnabled: boolean;
}

/**
 * Shared visual styling for tab pills. Layout, inactive surfaces, dots, and
 * focus rings stay with each caller.
 */
export function getTabPillStyle(a: TabPillStyleArgs): CSSProperties {
  const { active, surfaceStyle, resolvedTheme, accent, isDark, activeTextColor, textDim, glassEnabled } = a;
  const isOnyx = resolvedTheme === "onyx";
  const isCyber = resolvedTheme === "cyberpunk";
  const isNeon = surfaceStyle === "neon";
  const wirey = isCyber || isNeon;

  if (!active) {
    return { color: textDim };
  }

  if (isOnyx) {
    return {
      background: "transparent",
      border: "1px solid transparent",
      color: accent.primary,
      boxShadow: "none",
    };
  }

  if (wirey) {
    return {
      background: "transparent",
      border: "1px solid transparent",
      color: accent.primary,
      boxShadow: "none",
      filter: `drop-shadow(0 0 7px ${accent.glow}0.85))`,
      textShadow: `0 0 10px ${accent.glow}0.90)`,
    };
  }

  if (surfaceStyle === "glass") {
    return {
      background: `${accent.glow}0.65)`,
      border: `1px solid ${accent.glow}0.55)`,
      color: activeTextColor,
      backdropFilter: "blur(20px) saturate(160%)",
      WebkitBackdropFilter: "blur(20px) saturate(160%)",
      boxShadow: `inset 0 1px 1px rgba(255,255,255,0.40), inset 0 0 0 0.5px rgba(255,255,255,0.22), 0 0 18px ${accent.glow}0.55)`,
    };
  }

  if (!glassEnabled) {
    return {
      background: `${accent.glow}0.20)`,
      border: `1px solid ${accent.glow}0.60)`,
      color: isDark ? "white" : activeTextColor,
      boxShadow: "none",
    };
  }

  if (surfaceStyle === "obsidian") {
    return {
      background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
      border: "1px solid transparent",
      color: accent.primary,
      boxShadow: "none",
    };
  }

  const activeShadow = surfaceStyle === "aero"
    ? `inset 0 1px 0 rgba(255,255,255,0.80), inset 0 2px 10px rgba(255,255,255,0.24), inset 0 -1px 0 rgba(0,0,0,0.28), 0 4px 16px ${accent.glow}0.55)`
    : surfaceStyle === "material"
    ? "var(--material-shadow-medium)"
    : `0 4px 24px ${accent.glow}0.5)`;

  return {
    background: accent.primary,
    border: `1px solid ${accent.primary}`,
    color: activeTextColor,
    boxShadow: activeShadow,
  };
}
