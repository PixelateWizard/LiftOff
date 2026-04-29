import type { CSSProperties, ReactNode } from "react";
import { SectionTabBar, type TabItem } from "./SectionTabBar";

interface Props {
  items: TabItem[];
  activeIndex: number;
  onSelect?: (index: number) => void;
  showButtons?: boolean;
  textTabs?: boolean;
  fontWeight?: "thin" | "medium" | "bold";
  accent: { primary: string; glow: string };
  theme: { text: string; textDim: string; textFaint: string };
  isDark: boolean;
  style?: CSSProperties;
  /** Optional content rendered on the right side, absolutely positioned */
  rightActions?: ReactNode;
  /** Label text casing */
  labelCase?: "default" | "ucfirst" | "uppercase";
}

export function SectionTabHeader({
  isDark,
  style,
  rightActions,
  labelCase,
  ...tabBarProps
}: Props) {
  return (
    <div style={{ position: "relative", ...style }}>
      <SectionTabBar
        isDark={isDark}
        labelCase={labelCase}
        {...tabBarProps}
      />
      {rightActions && (
        <div style={{
          position: "absolute",
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          gap: 6,
          alignItems: "center",
        }}>
          {rightActions}
        </div>
      )}
    </div>
  );
}
