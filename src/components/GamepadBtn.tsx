import type { CSSProperties } from "react";
import { TbArrowsUpDown, TbArrowsLeftRight } from "react-icons/tb";
import { useGamepadIcons } from "../contexts/GamepadContext";
import { useTheme } from "../contexts/ThemeContext";
import type { GamepadPlatform } from "./ui/Gamepad";
import {
  XboxA, XboxB, XboxX, XboxY, XboxLB, XboxRB, XboxLT, XboxRT, XboxMenu, XboxView, XboxGuide,
  PsCross, PsCircle, PsSquare, PsTriangle, PsL1, PsR1, PsL2, PsR2, PsOptions, PsCreate, PsHome,
  SwA, SwB, SwX, SwY, SwL, SwR, SwZL, SwZR, SwPlus, SwMinus, SwHome,
} from "./ui/Gamepad";
import type { GamepadIconProps } from "./ui/Gamepad";

type IconComp = (props: GamepadIconProps) => React.JSX.Element;

const ICON_MAP: Record<GamepadPlatform, Record<string, IconComp>> = {
  xbox:   { A: XboxA, B: XboxB, X: XboxX, Y: XboxY, LB: XboxLB, RB: XboxRB, LT: XboxLT, RT: XboxRT, MENU: XboxMenu, BACK: XboxView, HOME: XboxGuide },
  ps:     { A: PsCross, B: PsCircle, X: PsSquare, Y: PsTriangle, LB: PsL1, RB: PsR1, LT: PsL2, RT: PsR2, MENU: PsOptions, BACK: PsCreate, HOME: PsHome },
  switch: { A: SwA, B: SwB, X: SwX, Y: SwY, LB: SwL, RB: SwR, LT: SwZL, RT: SwZR, MENU: SwPlus, BACK: SwMinus, HOME: SwHome },
};

interface Props {
  btn: string;
  label: string;
  style?: CSSProperties;
}

const BTN_SIZES: Record<string, number> = { small: 18, medium: 22, large: 28 };

export function GamepadBtn({ btn, label, style }: Props) {
  const { theme } = useTheme();
  const { platform, colored, filled, btnSize } = useGamepadIcons();
  const iconSize = BTN_SIZES[btnSize ?? "medium"];

  let badge: React.ReactNode;
  const IconComp = ICON_MAP[platform]?.[btn];

  if (IconComp) {
    badge = <IconComp size={iconSize} colored={colored} filled={filled} />;
  } else if (btn === "↑↓") {
    badge = <TbArrowsUpDown size={14} color={theme.textDim} style={{ flexShrink: 0 }} />;
  } else if (btn === "←→") {
    badge = <TbArrowsLeftRight size={14} color={theme.textDim} style={{ flexShrink: 0 }} />;
  } else {
    badge = (
      <span style={{ fontSize: 10, color: theme.textDim, fontWeight: 600, flexShrink: 0 }}>
        {btn}
      </span>
    );
  }

  return (
    <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: theme.textDim, ...style }}>
      {badge}
      {label}
    </span>
  );
}
