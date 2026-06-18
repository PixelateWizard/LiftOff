import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { invoke } from "@tauri-apps/api/core";
import { rumble } from "../utils/gamepad";

interface UseStartupBootstrapOptions {
  onAppLoaded: () => void;
  hapticEnabledRef?: MutableRefObject<boolean>;
}

interface StartupBootstrapResult {
  loading: boolean;
  splashExiting: boolean;
  isReadyRef: MutableRefObject<boolean>;
  onLoaded: () => void;
  onLoadError: () => void;
}

export function useStartupBootstrap({
  onAppLoaded,
  hapticEnabledRef,
}: UseStartupBootstrapOptions): StartupBootstrapResult {
  const [loading, setLoading] = useState(true);
  const [splashExiting, setSplashExiting] = useState(false);
  const isReadyRef = useRef(false);
  const startupPulsesActiveRef = useRef(true);

  const playStartupHaptic = useCallback((pattern: "startup" | "startupReady") => {
    if (!(hapticEnabledRef?.current ?? true)) return;
    rumble(pattern, true);
    invoke("native_startup_rumble", { pattern }).catch(() => {});
  }, [hapticEnabledRef]);

  useEffect(() => {
    const pulseStartup = () => {
      if (startupPulsesActiveRef.current) {
        playStartupHaptic("startup");
      }
    };
    const timers = [300, 1000, 1800].map((delay) => window.setTimeout(pulseStartup, delay));
    const onGamepadConnected = () => {
      window.setTimeout(pulseStartup, 250);
    };
    window.addEventListener("gamepadconnected", onGamepadConnected);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("gamepadconnected", onGamepadConnected);
    };
  }, [playStartupHaptic]);

  const onLoaded = useCallback(() => {
    startupPulsesActiveRef.current = false;
    setSplashExiting(true);
    playStartupHaptic("startupReady");
    onAppLoaded();
    setTimeout(() => {
      setLoading(false);
      setTimeout(() => invoke("set_gamepad_ready"), 2000);
      setTimeout(() => { isReadyRef.current = true; }, 200);
    }, 800);
  }, [onAppLoaded, playStartupHaptic]);

  const onLoadError = useCallback(() => {
    setLoading(false);
  }, []);

  return {
    loading,
    splashExiting,
    isReadyRef,
    onLoaded,
    onLoadError,
  };
}
