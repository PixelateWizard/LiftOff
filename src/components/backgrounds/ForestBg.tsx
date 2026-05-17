import React from "react";
import type { AccentConfig } from "../../constants";

interface Props { accent: AccentConfig; }

const FAR_TREES = [0, 60, 110, 160, 220, 270, 320, 380, 430, 490, 540, 590, 640, 700, 740];
const NEAR_TREES = [-20, 80, 190, 310, 430, 520, 640, 740, 820];

interface PineTreeProps {
  x: number;
  baseY: number;
  h: number;
  w: number;
  i: number;
  trunkW: number;
}

function PineTree({ x, baseY, h, w, i, trunkW }: PineTreeProps) {
  const cx = x + w / 2;
  const topY = baseY - h;
  const lean = ((i % 3) - 1) * w * 0.035;
  const tiers = [
    { y: topY + h * 0.18, spread: w * 0.20, depth: h * 0.16 },
    { y: topY + h * 0.30, spread: w * 0.34, depth: h * 0.20 },
    { y: topY + h * 0.45, spread: w * 0.48, depth: h * 0.23 },
    { y: topY + h * 0.62, spread: w * 0.62, depth: h * 0.25 },
    { y: topY + h * 0.78, spread: w * 0.74, depth: h * 0.28 },
  ];

  return (
    <g>
      <rect x={cx - trunkW / 2 + lean * 0.2} y={topY + h * 0.48} width={trunkW} height={h * 0.52} />
      {tiers.map((t, idx) => {
        const center = cx + lean * (idx + 1) * 0.14;
        const top = t.y - t.depth * 0.52;
        const bottom = Math.min(baseY, t.y + t.depth);
        return (
          <path
            key={idx}
            d={[
              `M ${center},${top}`,
              `C ${center - t.spread * 0.18},${top + t.depth * 0.22} ${center - t.spread * 0.78},${t.y + t.depth * 0.20} ${center - t.spread},${bottom - t.depth * 0.18}`,
              `C ${center - t.spread * 0.48},${bottom + t.depth * 0.08} ${center - t.spread * 0.14},${bottom + t.depth * 0.03} ${center},${bottom}`,
              `C ${center + t.spread * 0.14},${bottom + t.depth * 0.03} ${center + t.spread * 0.48},${bottom + t.depth * 0.08} ${center + t.spread},${bottom - t.depth * 0.18}`,
              `C ${center + t.spread * 0.78},${t.y + t.depth * 0.20} ${center + t.spread * 0.18},${top + t.depth * 0.22} ${center},${top}`,
              "Z",
            ].join(" ")}
          />
        );
      })}
    </g>
  );
}

export default function ForestBg({ accent }: Props) {
  const underglow = `color-mix(in srgb, ${accent.primary} 60%, #44d62c 40%)`;
  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: -2, pointerEvents: "none", background: "linear-gradient(180deg,#000d03,#010a04,#010c05,#000803)" }} />
      <div className="theme-forest-moonbeam" style={{ position: "fixed", left: "50%", top: 0, transform: "translateX(-50%)", width: 180, height: "55%", zIndex: -1, pointerEvents: "none", background: "linear-gradient(180deg,rgba(220,245,255,0.14) 0%,rgba(200,240,220,0.06) 60%,transparent 100%)", filter: "blur(18px)" }} />
      <div style={{ position: "fixed", left: "50%", top: "4%", transform: "translateX(-50%)", width: 26, height: 26, borderRadius: "50%", zIndex: -1, pointerEvents: "none", background: "radial-gradient(circle at 40% 38%,rgba(255,255,240,0.92) 0%,rgba(220,240,230,0.65) 55%,transparent 78%)", boxShadow: "0 0 22px 8px rgba(200,245,220,0.18)" }} />
      <div style={{ position: "fixed", inset: "-10%", zIndex: -1, pointerEvents: "none", background: `radial-gradient(ellipse 68% 28% at 50% 95%, ${underglow} 0%, transparent 60%)`, filter: "blur(32px)", opacity: 0.52 }} />
      <div className="theme-forest-fog" style={{ position: "fixed", left: "-5%", right: "-5%", bottom: "20%", height: "14%", zIndex: -1, pointerEvents: "none", background: "linear-gradient(180deg,transparent,rgba(180,220,195,0.07) 50%,transparent)", filter: "blur(10px)" }} />
      <div className="theme-forest-fog-2" style={{ position: "fixed", left: "-5%", right: "-5%", bottom: "15%", height: "10%", zIndex: -1, pointerEvents: "none", background: "linear-gradient(180deg,transparent,rgba(160,210,180,0.05) 50%,transparent)", filter: "blur(14px)" }} />
      <svg style={{ position: "fixed", left: 0, bottom: 0, width: "100%", zIndex: 0, pointerEvents: "none", opacity: 0.88 }} viewBox="0 0 800 220" preserveAspectRatio="none">
        <g fill="#000d03">
          {FAR_TREES.map((x, i) => {
            const h = 80 + (i % 4) * 28;
            const w = 22 + (i % 3) * 8;
            return <PineTree key={i} x={x} baseY={220} h={h} w={w} i={i} trunkW={5} />;
          })}
        </g>
      </svg>
      <svg style={{ position: "fixed", left: 0, bottom: 0, width: "100%", zIndex: 0, pointerEvents: "none" }} viewBox="0 0 800 200" preserveAspectRatio="none">
        <g fill="#000a02">
          {NEAR_TREES.map((x, i) => {
            const h = 100 + (i % 3) * 35;
            const w = 32 + (i % 4) * 10;
            return <PineTree key={i} x={x} baseY={200} h={h} w={w} i={i} trunkW={7} />;
          })}
        </g>
      </svg>
      <div id="forest-particle-container" style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", overflow: "hidden" }} />
    </>
  );
}
