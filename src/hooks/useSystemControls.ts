import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface SystemVolume {
  percent: number;
  muted: boolean;
}

// Refresh native state when the tray opens. Writes are optimistic and
// debounced so pointer or d-pad drags cannot queue one IPC command per pixel.
export function useSystemControls(active: boolean) {
  const [volume, setVolume] = useState<SystemVolume | null>(null);
  // null = loading, -1 = unsupported, 0..100 = current brightness.
  const [brightness, setBrightness] = useState<number | null>(null);
  const volumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const brightnessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    invoke<SystemVolume>("get_system_volume")
      .then(setVolume)
      .catch(() => setVolume(null));
    invoke<number | null>("get_brightness")
      .then((value) => setBrightness(value == null ? -1 : value))
      .catch(() => setBrightness(-1));
  }, []);

  useEffect(() => {
    if (active) refresh();
  }, [active, refresh]);

  const requestVolume = useCallback((percent: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    setVolume((current) => current
      ? { ...current, percent: clamped, muted: clamped === 0 ? current.muted : false }
      : { percent: clamped, muted: false });
    if (volumeTimer.current) clearTimeout(volumeTimer.current);
    volumeTimer.current = setTimeout(() => {
      invoke("set_system_volume", { percent: clamped }).catch(refresh);
    }, 120);
  }, [refresh]);

  const requestBrightness = useCallback((percent: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    setBrightness(clamped);
    if (brightnessTimer.current) clearTimeout(brightnessTimer.current);
    brightnessTimer.current = setTimeout(() => {
      invoke("set_brightness", { percent: clamped }).catch(refresh);
    }, 220);
  }, [refresh]);

  useEffect(() => () => {
    if (volumeTimer.current) clearTimeout(volumeTimer.current);
    if (brightnessTimer.current) clearTimeout(brightnessTimer.current);
  }, []);

  return { volume, brightness, requestVolume, requestBrightness, refresh };
}
