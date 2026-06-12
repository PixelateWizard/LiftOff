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

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

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
      setTrack(mapPlayback(playback));
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
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (!status.connected) return;
    refreshPlayback();
    const id = window.setInterval(refreshPlayback, 10000);
    return () => window.clearInterval(id);
  }, [status.connected, refreshPlayback]);

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

  const runControl = useCallback(async (command: string, args?: Record<string, unknown>) => {
    setError(null);
    try {
      await invoke(command, args);
      await refreshPlayback();
    } catch (err) {
      setError(mapError(err));
    }
  }, [refreshPlayback]);

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
    play: (deviceId?: string | null) => runControl("spotify_play", deviceId ? { deviceId } : undefined),
    pause: () => runControl("spotify_pause"),
    next: () => runControl("spotify_next"),
    previous: () => runControl("spotify_previous"),
    seek: (positionMs: number) => runControl("spotify_seek", { positionMs: Math.max(0, Math.round(positionMs)) }),
    setShuffle: (state: boolean) => runControl("spotify_set_shuffle", { state }),
    setRepeat: (mode: "off" | "context" | "track") => runControl("spotify_set_repeat", { mode }),
    playContext: (contextUri: string, deviceId?: string | null) => runControl("spotify_play_context", deviceId ? { contextUri, deviceId } : { contextUri }),
    transfer: (deviceId: string) => runControl("spotify_transfer", { deviceId }),
  };
}

export type SpotifyController = ReturnType<typeof useSpotify>;
