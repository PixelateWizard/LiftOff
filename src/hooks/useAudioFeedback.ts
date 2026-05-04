import { useCallback, useEffect, useRef } from "react";
import uiSound from "../assets/uiSound.mp3";
import uiSoundAlt from "../assets/uiSoundAlt.mp3";
import appStartSound from "../assets/gameLaunchSound.wav";
import appLoadedSound from "../assets/appLoadedSound.wav";

type AudioKey = "ui" | "uiAlt" | "gameStart" | "appLoaded";

export function useAudioFeedback() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBuffers = useRef<Partial<Record<AudioKey, AudioBuffer>>>({});

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    return audioCtxRef.current;
  }, []);

  const preloadAudio = useCallback(async (key: AudioKey, url: string) => {
    try {
      const ctx = getAudioCtx();
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      audioBuffers.current[key] = await ctx.decodeAudioData(arr);
    } catch {}
  }, [getAudioCtx]);

  const playBuffer = useCallback((key: AudioKey) => {
    try {
      const ctx = getAudioCtx();
      if (ctx.state === "suspended") ctx.resume();
      const buf = audioBuffers.current[key];
      if (!buf) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    } catch {}
  }, [getAudioCtx]);

  useEffect(() => {
    preloadAudio("ui", uiSound);
    preloadAudio("uiAlt", uiSoundAlt);
    preloadAudio("gameStart", appStartSound);
    preloadAudio("appLoaded", appLoadedSound);
  }, [preloadAudio]);

  return {
    playSound: () => playBuffer("ui"),
    playSoundAlt: () => playBuffer("uiAlt"),
    playSoundGameStart: () => playBuffer("gameStart"),
    playAppLoadedSound: () => playBuffer("appLoaded"),
  };
}
