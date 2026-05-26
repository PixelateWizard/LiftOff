import React from "react";
import type { AccentColors } from "../../types";
import { CyberCircuit, GlyphCity } from "./neonblade";

interface Props { accent: AccentColors; effectsEnabled?: boolean; }

function hexPath(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${i === 0 ? "M" : "L"}${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join("") + "Z";
}

const HUD_NODES = [
  { text: "SYS:OK", left: "5.5%", top: "87.5%", cls: "theme-cyberpunk-hud-0" },
  { text: "NET:ACT", left: "5.5%", top: "90.5%", cls: "theme-cyberpunk-hud-1" },
  { text: "MEM:72%", left: "5.5%", top: "93.5%", cls: "theme-cyberpunk-hud-2" },
  { text: "LINK:LIVE", left: "82%", top: "87.5%", cls: "theme-cyberpunk-hud-3" },
  { text: "LAT:4ms", left: "82%", top: "90.5%", cls: "theme-cyberpunk-hud-4" },
] as const;

export default function CyberpunkBg({ accent, effectsEnabled = true }: Props) {
  const primary = accent.primary || "#00e5ff";
  const magenta = "rgba(255,20,140,1)";
  const bs = 16;

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: -2, pointerEvents: "none", background: "linear-gradient(180deg,#01060f 0%,#010a14 50%,#020812 100%)" }} />

      <div style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none", mixBlendMode: "screen" }}>
        <CyberCircuit
          color={primary}
          glowColor={primary}
          opacity={0.18}
          lineThickness={1.2}
          dotSize={2.5}
          dotType="outline"
          glowIntensity="soft"
        />
      </div>

      <div className="theme-cyberpunk-glow" style={{ position: "fixed", inset: "-12%", zIndex: -1, pointerEvents: "none", background: `radial-gradient(ellipse 50% 26% at 14% 82%, color-mix(in srgb, ${primary} 55%, rgba(0,200,255,0.28) 45%) 0%, transparent 64%)`, filter: "blur(40px)", mixBlendMode: "screen", opacity: 0.38 }} />
      <div className="theme-cyberpunk-glow-2" style={{ position: "fixed", inset: "-12%", zIndex: -1, pointerEvents: "none", background: "radial-gradient(ellipse 44% 24% at 86% 78%, rgba(255,20,140,0.38) 0%, transparent 60%)", filter: "blur(44px)", mixBlendMode: "screen", opacity: 0.35 }} />

      <div style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(0,229,255,0.042) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.042) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />

      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, height: "38vh", zIndex: 0, pointerEvents: "none", mixBlendMode: "screen" }}>
        <GlyphCity
          cityType="solid"
          variant="megacity"
          colorPrimary={primary}
          colorSecondary={magenta}
          colorTertiary="rgba(255,220,30,0.85)"
          bgColor="rgba(0,0,0,0)"
          fontSize={11}
          speed={effectsEnabled ? 90 : 0}
          showVehicles={effectsEnabled}
          blinkingLights={effectsEnabled}
          opacity={58}
        />
      </div>

      <div className="theme-cyberpunk-scan" style={{ position: "fixed", left: 0, right: 0, top: 0, height: 2, zIndex: 1, pointerEvents: "none", background: `linear-gradient(90deg, transparent, rgba(0,229,255,0.50) 20%, color-mix(in srgb, ${primary} 55%, rgba(0,229,255,1) 45%) 50%, rgba(0,229,255,0.50) 80%, transparent)`, filter: "blur(1px)", boxShadow: "0 0 10px rgba(0,229,255,0.30)" }} />

      <div className="theme-cyberpunk-horizon" style={{ position: "fixed", left: 0, right: 0, bottom: "22%", height: 1, zIndex: 1, pointerEvents: "none", background: `linear-gradient(90deg, transparent, ${primary}77 22%, rgba(0,229,255,0.55) 50%, ${primary}77 78%, transparent)`, filter: "blur(1px)" }} />

      <svg style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none", overflow: "visible" }} aria-hidden="true">
        <path className="theme-cyberpunk-hex-0" d={hexPath(120, 200, 42)} fill="none" stroke={primary} strokeWidth="0.7" />
        <path className="theme-cyberpunk-hex-1" d={hexPath(1780, 310, 30)} fill="none" stroke="rgba(0,229,255,1)" strokeWidth="0.6" />
        <path className="theme-cyberpunk-hex-2" d={hexPath(920, 610, 24)} fill="none" stroke={magenta} strokeWidth="0.5" />
        <path className="theme-cyberpunk-hex-3" d={hexPath(270, 590, 18)} fill="none" stroke={primary} strokeWidth="0.5" />
        <path className="theme-cyberpunk-hex-0" d={hexPath(1560, 155, 22)} fill="none" stroke="rgba(0,229,255,1)" strokeWidth="0.5" />
      </svg>

      {(["tl", "tr", "bl", "br"] as const).map((corner) => {
        const il = corner.endsWith("l");
        const it = corner.startsWith("t");
        const pos: React.CSSProperties = {
          position: "fixed",
          left: il ? "4%" : undefined,
          right: il ? undefined : "4%",
          top: it ? "8%" : undefined,
          bottom: it ? undefined : "8%",
          width: bs * 2,
          height: bs * 2,
          zIndex: 1,
          pointerEvents: "none",
        };
        const bar: React.CSSProperties = { position: "absolute", background: primary, opacity: 0.50 };
        return (
          <div key={corner} className="theme-cyberpunk-bracket" style={pos}>
            <div style={{ ...bar, top: 0, left: il ? 0 : "auto", right: il ? "auto" : 0, width: bs, height: 1 }} />
            <div style={{ ...bar, top: 0, left: il ? 0 : "auto", right: il ? "auto" : 0, width: 1, height: bs }} />
            <div style={{ ...bar, bottom: 0, left: il ? 0 : "auto", right: il ? "auto" : 0, width: bs, height: 1 }} />
            <div style={{ ...bar, bottom: 0, left: il ? 0 : "auto", right: il ? "auto" : 0, width: 1, height: bs }} />
          </div>
        );
      })}

      {HUD_NODES.map(({ text, left, top, cls }) => (
        <div key={text} className={cls} style={{ position: "fixed", left, top, zIndex: 1, pointerEvents: "none", fontFamily: "monospace", fontSize: 9, letterSpacing: "0.12em", color: `color-mix(in srgb, ${primary} 65%, rgba(0,229,255,1) 35%)`, opacity: 0.35 }}>
          {text}
        </div>
      ))}

      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", backgroundImage: "repeating-linear-gradient(180deg,transparent 0px,transparent 3px,rgba(0,0,0,0.05) 3px,rgba(0,0,0,0.05) 4px)", opacity: 0.45 }} />

      <div className="theme-cyberpunk-flicker-1" style={{ position: "fixed", top: "11%", left: "5%", width: 2, height: 28, zIndex: 1, pointerEvents: "none", background: `linear-gradient(180deg,transparent,${primary},transparent)`, filter: `blur(1px) drop-shadow(0 0 4px ${primary})` }} />
      <div className="theme-cyberpunk-flicker-2" style={{ position: "fixed", top: "17%", right: "7%", width: 2, height: 20, zIndex: 1, pointerEvents: "none", background: "linear-gradient(180deg,transparent,rgba(255,20,160,0.9),transparent)", filter: "blur(1px) drop-shadow(0 0 4px rgba(255,20,160,0.9))" }} />
    </>
  );
}
