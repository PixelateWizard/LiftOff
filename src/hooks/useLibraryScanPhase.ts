import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

/** Live `library-scan-phase` while a library refresh is actually running. */
export function useLibraryScanPhase(scanning: boolean): string | null {
  const [phase, setPhase] = useState<string | null>(null);

  useEffect(() => {
    if (!scanning) {
      setPhase(null);
      return;
    }
    let cancelled = false;
    const unlisten = listen<string>("library-scan-phase", (event) => {
      if (!cancelled) setPhase(event.payload);
    });
    return () => {
      cancelled = true;
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, [scanning]);

  return phase;
}
