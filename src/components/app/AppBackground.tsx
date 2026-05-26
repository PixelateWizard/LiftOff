import { useEffect, useRef } from "react";
import type { AccentColors, Settings } from "../../types";
import { AuroraBg, SynthwaveBg, CyberpunkBg, ForestBg, WebcoreBg, SpaceBg, SkyBg, WashBg, CinderBg, PlasmaBg, LofiBg } from "../backgrounds";
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
      if (appPaused || !lofiEffectsEnabled || settings.lofi_music_enabled === false || document.hidden) return;
      audio.play().catch(() => {});
    };
    const playOnVisible = () => {
      if (!document.hidden) play();
    };

    audio.play().catch(() => {
      window.addEventListener("pointerdown", play, { once: true });
      window.addEventListener("keydown", play, { once: true });
      window.addEventListener("touchstart", play, { once: true });
    });
    window.addEventListener("focus", play);
    document.addEventListener("visibilitychange", playOnVisible);
    return () => {
      window.removeEventListener("pointerdown", play);
      window.removeEventListener("keydown", play);
      window.removeEventListener("touchstart", play);
      window.removeEventListener("focus", play);
      document.removeEventListener("visibilitychange", playOnVisible);
      audio.pause();
    };
  }, [appPaused, lofiEffectsEnabled, settings.lofi_music_enabled]);

  return (
    <>
      {isLofi ? (
        <LofiBg lofiVideoRef={lofiVideoRef} lofiBg={lofiBg} lofiEffectsEnabled={lofiEffectsEnabled} appPaused={appPaused} />
      ) : (
        <div style={{ position: "fixed", inset: 0, zIndex: -2, background: isMaterial ? `url("${isDark ? PAPER_GRAIN_DARK : PAPER_GRAIN_LIGHT}") repeat, ${appBg}` : appBg }} />
      )}
      {resolvedTheme === "plasma" && <PlasmaBg accent={accent} />}
      {resolvedTheme === "cinder" && <CinderBg accent={accent} />}
      {resolvedTheme === "wash" && <WashBg accent={accent} washPink={washPink} />}
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
      {resolvedTheme === "space" && <SpaceBg />}
      {resolvedTheme === "sky" && <SkyBg />}
      <div style={{ position: "fixed", top: "-80%", left: "-80%", width: "180%", height: "180%", borderRadius: "50%", background: `radial-gradient(circle, ${bgGlow1} 0%, transparent 55%)`, pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-80%", right: "-80%", width: "180%", height: "180%", borderRadius: "50%", background: `radial-gradient(circle, ${bgGlow2} 0%, transparent 55%)`, pointerEvents: "none", zIndex: 0 }} />
    </>
  );
}
