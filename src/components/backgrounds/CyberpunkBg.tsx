import React from "react";
import type { AccentColors } from "../../types";
import { AsciiRain } from "../neonblade-ui/ascii-rain";

interface Props { accent: AccentColors; effectsEnabled?: boolean; }

const HUD_NODES = [
  { text: "SYS:OK", left: "5.5%", top: "87.5%", cls: "theme-cyberpunk-hud-0" },
  { text: "NET:ACT", left: "5.5%", top: "90.5%", cls: "theme-cyberpunk-hud-1" },
  { text: "MEM:72%", left: "5.5%", top: "93.5%", cls: "theme-cyberpunk-hud-2" },
  { text: "LINK:LIVE", left: "82%", top: "87.5%", cls: "theme-cyberpunk-hud-3" },
  { text: "LAT:4ms", left: "82%", top: "90.5%", cls: "theme-cyberpunk-hud-4" },
] as const;

export default function CyberpunkBg({ accent, effectsEnabled = true }: Props) {
  const primary = accent.primary || "#00e5ff";
  const bs = 16;

  return (
    <>
      {/* Base gradient — a very dark tint of the chosen accent */}
      <div style={{ position: "fixed", inset: 0, zIndex: -2, pointerEvents: "none", background: `linear-gradient(180deg, color-mix(in srgb, ${primary} 8%, #03040b 92%) 0%, color-mix(in srgb, ${primary} 5%, #02030a 95%) 52%, color-mix(in srgb, ${primary} 3%, #010207 97%) 100%)` }} />

      {/* ASCII matrix rain — the primary backdrop */}
      <div style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none" }}>
        <AsciiRain
          textColor={primary}
          bgColor={`color-mix(in srgb, ${primary} 5%, rgba(2,4,11,0.15) 95%)`}
          fontSize={16}
          speed={effectsEnabled ? 0.5 : 0}
          opacity={0.5}
        />
      </div>

      {/* Faint alignment grid for depth */}
      <div style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(0,229,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.035) 1px, transparent 1px)", backgroundSize: "46px 46px" }} />

      {/* Readability vignette — darken edges/center band so foreground panels read cleanly */}
      <div style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none", background: "radial-gradient(ellipse 120% 90% at 50% 45%, transparent 38%, rgba(1,6,15,0.55) 100%)" }} />
      <div style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none", background: "linear-gradient(180deg, rgba(1,6,15,0.45) 0%, transparent 22%, transparent 72%, rgba(1,6,15,0.55) 100%)" }} />

      {/* Top scan line accent */}
      <div className="theme-cyberpunk-scan" style={{ position: "fixed", left: 0, right: 0, top: 0, height: 2, zIndex: 1, pointerEvents: "none", background: `linear-gradient(90deg, transparent, rgba(0,229,255,0.50) 20%, color-mix(in srgb, ${primary} 55%, rgba(0,229,255,1) 45%) 50%, rgba(0,229,255,0.50) 80%, transparent)`, filter: "blur(1px)", boxShadow: "0 0 10px rgba(0,229,255,0.30)" }} />

      {/* Corner HUD brackets */}
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

      {/* HUD telemetry text */}
      {HUD_NODES.map(({ text, left, top, cls }) => (
        <div key={text} className={cls} style={{ position: "fixed", left, top, zIndex: 1, pointerEvents: "none", fontFamily: "monospace", fontSize: 9, letterSpacing: "0.12em", color: `color-mix(in srgb, ${primary} 65%, rgba(0,229,255,1) 35%)`, opacity: 0.35 }}>
          {text}
        </div>
      ))}

      {/* Scanline overlay */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", backgroundImage: "repeating-linear-gradient(180deg,transparent 0px,transparent 3px,rgba(0,0,0,0.05) 3px,rgba(0,0,0,0.05) 4px)", opacity: 0.45 }} />
    </>
  );
}
