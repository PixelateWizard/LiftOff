// Minimal semver comparison for update checks.
// Deliberately hand-rolled: LiftOff avoids adding dependencies for small,
// well-understood problems, and we only need ordering, not full semver range
// resolution. Follows semver 2.0.0 precedence rules for prerelease tags.

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  // Dot-separated prerelease identifiers. Empty array means a stable release.
  prerelease: string[];
}

// Accepts an optional leading "v", and ignores build metadata after "+".
const VERSION_RE = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

export function parseVersion(raw: string | null | undefined): ParsedVersion | null {
  if (!raw) return null;
  const match = VERSION_RE.exec(String(raw).trim());
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split(".") : [],
  };
}

function isNumericIdentifier(value: string): boolean {
  return /^\d+$/.test(value);
}

// Semver rule: numeric identifiers compare numerically and always sort lower
// than alphanumeric ones; alphanumeric identifiers compare in ASCII order.
function comparePrereleaseIdentifier(a: string, b: string): number {
  const aNumeric = isNumericIdentifier(a);
  const bNumeric = isNumericIdentifier(b);
  if (aNumeric && bNumeric) {
    const diff = Number(a) - Number(b);
    return diff === 0 ? 0 : diff > 0 ? 1 : -1;
  }
  if (aNumeric) return -1;
  if (bNumeric) return 1;
  if (a === b) return 0;
  return a > b ? 1 : -1;
}

function comparePrerelease(a: string[], b: string[]): number {
  // A version with a prerelease tag has lower precedence than the same
  // version without one. 2.0.0-alpha.4 < 2.0.0.
  if (a.length === 0 && b.length === 0) return 0;
  if (a.length === 0) return 1;
  if (b.length === 0) return -1;

  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    // A shorter set of identifiers sorts lower when all preceding ones match.
    if (i >= a.length) return -1;
    if (i >= b.length) return 1;
    const result = comparePrereleaseIdentifier(a[i], b[i]);
    if (result !== 0) return result;
  }
  return 0;
}

// Returns > 0 when a is newer than b, < 0 when older, 0 when equal.
// Returns null when either side cannot be parsed, so callers can decide how
// to handle garbage rather than silently treating it as "equal".
export function compareVersions(
  a: string | null | undefined,
  b: string | null | undefined,
): number | null {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return null;

  if (left.major !== right.major) return left.major > right.major ? 1 : -1;
  if (left.minor !== right.minor) return left.minor > right.minor ? 1 : -1;
  if (left.patch !== right.patch) return left.patch > right.patch ? 1 : -1;
  return comparePrerelease(left.prerelease, right.prerelease);
}

// Conservative helper: an unparseable version on either side is never treated
// as an update. We would rather miss a prompt than nag on a malformed tag.
export function isNewerVersion(
  candidate: string | null | undefined,
  current: string | null | undefined,
): boolean {
  const result = compareVersions(candidate, current);
  return result !== null && result > 0;
}
