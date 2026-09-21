import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";
import uiSound from "../assets/uiSound.mp3";
import uiSoundAlt from "../assets/uiSoundAlt.mp3";
import appStartSound from "../assets/gameLaunchSound.wav";
import appLoadedSound from "../assets/appLoadedSound.wav";
import launchSuccessSound from "../assets/launchSuccessSound.wav";
import { AUDIO_PROFILES, type AudioProfile } from "../audio/audioProfiles";

type AudioKey = "ui" | "uiAlt" | "gameStart" | "appLoaded" | "launchSuccess";

export function useAudioFeedback(
  profileRef?: RefObject<AudioProfile>,
  enabledRef?: RefObject<boolean>,
) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBuffers = useRef<Partial<Record<AudioKey, AudioBuffer>>>({});
  const pendingKeys = useRef<Set<AudioKey>>(new Set());

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    return audioCtxRef.current;
  }, []);

  const startSource = useCallback((key: AudioKey) => {
    if (enabledRef && enabledRef.current === false) return;
    const ctx = audioCtxRef.current;
    const buf = audioBuffers.current[key];
    if (!ctx || ctx.state !== "running" || !buf) return;
    pendingKeys.current.delete(key);
    try {
      const profile = profileRef?.current ?? AUDIO_PROFILES.standard;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      if (profile.detune) src.detune.value = profile.detune;

      const gainNode = ctx.createGain();
      gainNode.gain.value = profile.gain;

      let head: AudioNode = src;
      if (profile.filter) {
        const filter = ctx.createBiquadFilter();
        filter.type = profile.filter.type;
        filter.frequency.value = profile.filter.frequency;
        head.connect(filter);
        head = filter;
      }
      head.connect(gainNode);
      gainNode.connect(ctx.destination);
      src.start(0);
    } catch {}
  }, [enabledRef, profileRef]);

  const flushPending = useCallback(() => {
    for (const key of [...pendingKeys.current]) startSource(key);
  }, [startSource]);

  const ensureRunning = useCallback(async () => {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") {
      try { await ctx.resume(); } catch {}
    }
    if (ctx.state === "running") flushPending();
    return ctx.state === "running";
  }, [flushPending, getAudioCtx]);

  const preloadAudio = useCallback(async (key: AudioKey, url: string) => {
    try {
      const ctx = getAudioCtx();
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      audioBuffers.current[key] = await ctx.decodeAudioData(arr);
      if (pendingKeys.current.has(key)) void ensureRunning();
    } catch {}
  }, [ensureRunning, getAudioCtx]);

  const playBuffer = useCallback((key: AudioKey) => {
    if (enabledRef && enabledRef.current === false) return;
    pendingKeys.current.add(key);
    void ensureRunning();
  }, [enabledRef, ensureRunning]);

  useEffect(() => {
    preloadAudio("ui", uiSound);
    preloadAudio("uiAlt", uiSoundAlt);
    preloadAudio("gameStart", appStartSound);
    preloadAudio("appLoaded", appLoadedSound);
    preloadAudio("launchSuccess", launchSuccessSound);
  }, [preloadAudio]);

  useEffect(() => {
    const unlock = () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      void ensureRunning();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [ensureRunning]);

  return {
    playSound: () => playBuffer("ui"),
    playSoundAlt: () => playBuffer("uiAlt"),
    playSoundGameStart: () => playBuffer("gameStart"),
    playAppLoadedSound: () => playBuffer("appLoaded"),
    playLaunchSuccessSound: () => playBuffer("launchSuccess"),
  };
}
