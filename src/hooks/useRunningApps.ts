import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { App } from "../types";

interface RunningEntry {
  id: string;
  focused: boolean;
  confidence: string;
}

export interface RunningAppsData {
  runningIds: Set<string>;
  isRunning: (id?: string | null) => boolean;
  refreshRunning: () => void;
  gracefulClose: (app: App) => Promise<void>;
  forceClose: (app: App) => Promise<void>;
}

const CLOSE_RECHECK_DELAY_MS = 4000;

export function useRunningApps(appPaused: boolean, reclaimOnExit = true): RunningAppsData {
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
  const prevRunning = useRef<Set<string>>(new Set());
  const inFlight = useRef(false);

  const refreshRunning = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;
    invoke<RunningEntry[]>("get_running_launched")
      .then(async (list) => {
        const next = new Set(list.map((entry) => entry.id));
        const someExited = [...prevRunning.current].some((id) => !next.has(id));
        prevRunning.current = next;

        setRunningIds((prev) => {
          if (prev.size === next.size && [...prev].every((id) => next.has(id))) return prev;
          return next;
        });

        if (reclaimOnExit && someExited) {
          try {
            const focused = await getCurrentWindow().isFocused();
            if (!focused) invoke("focus_self").catch(() => {});
          } catch {
            invoke("focus_self").catch(() => {});
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        inFlight.current = false;
      });
  }, [reclaimOnExit]);

  useEffect(() => {
    refreshRunning();
    const intervalMs = appPaused ? 2000 : 3000;
    const id = window.setInterval(refreshRunning, intervalMs);
    return () => window.clearInterval(id);
  }, [appPaused, refreshRunning]);

  const isRunning = useCallback((id?: string | null) => !!id && runningIds.has(id), [runningIds]);

  const gracefulClose = useCallback(async (app: App) => {
    await invoke("close_launched", {
      name: app.name,
      launchPath: app.launch_path ?? "",
      source: app.source ?? "",
    }).catch(() => {});
    window.setTimeout(refreshRunning, CLOSE_RECHECK_DELAY_MS);
  }, [refreshRunning]);

  const forceClose = useCallback(async (app: App) => {
    await invoke("force_close_launched", {
      name: app.name,
      launchPath: app.launch_path ?? "",
      source: app.source ?? "",
    }).catch(() => {});
    window.setTimeout(refreshRunning, 600);
  }, [refreshRunning]);

  return { runningIds, isRunning, refreshRunning, gracefulClose, forceClose };
}
