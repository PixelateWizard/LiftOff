import { useEffect } from "react";
import type { RefObject } from "react";

interface LofiBgProps {
  lofiVideoRef: RefObject<HTMLVideoElement | null>;
  lofiBg: string;
  lofiEffectsEnabled: boolean;
  appPaused: boolean;
}

export function LofiBg({ lofiVideoRef, lofiBg, lofiEffectsEnabled, appPaused }: LofiBgProps) {
  useEffect(() => {
    const video = lofiVideoRef.current;
    if (!video) return;
    if (appPaused || !lofiEffectsEnabled) {
      video.pause();
      return;
    }
    const play = () => {
      if (appPaused || !lofiEffectsEnabled || document.hidden) return;
      video.play().catch(() => {});
    };
    const playOnVisible = () => {
      if (!document.hidden) play();
    };

    video.load();
    play();
    video.addEventListener("loadeddata", play);
    video.addEventListener("canplay", play);
    window.addEventListener("focus", play);
    document.addEventListener("visibilitychange", playOnVisible);
    return () => {
      video.removeEventListener("loadeddata", play);
      video.removeEventListener("canplay", play);
      window.removeEventListener("focus", play);
      document.removeEventListener("visibilitychange", playOnVisible);
    };
  }, [appPaused, lofiEffectsEnabled, lofiVideoRef]);

  return (
    <>
      <video
        ref={lofiVideoRef}
        src={lofiBg}
        autoPlay={lofiEffectsEnabled}
        muted
        loop
        playsInline
        preload="auto"
        style={{ position: "fixed", inset: 0, zIndex: -2, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center center", pointerEvents: "none" }}
      />
      <div style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none",
        background: `
          linear-gradient(90deg, rgba(8,10,24,0.58), rgba(8,10,24,0.22) 45%, rgba(8,10,24,0.48)),
          linear-gradient(180deg, transparent 45%, rgba(5,6,16,0.48) 100%)
        `,
      }} />
    </>
  );
}

export default LofiBg;
