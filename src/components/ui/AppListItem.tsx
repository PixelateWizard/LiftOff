import { forwardRef, type ReactNode, type CSSProperties, type MouseEvent } from "react";
import { useTheme } from "../../contexts/ThemeContext";

interface AppListItemProps {
  name: string;
  /** Pre-rendered icon node — art <img> or <AppIcon>. Caller controls size. */
  icon: ReactNode;
  focused?: boolean;
  /**
   * "pill"  — compact horizontal pill, flex-shrink 0, single-line name.
   *           Used by the Home pinned shelf.
   * "row"   — full-width row, 2-line name clamp.
   *           Used by the Apps list-view mode.
   */
  variant?: "pill" | "row";

  // ── Pill-variant style overrides (supplied by the parent context) ──
  idleBackground?: string;
  idleBorder?: string;
  idleBoxShadow?: string;
  idleColor?: string;
  activeTextColor?: string;

  // ── Interaction ────────────────────────────────────────────────
  onClick?: () => void;
  onDoubleClick?: () => void;
  onContextMenu?: (e: MouseEvent<HTMLDivElement>) => void;

  style?: CSSProperties;
  /** Extra elements rendered after the name (e.g. PinBadge). */
  children?: ReactNode;
}

export const AppListItem = forwardRef<HTMLDivElement, AppListItemProps>(
  (
    {
      name, icon, focused = false, variant = "row",
      idleBackground, idleBorder, idleBoxShadow, idleColor, activeTextColor,
      onClick, onDoubleClick, onContextMenu,
      style, children,
    },
    ref,
  ) => {
    const { accent, theme, isDark, glass, surfaceStyle } = useTheme();

    const isPixel = surfaceStyle === "win9x";
    const cardRadius = isPixel ? 0 : surfaceStyle === "material" ? 8 : 12;

    // ── Pill variant ───────────────────────────────────────────────
    if (variant === "pill") {
      return (
        <div
          ref={ref}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "7px 12px",
            flexShrink: 0, cursor: "pointer", borderRadius: cardRadius,
            transition: "all 0.15s ease",
            background: focused
              ? accent.primary
              : (idleBackground ?? "rgba(255,255,255,0.08)"),
            border: `1px solid ${focused
              ? accent.primary
              : (idleBorder ?? "rgba(255,255,255,0.15)")}`,
            boxShadow: focused
              ? `0 3px 10px ${accent.glow}0.38)`
              : (idleBoxShadow ?? "none"),
            ...style,
          }}
        >
          {icon}
          <div style={{
            fontSize: 12, fontWeight: 500,
            color: focused
              ? (activeTextColor ?? "white")
              : (idleColor ?? theme.textDim),
            whiteSpace: "nowrap", maxWidth: 110,
            overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {name}
          </div>
          {children}
        </div>
      );
    }

    // ── Row variant ────────────────────────────────────────────────
    const rowBg = surfaceStyle === "material"
      ? "var(--material-elevation-2)"
      : surfaceStyle === "obsidian"
      ? glass.background
      : isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.52)";

    const focusBorder = surfaceStyle === "material"
      ? accent.primary
      : `${accent.glow}0.6)`;
    const idleBorderRow = surfaceStyle === "material"
      ? (isDark ? "rgba(255,255,255,0.05)" : "rgba(43,31,20,0.05)")
      : "rgba(255,255,255,0.08)";
    const focusShadow = surfaceStyle === "material"
      ? "var(--material-shadow-medium)"
      : `0 0 0 1px ${accent.glow}0.25), 0 0 18px ${accent.glow}0.10)`;

    return (
      <div
        ref={ref}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "8px 14px",
          cursor: "pointer", transition: "all 0.15s ease",
          borderRadius: cardRadius,
          ...glass,
          background: rowBg,
          border: `1px solid ${focused ? focusBorder : idleBorderRow}`,
          ...(focused ? { boxShadow: focusShadow } : {}),
          ...style,
        }}
      >
        {/* Icon — fixed-width container so the text column is always aligned */}
        <div style={{ width: 40, height: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>

        {/* Name — 2-line clamp with ellipsis */}
        <div style={{
          flex: 1, minWidth: 0,
          fontSize: 13, fontWeight: 500,
          color: theme.text,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical" as CSSProperties["WebkitBoxOrient"],
          lineHeight: 1.35,
        }}>
          {name}
        </div>

        {children}
      </div>
    );
  },
);

AppListItem.displayName = "AppListItem";
