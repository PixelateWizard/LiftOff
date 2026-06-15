export interface AudioProfile {
  detune: number;
  gain: number;
  filter?: {
    type: BiquadFilterType;
    frequency: number;
  };
}

export const AUDIO_PROFILES: Record<string, AudioProfile> = {
  standard: { detune: 0, gain: 1.0 },
  playful: { detune: 30, gain: 1.0, filter: { type: "highshelf", frequency: 3000 } },
  crisp: { detune: 0, gain: 0.9, filter: { type: "lowpass", frequency: 12000 } },
  retro: { detune: -40, gain: 0.95, filter: { type: "lowpass", frequency: 6000 } },
  warm: { detune: -15, gain: 0.85, filter: { type: "lowpass", frequency: 8000 } },
};

export function resolveAudioProfile(resolvedTheme: string, surfaceStyle: string): AudioProfile {
  if (surfaceStyle === "material") return AUDIO_PROFILES.crisp;
  if (surfaceStyle === "win9x" || resolvedTheme === "webcore") return AUDIO_PROFILES.retro;
  if (resolvedTheme === "synthwave" || resolvedTheme === "cyberpunk") return AUDIO_PROFILES.playful;
  if (resolvedTheme === "forest" || resolvedTheme === "lofi" || resolvedTheme === "wash") return AUDIO_PROFILES.warm;
  return AUDIO_PROFILES.standard;
}
