import { forwardRef, type ReactNode, type CSSProperties, type MouseEvent } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { CyberpunkCard } from "./CyberpunkCard";
import { FocusRing } from "./FocusRing";

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
    const { accent, theme, isDark, glass, surface, surfaceStyle, resolvedTheme } = useTheme();

    const isPixel = surfaceStyle === "win9x";
    const cardRadius = resolvedTheme === "cyberpunk" ? 0 : isPixel ? 0 : surfaceStyle === "material" ? 8 : 12;

    // ── Pill variant ───────────────────────────────────────────────
    if (variant === "pill") {
      const isOnyx = resolvedTheme === "onyx";
      return (
        // Outer wrapper — no overflow:hidden, holds ring + inner content as siblings
        <div
          data-card=""
          className={focused ? "focused" : ""}
          ref={ref}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
          style={{ position: "relative", flexShrink: 0, borderRadius: cardRadius, cursor: "pointer", ...style }}
        >
          {/* Inner content — overflow:hidden */}
          <CyberpunkCard enabled={resolvedTheme === "cyberpunk"} focused={focused} accent={accent} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "7px 12px",
            borderRadius: cardRadius,
            overflow: "hidden",
            transition: "all 0.15s ease",
            background: focused && !isOnyx
              ? accent.primary
              : (idleBackground ?? "rgba(255,255,255,0.08)"),
            border: `1px solid ${focused
              ? (isOnyx ? "transparent" : accent.primary)
              : (idleBorder ?? "rgba(255,255,255,0.15)")}`,
            boxShadow: focused && !isOnyx
              ? `0 3px 10px ${accent.glow}0.38)`
              : (idleBoxShadow ?? "none"),
          }}>
            {icon}
            <div style={{
              fontSize: 12, fontWeight: 500,
              color: focused
                ? (isOnyx ? accent.primary : (activeTextColor ?? "white"))
                : (idleColor ?? theme.textDim),
              whiteSpace: "nowrap", maxWidth: 110,
              overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {name}
            </div>
            {children}
          </CyberpunkCard>
          {/* Ring — outside inner overflow:hidden, with gap */}
          <FocusRing focused={focused && isOnyx} variant="spin" elementRadius={cardRadius} />
        </div>
      );
    }

    // ── Row variant ────────────────────────────────────────────────
    const rowBg = surfaceStyle === "material"
      ? "var(--material-elevation-2)"
      : isPixel
      ? surface.panelBg
      : surfaceStyle === "obsidian"
      ? glass.background
      : isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.52)";

    const isOnyx = resolvedTheme === "onyx";
    const focusBorder = accent.primary;
    const idleBorderRow = surfaceStyle === "material"
      ? (isDark ? "rgba(255,255,255,0.05)" : "rgba(43,31,20,0.05)")
      : "rgba(255,255,255,0.08)";
    const focusBg = surfaceStyle === "material"
      ? "var(--material-elevation-3)"
      : isPixel
      ? surface.panelBg
      : surfaceStyle === "obsidian"
      ? `linear-gradient(90deg, ${accent.glow}0.24), ${accent.glow}0.10) 45%, transparent), ${glass.background}`
      : isDark
      ? `linear-gradient(90deg, ${accent.glow}0.22), ${accent.glow}0.12) 42%, rgba(255,255,255,0.055))`
      : `${accent.glow}0.12)`;
    const focusShadow = surfaceStyle === "material"
      ? `0 0 0 1px ${accent.primary}, var(--material-shadow-medium)`
      : `0 0 0 1px ${accent.primary}, 0 8px 22px rgba(0,0,0,0.24), 0 0 18px ${accent.glow}0.16)`;

    return (
      // Outer wrapper — no overflow:hidden, holds ring + inner content as siblings
      <div
        data-card=""
        className={focused ? "focused" : ""}
        ref={ref}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        style={{ position: "relative", borderRadius: cardRadius, ...style }}
      >
        {/* Inner content — overflow:hidden */}
        <CyberpunkCard
          enabled={resolvedTheme === "cyberpunk"}
          focused={focused}
          accent={accent}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "8px 14px",
            cursor: "pointer", transition: "all 0.15s ease",
            borderRadius: cardRadius,
            overflow: "hidden",
            position: "relative",
            transform: focused && !isOnyx ? "translateY(-1px)" : undefined,
            ...glass,
            background: focused && !isOnyx ? focusBg : rowBg,
            backdropFilter: isPixel ? undefined : glass.backdropFilter,
            WebkitBackdropFilter: isPixel ? undefined : glass.WebkitBackdropFilter,
            border: `1px solid ${focused && !isOnyx ? focusBorder : idleBorderRow}`,
            ...(focused && !isOnyx ? { boxShadow: focusShadow } : {}),
          }}
        >
          {/* Icon — fixed-width container so the text column is always aligned */}
          {focused && !isOnyx && (
            <div style={{
              position: "absolute",
              inset: 0,
              borderRadius: cardRadius,
              boxShadow: `inset 0 0 0 1px ${accent.glow}0.24)`,
              pointerEvents: "none",
            }} />
          )}

          <div style={{ width: 40, height: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {icon}
          </div>

          {/* Name — 2-line clamp with ellipsis */}
          <div style={{
            flex: 1, minWidth: 0,
            fontSize: 13, fontWeight: focused && !isOnyx ? 700 : 500,
            color: theme.text,
            textShadow: focused && !isOnyx && !accent.darkText ? "0 1px 2px rgba(0,0,0,0.35)" : undefined,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as CSSProperties["WebkitBoxOrient"],
            lineHeight: 1.35,
          }}>
            {name}
          </div>

          {children}
        </CyberpunkCard>
        {/* Ring — horizontal variant (left spotlight), outside overflow:hidden, with gap */}
        <FocusRing focused={focused && isOnyx} variant="spin" elementRadius={cardRadius} />
      </div>
    );
  },
);

AppListItem.displayName = "AppListItem";
