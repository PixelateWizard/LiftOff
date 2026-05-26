import { useEffect, useRef } from "react";
import type { AccentColors, Settings } from "../../types";
import { AuroraBg, SynthwaveBg, CyberpunkBg, ForestBg, WebcoreBg } from "../backgrounds";
import { PAPER_GRAIN_DARK, PAPER_GRAIN_LIGHT } from "../../theme/surfaces";
import lofiBg from "../../assets/themes/lofi/cozy_moonlit_study_night_scene.mp4";
import lofiPoster from "../../assets/themes/lofi/cozy_moonlit_study_night_scene-old.png";
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
  const effectsEnabled = settings.stars_enabled !== false;
  const lofiEffectsEnabled = isLofi && effectsEnabled;

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

    if (!lofiEffectsEnabled || settings.lofi_music_enabled === false) {
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
  }, [appPaused, lofiEffectsEnabled, settings.lofi_music_enabled]);

  useEffect(() => {
    const video = lofiVideoRef.current;
    if (!video) return;
    if (appPaused || !lofiEffectsEnabled) {
      video.pause();
      return;
    }
    if (lofiEffectsEnabled) video.play().catch(() => {});
  }, [appPaused, lofiEffectsEnabled]);

  return (
    <>
      {isLofi ? (
        <video
          ref={lofiVideoRef}
          src={lofiBg}
          poster={lofiPoster}
          autoPlay={lofiEffectsEnabled}
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
      {resolvedTheme === "plasma" && (
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
      {resolvedTheme === "cinder" && (
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
      {resolvedTheme === "wash" && (
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
      )}
      {resolvedTheme === "onyx" && (
        <>
          <style>{`
            @keyframes onyx-ring-spin {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
            .onyx-focus-ring,
            .onyx-focus-ring-stroke,
            .onyx-focus-ring-static {
              --onyx-focus-primary: ${accent.primary};
              --onyx-focus-glow: ${accent.glow}0.45);
              --onyx-focus-glow-soft: ${accent.glow}0.24);
            }
            .onyx-focus-ring-static {
              position: absolute;
              border: 2px solid var(--onyx-focus-primary);
              box-shadow: 0 0 0 1px var(--onyx-focus-glow-soft);
              pointer-events: none;
            }
            .onyx-focus-ring {
              position: absolute;
              inset: 0;
              border-radius: inherit;
              padding: 2px;
              pointer-events: none;
              -webkit-mask:
                linear-gradient(#fff 0 0) content-box,
                linear-gradient(#fff 0 0);
              -webkit-mask-composite: xor;
              mask-composite: exclude;
            }
            /* Rotating variant — square / vertical elements, goes all the way around */
            .onyx-ring-spin {
              position: absolute;
              inset: -150%;
              background: conic-gradient(
                from 0deg,
                transparent 0%,
                var(--onyx-focus-glow) 6%,
                var(--onyx-focus-primary) 25%,
                var(--onyx-focus-glow) 44%,
                transparent 50%,
                transparent 100%
              );
              animation: onyx-ring-spin 3s linear infinite;
            }
            /* Left-anchor sweep — narrow arc traces left→top-right→left→bottom-right */
            @keyframes onyx-ring-h-sweep {
              0%   { transform: rotate(0deg); }
              25%  { transform: rotate(135deg); }
              50%  { transform: rotate(0deg); }
              75%  { transform: rotate(-135deg); }
              100% { transform: rotate(0deg); }
            }
            .onyx-ring-h {
              position: absolute;
              inset: -150%;
              background: conic-gradient(
                from 218deg,
                transparent 0%,
                var(--onyx-focus-glow) 11%,
                var(--onyx-focus-primary) 15%,
                var(--onyx-focus-glow) 19%,
                transparent 26%,
                transparent 100%
              );
              animation: onyx-ring-h-sweep 5s ease-in-out infinite;
            }
            @keyframes onyx-ring-dash {
              from { stroke-dashoffset: 0; }
              to   { stroke-dashoffset: -100; }
            }
            .onyx-focus-ring-stroke {
              position: absolute;
              pointer-events: none;
            }
            .onyx-focus-ring-stroke svg {
              position: absolute;
              inset: 0;
              overflow: visible;
            }
            .onyx-ring-stroke-base,
            .onyx-ring-stroke-runner {
              fill: none;
              vector-effect: non-scaling-stroke;
            }
            .onyx-ring-stroke-base {
              stroke: var(--onyx-focus-glow-soft);
              stroke-width: 1.5;
            }
            .onyx-ring-stroke-runner {
              stroke: var(--onyx-focus-primary);
              stroke-width: 2.2;
              opacity: 0.82;
              stroke-linecap: round;
              animation: onyx-ring-dash 7.2s linear infinite;
              filter: drop-shadow(0 0 4px var(--onyx-focus-glow)) drop-shadow(0 0 10px var(--onyx-focus-glow-soft));
            }
            @media (prefers-reduced-motion: reduce) {
              .onyx-ring-spin, .onyx-ring-h, .onyx-ring-stroke-runner { animation: none; }
            }
          `}</style>
          {/* Subtle depth vignette */}
          <div style={{
            position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none",
            background: "radial-gradient(ellipse 75% 75% at 50% 50%, transparent 35%, rgba(0,0,0,0.45) 100%)",
          }} />
          {/* Top-light beam — narrow shaft descending from above */}
          {settings.onyx_top_light && (
            <div style={{
              position: "fixed", top: 0, left: 0, right: 0,
              height: "90vh", zIndex: 0, pointerEvents: "none",
              background: `
                radial-gradient(ellipse 38% 28% at 50% -8%, ${accent.glow}0.50) 0%, transparent 70%),
                radial-gradient(ellipse 20% 95% at 50% -5%, ${accent.glow}0.55) 0%, ${accent.glow}0.22) 25%, ${accent.glow}0.06) 55%, transparent 70%)
              `,
            }} />
          )}
        </>
      )}
      {resolvedTheme === "aurora" && <AuroraBg accent={accent} />}
      {resolvedTheme === "synthwave" && <SynthwaveBg accent={accent} />}
      {resolvedTheme === "cyberpunk" && <CyberpunkBg accent={accent} effectsEnabled={effectsEnabled} />}
      {resolvedTheme === "forest" && <ForestBg accent={accent} />}
      {resolvedTheme === "webcore" && <WebcoreBg accent={accent} effectsEnabled={effectsEnabled} />}
      {surfaceStyle === "aero" && (
        <div style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none",
          background: isDark
            ? "linear-gradient(180deg, rgba(255,255,255,0.012) 0%, rgba(0,0,0,0.018) 100%)"
            : "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.025) 100%)",
        }} />
      )}
      {resolvedTheme === "space" && (
        <div id="star-container" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }} />
      )}
      {resolvedTheme === "sky" && (
        <div id="cloud-container" style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none", overflow: "hidden" }} />
      )}
      <div style={{ position: "fixed", top: "-80%", left: "-80%", width: "180%", height: "180%", borderRadius: "50%", background: `radial-gradient(circle, ${bgGlow1} 0%, transparent 55%)`, pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-80%", right: "-80%", width: "180%", height: "180%", borderRadius: "50%", background: `radial-gradient(circle, ${bgGlow2} 0%, transparent 55%)`, pointerEvents: "none", zIndex: 0 }} />
    </>
  );
}
