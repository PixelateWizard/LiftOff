import type { AccentColors } from "../../types";

interface CinderBgProps {
  accent: AccentColors;
}

export function CinderBg({ accent }: CinderBgProps) {
  return (
    <>
      <div className="theme-cinder-layer" style={{ position: "fixed", inset: "-10%", zIndex: -1, pointerEvents: "none",
        background: `
          radial-gradient(circle at 20% 70%, color-mix(in srgb, ${accent.primary} 12%, rgba(255,106,43,0.10) 88%) 0%, transparent 40%),
          radial-gradient(circle at 80% 30%, rgba(255,80,40,0.08) 0%, transparent 45%),
          radial-gradient(circle at 50% 50%, rgba(255,140,80,0.05) 0%, transparent 60%),
          radial-gradient(ellipse 46% 28% at 72% 82%, color-mix(in srgb, ${accent.primary} 14%, rgba(255,214,163,0.08) 86%) 0%, transparent 72%),
          linear-gradient(180deg, #120909 0%, #1a0d0d 58%, #2a0f0f 100%)
        `,
        opacity: 0.92,
        filter: "blur(16px)",
      }} />
      <div style={{ position: "fixed", inset: "-12%", zIndex: -1, pointerEvents: "none",
        background: `
          radial-gradient(ellipse 34% 22% at 18% 76%, color-mix(in srgb, ${accent.primary} 12%, rgba(255,106,43,0.09) 88%) 0%, transparent 74%),
          radial-gradient(ellipse 28% 18% at 76% 34%, color-mix(in srgb, ${accent.dark} 10%, rgba(255,214,163,0.06) 90%) 0%, transparent 78%)
        `,
        opacity: 0.72,
        filter: "blur(34px)",
        mixBlendMode: "screen",
      }} />
      <div id="cinder-particle-container" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }} />
    </>
  );
}

export default CinderBg;
