import React from "react";
import type { AccentConfig } from "../../constants";

interface Props { accent: AccentConfig; }

const HORIZON_PCT = 38;
const SUN_R = 148;
const V_BOTTOM_X = [-80, 0, 80, 160, 240, 320, 370, 400, 430, 480, 560, 640, 720, 800, 880];

// Warp motion tuning. Keep in sync with the swRow keyframes in App.jsx.
const ROW_COUNT = 12;      // rows in flight at once (depth units)
const ROW_DEPTH = 1.4;     // perspective constant: y = 1 / (1 + u / ROW_DEPTH)
const ROW_SEC = 1.5;       // seconds between consecutive rows reaching the viewer
const BAND_SEC = 1.95;     // sun band scroll period (one 13px stripe)
const STREAK_COUNT = 40;
const STREAK_BASE_SEC = 2.85;

// Resting opacity for a row at depth u; mirrors the swRow keyframe opacities.
function rowOpacity(u: number): number {
  const far = Math.min(1, Math.max(0, (ROW_COUNT - u) / 4));
  const near = 0.55 + 0.45 * Math.min(1, u / 2);
  return +(far * near * 0.9).toFixed(3);
}

// Each row plays the same keyframes offset by a negative delay so rows stay evenly spaced in depth.
// The inline transform/opacity is the static pose used when effects are off or motion is reduced.
const ROWS = Array.from({ length: ROW_COUNT }, (_, i) => {
  const u = ROW_COUNT - i;
  return {
    delay: `${-(i * ROW_SEC)}s`,
    restY: `${(100 / (1 + u / ROW_DEPTH)).toFixed(2)}%`,
    restOpacity: rowOpacity(u),
  };
});

// Deterministic pseudo-random so streaks do not reshuffle on every render.
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STREAKS = (() => {
  const rand = mulberry32(0x5e7a);
  return Array.from({ length: STREAK_COUNT }, () => {
    const angle = -(6 + rand() * 168);
    const peak = 0.45 + rand() * 0.5;
    const pink = rand() > 0.45;
    const dur = STREAK_BASE_SEC * (0.7 + rand() * 0.8);
    const phase = rand();
    return {
      angle: `${angle.toFixed(1)}deg`,
      peak: peak.toFixed(2),
      dur: `${dur.toFixed(2)}s`,
      delay: `${(-dur * phase).toFixed(2)}s`,
      background: pink
        ? "linear-gradient(90deg, rgba(255,120,220,0), rgba(255,140,230,1))"
        : "linear-gradient(90deg, rgba(120,220,255,0), rgba(150,230,255,1))",
    };
  });
})();

export default function SynthwaveBg({ accent }: Props) {
  const sunMix = `color-mix(in srgb, ${accent.primary} 65%, #ff2090 35%)`;
  const sunMix2 = `color-mix(in srgb, ${accent.primary} 30%, #a010a0 70%)`;
  const horizMix = `color-mix(in srgb, ${accent.primary} 38%, rgba(255,60,180,0.28) 62%)`;

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: -2, pointerEvents: "none", background: "linear-gradient(180deg,#0e0118 0%,#160230 22%,#220540 42%,#160230 62%,#0c0220 100%)" }} />

      {/* Star streaks radiating upward from the sun's center, clipped to the sky */}
      <div style={{ position: "fixed", left: 0, right: 0, top: 0, height: `${100 - HORIZON_PCT}%`, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: "50%", top: "100%", width: 0, height: 0 }}>
          {STREAKS.map((s, i) => (
            <div
              key={i}
              className="theme-synthwave-streak"
              style={{
                position: "absolute", left: 0, top: 0, width: 70, height: 1.5, borderRadius: 2,
                transformOrigin: "0 50%", opacity: 0, background: s.background,
                animationDuration: s.dur, animationDelay: s.delay,
                ["--sw-a" as any]: s.angle, ["--sw-o" as any]: s.peak,
              }}
            />
          ))}
        </div>
      </div>

      <div className="theme-synthwave-sun" style={{ position: "fixed", left: "50%", bottom: `calc(${HORIZON_PCT}% - ${SUN_R}px)`, transform: "translateX(-50%)", width: SUN_R * 2, height: SUN_R * 2, borderRadius: "50%", zIndex: 0, pointerEvents: "none", background: `radial-gradient(circle at 50% 42%, #fff5c0 0%, #ffe840 8%, #ff9f00 22%, ${sunMix} 44%, ${sunMix2} 62%, transparent 76%)`, boxShadow: `0 0 60px 22px ${accent.glow}0.50), 0 0 120px 44px rgba(180,20,130,0.22)` }} />

      {/* Sun bands: a taller stripe layer slides down one 13px period and loops */}
      <div style={{ position: "fixed", left: "50%", bottom: `calc(${HORIZON_PCT}% - ${SUN_R}px)`, transform: "translateX(-50%)", width: SUN_R * 2, height: SUN_R * 2, borderRadius: "50%", zIndex: 0, overflow: "hidden", pointerEvents: "none", opacity: 0.88 }}>
        <div className="theme-synthwave-bands" style={{ position: "absolute", left: 0, right: 0, top: -13, height: SUN_R * 2 + 13, backgroundImage: "repeating-linear-gradient(180deg,transparent 0px,transparent 10px,rgba(7,2,15,0.72) 10px,rgba(7,2,15,0.72) 13px)", animationDuration: `${BAND_SEC}s` }} />
      </div>

      <div className="theme-synthwave-horizon" style={{ position: "fixed", left: "-10%", right: "-10%", bottom: `calc(${HORIZON_PCT}% - 2px)`, height: 60, zIndex: 0, pointerEvents: "none", background: `linear-gradient(180deg,transparent,${horizMix},transparent)`, filter: "blur(10px)", mixBlendMode: "screen" }} />
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, height: `${HORIZON_PCT}%`, background: "#07020e", zIndex: 0, pointerEvents: "none" }} />

      {/* Animated floor rows. Same box as the grid SVG so the vanishing point matches the fan lines. */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, height: `${HORIZON_PCT + 2}%`, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        {ROWS.map((r, i) => (
          <div
            key={i}
            className="theme-synthwave-row"
            style={{
              position: "absolute", inset: 0,
              transform: `translate3d(0, ${r.restY}, 0)`, opacity: r.restOpacity,
              animationDuration: `${ROW_COUNT * ROW_SEC}s`, animationDelay: r.delay,
            }}
          >
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 1.5, background: "rgb(255,48,192)", boxShadow: "0 0 6px rgba(255,48,192,0.55)" }} />
          </div>
        ))}
      </div>

      {/* Horizon haze hides where new rows fade in */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: `calc(${HORIZON_PCT}% - 46px)`, height: 60, zIndex: 0, pointerEvents: "none", background: "linear-gradient(180deg, rgba(40,6,60,0.95) 0%, rgba(40,6,60,0.55) 35%, rgba(7,2,14,0) 100%)" }} />

      <svg style={{ position: "fixed", left: 0, bottom: 0, width: "100%", height: `${HORIZON_PCT + 2}%`, zIndex: 0, pointerEvents: "none" }} viewBox="0 0 800 260" preserveAspectRatio="none">
        <defs>
          <linearGradient id="swGrid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,48,192,0.90)" />
            <stop offset="100%" stopColor="rgba(255,48,192,0.28)" />
          </linearGradient>
        </defs>
        {V_BOTTOM_X.map((bx, i) => (
          <line key={i} x1={400} y1={0} x2={bx} y2={260} stroke="url(#swGrid)" strokeWidth="0.75" strokeOpacity="0.80" />
        ))}
        <polygon points="0,260 0,158 28,98 56,138 76,78 102,122 126,68 157,112 186,88 218,132 252,260" fill="#0d0420" stroke="rgba(40,80,200,0.55)" strokeWidth="1.2" />
        <polyline points="28,98 56,138 76,78 102,122 126,68 157,112 186,88 218,132" fill="none" stroke="rgba(40,80,200,0.35)" strokeWidth="0.8" />
        <polygon points="800,260 800,158 772,98 744,138 724,78 698,122 674,68 643,112 614,88 582,132 548,260" fill="#0d0420" stroke="rgba(40,80,200,0.55)" strokeWidth="1.2" />
        <polyline points="772,98 744,138 724,78 698,122 674,68 643,112 614,88 582,132" fill="none" stroke="rgba(40,80,200,0.35)" strokeWidth="0.8" />
      </svg>
    </>
  );
}
