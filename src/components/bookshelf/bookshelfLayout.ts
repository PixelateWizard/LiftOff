import type { App } from "../../types";

// Geometry shared by the Bookshelf Home and its CSS (src/styles/bookshelf.css).
// All values are layout px at the 1280x800 authoring size.
export const SHELF_ROW_H = 198;
export const SHELF_PLANK_H = 24;
export const SHELF_PITCH = SHELF_ROW_H + SHELF_PLANK_H;
export const SHELF_SIDE_INSET = 26;
export const SHELF_ROW_PAD = 18;
export const SPINE_W = 40;
export const SPINE_H = 176;
export const FACE_W = 117;
export const FACE_H = 176;
export const ITEM_GAP = 2;
// Divider card (5px) plus its 4px margins and the flex gap.
export const DIVIDER_COST = 5 + 8 + ITEM_GAP;
// Bookend (12px) plus its 6px left margin and the flex gap.
export const BOOKEND_COST = 12 + 6 + ITEM_GAP;
export const SPINE_COST = SPINE_W + ITEM_GAP;
export const RECENT_SHELF_LIMIT = 7;

export type ShelfItemKind = "face" | "spine";

export type ShelfEntry =
  | { type: "item"; app: App; itemIndex: number }
  | { type: "divider"; letter: string };

export interface Shelf {
  key: string;
  kind: "recent" | "library";
  label: string;
  itemKind: ShelfItemKind;
  entries: ShelfEntry[];
  items: App[];
}

/** Letter used for A-Z dividers. Accents fold to their base letter; anything else groups under "#". */
export function shelfLetter(name: string | undefined): string {
  const first = String(name ?? "").trim().normalize("NFD").charAt(0).toLocaleUpperCase("en");
  return /^[A-Z]$/.test(first) ? first : "#";
}

export function compareShelfNames(a: App, b: App): number {
  return String(a.name ?? "").localeCompare(String(b.name ?? ""), undefined, { sensitivity: "base", numeric: true });
}

function rangeLabel(items: App[]): string {
  if (items.length === 0) return "";
  const first = shelfLetter(items[0].name);
  const last = shelfLetter(items[items.length - 1].name);
  return first === last ? first : `${first} – ${last}`;
}

/**
 * Splits A-Z sorted games into shelves that fit `innerWidth` (the row width
 * between the row paddings). A divider card precedes the first spine of each
 * letter; a shelf that starts mid-letter carries no divider.
 */
export function buildLibraryShelves(games: App[], innerWidth: number, withDividers = true): Shelf[] {
  const sorted = [...games].sort(compareShelfNames);
  const capacity = Math.max(SPINE_COST * 4, innerWidth - BOOKEND_COST);
  const shelves: Shelf[] = [];
  let entries: ShelfEntry[] = [];
  let items: App[] = [];
  let used = 0;
  let prevLetter: string | null = null;

  const flush = () => {
    if (items.length === 0) return;
    shelves.push({
      key: `library-${shelves.length}`,
      kind: "library",
      label: rangeLabel(items),
      itemKind: "spine",
      entries,
      items,
    });
    entries = [];
    items = [];
    used = 0;
  };

  for (const app of sorted) {
    const letter = shelfLetter(app.name);
    const needsDivider = withDividers && letter !== prevLetter;
    const cost = (needsDivider ? DIVIDER_COST : 0) + SPINE_COST;
    if (items.length > 0 && used + cost > capacity) flush();
    if (needsDivider) {
      entries.push({ type: "divider", letter });
      used += DIVIDER_COST;
    }
    entries.push({ type: "item", app, itemIndex: items.length });
    items.push(app);
    used += SPINE_COST;
    prevLetter = letter;
  }
  flush();
  return shelves;
}

export function buildRecentShelf(recentGames: App[], label: string): Shelf | null {
  const items = recentGames.slice(0, RECENT_SHELF_LIMIT);
  if (items.length === 0) return null;
  return {
    key: "recent",
    kind: "recent",
    label,
    itemKind: "face",
    entries: items.map((app, itemIndex) => ({ type: "item" as const, app, itemIndex })),
    items,
  };
}

/** Stable 8-60% horizontal offset so each spine shows a different strip of its cover. */
export function spineArtOffset(id: string): number {
  let hash = 2166136261;
  for (const char of id) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return 8 + ((hash >>> 0) % 53);
}

export interface ShelfFocus {
  shelf: number;
  item: number;
}

/** Keeps focus on the same game after a rebuild, else clamps it into range. */
export function reconcileShelfFocus(shelves: Shelf[], focus: ShelfFocus, focusedId: string | null): ShelfFocus {
  if (shelves.length === 0) return { shelf: 0, item: 0 };
  if (focusedId) {
    for (let s = 0; s < shelves.length; s += 1) {
      const i = shelves[s].items.findIndex((app) => app.id === focusedId);
      if (i >= 0) return { shelf: s, item: i };
    }
  }
  const shelf = Math.max(0, Math.min(shelves.length - 1, focus.shelf));
  const item = Math.max(0, Math.min(shelves[shelf].items.length - 1, focus.item));
  return { shelf, item };
}

/** Index on `targetCenters` nearest to `x`, used for Up/Down between shelves. */
export function nearestIndex(targetCenters: number[], x: number): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  targetCenters.forEach((center, index) => {
    const distance = Math.abs(center - x);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
}
