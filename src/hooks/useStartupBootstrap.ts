import { useCallback, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { invoke } from "@tauri-apps/api/core";

interface UseStartupBootstrapOptions {
  onAppLoaded: () => void;
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
}: UseStartupBootstrapOptions): StartupBootstrapResult {
  const [loading, setLoading] = useState(true);
  const [splashExiting, setSplashExiting] = useState(false);
  const isReadyRef = useRef(false);

  const onLoaded = useCallback(() => {
    setSplashExiting(true);
    onAppLoaded();
    setTimeout(() => {
      setLoading(false);
      setTimeout(() => invoke("set_gamepad_ready"), 2000);
      setTimeout(() => { isReadyRef.current = true; }, 200);
    }, 800);
  // `onAppLoaded` comes from useAudioFeedback and is intentionally stable.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
