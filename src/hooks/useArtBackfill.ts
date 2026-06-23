import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import type { App } from "../types";

type FetchGameArt = (
  games: App[],
  onProgress?: (done: number, total: number, lastName?: string) => void,
  options?: { includeUninstalled?: boolean; forceRefresh?: boolean }
) => Promise<void> | void;

interface UseArtBackfillArgs {
  // Full library (raw, all apps), as a ref so the loop always reads the latest without restarting.
  appsRef: MutableRefObject<App[]>;
  // id -> url | "" ; undefined means "never attempted". Mirror of the gameArt state.
  gameArtRef: MutableRefObject<Record<string, string>>;
  // ids in current on-screen view order; these are filled first.
  priorityIdsRef: MutableRefObject<string[]>;
  fetchGameArt: FetchGameArt;
  // Gate: flip true once startup is done (e.g. !loading). The loop won't touch the network before this.
  enabled: boolean;
}

// Small + spaced so this trickles in the background and never bursts the network or the SGDB key.
const CHUNK = 6;
const TICK_DELAY_MS = 400;
const HEAD_START_MS = 1500;
const EMPTY_RECHECK_MS = 3000;

export function useArtBackfill({
  appsRef,
  gameArtRef,
  priorityIdsRef,
  fetchGameArt,
  enabled,
}: UseArtBackfillArgs) {
  // Guards against re-picking games while a chunk is in flight (covers the state->ref settle window).
  const inFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    inFlightRef.current.clear();

    const idle = (cb: () => void) => {
      const ric = window.requestIdleCallback;
      if (typeof ric === "function") ric(cb, { timeout: 2000 });
      else window.setTimeout(cb, 200);
    };
    const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

    const pickChunk = (): App[] => {
      const resolved = gameArtRef.current;
      const inFlight = inFlightRef.current;
      const isPending = (app: App) =>
        app.app_type === "game" &&
        app.installed === false &&
        resolved[app.id] === undefined &&
        !inFlight.has(app.id);

      const byId = new Map(appsRef.current.map((app) => [app.id, app]));
      const out: App[] = [];
      const seen = new Set<string>();

      for (const id of priorityIdsRef.current) {
        const app = byId.get(id);
        if (app && isPending(app)) {
          out.push(app);
          seen.add(id);
          if (out.length >= CHUNK) return out;
        }
      }
      for (const app of appsRef.current) {
        if (!seen.has(app.id) && isPending(app)) {
          out.push(app);
          if (out.length >= CHUNK) return out;
        }
      }
      return out;
    };

    (async () => {
      await sleep(HEAD_START_MS);
      while (!cancelled) {
        const chunk = pickChunk();
        if (!chunk.length) {
          await sleep(EMPTY_RECHECK_MS);
          continue;
        }

        chunk.forEach((app) => inFlightRef.current.add(app.id));
        await new Promise<void>((resolve) =>
          idle(async () => {
            if (cancelled) return resolve();
            try {
              await fetchGameArt(chunk, undefined, { includeUninstalled: true, forceRefresh: true });
            } finally {
              chunk.forEach((app) => inFlightRef.current.delete(app.id));
            }
            resolve();
          })
        );
        await sleep(TICK_DELAY_MS);
      }
    })();

    return () => {
      cancelled = true;
      inFlightRef.current.clear();
    };
  }, [enabled, fetchGameArt, appsRef, gameArtRef, priorityIdsRef]);
}
