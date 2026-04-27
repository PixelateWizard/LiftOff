import type { ReactNode } from "react";
import { GamepadBtn } from "../GamepadBtn";

export interface ShortcutItem {
  btn: string;
  label: string;
}

interface ModalShellProps {
  title: string;
  children?: ReactNode;
  shortcuts?: ShortcutItem[];
  glass: any;
  accent: any;
  theme: any;
  isDark: boolean;
  width?: number;
  maxHeight?: string;
  zIndex?: number;
  onOverlayClick?: () => void;
}

export default function ModalShell({
  title,
  children,
  shortcuts = [],
  glass,
  accent,
  theme,
  isDark,
  width = 480,
  maxHeight,
  zIndex = 2000,
  onOverlayClick,
}: ModalShellProps) {
  const hasBody = children != null && children !== false;

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
        style={{
          ...glass,
          width: `min(${width}px, 90vw)`,
          ...(maxHeight ? { maxHeight } : {}),
          borderRadius: 20,
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          border: `1px solid ${accent.glow}0.3)`,
          boxShadow: "0 8px 48px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          padding: "20px 24px 14px", flexShrink: 0,
          ...(hasBody ? { borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}` } : {}),
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>{title}</div>
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
              <GamepadBtn key={`${btn}-${i}`} btn={btn} label={label} theme={theme} isDark={isDark} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
