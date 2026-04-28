import type { CSSProperties } from "react";
import { useGamepadIcons } from "../contexts/GamepadContext";
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
  accent: { primary: string; glow: string };
  theme: { text: string; textDim: string; textFaint: string };
  isDark: boolean;
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
  accent,
  theme,
  isDark,
  style,
  labelCase = "default",
}: SectionTabBarProps) {
  const textTransform: CSSProperties["textTransform"] =
    labelCase === "uppercase" ? "uppercase" :
    labelCase === "ucfirst"   ? "capitalize" :
    "none";

  const PILL_W = { thin: 300, medium: 600, bold: 700 } as const;
  const TEXT_W = {
    thin:   { base: 300, active: 500 },
    medium: { base: 500, active: 700 },
    bold:   { base: 700, active: 700 },
  } as const;

  const makePillTabStyle = (active: boolean, isDashed?: boolean): CSSProperties => ({
    fontSize: 11,
    fontWeight: PILL_W[fontWeight],
    letterSpacing: "0.06em",
    padding: "5px 14px",
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    borderRadius: 20,
    cursor: "pointer",
    transition: "all 0.15s ease",
    userSelect: "none",
    textTransform,
    background: active
      ? accent.primary
      : isDark
      ? "rgba(255,255,255,0.06)"
      : "rgba(0,0,0,0.06)",
    color: active ? "white" : theme.textDim,
    border: `1px ${isDashed && !active ? "dashed" : "solid"} ${
      active
        ? accent.primary
        : isDark
        ? "rgba(255,255,255,0.1)"
        : "rgba(0,0,0,0.1)"
    }`,
    boxShadow: active ? `0 2px 10px ${accent.glow}0.35)` : "none",
    flexShrink: 0,
    whiteSpace: "nowrap",
  });

  const makeTextTabStyle = (active: boolean): CSSProperties => ({
    fontSize: 12,
    fontWeight: active ? TEXT_W[fontWeight].active : TEXT_W[fontWeight].base,
    letterSpacing: "0.04em",
    padding: "4px 10px",
    borderRadius: 20,
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
      {items.map((item, i) => (
        <div key={i} onClick={() => onSelect?.(i)}
          style={textTabs ? makeTextTabStyle(activeIndex === i) : makePillTabStyle(activeIndex === i, item.isDashed)}>
          {item.label}
        </div>
      ))}
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
