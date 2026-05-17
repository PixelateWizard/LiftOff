import React from "react";
import type { AccentConfig } from "../../constants";

interface Props { accent: AccentConfig; }

const GRAIN_URI = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`;

export default function LofiBg({ accent }: Props) {
  const lampColor = `color-mix(in srgb, ${accent.primary} 48%, rgba(255,185,55,1) 52%)`;
  const floorColor = `color-mix(in srgb, ${accent.primary} 28%, rgba(255,155,40,0.9) 72%)`;
  const coneTop = `color-mix(in srgb, ${accent.primary} 50%, rgba(255,200,80,1) 50%)`;
  const coneMid = `color-mix(in srgb, ${accent.primary} 30%, rgba(255,160,50,1) 70%)`;

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: -2, pointerEvents: "none", background: "linear-gradient(160deg,#241408 0%,#1e1108 50%,#180e07 100%)" }} />
      <div className="theme-lofi-window" style={{ position: "fixed", left: "12%", right: "38%", top: "-4%", height: "60%", zIndex: -1, pointerEvents: "none", background: "linear-gradient(180deg,rgba(160,215,250,0.20) 0%,rgba(140,200,240,0.13) 55%,transparent 100%)", filter: "blur(6px)" }} />
      <svg style={{ position: "fixed", left: 0, top: 0, width: "100%", height: "65%", zIndex: -1, pointerEvents: "none" }} viewBox="0 0 800 380" preserveAspectRatio="none">
        <rect x="92" y="0" width="396" height="242" fill="rgba(160,210,248,0.11)" />
        <rect x="88" y="0" width="404" height="244" fill="none" stroke="rgba(28,16,6,0.75)" strokeWidth="14" />
        <line x1="290" y1="0" x2="290" y2="244" stroke="rgba(28,16,6,0.70)" strokeWidth="9" />
        <line x1="88" y1="130" x2="492" y2="130" stroke="rgba(28,16,6,0.70)" strokeWidth="9" />
        <rect x="76" y="242" width="432" height="16" fill="rgba(45,25,10,0.80)" rx="2" />
        <ellipse cx="435" cy="250" rx="16" ry="7" fill="rgba(18,10,4,0.80)" />
        <ellipse cx="447" cy="242" rx="9" ry="8" fill="rgba(18,10,4,0.80)" />
        <polygon points="441,236 438,228 444,236" fill="rgba(18,10,4,0.80)" />
        <polygon points="452,236 455,228 458,236" fill="rgba(18,10,4,0.80)" />
        <path d="M419,248 Q408,240 412,232" fill="none" stroke="rgba(18,10,4,0.80)" strokeWidth="3" strokeLinecap="round" />
        <rect x="0" y="60" width="80" height="320" fill="rgba(14,8,3,0.72)" />
        {[95, 108, 121, 134, 147, 160].map((y, i) => <rect key={y} x="8" y={y} width={[58, 44, 52, 38, 56, 48][i]} height="7" fill="rgba(30,18,8,0.80)" />)}
        <ellipse cx="525" cy="218" rx="26" ry="18" fill="rgba(14,8,3,0.65)" />
        <ellipse cx="516" cy="198" rx="15" ry="20" fill="rgba(18,10,4,0.60)" />
        <ellipse cx="534" cy="192" rx="13" ry="17" fill="rgba(18,10,4,0.60)" />
        <rect x="520" y="220" width="7" height="18" fill="rgba(14,8,3,0.70)" />
      </svg>
      <div className="theme-lofi-lamp" style={{ position: "fixed", inset: "-10%", zIndex: -1, pointerEvents: "none", background: `radial-gradient(ellipse 44% 48% at 76% 24%, ${lampColor} 0%, transparent 62%)`, filter: "blur(44px)", opacity: 0.88 }} />
      <svg style={{ position: "fixed", right: "8%", top: "-6%", width: "50%", height: "78%", zIndex: -1, pointerEvents: "none" }} viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lofiCone" x1=".5" y1="0" x2=".5" y2="1">
            <stop offset="0%" stopColor={coneTop} stopOpacity="0.20" />
            <stop offset="55%" stopColor={coneMid} stopOpacity="0.08" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points="50,0 -30,100 130,100" fill="url(#lofiCone)" />
      </svg>
      <div style={{ position: "fixed", inset: "-10%", zIndex: -1, pointerEvents: "none", background: `radial-gradient(ellipse 35% 24% at 72% 90%, ${floorColor} 0%, transparent 58%)`, filter: "blur(30px)", opacity: 0.44 }} />
      <div style={{ position: "fixed", left: "12%", right: "55%", bottom: "10%", height: "30%", zIndex: -1, pointerEvents: "none", background: "linear-gradient(180deg,transparent 0%,rgba(100,160,220,0.06) 60%,rgba(80,140,200,0.03) 100%)", filter: "blur(10px)" }} />
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", background: "radial-gradient(ellipse 90% 90% at 45% 45%,transparent 30%,rgba(0,0,0,0.55) 100%)" }} />
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", backgroundImage: GRAIN_URI, backgroundRepeat: "repeat", opacity: 0.65, mixBlendMode: "overlay" }} />
      <div id="lofi-dust-container" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }} />
    </>
  );
}
