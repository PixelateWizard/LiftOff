import type { AccentColors } from "../../types";

interface PlasmaBgProps {
  accent: AccentColors;
}

export function PlasmaBg({ accent }: PlasmaBgProps) {
  return (
    <>
      <div className="theme-plasma-layer" style={{ position: "fixed", inset: "-18%", zIndex: -1, pointerEvents: "none",
        background: `
          radial-gradient(ellipse 42% 30% at 22% 28%, color-mix(in srgb, ${accent.primary} 62%, transparent 38%) 0%, transparent 62%),
          radial-gradient(ellipse 36% 28% at 78% 64%, color-mix(in srgb, ${accent.light} 44%, transparent 56%) 0%, transparent 68%),
          linear-gradient(118deg, transparent 8%, color-mix(in srgb, ${accent.dark} 44%, transparent 56%) 22%, transparent 42%, color-mix(in srgb, ${accent.primary} 34%, transparent 66%) 58%, transparent 82%)
        `,
        opacity: 0.62,
        filter: "blur(24px)",
        mixBlendMode: "screen",
      }} />
      <div id="plasma-particle-container" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }} />
    </>
  );
}

export default PlasmaBg;
