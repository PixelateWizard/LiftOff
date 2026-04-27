import type { CSSProperties } from "react";
import { TbArrowsUpDown, TbArrowsLeftRight } from "react-icons/tb";

const CIRCLE_COLORS: Record<string, string> = {
  A: "#4a9c4a",
  B: "#b03030",
  X: "#3a5a8a",
  Y: "#8a6a00",
};

const PILL_BTNS = new Set(["LB", "RB", "LT", "RT", "MENU", "BACK", "START", "⊞"]);

interface Props {
  btn: string;
  label: string;
  theme: any;
  isDark?: boolean;
  style?: CSSProperties;
}

export function GamepadBtn({ btn, label, theme, isDark = true, style }: Props) {
  const circleColor = CIRCLE_COLORS[btn];
  const isPill = PILL_BTNS.has(btn);

  let badge: React.ReactNode;

  if (circleColor) {
    badge = (
      <span style={{
        width: 20, height: 20, borderRadius: "50%",
        background: circleColor,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 8, fontWeight: 700, color: "white", flexShrink: 0,
      }}>
        {btn}
      </span>
    );
  } else if (isPill) {
    badge = (
      <span style={{
        height: 18,
        minWidth: btn.length > 2 ? 28 : 24,
        borderRadius: 4,
        background: isDark ? "rgba(255,255,255,0.52)" : "rgba(0,0,0,0.15)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: btn.length > 2 ? 7 : 8, fontWeight: 700,
        color: isDark ? "white" : "#333",
        padding: "0 4px", flexShrink: 0,
      }}>
        {btn}
      </span>
    );
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
