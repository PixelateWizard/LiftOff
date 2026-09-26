// Small presentational pieces shared by the Bookshelf Home, grids, and case.

/** CSS url() value that tolerates quotes in asset and data URLs. */
export function cssUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  return `url("${url.replace(/"/g, "%22")}")`;
}

/** Down arrow on the cream "still sealed" badge of uninstalled games. */
export function SealGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#5a3b05" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4v13M6 12l6 6 6-6" />
    </svg>
  );
}

/** Ceramic LiftOff rocket that sits at the end of the Recently played shelf. */
export function ShelfFigurine() {
  return (
    <div className="bs-figurine" aria-hidden="true">
      <svg width="96" height="150" viewBox="0 0 96 150">
        <path className="bs-fig-body" d="M48 6 C62 22 66 44 64 88 L32 88 C30 44 34 22 48 6Z" />
        <circle className="bs-fig-window" cx="48" cy="48" r="9" />
        <path className="bs-fig-wing" d="M32 70 L18 100 L33 92Z M64 70 L78 100 L63 92Z" />
        <rect className="bs-fig-nozzle" x="36" y="88" width="24" height="10" rx="2" />
        <rect className="bs-fig-nozzle" x="45" y="98" width="6" height="22" />
        <rect className="bs-fig-base" x="14" y="120" width="68" height="18" rx="3" />
        <rect className="bs-fig-base bs-fig-base--low" x="10" y="134" width="76" height="12" rx="2" />
      </svg>
    </div>
  );
}

/** Rocket mark printed on the manual header. */
export function ManualRocket() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="bs-manual-rocket">
      <path d="M16 2 L21 9 L22 19 Q22 22 19 22 L13 22 Q10 22 10 19 L11 9 Z" fill="var(--bs-accent-ink)" />
      <path d="M10 18 L5 25 L11 21 Z M22 18 L27 25 L21 21 Z" fill="var(--bs-ink)" />
    </svg>
  );
}

/** Hand-drawn style icon holder color for a floppy when the app icon has no sampled color. */
const FLOPPY_FALLBACKS = ["#2b3a55", "#43306a", "#7a2f2f", "#1f4d4a", "#2d2d33", "#8a2b2b", "#22324a", "#3d4230", "#5b4a2f", "#2f3f4a"];

export function floppyColor(id: string, sampled?: { r: number; g: number; b: number } | null): string {
  if (sampled) return `color-mix(in srgb, rgb(${sampled.r} ${sampled.g} ${sampled.b}) 58%, #1c1a1e)`;
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return FLOPPY_FALLBACKS[hash % FLOPPY_FALLBACKS.length];
}
