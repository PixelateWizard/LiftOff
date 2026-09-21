export const SPLASH_STATUS_KEYS = [
  "splash.status.starting",
  "splash.status.scanning",
  "splash.status.findingGames",
  "splash.status.loadingArt",
  "splash.status.almostReady",
] as const;

export const SPLASH_SCAN_PHASE_STATUS_KEYS: Record<string, string> = {
  desktop: "splash.status.scanDesktop",
  steam: "splash.status.scanSteam",
  xbox: "splash.status.scanXbox",
  other_launchers: "splash.status.scanOther",
};

export function resolveSplashStatusKey(
  scanPhase: string | null,
  phaseStale: boolean,
  longWait: boolean,
  statusIdx: number,
): string {
  if (phaseStale || longWait) return "splash.status.stillWorking";
  const phaseKey = scanPhase ? SPLASH_SCAN_PHASE_STATUS_KEYS[scanPhase] : null;
  return phaseKey ?? SPLASH_STATUS_KEYS[Math.min(statusIdx, SPLASH_STATUS_KEYS.length - 1)];
}
