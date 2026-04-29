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
  withBackground?: boolean;
  glass?: CSSProperties;
  accent: { primary: string; glow: string };
  theme: { text: string; textDim: string; textFaint: string };
  isDark: boolean;
  style?: CSSProperties;
}

type IconComp = (props: GamepadIconProps) => React.JSX.Element;

const TRIGGER_ICONS: Record<GamepadPlatform, [IconComp, IconComp]> = {
  xbox:   [XboxLT, XboxRT],
  ps:     [PsL2,   PsR2  ],
  switch: [SwZL,   SwZR  ],
};

function TriggerBadge({ side }: { side: "left" | "right" }) {
  const { platform, colored, filled } = useGamepadIcons();
  const [LeftIcon, RightIcon] = TRIGGER_ICONS[platform];
  const Icon = side === "left" ? LeftIcon : RightIcon;
  return <Icon size={22} colored={colored} filled={filled} />;
}

export function SectionTabBar({
  items,
  activeIndex,
  onSelect,
  showButtons = true,
  textTabs = false,
  withBackground = false,
  glass,
  accent,
  theme,
  isDark,
  style,
}: SectionTabBarProps) {
  const makePillTabStyle = (active: boolean, isDashed?: boolean): CSSProperties => ({
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.06em",
    padding: "5px 14px",
    borderRadius: 20,
    cursor: "pointer",
    transition: "all 0.15s ease",
    userSelect: "none",
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
    fontWeight: active ? 700 : 500,
    letterSpacing: "0.04em",
    padding: "4px 10px",
    borderRadius: 20,
    cursor: "pointer",
    transition: "color 0.15s ease",
    userSelect: "none",
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

  if (withBackground) {
    return (
      <div style={{ paddingTop: 10, paddingBottom: 10, ...style }}>
        <div style={{ ...(glass ?? {}), borderRadius: 14, padding: "8px 16px" }}>
          {inner}
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 10, paddingBottom: 10, ...style }}>
      {inner}
    </div>
  );
}
