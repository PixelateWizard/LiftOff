import { useState, type CSSProperties } from "react";
import { useGamepadIcons } from "../contexts/GamepadContext";
import { useTheme } from "../contexts/ThemeContext";
import type { GamepadPlatform } from "./ui/Gamepad";
import { XboxLT, XboxRT, PsL2, PsR2, SwZL, SwZR } from "./ui/Gamepad";
import type { GamepadIconProps } from "./ui/Gamepad";

export interface TabItem {
  label: string;
  isDashed?: boolean;
}

interface SectionTabBarProps {
  items: TabItem[];
  activeIndex: number;
  onSelect?: (index: number) => void;
  /** Show trigger badges on either side of tabs */
  showButtons?: boolean;
  /** true = text-only tabs, active item gets accent color | false (default) = pill tabs */
  textTabs?: boolean;
  /** Tab label weight: thin (300) | medium (600/500) | bold (700) */
  fontWeight?: "thin" | "medium" | "bold";
  style?: CSSProperties;
  /** Label text casing: default | ucfirst (capitalize) | uppercase */
  labelCase?: "default" | "ucfirst" | "uppercase";
}

type IconComp = (props: GamepadIconProps) => React.JSX.Element;

const TRIGGER_ICONS: Record<GamepadPlatform, [IconComp, IconComp]> = {
  xbox:   [XboxLT, XboxRT],
  ps:     [PsL2,   PsR2  ],
  switch: [SwZL,   SwZR  ],
};

const TRIGGER_SIZES: Record<string, number> = { small: 18, medium: 22, large: 28 };

function TriggerBadge({ side }: { side: "left" | "right" }) {
  const { platform, colored, filled, btnSize } = useGamepadIcons();
  const [LeftIcon, RightIcon] = TRIGGER_ICONS[platform];
  const Icon = side === "left" ? LeftIcon : RightIcon;
  return <Icon size={TRIGGER_SIZES[btnSize ?? "small"]} colored={colored} filled={filled} />;
}

export function SectionTabBar({
  items,
  activeIndex,
  onSelect,
  showButtons = true,
  textTabs = false,
  fontWeight = "medium",
  style,
  labelCase = "default",
}: SectionTabBarProps) {
  const { theme, accent, isDark, glassEnabled, surfaceStyle, resolvedTheme } = useTheme();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const activePillText = "rgba(20, 14, 10, 0.90)";
  const activeTextColor = isDark
    ? (accent.darkText ? activePillText : "white")
    : (accent.lightDarkText ? activePillText : "white");
  const textTransform: CSSProperties["textTransform"] =
    labelCase === "uppercase" ? "uppercase" :
    labelCase === "ucfirst"   ? "capitalize" :
    "none";
  const isPixel = surfaceStyle === "win9x";

  const PILL_W = { thin: 300, medium: 600, bold: 700 } as const;
  const TEXT_W = {
    thin:   { base: 300, active: 500 },
    medium: { base: 500, active: 700 },
    bold:   { base: 700, active: 700 },
  } as const;

  const makePillTabStyle = (active: boolean, isDashed?: boolean, hovered = false): CSSProperties => ({
    fontSize: 11,
    fontWeight: PILL_W[fontWeight],
    letterSpacing: "0.06em",
    padding: "5px 14px",
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    borderRadius: isPixel ? 0 : 20,
    cursor: "pointer",
    transition: "background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, border-color 0.15s ease",
    userSelect: "none",
    textTransform,
    background: active
      ? (resolvedTheme === "onyx" ? "transparent" : accent.primary)
      : surfaceStyle === "material"
      ? hovered ? "var(--material-elevation-3)" : "var(--material-elevation-2)"
      : surfaceStyle === "aero"
      ? (isDark ? "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.10) 30%, rgba(255,255,255,0.08) 100%)" : "linear-gradient(180deg, rgba(255,255,255,0.90) 0%, rgba(255,255,255,0.68) 25%, rgba(255,255,255,0.60) 100%)")
      : glassEnabled
      ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.55)")
      : isDark
      ? "rgba(255,255,255,0.06)"
      : "rgba(0,0,0,0.06)",
    color: active ? (resolvedTheme === "onyx" ? accent.primary : activeTextColor) : theme.textDim,
    border: `1px ${isDashed && !active ? "dashed" : "solid"} ${
      active
        ? accent.primary
        : surfaceStyle === "material"
        ? "var(--material-border-subtle)"
        : surfaceStyle === "aero"
        ? (isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.88)")
        : glassEnabled
        ? (isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.70)")
        : isDark
        ? "rgba(255,255,255,0.1)"
        : "rgba(0,0,0,0.1)"
    }`,
    backdropFilter: !active && glassEnabled && surfaceStyle !== "material" ? (surfaceStyle === "aero" ? "blur(10px) saturate(140%)" : "blur(12px) saturate(150%)") : undefined,
    boxShadow: active
      ? resolvedTheme === "onyx"
        ? "none"
        : surfaceStyle === "aero"
        ? `inset 0 1px 0 rgba(255,255,255,0.80), inset 0 2px 10px rgba(255,255,255,0.24), inset 0 -1px 0 rgba(0,0,0,0.28), 0 4px 16px ${accent.glow}0.55)`
        : surfaceStyle === "material"
        ? "var(--material-shadow-medium)"
        : `0 2px 10px ${accent.glow}0.35)`
      : surfaceStyle === "aero"
      ? (isDark
          ? `inset 0 1px 0 rgba(255,255,255,${hovered ? "0.52" : "0.42"}), inset 0 -1px 0 rgba(0,0,0,0.10), 0 0 0 1px ${accent.glow}${hovered ? "0.18)" : "0.12)"}`
          : `inset 0 1px 0 rgba(255,255,255,0.99), inset 0 -1px 0 rgba(0,0,0,0.06), 0 0 0 1px ${accent.glow}${hovered ? "0.14)" : "0.10)"}`)

      : surfaceStyle === "material"
      ? hovered ? "var(--material-shadow-medium)" : "var(--material-shadow-low)"
      : glassEnabled
      ? (isDark ? "inset 0 1px 0 rgba(255,255,255,0.14)" : "inset 0 1px 0 rgba(255,255,255,0.95)")
      : "none",
    flexShrink: 0,
    whiteSpace: "nowrap",
    transform: surfaceStyle === "material" && hovered && !active ? "translateY(-1px)" : "translateY(0)",
  });

  const makeTextTabStyle = (active: boolean): CSSProperties => ({
    fontSize: 12,
    fontWeight: active ? TEXT_W[fontWeight].active : TEXT_W[fontWeight].base,
    letterSpacing: "0.04em",
    padding: "4px 10px",
    borderRadius: isPixel ? 0 : 20,
    cursor: "pointer",
    transition: "color 0.15s ease",
    userSelect: "none",
    textTransform,
    color: active ? accent.primary : theme.textDim,
    background: "transparent",
    border: "1px solid transparent",
    flexShrink: 0,
    whiteSpace: "nowrap",
  });

  const tabs = (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" }}>
      {items.map((item, i) => {
        const active = activeIndex === i;
        if (textTabs) {
          return (
            <div key={i} onClick={() => onSelect?.(i)} style={makeTextTabStyle(active)}>
              {item.label}
            </div>
          );
        }
        const hovered = (surfaceStyle === "aero" || surfaceStyle === "material") && !active && hoveredIndex === i;
        const baseStyle = makePillTabStyle(active, item.isDashed, hovered);
        return (
          <div key={i} onClick={() => onSelect?.(i)}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{ ...baseStyle, position: "relative", overflow: "hidden" }}>
            {item.label}
            {active && resolvedTheme === "onyx" && <div className="onyx-focus-ring"><div className="onyx-ring-spin"/></div>}
          </div>
        );
      })}
    </div>
  );

  const inner = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      {showButtons && <TriggerBadge side="left" />}
      <div style={{ marginLeft: showButtons ? 42 : 0, marginRight: showButtons ? 42 : 0 }}>
        {tabs}
      </div>
      {showButtons && <TriggerBadge side="right" />}
    </div>
  );

  return (
    <div style={{ paddingTop: 10, paddingBottom: 10, ...style }}>
      {inner}
    </div>
  );
}
