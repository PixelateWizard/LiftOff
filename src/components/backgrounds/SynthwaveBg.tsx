import React from "react";
import type { AccentConfig } from "../../constants";

interface Props { accent: AccentConfig; }

const HORIZON_PCT = 38;
const SUN_R = 148;
const H_LINES = [4, 11, 22, 37, 56, 80, 110, 148, 196, 260];
const V_BOTTOM_X = [-80, 0, 80, 160, 240, 320, 370, 400, 430, 480, 560, 640, 720, 800, 880];

export default function SynthwaveBg({ accent }: Props) {
  const sunMix = `color-mix(in srgb, ${accent.primary} 65%, #ff2090 35%)`;
  const sunMix2 = `color-mix(in srgb, ${accent.primary} 30%, #a010a0 70%)`;
  const horizMix = `color-mix(in srgb, ${accent.primary} 38%, rgba(255,60,180,0.28) 62%)`;

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: -2, pointerEvents: "none", background: "linear-gradient(180deg,#0e0118 0%,#160230 22%,#220540 42%,#160230 62%,#0c0220 100%)" }} />
      <div id="synthwave-star-container" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }} />
      <div className="theme-synthwave-sun" style={{ position: "fixed", left: "50%", bottom: `calc(${HORIZON_PCT}% - ${SUN_R}px)`, transform: "translateX(-50%)", width: SUN_R * 2, height: SUN_R * 2, borderRadius: "50%", zIndex: 0, pointerEvents: "none", background: `radial-gradient(circle at 50% 42%, #fff5c0 0%, #ffe840 8%, #ff9f00 22%, ${sunMix} 44%, ${sunMix2} 62%, transparent 76%)`, boxShadow: `0 0 60px 22px ${accent.glow}0.50), 0 0 120px 44px rgba(180,20,130,0.22)` }} />
      <div style={{ position: "fixed", left: "50%", bottom: `calc(${HORIZON_PCT}% - ${SUN_R}px)`, transform: "translateX(-50%)", width: SUN_R * 2, height: SUN_R * 2, borderRadius: "50%", zIndex: 0, overflow: "hidden", pointerEvents: "none", backgroundImage: "repeating-linear-gradient(180deg,transparent 0px,transparent 10px,rgba(7,2,15,0.72) 10px,rgba(7,2,15,0.72) 13px)", opacity: 0.88 }} />
      <div className="theme-synthwave-horizon" style={{ position: "fixed", left: "-10%", right: "-10%", bottom: `calc(${HORIZON_PCT}% - 2px)`, height: 60, zIndex: 0, pointerEvents: "none", background: `linear-gradient(180deg,transparent,${horizMix},transparent)`, filter: "blur(10px)", mixBlendMode: "screen" }} />
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, height: `${HORIZON_PCT}%`, background: "#07020e", zIndex: 0, pointerEvents: "none" }} />
      <svg style={{ position: "fixed", left: 0, bottom: 0, width: "100%", height: `${HORIZON_PCT + 2}%`, zIndex: 0, pointerEvents: "none" }} viewBox="0 0 800 260" preserveAspectRatio="none">
        <defs>
          <linearGradient id="swGrid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,48,192,0.90)" />
            <stop offset="100%" stopColor="rgba(255,48,192,0.28)" />
          </linearGradient>
        </defs>
        <polygon points="0,260 0,158 28,98 56,138 76,78 102,122 126,68 157,112 186,88 218,132 252,260" fill="#0d0420" stroke="rgba(40,80,200,0.55)" strokeWidth="1.2" />
        <polyline points="28,98 56,138 76,78 102,122 126,68 157,112 186,88 218,132" fill="none" stroke="rgba(40,80,200,0.35)" strokeWidth="0.8" />
        <polygon points="800,260 800,158 772,98 744,138 724,78 698,122 674,68 643,112 614,88 582,132 548,260" fill="#0d0420" stroke="rgba(40,80,200,0.55)" strokeWidth="1.2" />
        <polyline points="772,98 744,138 724,78 698,122 674,68 643,112 614,88 582,132" fill="none" stroke="rgba(40,80,200,0.35)" strokeWidth="0.8" />
        {H_LINES.map((y, i) => (
          <line key={i} x1="0" y1={y} x2="800" y2={y} stroke="url(#swGrid)" strokeWidth={i < 3 ? 0.8 : 1} strokeOpacity={i === 0 ? 0.4 : i < 4 ? 0.65 : 0.85} />
        ))}
        {V_BOTTOM_X.map((bx, i) => (
          <line key={i} x1={400} y1={0} x2={bx} y2={260} stroke="url(#swGrid)" strokeWidth="0.75" strokeOpacity="0.80" />
        ))}
      </svg>
    </>
  );
}
