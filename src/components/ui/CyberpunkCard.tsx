import type { CSSProperties, ReactNode } from "react";
import { BorderBeamCornerCutCard } from "../neonblade-ui/border-beam-corner-cut-card";

interface CyberpunkCardProps {
  enabled: boolean;
  focused?: boolean;
  accent: { primary: string; glow: string };
  style?: CSSProperties;
  children: ReactNode;
}

export function CyberpunkCard({ enabled, focused, accent, style, children }: CyberpunkCardProps) {
  if (!enabled) return <div style={style}>{children}</div>;

  return (
    <BorderBeamCornerCutCard
      data-card-inner=""
      beamColor={focused ? accent.primary : `${accent.glow}0.55)`}
      beamColorB="rgba(255,20,140,0.9)"
      variant={focused ? "dual" : "single"}
      duration={focused ? 3.2 : 5.5}
      durationB={4.4}
      borderWidth={focused ? 2 : 1}
      corner="bottom-right"
      cornerSize={12}
      glowIntensity={focused ? "medium" : "low"}
      bgColor="rgba(0,10,22,0.72)"
      style={style}
      innerStyle={{
        position: "absolute",
        inset: 0,
        padding: 0,
        overflow: "hidden",
        backgroundColor: "rgba(0,10,22,0.72)",
      }}
    >
      {children}
    </BorderBeamCornerCutCard>
  );
}
