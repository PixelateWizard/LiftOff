import type { CSSProperties } from "react";
import { SectionTabBar, type TabItem } from "./SectionTabBar";

interface Props {
  items: TabItem[];
  activeIndex: number;
  onSelect?: (index: number) => void;
  showButtons?: boolean;
  textTabs?: boolean;
  withBackground?: boolean;
  accent: { primary: string; glow: string };
  theme: { text: string; textDim: string; textFaint: string };
  isDark: boolean;
  glass: CSSProperties;
  sticky?: boolean;
  /** When true the header takes on the nav-bar glass background and sticks to the top */
  transparent?: boolean;
  style?: CSSProperties;
}

export function SectionTabHeader({
  isDark,
  glass,
  sticky = false,
  transparent = false,
  style,
  withBackground,
  ...tabBarProps
}: Props) {
  const glassStyle: CSSProperties = transparent
    ? {
        // background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.75)",
        // backdropFilter: "blur(24px)",
        // WebkitBackdropFilter: "blur(24px)",
      }
    : {};

  const outer: CSSProperties = {
    ...(sticky ? { position: "sticky", top: 0, zIndex: 10 } : {}),
    ...glassStyle,
    ...style,
  };

  const marginY = "3px";
  const paddingY = "10px";

  return (
    <div style={{ ...outer, ...(!withBackground ? { paddingTop: paddingY, paddingBottom: paddingY } : { marginLeft: marginY, marginRight: marginY }) }}>
      <SectionTabBar
        isDark={isDark}
        glass={withBackground ? glass : undefined}
        withBackground={withBackground}
        {...tabBarProps}
      />
    </div>
  );
}
