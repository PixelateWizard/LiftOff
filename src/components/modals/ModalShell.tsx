import type { ReactNode } from "react";
import { GamepadBtn } from "../GamepadBtn";
import { useTheme } from "../../contexts/ThemeContext";

export interface ShortcutItem {
  btn: string;
  label: string;
}

interface ModalShellProps {
  title: string;
  children?: ReactNode;
  shortcuts?: ShortcutItem[];
  width?: number;
  maxHeight?: string;
  zIndex?: number;
  onOverlayClick?: () => void;
}

export default function ModalShell({
  title,
  children,
  shortcuts = [],
  width = 480,
  maxHeight,
  zIndex = 2000,
  onOverlayClick,
}: ModalShellProps) {
  const { glass, accent, theme, isDark, surfaceStyle, surface, resolvedTheme } = useTheme();
  const hasBody = children != null && children !== false;
  const isPixel = surfaceStyle === "win9x";
  const pixelShell = isPixel ? {
    background: surface.panelBg,
    border: "2px solid",
    borderColor: surface.borderRaised,
    boxShadow: surface.panelShadow,
  } : {};
  const pixelTitleBar = isPixel ? {
    margin: 3,
    height: 22,
    padding: "0 5px 0 7px",
    boxSizing: "border-box" as const,
    background: surface.titleBarBg,
    color: surface.titleBarText,
    borderBottom: surface.titleBarBorder,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  } : {};
  const pixelTitleButton = isPixel ? {
    width: 14,
    height: 14,
    background: surface.buttonBg,
    border: "1px solid",
    borderColor: surface.buttonBorder,
    boxShadow: surface.buttonShadow,
    color: surface.buttonText,
    fontSize: 10,
    fontWeight: 700,
    lineHeight: "12px",
    textAlign: "center" as const,
    fontFamily: "monospace",
  } : {};

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Segoe UI', sans-serif", userSelect: "none",
      }}
      onClick={onOverlayClick}
    >
      <div
        data-modal=""
        style={{
          ...glass,
          width: `min(${width}px, 90vw)`,
          ...(maxHeight ? { maxHeight } : {}),
          borderRadius: resolvedTheme === "cyberpunk" ? 0 : isPixel ? 0 : surfaceStyle === "material" ? 16 : 24,
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          border: `1px solid ${accent.glow}0.3)`,
          boxShadow: "0 8px 48px rgba(0,0,0,0.6)",
          ...pixelShell,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          padding: isPixel ? undefined : "20px 24px 14px", flexShrink: 0,
          ...(isPixel ? pixelTitleBar : hasBody ? { borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}` } : {}),
        }}>
          <div style={{ fontSize: isPixel ? 11 : 15, fontWeight: 700, color: isPixel ? "#ffffff" : theme.text, fontFamily: isPixel ? "Tahoma, Arial, sans-serif" : undefined }}>{title}</div>
          {isPixel && (
            <div style={{ display: "flex", gap: 3 }}>
              <span style={pixelTitleButton}>_</span>
              <span style={pixelTitleButton}>x</span>
            </div>
          )}
        </div>

        {hasBody && (
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            {children}
          </div>
        )}

        {shortcuts.length > 0 && (
          <div style={{
            padding: "10px 20px", flexShrink: 0,
            borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`,
            display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center",
          }}>
            {shortcuts.map(({ btn, label }, i) => (
              <GamepadBtn key={`${btn}-${i}`} btn={btn} label={label} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
