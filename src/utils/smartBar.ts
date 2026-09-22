import type { App, BottombarMode, Settings } from "../types";

export type BarHintButton = "A" | "B" | "X" | "Y" | "←→";

export interface BarHint {
  btn: BarHintButton;
  labelKey: string;
}

export type BarFocus =
  | { kind: "app"; appId: string; heroCloseAction?: boolean }
  | { kind: "setting"; itemType: string }
  | { kind: "search" }
  | { kind: "none" }
  | { kind: "other" };

export interface BarAppState {
  app: App;
  running: boolean;
  installing: boolean;
  pinned: boolean;
  // True only where A launches a game instead of opening Details.
  launchesDirectly: boolean;
}

export interface BarDownload {
  app: App;
  pct: number;
  indeterminate: boolean;
  phase: string;
  bytesDone: number;
  bytesTotal: number;
}

export interface BarRunning {
  app: App;
  startedAt: number;
}

export type BarSetup =
  | { kind: "scan"; scanPhase: string }
  | { kind: "art"; done: number; total: number; lastName?: string };

export type BarActivity =
  | { kind: "install"; download: BarDownload; extra: number }
  | { kind: "setup"; setup: BarSetup }
  | { kind: "running"; running: BarRunning }
  | { kind: "update"; version: string | null };

// Pill height (52) + bottom margin (18) + breathing room, in unscaled px.
export const SMART_BAR_CLEARANCE = 76;
export const FULL_BAR_CLEARANCE = 64;

const BACK: BarHint = { btn: "B", labelKey: "smartBar.hint.back" };

export function normalizeBottomBarMode(mode: string | null | undefined): BottombarMode {
  return mode === "full" || mode === "hidden" ? mode : "smart";
}

export function allowsBottomBumperBadges(mode: string | null | undefined): boolean {
  return normalizeBottomBarMode(mode) === "full";
}

export function resolveNavBumpersPos(
  pos: string | null | undefined,
  mode: string | null | undefined,
): "header" | "bottom" | "hidden" {
  if (pos === "header") return "header";
  if (pos === "bottom" && allowsBottomBumperBadges(mode)) return "bottom";
  return "hidden";
}

export function migrateBottomBarSettings(
  s: Pick<Partial<Settings>, "bottombar_mode" | "bottombar_smart_migrated">
): { bottombar_mode: BottombarMode; changed: boolean } {
  const current = String(s.bottombar_mode ?? "");
  const next: BottombarMode = !s.bottombar_smart_migrated
    ? (current === "hidden" ? "hidden" : "smart")
    : normalizeBottomBarMode(current);
  return { bottombar_mode: next, changed: next !== current || !s.bottombar_smart_migrated };
}

export function getBottomBarClearance(mode: BottombarMode, hasBackground: boolean): number {
  if (mode === "full") return hasBackground ? FULL_BAR_CLEARANCE : 0;
  if (mode === "smart") return SMART_BAR_CLEARANCE;
  return 0;
}

/** Unboxed Immersive hero copy offset from the viewport bottom. Boxed panels add their own +12 gap. */
export function immersiveHeroCopyBottom(mode: BottombarMode, cinematicHeroBottom: number): number {
  if (mode === "smart") return Math.max(cinematicHeroBottom, SMART_BAR_CLEARANCE);
  return cinematicHeroBottom;
}

export function resolveBarHints(focus: BarFocus, appState: BarAppState | null): BarHint[] {
  switch (focus.kind) {
    case "search":
    case "none":
      return [];
    case "setting": {
      const type = focus.itemType;
      if (type === "toggle" || type === "home_collection_toggle") return [{ btn: "A", labelKey: "smartBar.hint.toggle" }, BACK];
      if (type === "cycle" || type === "accent") return [{ btn: "A", labelKey: "smartBar.hint.change" }, BACK];
      if (type === "slider") return [{ btn: "←→", labelKey: "smartBar.hint.adjust" }, BACK];
      return [{ btn: "A", labelKey: "smartBar.hint.select" }, BACK];
    }
    case "app": {
      if (!appState) return [{ btn: "A", labelKey: "smartBar.hint.select" }];
      const { app, running, installing, pinned, launchesDirectly } = appState;
      const pin: BarHint = { btn: "X", labelKey: pinned ? "smartBar.hint.unpin" : "smartBar.hint.pin" };
      if (focus.heroCloseAction && running) return [{ btn: "A", labelKey: "smartBar.hint.closeGame" }, pin];
      if (app.app_type !== "game") return [{ btn: "A", labelKey: "smartBar.hint.details" }, pin];
      if (!launchesDirectly || installing || app.installed === false) {
        return [{ btn: "A", labelKey: "smartBar.hint.details" }, pin];
      }
      return [{ btn: "A", labelKey: running ? "smartBar.hint.resume" : "smartBar.hint.play" }, pin];
    }
    default:
      return [{ btn: "A", labelKey: "smartBar.hint.select" }, { btn: "Y", labelKey: "smartBar.hint.search" }];
  }
}

type ProgressMap = Record<string, {
  pct?: number; state?: string; phase?: string; live?: boolean; bytesDone?: number; bytesTotal?: number;
} | undefined>;

export function collectDownloads(lookup: (id: string) => App | undefined, steam: ProgressMap, xbox: ProgressMap): BarDownload[] {
  const out: BarDownload[] = [];
  const push = (id: string, p: NonNullable<ProgressMap[string]>, isSteam: boolean) => {
    if (p.state === "uninstalling" || p.state === "complete" || p.state === "error" || p.state === "canceled") return;
    const app = lookup(id);
    if (!app) return;
    out.push({
      app,
      pct: Math.max(0, Math.min(100, Number(p.pct ?? 0))),
      // Mirrors GameCard: live Steam traces and pending jobs have no honest percentage.
      indeterminate: (isSteam && p.live === true) || p.state === "pending",
      phase: p.phase ?? "downloading",
      bytesDone: Number(p.bytesDone ?? 0),
      bytesTotal: Number(p.bytesTotal ?? 0),
    });
  };
  for (const [id, p] of Object.entries(steam)) if (p) push(id, p, true);
  for (const [id, p] of Object.entries(xbox)) if (p) push(id, p, false);
  return out;
}

export function pickBarActivity(
  downloads: BarDownload[],
  running: BarRunning[],
  update: { available: boolean; version: string | null },
  setup: BarSetup | null = null,
): BarActivity | null {
  if (downloads.length > 0) return { kind: "install", download: downloads[0], extra: downloads.length - 1 };
  if (setup) return { kind: "setup", setup };
  if (running.length > 0) return { kind: "running", running: running[0] };
  if (update.available) return { kind: "update", version: update.version };
  return null;
}

export function setupScanLabelKey(phase: string): string {
  if (phase === "desktop") return "splash.status.scanDesktop";
  if (phase === "steam") return "splash.status.scanSteam";
  if (phase === "xbox") return "splash.status.scanXbox";
  if (phase === "other_launchers") return "splash.status.scanOther";
  return "smartBar.activity.setupLibrary";
}

export function countLibraryArtSetup(
  apps: Array<Pick<App, "id" | "app_type" | "installed">>,
  gameArt: Record<string, string | undefined>,
  heroStatic: Record<string, string | undefined>,
  options: {
    includeUninstalled?: boolean;
    customArt?: Record<string, string | undefined>;
    customHeroArt?: Record<string, string | undefined>;
  } = {},
): { done: number; total: number } | null {
  const games = apps.filter((app) => (
    app.app_type === "game"
    && (options.includeUninstalled || app.installed !== false)
  ));
  const total = games.length;
  if (total === 0) return null;
  const done = games.filter((game) => (
    (Boolean(options.customArt?.[game.id]) || gameArt[game.id] !== undefined)
    && (Boolean(options.customHeroArt?.[game.id]) || heroStatic[game.id] !== undefined)
  )).length;
  if (done >= total) return null;
  return { done, total };
}

// Live Smart-bar art progress has one owner. Silent fetches (backfill, a single
// Details refresh, cache clear) must not take the next job id, or the reporting
// fetch can no longer clear the pill and the last game name stays up.
export function claimArtBarJob(current: number, report: boolean): number | null {
  return report ? current + 1 : null;
}

export function resolveBarSetup(
  splashVisible: boolean,
  scanning: boolean,
  scanPhase: string | null,
  art: { done: number; total: number; lastName?: string } | null,
): BarSetup | null {
  if (splashVisible) return null;
  if (scanning) return { kind: "scan", scanPhase: scanPhase || "other_launchers" };
  if (art && art.total > 0 && art.done < art.total) {
    return { kind: "art", done: art.done, total: art.total, lastName: art.lastName };
  }
  return null;
}

export function runningMinutes(startedAt: number, now: number): number {
  return Math.max(0, Math.floor((now - startedAt) / 60000));
}

export function installPhaseLabelKey(phase: string): string {
  if (phase === "preparing") return "install.preparing";
  if (phase === "staging") return "install.staging";
  if (phase === "paused") return "install.paused";
  return "install.downloading";
}
