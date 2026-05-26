import type { AccentColors } from "../../types";

interface WashBgProps {
  accent: AccentColors;
  washPink: string;
}

export function WashBg({ accent, washPink }: WashBgProps) {
  return (
    <>
      {/* Static SVG filter for dried watercolor edges. Animated layers avoid SVG filters. */}
      <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden="true">
        <defs>
          <filter id="wash-edge" x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="linearRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.032 0.041" numOctaves="2" seed="7" result="edgeNoise"/>
            <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blurred"/>
            <feComponentTransfer in="blurred" result="shaped">
              <feFuncA type="table" tableValues="0 0 0.05 0.22 0.52 0.80 0.95 1"/>
            </feComponentTransfer>
            <feDisplacementMap in="shaped" in2="edgeNoise" scale="40" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
        </defs>
      </svg>

      <div className="theme-wash-static" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: `
          radial-gradient(ellipse 62% 52% at 18% 47%, ${accent.glow}0.25) 0%, ${accent.glow}0.72) 30%, ${accent.glow}0.24) 52%, transparent 63%),
          radial-gradient(ellipse 42% 62% at 12% 54%, ${accent.glow}0.19) 0%, ${accent.glow}0.60) 34%, ${accent.glow}0.17) 56%, transparent 67%),
          radial-gradient(ellipse 22% 17% at 30% 43%, ${accent.glow}0.81) 0%, ${accent.glow}0.25) 38%, transparent 52%),
          radial-gradient(ellipse 50% 30% at 20% 85%, ${accent.glow}0.38) 0%, ${accent.glow}0.47) 28%, transparent 58%)
        `,
        filter: "url(#wash-edge) hue-rotate(20deg) saturate(0.82)",
      }} />

      <div className="theme-wash-static" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: `
          radial-gradient(ellipse 55% 46% at 72% 46%, ${accent.glow}0.25) 0%, ${accent.glow}0.74) 30%, ${accent.glow}0.22) 52%, transparent 62%),
          radial-gradient(ellipse 34% 42% at 84% 38%, ${accent.glow}0.20) 0%, ${accent.glow}0.62) 34%, ${accent.glow}0.14) 54%, transparent 65%),
          radial-gradient(ellipse 14% 11% at 78% 44%, ${accent.glow}0.84) 0%, ${accent.glow}0.22) 36%, transparent 50%)
        `,
        filter: "url(#wash-edge) hue-rotate(205deg) saturate(0.9)",
      }} />

      <div className="theme-wash-static" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: `
          radial-gradient(ellipse 56% 49% at 50% 25%, ${washPink}0.50) 0%, ${washPink}0.65) 28%, ${washPink}0.18) 50%, transparent 65%),
          radial-gradient(ellipse 35% 28% at 58% 38%, ${washPink}0.20) 0%, ${washPink}0.42) 38%, transparent 58%)
        `,
        filter: "url(#wash-edge) hue-rotate(320deg) saturate(0.95)",
      }} />

      <div className="theme-wash-static" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: `
          radial-gradient(ellipse 45% 70% at 60% 48%, ${accent.glow}0.08) 0%, ${accent.glow}0.60) 46%, ${accent.glow}0.18) 62%, transparent 72%),
          radial-gradient(ellipse 45% 25% at 62% 55%, ${accent.glow}0.04) 0%, ${accent.glow}0.22) 52%, transparent 70%)
        `,
        filter: "url(#wash-edge) hue-rotate(260deg) saturate(0.72)",
      }} />

      <div className="theme-wash-float theme-wash-float-1" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: `
          radial-gradient(ellipse 52% 46% at 22% 46%, ${accent.glow}0.20) 0%, ${accent.glow}0.08) 62%, transparent 82%),
          radial-gradient(ellipse 36% 28% at 14% 74%, ${accent.glow}0.14) 0%, ${accent.glow}0.05) 56%, transparent 76%)
        `,
        filter: "blur(32px) hue-rotate(20deg) saturate(0.75)",
      }} />

      <div className="theme-wash-float theme-wash-float-2" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: `
          radial-gradient(ellipse 50% 44% at 76% 44%, ${accent.glow}0.22) 0%, ${accent.glow}0.08) 60%, transparent 80%),
          radial-gradient(ellipse 28% 36% at 88% 62%, ${accent.glow}0.14) 0%, ${accent.glow}0.05) 55%, transparent 74%)
        `,
        filter: "blur(36px) hue-rotate(205deg) saturate(0.85)",
      }} />

      <div className="theme-wash-float theme-wash-float-3" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: `
          radial-gradient(ellipse 46% 38% at 50% 20%, ${washPink}0.30) 0%, ${washPink}0.10) 56%, transparent 78%)
        `,
        filter: "blur(28px) saturate(0.90)",
      }} />

      <div className="theme-wash-float theme-wash-float-4" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: `
          radial-gradient(ellipse 40% 28% at 28% 82%, ${accent.glow}0.18) 0%, ${accent.glow}0.06) 54%, transparent 74%),
          radial-gradient(ellipse 32% 22% at 68% 88%, ${accent.glow}0.14) 0%, ${accent.glow}0.05) 56%, transparent 76%)
        `,
        filter: "blur(30px) hue-rotate(340deg) saturate(0.70)",
      }} />

      <svg style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 1, pointerEvents: "none", opacity: 0.09, mixBlendMode: "overlay" }} aria-hidden="true">
        <filter id="wash-grain-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.72 0.58" numOctaves="4" seed="13" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#wash-grain-filter)"/>
      </svg>
    </>
  );
}

export default WashBg;
