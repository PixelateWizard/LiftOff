import type { AccentColors, Settings } from "../../types";
import { AuroraBg, SynthwaveBg, CyberpunkBg, ForestBg, WebcoreBg } from "../backgrounds";
import { PAPER_GRAIN_DARK, PAPER_GRAIN_LIGHT } from "../../theme/surfaces";
import lofiBg from "../../assets/themes/lofi/cozy_moonlit_study_night_scene.png";

interface AppBackgroundProps {
  settings: Settings;
  resolvedTheme: string;
  accent: AccentColors;
  appBg: string;
  bgGlow1: string;
  bgGlow2: string;
  isDark: boolean;
  isMaterial: boolean;
  surfaceStyle: string;
}

const LOFI_LIGHTS = [
  { left: "8.3%", top: "1.2%", size: 18, duration: "7.5s", delay: "-1.2s" },
  { left: "13.4%", top: "4.8%", size: 18, duration: "8.2s", delay: "-4.1s" },
  { left: "18.6%", top: "6.5%", size: 17, duration: "9.4s", delay: "-2.7s" },
  { left: "35.0%", top: "3.8%", size: 18, duration: "8.8s", delay: "-5.8s" },
  { left: "40.0%", top: "4.0%", size: 18, duration: "10.2s", delay: "-3.2s" },
  { left: "46.8%", top: "9.8%", size: 17, duration: "7.9s", delay: "-6.4s" },
  { left: "50.4%", top: "10.3%", size: 17, duration: "8.6s", delay: "-2.9s" },
  { left: "53.5%", top: "9.8%", size: 17, duration: "9.5s", delay: "-5.2s" },
  { left: "56.3%", top: "9.2%", size: 17, duration: "8.1s", delay: "-3.1s" },
  { left: "63.3%", top: "1.8%", size: 18, duration: "11.2s", delay: "-1.6s" },
  { left: "70.6%", top: "9.6%", size: 18, duration: "8.5s", delay: "-5.2s" },
  { left: "75.6%", top: "7.8%", size: 17, duration: "9.8s", delay: "-2.3s" },
  { left: "79.8%", top: "12.8%", size: 18, duration: "7.2s", delay: "-4.8s" },
  { left: "86.5%", top: "9.5%", size: 17, duration: "8.1s", delay: "-3.6s" },
  { left: "97.6%", top: "2.8%", size: 18, duration: "9.1s", delay: "-5.6s" },
] as const;

const LOFI_STARS = [
  { left: "48.8%", top: "20.9%", size: 2.2, duration: "5.5s", delay: "-1.1s" },
  { left: "52.7%", top: "29.5%", size: 2.6, duration: "7.2s", delay: "-3.7s" },
  { left: "58.0%", top: "23.9%", size: 2.0, duration: "6.4s", delay: "-2.8s" },
  { left: "61.9%", top: "32.6%", size: 3.0, duration: "8.5s", delay: "-4.9s" },
  { left: "67.0%", top: "22.8%", size: 2.3, duration: "4.8s", delay: "-1.9s" },
  { left: "70.8%", top: "31.4%", size: 2.1, duration: "7.9s", delay: "-6.1s" },
  { left: "73.8%", top: "22.4%", size: 2.6, duration: "5.9s", delay: "-2.2s" },
  { left: "44.8%", top: "31.6%", size: 2.0, duration: "8.8s", delay: "-3.4s" },
] as const;

const LOFI_STEAM = [
  { left: "53.6%", top: "48.8%", width: 18, height: 46, duration: "7.5s", delay: "-1.4s" },
  { left: "54.5%", top: "47.6%", width: 24, height: 56, duration: "9.2s", delay: "-4.8s" },
  { left: "55.6%", top: "48.6%", width: 16, height: 44, duration: "8.3s", delay: "-6.2s" },
] as const;

const LOFI_LAMPS = [
  { left: "2.0%", top: "64.6%", width: "8.5%", height: "14.0%", duration: "8.8s", delay: "-2.1s", opacity: 0.58 },
  { left: "15.4%", top: "30.5%", width: "7.2%", height: "11.0%", duration: "10.4s", delay: "-5.6s", opacity: 0.42 },
  { left: "36.8%", top: "39.2%", width: "14.0%", height: "12.2%", duration: "9.6s", delay: "-3.4s", opacity: 0.50 },
  { left: "92.4%", top: "48.0%", width: "8.2%", height: "12.5%", duration: "11.2s", delay: "-4.7s", opacity: 0.44 },
  { left: "88.2%", top: "65.2%", width: "7.8%", height: "11.8%", duration: "9.2s", delay: "-6.8s", opacity: 0.48 },
] as const;

const LOFI_HAIR_WISPS = [
  { d: "M 10 34 C 38 58, 62 92, 100 116 C 134 138, 166 134, 206 144", color: "rgba(205,96,224,0.34)", width: 1.4, duration: "9.5s", delay: "-1.8s" },
  { d: "M 2 40 C 28 58, 54 100, 98 126 C 132 148, 174 146, 220 154", color: "rgba(238,92,176,0.30)", width: 1.1, duration: "11.2s", delay: "-5.4s" },
  { d: "M 30 26 C 54 48, 74 82, 116 104 C 146 122, 174 118, 202 124", color: "rgba(255,118,190,0.22)", width: 0.9, duration: "8.8s", delay: "-6.4s" },
  { d: "M 18 70 C 46 92, 78 132, 122 150 C 154 166, 180 164, 210 156", color: "rgba(154,94,224,0.22)", width: 1.0, duration: "13.4s", delay: "-8.2s" },
  { d: "M 12 92 C 42 118, 70 154, 112 166 C 144 176, 174 174, 204 164", color: "rgba(196,86,214,0.24)", width: 1.0, duration: "12.0s", delay: "-2.8s" },
  { d: "M 34 112 C 62 138, 90 166, 130 174 C 158 180, 184 174, 214 166", color: "rgba(118,84,210,0.22)", width: 0.9, duration: "14.2s", delay: "-9.5s" },
  { d: "M 8 128 C 34 158, 70 194, 118 210 C 150 218, 176 210, 206 198", color: "rgba(176,78,210,0.24)", width: 0.9, duration: "12.8s", delay: "-4.7s" },
  { d: "M 42 146 C 70 176, 104 212, 148 222 C 178 228, 196 218, 222 206", color: "rgba(224,92,184,0.20)", width: 0.8, duration: "15.0s", delay: "-10.6s" },
  { d: "M 22 166 C 52 194, 86 226, 126 238 C 152 244, 174 238, 196 226", color: "rgba(116,88,218,0.20)", width: 0.85, duration: "13.8s", delay: "-6.9s" },
] as const;

const LOFI_COVER_WIDTH = "max(100vw, 177.68vh)";
const LOFI_COVER_HEIGHT = "max(100vh, 56.28vw)";

export function AppBackground({ settings, resolvedTheme, accent, appBg, bgGlow1, bgGlow2, isDark, isMaterial, surfaceStyle }: AppBackgroundProps) {
  const washPink = accent.glow;
  const isLofi = resolvedTheme === "lofi";
  return (
    <>
      <div style={isLofi
        ? { position: "fixed", inset: 0, zIndex: -2, backgroundImage: `url(${lofiBg})`, backgroundSize: "cover", backgroundPosition: "center center", backgroundRepeat: "no-repeat", pointerEvents: "none" }
        : { position: "fixed", inset: 0, zIndex: -2, background: isMaterial ? `url("${isDark ? PAPER_GRAIN_DARK : PAPER_GRAIN_LIGHT}") repeat, ${appBg}` : appBg }
      } />
      {isLofi && (
        <div style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none",
          background: `
            linear-gradient(90deg, rgba(8,10,24,0.58), rgba(8,10,24,0.22) 45%, rgba(8,10,24,0.48)),
            linear-gradient(180deg, transparent 45%, rgba(5,6,16,0.48) 100%)
          `,
        }} />
      )}
      {settings.stars_enabled && resolvedTheme === "plasma" && (
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
      )}
      {settings.stars_enabled && resolvedTheme === "cinder" && (
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
      )}
      {settings.stars_enabled && resolvedTheme === "wash" && (
        <>
          {/* Three specialized SVG filters */}
          <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden="true">
            <defs>
              {/* wash-edge: pre-blur → non-linear alpha (dried/pooled edges) → organic displacement */}
              <filter id="wash-edge" x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="linearRGB">
                <feTurbulence type="fractalNoise" baseFrequency="0.013 0.009" numOctaves="4" seed="7" result="edgeNoise"/>
                <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="preBlurred"/>
                <feComponentTransfer in="preBlurred" result="shaped">
                  <feFuncA type="table" tableValues="0 0 0.05 0.22 0.52 0.80 0.95 1"/>
                </feComponentTransfer>
                <feDisplacementMap in="shaped" in2="edgeNoise" scale="80" xChannelSelector="R" yChannelSelector="G"/>
              </filter>
              {/* wash-flow: asymmetric vertical blur → displacement — drips and downward spread */}
              <filter id="wash-flow" x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="linearRGB">
                <feTurbulence type="fractalNoise" baseFrequency="0.018 0.007" numOctaves="3" seed="23" result="flowNoise"/>
                <feGaussianBlur in="SourceGraphic" stdDeviation="0.8 3.5" result="flowed"/>
                <feDisplacementMap in="flowed" in2="flowNoise" scale="50" xChannelSelector="R" yChannelSelector="G"/>
              </filter>
              {/* wash-drag: asymmetric horizontal blur → displacement — brushstroke / paint pull */}
              <filter id="wash-drag" x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="linearRGB">
                <feTurbulence type="fractalNoise" baseFrequency="0.007 0.022" numOctaves="3" seed="41" result="dragNoise"/>
                <feGaussianBlur in="SourceGraphic" stdDeviation="5.5 0.6" result="dragged"/>
                <feDisplacementMap in="dragged" in2="dragNoise" scale="24" xChannelSelector="R" yChannelSelector="G"/>
              </filter>
            </defs>
          </svg>

          <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
            background: `radial-gradient(ellipse 100% 100% at 50% 50%, ${accent.glow}0.08) 0%, transparent 70%)`,
          }} />

          <div className="theme-wash-layer" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
            background: `
              radial-gradient(ellipse 28% 78% at -4% 50%, ${accent.glow}0.24) 0%, ${accent.glow}0.18) 36%, transparent 68%),
              radial-gradient(ellipse 42% 30% at 20% -7%, ${accent.glow}0.18) 0%, ${accent.glow}0.12) 42%, transparent 72%),
              radial-gradient(ellipse 46% 26% at 28% 107%, ${accent.glow}0.16) 0%, ${accent.glow}0.12) 40%, transparent 70%)
            `,
            animation: "washMix 32s ease-in-out infinite, washOpacity 30s ease-in-out infinite",
            animationDelay: "-11s, -6s",
          }} />

          <div className="theme-wash-layer" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
            background: `
              radial-gradient(ellipse 30% 76% at 104% 48%, rgba(78,150,255,0.22) 0%, rgba(78,150,255,0.16) 36%, transparent 68%),
              radial-gradient(ellipse 48% 28% at 78% 105%, rgba(88,136,255,0.18) 0%, rgba(88,136,255,0.12) 42%, transparent 72%),
              radial-gradient(ellipse 36% 26% at 100% 6%, rgba(134,122,255,0.14) 0%, rgba(134,122,255,0.10) 42%, transparent 72%)
            `,
            animation: "washB1 34s ease-in-out infinite, washOpacity 32s ease-in-out infinite",
            animationDelay: "-17s, -13s",
          }} />

          <div className="theme-wash-layer" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
            background: `
              radial-gradient(ellipse 52% 24% at 54% -5%, rgba(238,98,166,0.16) 0%, rgba(238,98,166,0.12) 40%, transparent 72%),
              radial-gradient(ellipse 38% 22% at 56% 104%, rgba(238,98,166,0.10) 0%, rgba(238,98,166,0.08) 44%, transparent 74%)
            `,
            animation: "washPink 36s ease-in-out infinite, washOpacity 34s ease-in-out infinite",
            animationDelay: "-21s, -9s",
          }} />

          {/* Warm primary — compound shape: main pool + side lobe + pigment hotspot + upper corner bloom.
              Multiple overlapping radials form an amoeba-like region; feComponentTransfer makes edges
              non-linear so they dry unevenly rather than fading uniformly. */}
          <div className="theme-wash-layer theme-wash-w1" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
            background: `
              radial-gradient(ellipse 62% 52% at 18% 47%, ${accent.glow}0.25) 0%, ${accent.glow}0.72) 30%, ${accent.glow}0.24) 52%, transparent 63%),
              radial-gradient(ellipse 42% 62% at 12% 54%, ${accent.glow}0.19) 0%, ${accent.glow}0.60) 34%, ${accent.glow}0.17) 56%, transparent 67%),
              radial-gradient(ellipse 22% 17% at 30% 43%, ${accent.glow}0.81) 0%, ${accent.glow}0.25) 38%, transparent 52%),
              radial-gradient(ellipse 31% 24% at 8% 24%, ${accent.glow}0.14) 0%, ${accent.glow}0.53) 40%, ${accent.glow}0.12) 60%, transparent 70%),
              radial-gradient(ellipse 50% 30% at 20% 85%, ${accent.glow}0.38) 0%, ${accent.glow}0.47) 28%, transparent 58%)
            `,
            filter: "url(#wash-edge) hue-rotate(20deg) saturate(0.82)",
          }} />

          {/* Warm secondary — lower pools + faint top-center bleed. wash-flow gives vertical drip
              character so these sit differently than the main body's spread. */}
          <div className="theme-wash-layer theme-wash-w2" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
            background: `
              radial-gradient(ellipse 28% 22% at 24% 72%, ${accent.glow}0.17) 0%, ${accent.glow}0.55) 42%, transparent 58%),
              radial-gradient(ellipse 20% 15% at 18% 86%, ${accent.glow}0.11) 0%, ${accent.glow}0.45) 44%, transparent 60%),
              radial-gradient(ellipse 14% 11% at 48% 18%, ${accent.glow}0.11) 0%, ${accent.glow}0.42) 46%, transparent 62%),
              radial-gradient(ellipse 40% 24% at 42% 92%, ${accent.glow}0.22) 0%, ${accent.glow}0.42) 32%, transparent 62%)
            `,
            filter: "url(#wash-flow)",
          }} />

          {/* Warm tendrils — two shapes at different heights and widths break the horizontal read.
              Left section thicker, right section thinner and offset upward; the gap between them
              creates a natural break. wash-flow's vertical asymmetry adds downward bleeding so each
              piece drifts differently and the two never merge into a clean line. */}
          <div className="theme-wash-layer theme-wash-w3" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
            background: `
              radial-gradient(ellipse 48% 10% at 26% 59%, ${accent.glow}0.08) 0%, ${accent.glow}0.34) 36%, transparent 55%),
              radial-gradient(ellipse 25% 7% at 50% 45%, ${accent.glow}0.06) 0%, ${accent.glow}0.22) 42%, transparent 60%)
            `,
            filter: "url(#wash-flow)",
          }} />

          <div className="theme-wash-layer theme-wash-pink" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
            background: `
              radial-gradient(ellipse 56% 49% at 50% 25%, ${washPink}0.50) 0%, ${washPink}0.65) 28%, ${washPink}0.18) 50%, transparent 65%),
              radial-gradient(ellipse 35% 28% at 58% 38%, ${washPink}0.20) 0%, ${washPink}0.42) 38%, transparent 58%)
            `,
            filter: "url(#wash-edge) hue-rotate(320deg) saturate(0.95)",
          }} />

          {/* Cool primary — compound right-side region. hue-rotate(148°) maps warm accent to a
              muted teal; saturate(0.58) keeps it soft so it reads as supporting, not competing.
              4th radial: tight hotspot for internal pigment density variation (dried-edge pooling). */}
          <div className="theme-wash-layer theme-wash-c1" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
            background: `
              radial-gradient(ellipse 55% 46% at 72% 46%, ${accent.glow}0.25) 0%, ${accent.glow}0.74) 30%, ${accent.glow}0.22) 52%, transparent 62%),
              radial-gradient(ellipse 34% 42% at 84% 38%, ${accent.glow}0.20) 0%, ${accent.glow}0.62) 34%, ${accent.glow}0.14) 54%, transparent 65%),
              radial-gradient(ellipse 20% 15% at 62% 70%, ${accent.glow}0.08) 0%, ${accent.glow}0.30) 46%, transparent 62%),
              radial-gradient(ellipse 14% 11% at 78% 44%, ${accent.glow}0.84) 0%, ${accent.glow}0.22) 36%, transparent 50%),
              radial-gradient(ellipse 40% 28% at 75% 80%, ${accent.glow}0.45) 0%, ${accent.glow}0.55) 28%, transparent 55%)
            `,
            filter: "url(#wash-edge) hue-rotate(205deg) saturate(0.9)",
          }} />

          {/* Cool upper — slightly different hue angle (130°) adds variation within cool region;
              more desaturated (0.52) so upper corner reads as a diluted wash, not a second color. */}
          <div className="theme-wash-layer theme-wash-c2" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
            background: `
              radial-gradient(ellipse 22% 28% at 88% 24%, ${accent.glow}0.14) 0%, ${accent.glow}0.53) 40%, transparent 58%),
              radial-gradient(ellipse 17% 14% at 72% 78%, ${accent.glow}0.11) 0%, ${accent.glow}0.39) 44%, transparent 60%)
            `,
            filter: "url(#wash-edge) hue-rotate(260deg) saturate(0.85)",
          }} />

          {/* Center meeting zone — ring gradient (opaque center=0 → peak at 46% → fade) simulates
              pigment accumulation where two wet washes touch. 3rd radial extends cool cohesion
              faintly toward center, breaking the hard warm/cool boundary. */}
          <div className="theme-wash-layer theme-wash-mix" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
            background: `
              radial-gradient(ellipse 45% 70% at 60% 48%, ${accent.glow}0.08) 0%, ${accent.glow}0.60) 46%, ${accent.glow}0.18) 62%, transparent 72%),
              radial-gradient(ellipse 17% 13% at 44% 34%, ${accent.glow}0.10) 0%, ${accent.glow}0.36) 48%, transparent 66%),
              radial-gradient(ellipse 45% 25% at 62% 55%, ${accent.glow}0.04) 0%, ${accent.glow}0.22) 52%, transparent 70%)
            `,
            filter: "url(#wash-edge) hue-rotate(260deg) saturate(0.72)",
          }} />

          {/* Cool cohesion bridge — extremely faint cool wash reaching from right region toward
              center. Connects the two color masses so the split feels like wet diffusion, not
              two separate paintings. Very low opacity; hue-rotate matches C1 exactly. */}
          <div className="theme-wash-layer theme-wash-bleed1" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
            background: `
              radial-gradient(ellipse 73% 39% at 66% 52%, ${accent.glow}0.0) 0%, ${accent.glow}0.20) 48%, transparent 64%),
              radial-gradient(ellipse 28% 20% at 56% 62%, ${accent.glow}0.03) 0%, ${accent.glow}0.14) 50%, transparent 66%)
            `,
            filter: "url(#wash-edge) hue-rotate(205deg) saturate(0.7)",
          }} />

          {/* Tertiary whisper — barely visible golden hue (hue-rotate 68°) at two small spots.
              Breaks the two-color look; adds the "accidental third pigment" quality of real
              watercolor. Must stay near invisible: max opacity 0.12 at peak. */}
          <div className="theme-wash-layer theme-wash-bleed2" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
            background: `
              radial-gradient(ellipse 17% 13% at 70% 76%, ${accent.glow}0.04) 0%, ${accent.glow}0.15) 44%, transparent 60%),
              radial-gradient(ellipse 11% 8% at 34% 22%, ${accent.glow}0.03) 0%, ${accent.glow}0.13) 46%, transparent 62%)
            `,
            filter: "url(#wash-edge) hue-rotate(68deg) saturate(0.5)",
          }} />

          {/* Paper grain — fractal noise at overlay blend; two-axis baseFrequency gives fibrous paper feel */}
          <svg style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 1, pointerEvents: "none", opacity: 0.092, mixBlendMode: "overlay" }} aria-hidden="true">
            <filter id="wash-grain-filter">
              <feTurbulence type="fractalNoise" baseFrequency="0.72 0.58" numOctaves="4" seed="13" stitchTiles="stitch"/>
              <feColorMatrix type="saturate" values="0"/>
            </filter>
            <rect width="100%" height="100%" filter="url(#wash-grain-filter)"/>
          </svg>
        </>
      )}
      {settings.stars_enabled && resolvedTheme === "aurora" && <AuroraBg accent={accent} />}
      {settings.stars_enabled && resolvedTheme === "synthwave" && <SynthwaveBg accent={accent} />}
      {settings.stars_enabled && resolvedTheme === "cyberpunk" && <CyberpunkBg accent={accent} />}
      {isLofi && (
        <div className="lofi-effects" style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: "50%", top: "50%", width: LOFI_COVER_WIDTH, height: LOFI_COVER_HEIGHT, transform: "translate(-50%, -50%)", pointerEvents: "none" }}>
            <div className="lofi-moon-halo" style={{ position: "absolute", left: "53.9%", top: "23.1%", width: "21.5%", height: "38.2%", transform: "translate(-50%, -50%)", borderRadius: "50%", pointerEvents: "none", background: "radial-gradient(ellipse, rgba(255,242,206,0.42) 0%, rgba(255,218,170,0.34) 30%, rgba(255,190,132,0.17) 52%, transparent 76%)", filter: "blur(18px)", mixBlendMode: "screen", opacity: 0.42 }} />
            <div className="lofi-moon-rim" style={{ position: "absolute", left: "53.9%", top: "23.1%", width: "9.2%", height: "16.4%", transform: "translate(-50%, -50%)", borderRadius: "50%", pointerEvents: "none", background: "radial-gradient(ellipse, rgba(255,246,218,0.18) 0%, rgba(255,226,182,0.12) 58%, transparent 74%)", boxShadow: "0 0 14px 4px rgba(255,218,170,0.12)", mixBlendMode: "screen", opacity: 0.44 }} />
            <div className="lofi-window-shimmer" style={{ position: "absolute", left: "39.0%", top: "10.0%", width: "33.4%", height: "38.0%", borderRadius: 6, pointerEvents: "none", background: "linear-gradient(115deg, transparent 0%, rgba(255,230,190,0.00) 33%, rgba(255,230,190,0.22) 48%, rgba(180,205,255,0.12) 56%, transparent 72%)", mixBlendMode: "screen", opacity: 0.48 }} />
            {LOFI_LIGHTS.map((light, index) => (
              <div key={`lofi-light-${index}`} className="lofi-light-glow" style={{ position: "absolute", left: light.left, top: light.top, width: light.size, height: light.size, borderRadius: "999px", pointerEvents: "none", background: "radial-gradient(circle, rgba(255,216,128,0.36) 0%, rgba(255,146,80,0.24) 38%, transparent 72%)", boxShadow: "0 0 18px 5px rgba(255,135,70,0.22)", mixBlendMode: "screen", animationDuration: light.duration, animationDelay: light.delay }} />
            ))}
            {LOFI_LAMPS.map((lamp, index) => (
              <div key={`lofi-lamp-${index}`} className="lofi-lamp-glow" style={{ position: "absolute", left: lamp.left, top: lamp.top, width: lamp.width, height: lamp.height, transform: "translate(-50%, -50%)", borderRadius: "50%", pointerEvents: "none", background: "radial-gradient(ellipse, rgba(255,196,112,0.42) 0%, rgba(255,132,70,0.20) 42%, transparent 74%)", filter: "blur(10px)", mixBlendMode: "screen", opacity: lamp.opacity, animationDuration: lamp.duration, animationDelay: lamp.delay }} />
            ))}
            {LOFI_STARS.map((star, index) => (
              <div key={`lofi-star-${index}`} className="lofi-star" style={{ position: "absolute", left: star.left, top: star.top, width: star.size + 0.8, height: star.size + 0.8, borderRadius: "999px", pointerEvents: "none", background: "rgba(255,246,218,0.98)", boxShadow: "0 0 9px rgba(255,236,190,0.76)", animationDuration: star.duration, animationDelay: star.delay }} />
            ))}
            {LOFI_STEAM.map((steam, index) => (
              <div key={`lofi-steam-${index}`} className="lofi-steam" style={{ position: "absolute", left: steam.left, top: steam.top, width: steam.width, height: steam.height, borderRadius: "50%", pointerEvents: "none", borderLeft: "2px solid rgba(255,231,204,0.46)", background: "radial-gradient(ellipse at 35% 55%, rgba(255,231,204,0.24), transparent 62%)", filter: "blur(1.4px)", animationDuration: steam.duration, animationDelay: steam.delay }} />
            ))}
            <svg className="lofi-hair-layer" style={{ position: "absolute", left: "67.0%", top: "39.6%", width: "18.2%", height: "30.0%", overflow: "visible", pointerEvents: "none", mixBlendMode: "screen" }} viewBox="0 0 240 260" preserveAspectRatio="none" aria-hidden="true">
              {LOFI_HAIR_WISPS.map((wisp, index) => (
                <path key={`lofi-hair-${index}`} className="lofi-hair-wisp" d={wisp.d} fill="none" stroke={wisp.color} strokeWidth={wisp.width} strokeLinecap="round" style={{ animationDuration: wisp.duration, animationDelay: wisp.delay }} />
              ))}
            </svg>
          </div>
          <div className="lofi-grain" style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.86 0.72' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.16'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", mixBlendMode: "overlay", opacity: 0.16 }} />
        </div>
      )}
      {settings.stars_enabled && resolvedTheme === "forest" && <ForestBg accent={accent} />}
      {settings.stars_enabled && resolvedTheme === "webcore" && <WebcoreBg accent={accent} />}
      {surfaceStyle === "aero" && (
        <div style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none",
          background: isDark
            ? "linear-gradient(180deg, rgba(255,255,255,0.012) 0%, rgba(0,0,0,0.018) 100%)"
            : "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.025) 100%)",
        }} />
      )}
      {resolvedTheme === "space" && settings.stars_enabled && (
        <div id="star-container" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }} />
      )}
      {resolvedTheme === "sky" && settings.stars_enabled && (
        <div id="cloud-container" style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none", overflow: "hidden" }} />
      )}
      <div style={{ position: "fixed", top: "-80%", left: "-80%", width: "180%", height: "180%", borderRadius: "50%", background: `radial-gradient(circle, ${bgGlow1} 0%, transparent 55%)`, pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-80%", right: "-80%", width: "180%", height: "180%", borderRadius: "50%", background: `radial-gradient(circle, ${bgGlow2} 0%, transparent 55%)`, pointerEvents: "none", zIndex: 0 }} />
    </>
  );
}
