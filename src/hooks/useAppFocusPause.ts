import { useEffect } from "react";

/**
 * Pauses background animations when the app is not visible or focused.
 * Toggles the `app-bg-paused` class on <html>.
 */
export function useAppFocusPause() {
  useEffect(() => {
    const root = document.documentElement;

    function pause() {
      root.classList.add("app-bg-paused");
    }

    function resume() {
      if (!document.hidden) {
        root.classList.remove("app-bg-paused");
      }
    }

    function onVisibilityChange() {
      if (document.hidden) {
        pause();
      } else {
        resume();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", pause);
    window.addEventListener("focus", resume);

    if (document.hidden) pause();

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", pause);
      window.removeEventListener("focus", resume);
      root.classList.remove("app-bg-paused");
    };
  }, []);
}
