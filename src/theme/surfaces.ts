import { useMemo, type CSSProperties } from "react";
import type { AccentColors } from "../types";

// Paper grain for Material surface: SVG fractal noise, stitched and desaturated.
export const PAPER_GRAIN_LIGHT = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72 0.54' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23p)' opacity='0.038'/%3E%3C/svg%3E";
export const PAPER_GRAIN_DARK  = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72 0.54' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23p)' opacity='0.075'/%3E%3C/svg%3E";

export interface SurfaceTokens {
  panelBg: string;
  insetBg: string;
  activeBg: string;
  raisedLight: string;
  raisedMid: string;
  shadow: string;
  darkEdge: string;
  borderRaised: string;
  borderRaisedSoft: string;
  borderSunken: string;
  bevelRaised: string;
  bevelRaisedSoft: string;
  bevelSunken: string;
  titleBarBg: string;
  titleBarBorder: string;
  titleBarText: string;
  buttonBg: string;
  buttonText: string;
  buttonBorder: string;
  buttonShadow: string;
  panelShadow: string;
  dropShadow: string;
  cardFocusRing: string;
  coverShadow: string;
}

interface SurfaceThemeArgs {
  resolvedTheme: string;
  surfaceStyle: string;
  glassEnabled: boolean;
  isDark: boolean;
  isWash: boolean;
  cinematicLight: boolean;
  accent: AccentColors;
}

const STANDALONE_BACKGROUNDS = new Set(["aurora", "synthwave", "cyberpunk", "lofi", "forest", "webcore", "onyx"]);

function buildMaterialTokens(isDark: boolean, isWash: boolean, accent: AccentColors): CSSProperties {
  return {
    "--material-bg-primary": isDark ? "#141312" : isWash ? "#f7f4ef" : `color-mix(in srgb, ${accent.lightBg} 86%, #f7f4ef 14%)`,
    "--material-bg-secondary": isDark ? "#1b1917" : isWash ? "#faf8f4" : `color-mix(in srgb, ${accent.lightBg} 72%, #ffffff 28%)`,
    "--material-shadow-low": isDark
      ? "0 6px 18px rgba(0,0,0,0.22), 0 14px 38px rgba(0,0,0,0.16)"
      : isWash ? `0 5px 18px color-mix(in srgb, ${accent.primary} 18%, rgba(38,26,16,0.14) 82%), 0 14px 36px rgba(38,26,16,0.10)` : "0 5px 18px rgba(18,18,20,0.075), 0 14px 36px rgba(18,18,20,0.052)",
    "--material-shadow-medium": isDark
      ? "0 10px 28px rgba(0,0,0,0.28), 0 22px 56px rgba(0,0,0,0.20)"
      : isWash ? `0 9px 26px color-mix(in srgb, ${accent.primary} 20%, rgba(38,26,16,0.17) 80%), 0 22px 52px rgba(38,26,16,0.12)` : "0 9px 28px rgba(18,18,20,0.105), 0 22px 54px rgba(18,18,20,0.075)",
    "--material-shadow-high": isDark
      ? "0 14px 36px rgba(0,0,0,0.34), 0 32px 72px rgba(0,0,0,0.24)"
      : isWash ? `0 12px 34px color-mix(in srgb, ${accent.primary} 22%, rgba(38,26,16,0.20) 78%), 0 28px 68px rgba(38,26,16,0.14)` : "0 13px 36px rgba(18,18,20,0.13), 0 30px 72px rgba(18,18,20,0.09)",
    "--material-shadow-pressed": isDark
      ? "0 4px 14px rgba(0,0,0,0.22), 0 10px 28px rgba(0,0,0,0.14)"
      : "0 4px 14px rgba(18,18,20,0.075), 0 10px 28px rgba(18,18,20,0.045)",
    "--material-elevation-1": isDark ? "#181511" : isWash ? "#fdfaf7" : `color-mix(in srgb, ${accent.lightBg} 58%, #faf8f2 42%)`,
    "--material-elevation-2": isDark ? "#1e1b17" : isWash ? "#ffffff" : `color-mix(in srgb, ${accent.lightBg} 36%, #faf8f2 64%)`,
    "--material-elevation-3": isDark ? "#242019" : isWash ? "#ffffff" : "#faf8f2",
    "--material-inset-bg": isDark ? "#221f19" : `color-mix(in srgb, ${accent.lightBg} 82%, #efe7dc 18%)`,
    "--material-inset-row": isDark ? "#26231c" : `color-mix(in srgb, ${accent.lightBg} 68%, #fdf7ec 32%)`,
    "--material-inset-row-active": isDark ? "#2b261f" : `color-mix(in srgb, ${accent.lightBg} 42%, #faf8f2 58%)`,
    "--material-inset-top-edge": isDark ? "rgba(255,255,255,0.055)" : "rgba(18,18,20,0.075)",
    "--material-inset-bottom-edge": isDark ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.62)",
    "--material-border-subtle": isDark ? "rgba(255,255,255,0.025)" : isWash ? "rgba(42,30,20,0.035)" : "rgba(40,28,14,0.045)",
  } as CSSProperties;
}

function buildSurfaceTokens(surfaceStyle: string, isDark: boolean, accent: AccentColors): SurfaceTokens {
  if (surfaceStyle === "win9x") {
    const panelBg = isDark ? "#2f343d" : "#d4d0c8";
    const insetBg = isDark ? "#252a31" : "#c0c0c0";
    const activeBg = isDark ? "#3a404a" : "#d4d0c8";
    const raisedLight = isDark ? "#626b78" : "#ffffff";
    const raisedMid = isDark ? "#4d5663" : "#dfdfdf";
    const shadow = isDark ? "#11151b" : "#808080";
    const darkEdge = isDark ? "#05070a" : "#404040";
    const borderRaised = `${raisedLight} ${darkEdge} ${darkEdge} ${raisedLight}`;
    const borderRaisedSoft = `${raisedLight} ${shadow} ${shadow} ${raisedLight}`;
    const borderSunken = `${darkEdge} ${raisedLight} ${raisedLight} ${darkEdge}`;
    const bevelRaised = `inset 1px 1px 0 ${raisedMid}, inset -1px -1px 0 ${darkEdge}`;
    const bevelRaisedSoft = `inset 1px 1px 0 ${raisedMid}, inset -1px -1px 0 ${shadow}`;
    const bevelSunken = `inset 1px 1px 0 ${raisedLight}, inset -1px -1px 0 ${shadow}`;
    return {
      panelBg, insetBg, activeBg, raisedLight, raisedMid, shadow, darkEdge,
      borderRaised, borderRaisedSoft, borderSunken, bevelRaised, bevelRaisedSoft, bevelSunken,
      titleBarBg: `linear-gradient(90deg, color-mix(in srgb, ${accent.primary} 72%, #06102a 28%), color-mix(in srgb, ${accent.primary} 36%, #1a2a60 64%))`,
      titleBarBorder: `1px solid ${shadow}`,
      titleBarText: "#ffffff",
      buttonBg: panelBg,
      buttonText: isDark ? "#f2f4f8" : "#111111",
      buttonBorder: borderRaised,
      buttonShadow: `inset 1px 1px 0 ${raisedMid}`,
      panelShadow: `${bevelRaisedSoft}, ${isDark ? "8px 8px 0 rgba(0,0,0,0.42)" : "8px 8px 0 rgba(0,0,0,0.28)"}`,
      dropShadow: isDark ? "8px 8px 0 rgba(0,0,0,0.42)" : "8px 8px 0 rgba(0,0,0,0.28)",
      cardFocusRing: raisedLight,
      coverShadow: `2px 2px 0 ${shadow}, -1px -1px 0 ${raisedLight}`,
    };
  }

  const panelBg = surfaceStyle === "material"
    ? "var(--material-elevation-2)"
    : isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.72)";
  const insetBg = surfaceStyle === "material"
    ? "var(--material-inset-bg)"
    : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const activeBg = surfaceStyle === "material"
    ? "var(--material-inset-row-active)"
    : isDark ? `${accent.glow}0.08)` : `${accent.glow}0.05)`;
  const raisedLight = isDark ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.75)";
  const raisedMid = isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.55)";
  const shadow = isDark ? "rgba(0,0,0,0.30)" : "rgba(0,0,0,0.12)";
  const darkEdge = isDark ? "rgba(0,0,0,0.40)" : "rgba(0,0,0,0.16)";

  return {
    panelBg, insetBg, activeBg, raisedLight, raisedMid, shadow, darkEdge,
    borderRaised: raisedLight,
    borderRaisedSoft: raisedLight,
    borderSunken: shadow,
    bevelRaised: `inset 0 1px 0 ${raisedLight}`,
    bevelRaisedSoft: `inset 0 1px 0 ${raisedMid}`,
    bevelSunken: `inset 0 1px 0 ${shadow}`,
    titleBarBg: surfaceStyle === "material" ? "var(--material-elevation-3)" : panelBg,
    titleBarBorder: `1px solid ${shadow}`,
    titleBarText: isDark ? "#ffffff" : "#1a1a1a",
    buttonBg: activeBg,
    buttonText: isDark ? "#ffffff" : "#1a1a1a",
    buttonBorder: raisedLight,
    buttonShadow: `inset 0 1px 0 ${raisedMid}`,
    panelShadow: surfaceStyle === "material" ? "var(--material-shadow-high)" : `0 8px 28px ${shadow}`,
    dropShadow: `0 8px 28px ${shadow}`,
    cardFocusRing: raisedLight,
    coverShadow: surfaceStyle === "material" ? "var(--material-shadow-medium)" : `0 8px 32px ${shadow}`,
  };
}

function flatGlass(isDark: boolean): CSSProperties {
  return {
    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.75)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.9)"}`,
    boxShadow: isDark ? "none" : "0 2px 16px rgba(0,0,0,0.06)",
  };
}

function win9xSurface(surface: SurfaceTokens): CSSProperties {
  return {
    background: surface.panelBg,
    backdropFilter: undefined,
    WebkitBackdropFilter: undefined,
    border: "2px solid",
    borderColor: surface.borderRaisedSoft,
    boxShadow: surface.bevelRaised,
    borderRadius: 0,
  };
}

function obsidianSurface(): CSSProperties {
  return {
    background: "linear-gradient(180deg, rgba(10,8,18,0.62), rgba(10,8,18,0.58))",
    backdropFilter: "blur(18px) saturate(120%) brightness(0.82)",
    WebkitBackdropFilter: "blur(18px) saturate(120%) brightness(0.82)",
    border: "1px solid rgba(255,180,80,0.08)",
    borderTop: "1px solid rgba(255,210,150,0.14)",
    borderBottom: "1px solid rgba(0,0,0,0.44)",
    boxShadow: "inset 0 1px 0 rgba(255,210,150,0.08), inset 0 -1px 0 rgba(0,0,0,0.32), 0 10px 30px rgba(0,0,0,0.22)",
  };
}

function neonSurface(accent: AccentColors): CSSProperties {
  return {
    background: "rgba(0,0,0,0.06)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    border: `1px solid ${accent.glow}0.44)`,
    boxShadow: `0 0 0 1px ${accent.glow}0.22), 0 0 10px ${accent.glow}0.14), 0 0 22px ${accent.glow}0.07)`,
  };
}

function cyberpunkSurface(accent: AccentColors): CSSProperties {
  // Opaque HUD panel — a very dark tint of the accent so the animated background
  // never bleeds into content. Neon edge + faint outer glow.
  return {
    background: `linear-gradient(180deg, color-mix(in srgb, ${accent.primary} 16%, #05080f 84%) 0%, color-mix(in srgb, ${accent.primary} 9%, #03050b 91%) 100%)`,
    backdropFilter: "blur(6px) saturate(135%)",
    WebkitBackdropFilter: "blur(6px) saturate(135%)",
    border: `1px solid ${accent.glow}0.38)`,
    boxShadow: `0 0 0 1px ${accent.glow}0.16), 0 0 12px ${accent.glow}0.10), inset 0 1px 0 ${accent.glow}0.12)`,
  };
}

function buildGlassSurface(args: SurfaceThemeArgs, surface: SurfaceTokens, flat: CSSProperties): CSSProperties {
  const { glassEnabled, surfaceStyle, isDark, cinematicLight, accent, resolvedTheme } = args;
  if (!glassEnabled) return flat;
  if (resolvedTheme === "onyx") return {
    background: "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)",
    backdropFilter: "blur(22px) saturate(160%) brightness(1.04)",
    WebkitBackdropFilter: "blur(22px) saturate(160%) brightness(1.04)",
    border: "1.5px solid rgba(255,255,255,0.14)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.24), 0 10px 32px rgba(0,0,0,0.48)",
  };
  if (resolvedTheme === "cyberpunk") return cyberpunkSurface(accent);
  if (surfaceStyle === "material") return {
    background: `url("${isDark ? PAPER_GRAIN_DARK : PAPER_GRAIN_LIGHT}") repeat, var(--material-elevation-2)`,
    backdropFilter: undefined,
    WebkitBackdropFilter: undefined,
    border: "1px solid var(--material-border-subtle)",
    boxShadow: "var(--material-shadow-low)",
  };
  if (surfaceStyle === "aero") return {
    background: isDark
      ? "linear-gradient(180deg, rgba(255,255,255,0.36) 0%, rgba(255,255,255,0.16) 12%, rgba(255,255,255,0.08) 100%)"
      : cinematicLight
        ? "linear-gradient(180deg, rgba(255,255,255,0.68) 0%, rgba(255,255,255,0.52) 15%, rgba(255,255,255,0.34) 100%)"
        : "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.76) 12%, rgba(255,255,255,0.58) 100%)",
    backdropFilter: isDark ? "blur(14px) saturate(160%) brightness(1.06)" : "blur(16px) saturate(140%) brightness(1.02)",
    WebkitBackdropFilter: isDark ? "blur(14px) saturate(160%) brightness(1.06)" : "blur(16px) saturate(140%) brightness(1.02)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.85)"}`,
    boxShadow: isDark
      ? `inset 0 1px 0 rgba(255,255,255,0.60), inset 0 2px 4px rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.24), inset 1px 0 0 rgba(255,255,255,0.08), 0 0 0 1px ${accent.glow}0.12), 0 8px 28px rgba(0,0,0,0.30)`
      : `inset 0 1px 0 rgba(255,255,255,0.99), inset 0 2px 8px rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.08), 0 0 0 1px ${accent.glow}0.10), 0 6px 20px rgba(0,0,0,0.14)`,
  };
  if (surfaceStyle === "obsidian") return obsidianSurface();
  if (surfaceStyle === "neon") return neonSurface(accent);
  if (surfaceStyle === "win9x") return win9xSurface(surface);
  return {
    background: isDark
      ? "linear-gradient(180deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.035) 100%)"
      : cinematicLight
        ? "linear-gradient(180deg, rgba(255,255,255,0.50) 0%, rgba(255,255,255,0.26) 100%)"
        : "linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.42) 100%)",
    backdropFilter: isDark ? "blur(30px) saturate(150%) brightness(1.05)" : "blur(30px) saturate(160%) brightness(1.02)",
    WebkitBackdropFilter: isDark ? "blur(30px) saturate(150%) brightness(1.05)" : "blur(30px) saturate(160%) brightness(1.02)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.55)"}`,
    boxShadow: isDark
      ? "inset 0 0 0 0.5px rgba(255,255,255,0.20), inset 0 1px 2px rgba(255,255,255,0.32), inset 0 -14px 36px rgba(255,255,255,0.04), 0 8px 26px rgba(0,0,0,0.30)"
      : "inset 0 1px 0 rgba(255,255,255,0.75), inset 0 -1px 0 rgba(0,0,0,0.08), 0 8px 28px rgba(0,0,0,0.16)",
  };
}

function buildGlassBarSurface(args: SurfaceThemeArgs, surface: SurfaceTokens, flat: CSSProperties): CSSProperties {
  const { glassEnabled, surfaceStyle, isDark, cinematicLight, accent, resolvedTheme } = args;
  if (!glassEnabled) return flat;
  if (resolvedTheme === "onyx") return {
    background: "linear-gradient(180deg, rgba(0,0,0,0.34), rgba(0,0,0,0.22)), linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05))",
    backdropFilter: "blur(18px) saturate(130%) brightness(0.84)",
    WebkitBackdropFilter: "blur(18px) saturate(130%) brightness(0.84)",
    border: "1.5px solid rgba(255,255,255,0.12)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.20), inset 0 -1px 0 rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.32)",
  };
  if (resolvedTheme === "cyberpunk") return {
    background: `linear-gradient(180deg, color-mix(in srgb, ${accent.primary} 12%, #04060d 88%) 0%, color-mix(in srgb, ${accent.primary} 7%, #02040a 93%) 100%)`,
    backdropFilter: "blur(10px) saturate(130%)",
    WebkitBackdropFilter: "blur(10px) saturate(130%)",
    border: `1px solid ${accent.glow}0.30)`,
    boxShadow: `0 0 0 1px ${accent.glow}0.26), 0 2px 16px ${accent.glow}0.10), inset 0 1px 0 ${accent.glow}0.10)`,
  };
  if (surfaceStyle === "material") return {
    background: `url("${isDark ? PAPER_GRAIN_DARK : PAPER_GRAIN_LIGHT}") repeat, var(--material-elevation-3)`,
    backdropFilter: undefined,
    WebkitBackdropFilter: undefined,
    border: "1px solid var(--material-border-subtle)",
    boxShadow: "var(--material-shadow-high)",
  };
  if (surfaceStyle === "aero") return {
    background: isDark
      ? "linear-gradient(180deg, rgba(0,0,0,0.42), rgba(0,0,0,0.28)), linear-gradient(180deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.10) 20%, rgba(255,255,255,0.05) 100%)"
      : cinematicLight
        ? "linear-gradient(180deg, rgba(255,255,255,0.84) 0%, rgba(255,255,255,0.70) 15%, rgba(255,255,255,0.54) 100%)"
        : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.88) 15%, rgba(255,255,255,0.72) 100%)",
    backdropFilter: isDark ? "blur(12px) saturate(130%) brightness(0.84)" : "blur(16px) saturate(140%) brightness(1.02)",
    WebkitBackdropFilter: isDark ? "blur(12px) saturate(130%) brightness(0.84)" : "blur(16px) saturate(140%) brightness(1.02)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.85)"}`,
    boxShadow: isDark
      ? `inset 0 1px 0 rgba(255,255,255,0.52), inset 0 2px 7px rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.18), 0 0 0 1px ${accent.glow}0.14), 0 4px 16px rgba(0,0,0,0.22)`
      : `inset 0 1px 0 rgba(255,255,255,0.99), inset 0 -1px 0 rgba(0,0,0,0.06), 0 0 0 1px ${accent.glow}0.10), 0 4px 16px rgba(0,0,0,0.10)`,
  };
  if (surfaceStyle === "obsidian") return obsidianSurface();
  if (surfaceStyle === "neon") return neonSurface(accent);
  if (surfaceStyle === "win9x") return win9xSurface(surface);
  return {
    background: isDark
      ? "linear-gradient(180deg, rgba(0,0,0,0.46), rgba(0,0,0,0.32)), linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05))"
      : cinematicLight
        ? "linear-gradient(180deg, rgba(255,255,255,0.68) 0%, rgba(255,255,255,0.46) 100%)"
        : "linear-gradient(180deg, rgba(255,255,255,0.84) 0%, rgba(255,255,255,0.58) 100%)",
    backdropFilter: isDark ? "blur(30px) saturate(120%) brightness(0.84)" : "blur(30px) saturate(160%) brightness(1.02)",
    WebkitBackdropFilter: isDark ? "blur(30px) saturate(120%) brightness(0.84)" : "blur(30px) saturate(160%) brightness(1.02)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.55)"}`,
    boxShadow: isDark
      ? "inset 0 0 0 0.5px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.16), 0 6px 20px rgba(0,0,0,0.25)"
      : "inset 0 1px 0 rgba(255,255,255,0.75), inset 0 -1px 0 rgba(0,0,0,0.08), 0 8px 28px rgba(0,0,0,0.16)",
  };
}

function buildSettingsRowSurface(args: SurfaceThemeArgs, surface: SurfaceTokens, flat: CSSProperties): CSSProperties {
  const { glassEnabled, surfaceStyle, isDark, accent, resolvedTheme } = args;
  if (!glassEnabled) return flat;
  const tintTop = `${accent.glow}0.025)`;
  const tintBot = `${accent.glow}0.010)`;
  if (resolvedTheme === "onyx") return {
    background: "linear-gradient(180deg, rgba(255,255,255,0.042), rgba(255,255,255,0.018))",
    backdropFilter: "blur(8px) saturate(110%) brightness(0.92)",
    WebkitBackdropFilter: "blur(8px) saturate(110%) brightness(0.92)",
    border: "1.5px solid rgba(255,255,255,0.09)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 6px rgba(0,0,0,0.20)",
  };
  if (resolvedTheme === "cyberpunk") return {
    // Opaque squared HUD row (dark accent tint) — readable, thin neon edge, no rail.
    background: `linear-gradient(180deg, color-mix(in srgb, ${accent.primary} 14%, #05080f 86%) 0%, color-mix(in srgb, ${accent.primary} 8%, #03050b 92%) 100%)`,
    backdropFilter: undefined,
    WebkitBackdropFilter: undefined,
    border: `1px solid ${accent.glow}0.20)`,
    boxShadow: `inset 0 1px 0 ${accent.glow}0.08), 0 2px 10px rgba(0,0,0,0.45)`,
  };
  if (surfaceStyle === "material") return {
    background: `url("${isDark ? PAPER_GRAIN_DARK : PAPER_GRAIN_LIGHT}") repeat, var(--material-elevation-2)`,
    backdropFilter: undefined,
    WebkitBackdropFilter: undefined,
    border: "1px solid var(--material-border-subtle)",
    boxShadow: "var(--material-shadow-low)",
  };
  if (surfaceStyle === "aero") return {
    background: isDark
      ? "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.07) 15%, rgba(255,255,255,0.04) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.90) 0%, rgba(255,255,255,0.74) 12%, rgba(255,255,255,0.56) 100%)",
    backdropFilter: isDark ? "blur(8px) saturate(115%) brightness(0.97)" : "blur(16px) saturate(140%) brightness(1.02)",
    WebkitBackdropFilter: isDark ? "blur(8px) saturate(115%) brightness(0.97)" : "blur(16px) saturate(140%) brightness(1.02)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`,
    boxShadow: isDark
      ? `inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.08), 0 0 0 1px ${accent.glow}0.10), 0 1px 4px rgba(0,0,0,0.08)`
      : "inset 0 1px 0 rgba(255,255,255,0.99), inset 0 -1px 0 rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.10)",
  };
  if (surfaceStyle === "obsidian") return obsidianSurface();
  if (surfaceStyle === "neon") return neonSurface(accent);
  if (surfaceStyle === "win9x") return win9xSurface(surface);
  return {
    background: isDark
      ? `linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.025)), linear-gradient(180deg, ${tintTop}, ${tintBot})`
      : "linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.42) 100%)",
    backdropFilter: isDark ? "blur(20px) saturate(140%) brightness(0.95)" : "blur(28px) saturate(160%) brightness(1.02)",
    WebkitBackdropFilter: isDark ? "blur(20px) saturate(140%) brightness(0.95)" : "blur(28px) saturate(160%) brightness(1.02)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`,
    boxShadow: isDark
      ? "inset 0 0 0 0.5px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.10), 0 2px 6px rgba(0,0,0,0.12)"
      : "inset 0 1px 0 rgba(255,255,255,0.75), inset 0 -1px 0 rgba(0,0,0,0.08), 0 8px 28px rgba(0,0,0,0.16)",
  };
}

export function useSurfaceTheme(args: SurfaceThemeArgs) {
  const { resolvedTheme, surfaceStyle, glassEnabled, isDark, isWash, cinematicLight, accent } = args;
  const materialTokens = useMemo(
    () => buildMaterialTokens(isDark, isWash, accent),
    [isDark, isWash, accent.lightBg, accent.primary],
  );
  const surface = useMemo(
    () => buildSurfaceTokens(surfaceStyle, isDark, accent),
    [surfaceStyle, isDark, accent],
  );
  const flat = useMemo(() => flatGlass(isDark), [isDark]);
  const glass = useMemo(() => buildGlassSurface(args, surface, flat), [resolvedTheme, glassEnabled, surfaceStyle, isDark, cinematicLight, accent, surface, flat]);
  const glassBar = useMemo(() => buildGlassBarSurface(args, surface, flat), [resolvedTheme, glassEnabled, surfaceStyle, isDark, cinematicLight, accent, surface, flat]);
  const settingsRowGlass = useMemo(() => buildSettingsRowSurface(args, surface, flat), [resolvedTheme, glassEnabled, surfaceStyle, isDark, accent, surface, flat]);

  const isMaterial = surfaceStyle === "material";
  const hasStandaloneBackground = STANDALONE_BACKGROUNDS.has(resolvedTheme);
  const appBg = isMaterial
    ? String(materialTokens["--material-bg-primary"])
    : resolvedTheme === "plasma"    ? "#05050b"
    : resolvedTheme === "cinder"    ? "#100806"
    : resolvedTheme === "wash"      ? "#f8f5f0"
    : resolvedTheme === "space"     ? "#070910"
    : resolvedTheme === "aurora"    ? "#020b14"
    : resolvedTheme === "synthwave" ? "#07020e"
    : resolvedTheme === "cyberpunk" ? `color-mix(in srgb, ${accent.primary} 6%, #01040a 94%)`
    : resolvedTheme === "lofi"      ? "#1e1108"
    : resolvedTheme === "forest"    ? "#010a04"
    : resolvedTheme === "webcore"   ? surface.panelBg
    : resolvedTheme === "onyx"      ? "#060b18"
    : accent.lightBg;
  const bgGlow1 = isMaterial || hasStandaloneBackground ? "transparent" : `${accent.glow}${isDark ? "0.07)" : "0.08)"}`;
  const bgGlow2 = isMaterial || hasStandaloneBackground ? "transparent" : `${accent.glow}${isDark ? "0.05)" : "0.06)"}`;
  // Unified focus / active indicator used app-wide: accent ring + soft accent bloom.
  // 2px solid ring keeps the edge crisp at 1280x800; the 18px bloom reads across the room.
  const focusGlow = `0 0 0 2px ${accent.glow}1), 0 0 18px ${accent.glow}0.6)`;
  const cardBackdropFilter = !glassEnabled
    ? (isDark ? "blur(16px)" : "blur(28px)")
    : surfaceStyle === "material"
      ? undefined
      : surfaceStyle === "aero"
        ? (isDark ? "blur(12px) saturate(140%) brightness(1.05)" : "blur(14px) saturate(140%) brightness(1.02)")
        : surfaceStyle === "obsidian"
          ? "blur(18px) saturate(120%) brightness(0.82)"
          : (isDark ? "blur(22px) saturate(180%) brightness(1.08)" : "blur(28px) saturate(160%) brightness(1.02)");

  return {
    materialTokens,
    surface,
    glass,
    glassBar,
    settingsRowGlass,
    appBg,
    bgGlow1,
    bgGlow2,
    cardBackdropFilter,
    materialFocusShadow: "var(--material-shadow-medium)",
    materialRaisedShadow: "var(--material-shadow-high)",
    focusGlow,
  };
}
