import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";
import uiSound from "../assets/uiSound.mp3";
import uiSoundAlt from "../assets/uiSoundAlt.mp3";
import appStartSound from "../assets/gameLaunchSound.wav";
import appLoadedSound from "../assets/appLoadedSound.wav";
import launchSuccessSound from "../assets/launchSuccessSound.wav";
import { AUDIO_PROFILES, type AudioProfile } from "../audio/audioProfiles";

type AudioKey = "ui" | "uiAlt" | "gameStart" | "appLoaded" | "launchSuccess";

export function useAudioFeedback(profileRef?: RefObject<AudioProfile>) {
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
  }, [getAudioCtx, profileRef]);

  useEffect(() => {
    preloadAudio("ui", uiSound);
    preloadAudio("uiAlt", uiSoundAlt);
    preloadAudio("gameStart", appStartSound);
    preloadAudio("appLoaded", appLoadedSound);
    preloadAudio("launchSuccess", launchSuccessSound);
  }, [preloadAudio]);

  return {
    playSound: () => playBuffer("ui"),
    playSoundAlt: () => playBuffer("uiAlt"),
    playSoundGameStart: () => playBuffer("gameStart"),
    playAppLoadedSound: () => playBuffer("appLoaded"),
    playLaunchSuccessSound: () => playBuffer("launchSuccess"),
  };
}
