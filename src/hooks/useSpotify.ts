import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface SpotifyStatus {
  connected: boolean;
  client_id_set: boolean;
  product: string;
}

export interface SpotifyTrack {
  id?: string;
  title: string;
  artist: string;
  album?: string;
  image?: string;
  durationMs: number;
  progressMs: number;
  isPlaying: boolean;
  contextUri?: string;
  shuffle: boolean;
  repeat: "off" | "context" | "track";
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  uri: string;
  image?: string;
  trackCount?: number;
}

export interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  volume_percent?: number;
}

export interface SpotifyUiError {
  key: "premiumRequired" | "noDevice" | "authNotConfirmed" | "generic";
  message?: string;
}

interface PlaybackOverride {
  until: number;
  trackId?: string;
  staleTrackId?: string;
  progressMs?: number;
  isPlaying?: boolean;
}

const defaultStatus: SpotifyStatus = {
  connected: false,
  client_id_set: false,
  product: "",
};

const mapError = (err: unknown): SpotifyUiError => {
  const message = String(err ?? "");
  if (message.includes("PREMIUM_REQUIRED")) return { key: "premiumRequired" };
  if (message.includes("NO_ACTIVE_DEVICE")) return { key: "noDevice" };
  return { key: "generic", message };
};

const authStatusError = () => ({
  key: "authNotConfirmed" as const,
  message: "Spotify auth completed in the browser, but LiftOff could not confirm the saved connection.",
});

const getTrackImage = (item: any): string | undefined => {
  const images = item?.album?.images;
  if (!Array.isArray(images) || images.length === 0) return undefined;
  return images[0]?.url;
};

const mapPlayback = (payload: any): SpotifyTrack | null => {
  if (!payload || !payload.item) return null;
  const item = payload.item;
  return {
    id: item.id,
    title: item.name ?? "",
    artist: Array.isArray(item.artists) ? item.artists.map((a: any) => a.name).filter(Boolean).join(", ") : "",
    album: item.album?.name,
    image: getTrackImage(item),
    durationMs: Number(item.duration_ms ?? 0),
    progressMs: Number(payload.progress_ms ?? 0),
    isPlaying: !!payload.is_playing,
    contextUri: payload.context?.uri,
    shuffle: !!payload.shuffle_state,
    repeat: payload.repeat_state === "track" || payload.repeat_state === "context" ? payload.repeat_state : "off",
  };
};

const mapPlaylists = (payload: any): SpotifyPlaylist[] => {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items
    .filter((item: any) => item?.id && item?.uri)
    .map((item: any) => ({
      id: item.id,
      name: item.name ?? "",
      uri: item.uri,
      image: Array.isArray(item.images) && item.images.length > 0 ? item.images[0]?.url : undefined,
      trackCount: item.tracks?.total,
    }));
};

const mapDevices = (payload: any): SpotifyDevice[] => {
  const devices = Array.isArray(payload?.devices) ? payload.devices : [];
  return devices
    .filter((device: any) => device?.id)
    .map((device: any) => ({
      id: device.id,
      name: device.name ?? "",
      type: device.type ?? "",
      is_active: !!device.is_active,
      volume_percent: device.volume_percent,
    }));
};

export function useSpotify() {
  const [status, setStatus] = useState<SpotifyStatus>(defaultStatus);
  const [track, setTrack] = useState<SpotifyTrack | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [devices, setDevices] = useState<SpotifyDevice[]>([]);
  const [error, setError] = useState<SpotifyUiError | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const statusRef = useRef(status);
  const trackRef = useRef<SpotifyTrack | null>(track);
  const playbackOverrideRef = useRef<PlaybackOverride | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    trackRef.current = track;
  }, [track]);

  const holdPlaybackOverride = useCallback((override: Omit<PlaybackOverride, "until">, durationMs = 2500) => {
    playbackOverrideRef.current = {
      ...override,
      until: Date.now() + durationMs,
    };
  }, []);

  const applyPlaybackOverride = useCallback((nextTrack: SpotifyTrack | null) => {
    const override = playbackOverrideRef.current;
    if (!override) return nextTrack;
    if (Date.now() > override.until) {
      playbackOverrideRef.current = null;
      return nextTrack;
    }

    if (!nextTrack) return nextTrack;

    if (override.staleTrackId && nextTrack.id === override.staleTrackId) {
      return null;
    }
    if (override.staleTrackId && nextTrack.id !== override.staleTrackId) {
      playbackOverrideRef.current = null;
      return nextTrack;
    }

    if (override.trackId && nextTrack.id && nextTrack.id !== override.trackId) {
      playbackOverrideRef.current = null;
      return nextTrack;
    }

    return {
      ...nextTrack,
      progressMs: override.progressMs ?? nextTrack.progressMs,
      isPlaying: override.isPlaying ?? nextTrack.isPlaying,
    };
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const next = await invoke<SpotifyStatus>("spotify_status");
      statusRef.current = next;
      setStatus(next);
      if (!next.connected) {
        setTrack(null);
        setPlaylists([]);
        setDevices([]);
      }
      return next;
    } catch (err) {
      setError(mapError(err));
      statusRef.current = defaultStatus;
      setStatus(defaultStatus);
      return defaultStatus;
    }
  }, []);

  // Lightweight poll: playback state only. Playlists and devices are fetched
  // separately so the 3s cadence and post-command bursts stay one request each
  // instead of three, which kept tripping Spotify rate limits and returning
  // stale snapshots.
  const refreshPlaybackState = useCallback(async () => {
    if (!statusRef.current.connected) return;
    try {
      const playback = await invoke<any>("spotify_playback_state").catch((err) => {
        if (String(err).includes("NO_ACTIVE_DEVICE")) return null;
        throw err;
      });
      setTrack(applyPlaybackOverride(mapPlayback(playback)));
      setError(null);
    } catch (err) {
      const mapped = mapError(err);
      setError(mapped);
      if (mapped.key === "noDevice") setTrack(null);
    }
  }, [applyPlaybackOverride]);

  const refreshDevices = useCallback(async () => {
    if (!statusRef.current.connected) return;
    try {
      setDevices(mapDevices(await invoke<any>("spotify_devices")));
    } catch {
      // Keep the last known device list; the next full refresh recovers it.
    }
  }, []);

  // Full refresh: playback + playlists + devices. Used on connect and when
  // the overlay opens, not on the polling cadence.
  const refreshPlayback = useCallback(async () => {
    if (!statusRef.current.connected) return;
    setLoading(true);
    try {
      const [playback, playlistPayload, devicePayload] = await Promise.all([
        invoke<any>("spotify_playback_state").catch((err) => {
          if (String(err).includes("NO_ACTIVE_DEVICE")) return null;
          throw err;
        }),
        invoke<any>("spotify_playlists"),
        invoke<any>("spotify_devices"),
      ]);
      setTrack(applyPlaybackOverride(mapPlayback(playback)));
      setPlaylists(mapPlaylists(playlistPayload));
      setDevices(mapDevices(devicePayload));
      setError(null);
    } catch (err) {
      const mapped = mapError(err);
      setError(mapped);
      if (mapped.key === "noDevice") setTrack(null);
    } finally {
      setLoading(false);
    }
  }, [applyPlaybackOverride]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (!status.connected) return;
    refreshPlayback();
    let tick = 0;
    const id = window.setInterval(() => {
      tick += 1;
      refreshPlaybackState();
      // Devices change rarely; refresh them every fifth tick (~15s).
      if (tick % 5 === 0) refreshDevices();
    }, 3000);
    return () => window.clearInterval(id);
  }, [status.connected, refreshPlayback, refreshPlaybackState, refreshDevices]);

  useEffect(() => {
    if (!track?.isPlaying) return;
    // Advance by elapsed wall time rather than a fixed 1000ms so late timer
    // fires do not make the scrubber drift between API refreshes.
    let lastTick = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTick;
      lastTick = now;
      setTrack((current) => {
        if (!current?.isPlaying) return current;
        return {
          ...current,
          progressMs: Math.min(current.durationMs, current.progressMs + elapsed),
        };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [track?.id, track?.isPlaying]);

  const connect = useCallback(async (clientId: string) => {
    setConnecting(true);
    setError(null);
    try {
      await invoke("spotify_begin_auth", { clientId });
      const next = await refreshStatus();
      if (!next.connected) {
        const mapped = authStatusError();
        setError(mapped);
        throw new Error(mapped.message);
      }
      await refreshPlayback();
      return next;
    } catch (err) {
      setError(mapError(err));
      throw err;
    } finally {
      setConnecting(false);
    }
  }, [refreshPlayback, refreshStatus]);

  const disconnect = useCallback(async () => {
    setError(null);
    await invoke("spotify_disconnect");
    await refreshStatus();
  }, [refreshStatus]);

  const refreshPlaybackBurst = useCallback((delays = [350, 900, 1800]) => {
    delays.forEach((delay) => {
      window.setTimeout(() => {
        refreshPlaybackState();
      }, delay);
    });
  }, [refreshPlaybackState]);

  const runControl = useCallback(async (
    command: string,
    args?: Record<string, unknown>,
    options?: {
      optimistic?: () => void;
      immediateRefresh?: boolean;
      refreshDelays?: number[];
      refreshDevicesAfter?: boolean;
    },
  ) => {
    setError(null);
    options?.optimistic?.();
    try {
      await invoke(command, args);
      if (options?.immediateRefresh !== false) await refreshPlaybackState();
      refreshPlaybackBurst(options?.refreshDelays);
      if (options?.refreshDevicesAfter) {
        window.setTimeout(() => {
          refreshDevices();
        }, 600);
      }
    } catch (err) {
      setError(mapError(err));
    }
  }, [refreshDevices, refreshPlaybackBurst, refreshPlaybackState]);

  const seek = useCallback(async (positionMs: number) => {
    const safePosition = Math.max(0, Math.round(positionMs));
    await runControl("spotify_seek", { positionMs: safePosition }, {
      optimistic: () => {
        const current = trackRef.current;
        if (current) {
          holdPlaybackOverride({ trackId: current.id, progressMs: Math.min(current.durationMs, safePosition) }, 3000);
        }
        setTrack((current) => {
          const next = current ? { ...current, progressMs: Math.min(current.durationMs, safePosition) } : current;
          trackRef.current = next;
          return next;
        });
      },
      immediateRefresh: false,
      refreshDelays: [900, 1800, 3000],
    });
  }, [holdPlaybackOverride, runControl]);

  const previous = useCallback(async () => {
    const current = trackRef.current;
    if (current && current.progressMs > 3000) {
      await seek(0);
      return;
    }

    setError(null);
    if (current?.id) {
      holdPlaybackOverride({ staleTrackId: current.id }, 4500);
    }
    setTrack(null);
    trackRef.current = null;
    try {
      await invoke("spotify_previous");
      refreshPlaybackBurst([350, 900, 1800, 3000]);
    } catch (err) {
      const message = String(err ?? "");
      if (message.includes("Restriction violated") || message.includes("HTTP 403")) {
        if (current) {
          holdPlaybackOverride({ trackId: current.id, progressMs: 0 }, 3000);
          const restarted = { ...current, progressMs: 0 };
          setTrack(restarted);
          trackRef.current = restarted;
        }
        await invoke("spotify_seek", { positionMs: 0 });
        refreshPlaybackBurst([900, 1800, 3000]);
        return;
      }
      setError(mapError(err));
    }
  }, [holdPlaybackOverride, refreshPlaybackBurst, seek]);

  const normalizedProduct = status.product.trim().toLowerCase();
  const isPremium = normalizedProduct === "premium";
  const requiresPremium = !!normalizedProduct && normalizedProduct !== "premium" && normalizedProduct !== "unknown";
  const activeDevice = useMemo(() => devices.find((device) => device.is_active) ?? null, [devices]);

  return {
    status,
    track,
    playlists,
    devices,
    activeDevice,
    error,
    loading,
    connecting,
    isPremium,
    requiresPremium,
    refreshStatus,
    refreshPlayback,
    connect,
    disconnect,
    play: (deviceId?: string | null) => runControl("spotify_play", deviceId ? { deviceId } : undefined, {
      optimistic: () => {
        const current = trackRef.current;
        if (current) holdPlaybackOverride({ trackId: current.id, isPlaying: true }, 2200);
        setTrack((current) => {
          const next = current ? { ...current, isPlaying: true } : current;
          trackRef.current = next;
          return next;
        });
      },
      immediateRefresh: false,
      refreshDelays: [350, 900, 1800],
    }),
    pause: () => runControl("spotify_pause", undefined, {
      optimistic: () => {
        const current = trackRef.current;
        if (current) holdPlaybackOverride({ trackId: current.id, isPlaying: false }, 2600);
        setTrack((current) => {
          const next = current ? { ...current, isPlaying: false } : current;
          trackRef.current = next;
          return next;
        });
      },
      immediateRefresh: false,
      refreshDelays: [900, 1800, 3000],
    }),
    next: () => runControl("spotify_next", undefined, {
      optimistic: () => {
        const current = trackRef.current;
        if (current?.id) holdPlaybackOverride({ staleTrackId: current.id }, 4500);
        setTrack(null);
        trackRef.current = null;
      },
      immediateRefresh: false,
      refreshDelays: [350, 900, 1800, 3000],
    }),
    previous,
    seek,
    setShuffle: (state: boolean) => runControl("spotify_set_shuffle", { state }),
    setRepeat: (mode: "off" | "context" | "track") => runControl("spotify_set_repeat", { mode }),
    playContext: (contextUri: string, deviceId?: string | null) => runControl("spotify_play_context", deviceId ? { contextUri, deviceId } : { contextUri }, {
      optimistic: () => {
        const current = trackRef.current;
        if (current?.id) holdPlaybackOverride({ staleTrackId: current.id }, 4500);
        setTrack(null);
        trackRef.current = null;
      },
      immediateRefresh: false,
      refreshDelays: [350, 900, 1800, 3000],
      refreshDevicesAfter: true,
    }),
    transfer: (deviceId: string) => runControl("spotify_transfer", { deviceId }, { refreshDevicesAfter: true }),
  };
}

export type SpotifyController = ReturnType<typeof useSpotify>;
