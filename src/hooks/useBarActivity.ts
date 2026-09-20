import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { App } from "../types";
import { collectDownloads, pickBarActivity, type BarActivity, type BarDownload, type BarRunning } from "../utils/smartBar";

export type BarEventKind = "pin" | "unpin" | "installStarted" | "installDone" | "refresh" | "track" | "closed";

export interface BarEvent {
  id: number;
  kind: BarEventKind;
  titleKey: string;
  subtitle?: string;
}

export const BAR_EVENT_MS = 2600;
const RUNNING_TICK_MS = 30000;

// Transient bar events. A new event replaces the current one and restarts the timer.
export function useBarEvents() {
  const [barEvent, setBarEvent] = useState<BarEvent | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const seqRef = useRef(0);

  const pushBarEvent = useCallback((event: Omit<BarEvent, "id">) => {
    seqRef.current += 1;
    setBarEvent({ ...event, id: seqRef.current });
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setBarEvent(null), BAR_EVENT_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return { barEvent, pushBarEvent };
}

interface UseBarActivityOptions {
  // Any render-time app list; used only to recompute when the library changes.
  apps: App[];
  lookupApp: (id: string) => App | undefined;
  installProgress: Record<string, any>;
  xboxInstallProgress: Record<string, any>;
  runningIds: Set<string>;
  updateAvailable: boolean;
  updateVersion: string | null;
  onRunningClosed?: (app: App) => void;
}

export interface BarActivityData {
  activity: BarActivity | null;
  downloads: BarDownload[];
  running: BarRunning[];
  now: number;
}

export function useBarActivity({
  apps,
  lookupApp,
  installProgress,
  xboxInstallProgress,
  runningIds,
  updateAvailable,
  updateVersion,
  onRunningClosed,
}: UseBarActivityOptions): BarActivityData {
  // First time LiftOff saw each running id. Sessions that started before
  // LiftOff launched are timed from when LiftOff first noticed them.
  const sinceRef = useRef(new Map<string, number>());
  const previousIdsRef = useRef<Set<string>>(new Set());
  const lookupRef = useRef(lookupApp);
  const closedRef = useRef(onRunningClosed);
  lookupRef.current = lookupApp;
  closedRef.current = onRunningClosed;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const stamp = Date.now();
    for (const id of runningIds) {
      if (!sinceRef.current.has(id)) sinceRef.current.set(id, stamp);
    }
    for (const id of previousIdsRef.current) {
      if (runningIds.has(id)) continue;
      sinceRef.current.delete(id);
      const app = lookupRef.current(id);
      if (app) closedRef.current?.(app);
    }
    previousIdsRef.current = new Set(runningIds);
    setNow(stamp);
  }, [runningIds]);

  useEffect(() => {
    if (runningIds.size === 0) return;
    const id = window.setInterval(() => setNow(Date.now()), RUNNING_TICK_MS);
    return () => window.clearInterval(id);
  }, [runningIds]);

  const downloads = useMemo(
    () => collectDownloads((id) => lookupRef.current(id), installProgress, xboxInstallProgress),
    [installProgress, xboxInstallProgress, apps]
  );

  const running = useMemo(() => {
    const list: BarRunning[] = [];
    for (const id of runningIds) {
      const app = lookupRef.current(id);
      if (app) list.push({ app, startedAt: sinceRef.current.get(id) ?? now });
    }
    return list.sort((a, b) => b.startedAt - a.startedAt);
  }, [runningIds, apps, now]);

  const activity = useMemo(
    () => pickBarActivity(downloads, running, { available: updateAvailable, version: updateVersion }),
    [downloads, running, updateAvailable, updateVersion]
  );

  return { activity, downloads, running, now };
}
