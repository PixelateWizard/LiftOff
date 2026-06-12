import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { SpotifyTrack } from "./useSpotify";

type SpotifyTokenCallback = (token: string) => void;

interface SpotifyPlayerInstance {
  addListener(event: "ready" | "not_ready", cb: (payload: { device_id: string }) => void): void;
  addListener(event: "initialization_error" | "authentication_error" | "account_error" | "playback_error", cb: (payload: { message: string }) => void): void;
  addListener(event: "autoplay_failed", cb: () => void): void;
  addListener(event: "player_state_changed", cb: (payload: SpotifySdkState | null) => void): void;
  connect(): Promise<boolean>;
  disconnect(): void;
  getCurrentState?: () => Promise<SpotifySdkState | null>;
  activateElement?: () => Promise<void>;
}

interface SpotifyPlayerConstructor {
  new (options: {
    name: string;
    getOAuthToken: (cb: SpotifyTokenCallback) => void;
    volume?: number;
  }): SpotifyPlayerInstance;
}

declare global {
  interface Window {
    Spotify?: {
      Player: SpotifyPlayerConstructor;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

export interface SpotifyWebPlayerState {
  ready: boolean;
  deviceId: string | null;
  error: string | null;
  track: SpotifyTrack | null;
  activate: () => Promise<void>;
  sync: () => Promise<void>;
}

interface SpotifySdkState {
  paused: boolean;
  position: number;
  duration: number;
  context?: { uri?: string | null } | null;
  track_window?: {
    current_track?: {
      id?: string;
      name?: string;
      duration_ms?: number;
      artists?: Array<{ name?: string }>;
      album?: {
        name?: string;
        images?: Array<{ url?: string }>;
      };
    };
  };
}

const SDK_SRC = "https://sdk.scdn.co/spotify-player.js";
let sdkPromise: Promise<void> | null = null;

const mapSdkTrack = (state: SpotifySdkState | null): SpotifyTrack | null => {
  const item = state?.track_window?.current_track;
  if (!item) return null;
  return {
    id: item.id,
    title: item.name ?? "",
    artist: Array.isArray(item.artists) ? item.artists.map((artist) => artist.name).filter(Boolean).join(", ") : "",
    album: item.album?.name,
    image: Array.isArray(item.album?.images) && item.album.images.length > 0 ? item.album.images[0]?.url : undefined,
    durationMs: Number(item.duration_ms ?? state?.duration ?? 0),
    progressMs: Number(state?.position ?? 0),
    isPlaying: !state?.paused,
    contextUri: state?.context?.uri ?? undefined,
    shuffle: false,
    repeat: "off",
  };
};

const loadSpotifySdk = () => {
  if (window.Spotify?.Player) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_SRC}"]`);
    const previousReady = window.onSpotifyWebPlaybackSDKReady;
    window.onSpotifyWebPlaybackSDKReady = () => {
      previousReady?.();
      resolve();
    };

    if (existing) {
      existing.addEventListener("error", () => reject(new Error("Could not load Spotify Web Playback SDK.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = SDK_SRC;
    script.async = true;
    script.onerror = () => reject(new Error("Could not load Spotify Web Playback SDK."));
    document.body.appendChild(script);
  });

  return sdkPromise;
};

export function useSpotifyWebPlayer(enabled: boolean): SpotifyWebPlayerState {
  const [ready, setReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [track, setTrack] = useState<SpotifyTrack | null>(null);
  const playerRef = useRef<SpotifyPlayerInstance | null>(null);
  const sync = useCallback(async () => {
    const state = await playerRef.current?.getCurrentState?.();
    if (state !== undefined) {
      setTrack(mapSdkTrack(state));
      if (state) setError(null);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      playerRef.current?.disconnect();
      playerRef.current = null;
      setReady(false);
      setDeviceId(null);
      setError(null);
      setTrack(null);
      return;
    }

    let cancelled = false;
    loadSpotifySdk()
      .then(() => {
        if (cancelled || !window.Spotify?.Player) return;

        const player = new window.Spotify.Player({
          name: "LiftOff on Ally",
          getOAuthToken: async (cb) => {
            try {
              const token = await invoke<string>("spotify_access_token");
              cb(token);
            } catch {
              setError("Could not refresh Spotify access token for in-app playback.");
            }
          },
          volume: 0.75,
        });

        player.addListener("ready", ({ device_id }) => {
          setDeviceId(device_id);
          setReady(true);
          setError(null);
        });
        player.addListener("not_ready", ({ device_id }) => {
          setReady(false);
          setDeviceId((current) => (current === device_id ? null : current));
        });
        player.addListener("initialization_error", ({ message }) => setError(message));
        player.addListener("authentication_error", ({ message }) => setError(message));
        player.addListener("account_error", ({ message }) => setError(message));
        player.addListener("playback_error", ({ message }) => setError(message));
        player.addListener("autoplay_failed", () => setError("Spotify autoplay was blocked. Press Play in LiftOff to resume local playback."));
        player.addListener("player_state_changed", (state) => {
          setTrack(mapSdkTrack(state));
          if (state) setError(null);
        });

        playerRef.current = player;
        player.connect().then((connected) => {
          if (!connected) setError("Spotify in-app player did not connect.");
        });
      })
      .catch((err) => setError(String(err?.message ?? err ?? "Could not load Spotify Web Playback SDK.")));

    return () => {
      cancelled = true;
      playerRef.current?.disconnect();
      playerRef.current = null;
      setReady(false);
      setDeviceId(null);
      setTrack(null);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !ready) return;
    const id = window.setInterval(() => {
      sync();
    }, 1000);
    return () => window.clearInterval(id);
  }, [enabled, ready, sync]);

  const activate = useCallback(async () => {
    await playerRef.current?.activateElement?.();
  }, []);

  return { ready, deviceId, error, track, activate, sync };
}
