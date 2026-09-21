import { useCallback, useEffect, useRef, useState } from "react";

export const SMART_BAR_IDLE_MS = 4000;

interface Options {
  enabled: boolean;
  // Any value that changes when focus or visible UI state changes.
  activityKey: string;
}

// Collapses the Smart bar hint group after idle time. Gamepad edges call
// `poke` from the main poll; keyboard, pointer and wheel input are caught here.
export function useIdleCollapse({ enabled, activityKey }: Options) {
  const [idle, setIdle] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const poke = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setIdle(false);
    if (!enabledRef.current) return;
    timerRef.current = window.setTimeout(() => setIdle(true), SMART_BAR_IDLE_MS);
  }, []);

  useEffect(() => { poke(); }, [enabled, activityKey, poke]);

  useEffect(() => {
    const options: AddEventListenerOptions = { capture: true, passive: true };
    window.addEventListener("keydown", poke, options);
    window.addEventListener("pointerdown", poke, options);
    window.addEventListener("wheel", poke, options);
    return () => {
      window.removeEventListener("keydown", poke, options);
      window.removeEventListener("pointerdown", poke, options);
      window.removeEventListener("wheel", poke, options);
      window.clearTimeout(timerRef.current);
    };
  }, [poke]);

  return { collapsed: enabled && idle, poke };
}
