import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { invoke } from "@tauri-apps/api/core";
import { consumeFseReloadFlag } from "../utils/fseReload";
import { rumble, suspendGamepadInputUntilButtonsReleased } from "../utils/gamepad";

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
  const [fastResume] = useState(consumeFseReloadFlag);
  const [loading, setLoading] = useState(true);
  const [splashExiting, setSplashExiting] = useState(false);
  const isReadyRef = useRef(false);
  const startupPulsesActiveRef = useRef(true);

  const playStartupHaptic = useCallback((pattern: "startup" | "startupReady") => {
    if (fastResume || !(hapticEnabledRef?.current ?? true)) return;
    rumble(pattern, true);
    invoke("native_startup_rumble", { pattern }).catch(() => {});
  }, [fastResume, hapticEnabledRef]);

  useEffect(() => {
    if (fastResume) {
      suspendGamepadInputUntilButtonsReleased();
      return;
    }
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
  }, [fastResume, playStartupHaptic]);

  const onLoaded = useCallback(() => {
    startupPulsesActiveRef.current = false;
    setSplashExiting(true);
    playStartupHaptic("startupReady");
    if (!fastResume) onAppLoaded();
    setTimeout(() => {
      setLoading(false);
      setTimeout(() => invoke("set_gamepad_ready"), 2000);
      setTimeout(() => { isReadyRef.current = true; }, 200);
    }, fastResume ? 0 : 800);
  }, [fastResume, onAppLoaded, playStartupHaptic]);

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
