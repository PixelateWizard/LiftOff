import { useEffect, useRef } from "react";
import type { AccentColors, Settings } from "../../types";
import { AuroraBg, SynthwaveBg, CyberpunkBg, ForestBg, WebcoreBg } from "../backgrounds";
import { PAPER_GRAIN_DARK, PAPER_GRAIN_LIGHT } from "../../theme/surfaces";
import lofiBg from "../../assets/themes/lofi/cozy_moonlit_study_night_scene.mp4";
import lofiMusic from "../../assets/themes/lofi/mondamusic-lofi-lofi-girl-lofi-music-529555.mp3";

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
  appPaused?: boolean;
}

export function AppBackground({ settings, resolvedTheme, accent, appBg, bgGlow1, bgGlow2, isDark, isMaterial, surfaceStyle, appPaused = false }: AppBackgroundProps) {
  const lofiMusicRef = useRef<HTMLAudioElement | null>(null);
  const lofiVideoRef = useRef<HTMLVideoElement | null>(null);
  const washPink = accent.glow;
  const isLofi = resolvedTheme === "lofi";

  useEffect(() => {
    if (!lofiMusicRef.current) {
      lofiMusicRef.current = new Audio(lofiMusic);
      lofiMusicRef.current.loop = true;
      lofiMusicRef.current.volume = 0.28;
      lofiMusicRef.current.preload = "auto";
    }

    const audio = lofiMusicRef.current;
    if (appPaused) {
      audio.pause();
      return;
    }

    if (!isLofi || settings.lofi_music_enabled === false) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    const play = () => {
      audio.play().catch(() => {});
    };

    audio.play().catch(() => {
      window.addEventListener("pointerdown", play, { once: true });
      window.addEventListener("keydown", play, { once: true });
      window.addEventListener("touchstart", play, { once: true });
    });
    return () => {
      window.removeEventListener("pointerdown", play);
      window.removeEventListener("keydown", play);
      window.removeEventListener("touchstart", play);
      audio.pause();
    };
  }, [appPaused, isLofi, settings.lofi_music_enabled]);

  useEffect(() => {
    const video = lofiVideoRef.current;
    if (!video) return;
    if (appPaused) {
      video.pause();
      return;
    }
    if (isLofi) video.play().catch(() => {});
  }, [appPaused, isLofi]);

  return (
    <>
      {isLofi ? (
        <video
          ref={lofiVideoRef}
          src={lofiBg}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          style={{ position: "fixed", inset: 0, zIndex: -2, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center center", pointerEvents: "none" }}
        />
      ) : (
        <div style={{ position: "fixed", inset: 0, zIndex: -2, background: isMaterial ? `url("${isDark ? PAPER_GRAIN_DARK : PAPER_GRAIN_LIGHT}") repeat, ${appBg}` : appBg }} />
      )}
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
      {resolvedTheme === "onyx" && (
        <>
          <style>{`
            @keyframes onyx-ambient {
              0%, 100% { opacity: 0.55; transform: translateX(0%) translateY(0%) scale(1); }
              33%       { opacity: 0.72; transform: translateX(1.5%) translateY(-0.5%) scale(1.02); }
              66%       { opacity: 0.62; transform: translateX(-1%) translateY(0.8%) scale(0.98); }
            }
            @keyframes onyx-card-shimmer {
              0%, 100% { box-shadow: inset 0 1px 0 rgba(100,160,255,0.18), 0 0 0 1px rgba(80,130,255,0.14), 0 10px 32px rgba(0,0,0,0.45); }
              50%       { box-shadow: inset 0 1px 0 rgba(150,210,255,0.30), 0 0 0 1px rgba(110,175,255,0.28), 0 10px 40px rgba(10,30,80,0.55), 0 0 18px rgba(80,150,255,0.10); }
            }
            @media (prefers-reduced-motion: reduce) {
              @keyframes onyx-ambient { 0%, 100% { opacity: 0.60; } }
              @keyframes onyx-card-shimmer { 0%, 100% { box-shadow: inset 0 1px 0 rgba(100,160,255,0.22), 0 0 0 1px rgba(80,130,255,0.18), 0 10px 32px rgba(0,0,0,0.45); } }
            }
          `}</style>
          {/* Bande lumineuse ambiante principale — bande horizontale centrée, style PS5 */}
          <div style={{
            position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none",
            background: `
              radial-gradient(ellipse 100% 50% at 50% 38%, rgba(20,60,180,0.32) 0%, rgba(10,30,100,0.20) 42%, transparent 68%),
              radial-gradient(ellipse 60% 40% at 18% 58%, rgba(10,40,130,0.20) 0%, transparent 55%),
              radial-gradient(ellipse 55% 35% at 82% 32%, rgba(30,70,200,0.18) 0%, transparent 52%)
            `,
            animation: "onyx-ambient 18s ease-in-out infinite",
          }} />
          {/* Lueur basse de scène */}
          <div style={{
            position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none",
            background: "radial-gradient(ellipse 80% 28% at 50% 102%, rgba(20,55,160,0.22) 0%, transparent 55%)",
            animation: "onyx-ambient 24s ease-in-out infinite",
            animationDelay: "-9s",
          }} />
          {/* Vignette de profondeur */}
          <div style={{
            position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none",
            background: "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 40%, rgba(2,5,20,0.55) 100%)",
          }} />
        </>
      )}
      {settings.stars_enabled && resolvedTheme === "aurora" && <AuroraBg accent={accent} />}
      {settings.stars_enabled && resolvedTheme === "synthwave" && <SynthwaveBg accent={accent} />}
      {settings.stars_enabled && resolvedTheme === "cyberpunk" && <CyberpunkBg accent={accent} />}
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
