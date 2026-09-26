// Shared by Game Details and the Bookshelf Home plaque.
export function normalizeEpochMs(value?: number) {
  if (!value) return undefined;
  return value < 100000000000 ? value * 1000 : value;
}

export function formatRelativeTime(value: number, never: string) {
  const ms = normalizeEpochMs(value);
  if (!ms) return never;
  const diff = Date.now() - ms;
  if (diff < 60_000) return "Just now";
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 365 * 24 * 60 * 60_000],
    ["month", 30 * 24 * 60 * 60_000],
    ["week", 7 * 24 * 60 * 60_000],
    ["day", 24 * 60 * 60_000],
    ["hour", 60 * 60_000],
    ["minute", 60_000],
  ];
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, unitMs] of units) {
    if (diff >= unitMs) return rtf.format(-Math.floor(diff / unitMs), unit);
  }
  return never;
}

export function formatPlaytime(minutes: number) {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}m`;
  const hours = Math.floor(minutes / 60);
  const rem = Math.round(minutes % 60);
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}
