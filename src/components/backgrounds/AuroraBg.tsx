import React from "react";
import type { AccentConfig } from "../../constants";

interface Props { accent: AccentConfig; }

export default function AuroraBg({ accent }: Props) {
  const band4 = `color-mix(in srgb, ${accent.primary} 55%, rgba(120,60,220,0.28) 45%)`;
  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: -2, pointerEvents: "none", background: "linear-gradient(180deg,#030f1e 0%,#020b14 60%,#01080f 100%)" }} />
      <div className="theme-aurora-band theme-aurora-b1" style={{ position: "fixed", left: "-10%", right: "-10%", top: "36%", height: "28%", zIndex: -1, pointerEvents: "none", background: "radial-gradient(ellipse 90% 100% at 50% 50%, rgba(32,210,140,0.52) 0%, transparent 74%)", filter: "blur(28px)", mixBlendMode: "screen" }} />
      <div className="theme-aurora-band theme-aurora-b2" style={{ position: "fixed", left: "-15%", right: "-15%", top: "14%", height: "34%", zIndex: -1, pointerEvents: "none", background: "radial-gradient(ellipse 80% 100% at 50% 50%, rgba(110,60,220,0.38) 0%, transparent 72%)", filter: "blur(36px)", mixBlendMode: "screen" }} />
      <div className="theme-aurora-band theme-aurora-b3" style={{ position: "fixed", left: "-8%", right: "-8%", top: "24%", height: "22%", zIndex: -1, pointerEvents: "none", background: "radial-gradient(ellipse 70% 100% at 50% 50%, rgba(0,220,200,0.30) 0%, transparent 78%)", filter: "blur(22px)", mixBlendMode: "screen" }} />
      <div className="theme-aurora-band theme-aurora-b4" style={{ position: "fixed", left: "10%", right: "-20%", top: "16%", height: "44%", zIndex: -1, pointerEvents: "none", background: `radial-gradient(ellipse 60% 100% at 60% 50%, ${band4} 0%, transparent 68%)`, filter: "blur(44px)", opacity: 0.42, mixBlendMode: "screen" }} />
      <div className="theme-aurora-shimmer" style={{ position: "fixed", left: 0, right: 0, top: "28%", height: "18%", zIndex: -1, pointerEvents: "none", background: "linear-gradient(180deg,transparent 0%,rgba(160,255,220,0.13) 40%,rgba(160,255,220,0.13) 60%,transparent 100%)", filter: "blur(8px)", mixBlendMode: "screen" }} />
      <div id="aurora-star-container" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }} />
    </>
  );
}
