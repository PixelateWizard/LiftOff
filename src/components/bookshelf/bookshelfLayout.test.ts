import { describe, expect, it } from "vitest";
import type { App } from "../../types";
import {
  BOOKEND_COST,
  DIVIDER_COST,
  SPINE_COST,
  buildLibraryShelves,
  buildRecentShelf,
  nearestIndex,
  reconcileShelfFocus,
  shelfLetter,
  spineArtOffset,
} from "./bookshelfLayout";

const game = (name: string, id = name.toLowerCase().replace(/\s+/g, "-")): App => ({ id, name, app_type: "game" });

describe("shelfLetter", () => {
  it("folds accents and groups non-letters under #", () => {
    expect(shelfLetter("Élan")).toBe("E");
    expect(shelfLetter("  zelda")).toBe("Z");
    expect(shelfLetter("7 Days")).toBe("#");
    expect(shelfLetter("")).toBe("#");
  });
});

describe("buildLibraryShelves", () => {
  it("sorts A-Z and puts a divider before each new letter", () => {
    const [shelf] = buildLibraryShelves([game("Beta"), game("alpha"), game("Axe")], 2000);
    expect(shelf.items.map((app) => app.name)).toEqual(["alpha", "Axe", "Beta"]);
    expect(shelf.entries.map((entry) => entry.type === "divider" ? `|${entry.letter}` : entry.app.name))
      .toEqual(["|A", "alpha", "Axe", "|B", "Beta"]);
    expect(shelf.label).toBe("A – B");
  });

  it("wraps onto a new shelf when the row is full and does not repeat a divider mid-letter", () => {
    const width = BOOKEND_COST + DIVIDER_COST + SPINE_COST * 3;
    const shelves = buildLibraryShelves(["A1", "A2", "A3", "A4", "A5"].map((name) => game(name)), width);
    expect(shelves).toHaveLength(2);
    expect(shelves[0].items).toHaveLength(3);
    expect(shelves[1].entries[0].type).toBe("item");
    expect(shelves[1].label).toBe("A");
  });

  it("returns no shelves for an empty library", () => {
    expect(buildLibraryShelves([], 1200)).toEqual([]);
  });

  it("numbers items per shelf", () => {
    const shelves = buildLibraryShelves([game("A"), game("B"), game("C")], 2000);
    const indexes = shelves[0].entries.flatMap((entry) => entry.type === "item" ? [entry.itemIndex] : []);
    expect(indexes).toEqual([0, 1, 2]);
  });
});

describe("buildRecentShelf", () => {
  it("caps the face-out shelf at seven games and skips an empty list", () => {
    const recent = Array.from({ length: 9 }, (_, i) => game(`Game ${i}`));
    expect(buildRecentShelf(recent, "Recently played")?.items).toHaveLength(7);
    expect(buildRecentShelf([], "Recently played")).toBeNull();
  });
});

describe("focus helpers", () => {
  it("keeps focus on the same game after the shelves change", () => {
    const shelves = buildLibraryShelves([game("A"), game("B"), game("C")], BOOKEND_COST + SPINE_COST * 4 + DIVIDER_COST);
    const focus = reconcileShelfFocus(shelves, { shelf: 0, item: 0 }, "c");
    expect(shelves[focus.shelf].items[focus.item].id).toBe("c");
  });

  it("clamps when the focused game is gone", () => {
    const shelves = buildLibraryShelves([game("A")], 2000);
    expect(reconcileShelfFocus(shelves, { shelf: 3, item: 9 }, "missing")).toEqual({ shelf: 0, item: 0 });
    expect(reconcileShelfFocus([], { shelf: 1, item: 1 }, null)).toEqual({ shelf: 0, item: 0 });
  });

  it("picks the nearest item when moving between shelves", () => {
    expect(nearestIndex([20, 62, 104], 70)).toBe(1);
    expect(nearestIndex([20, 62, 104], 500)).toBe(2);
  });

  it("gives each spine a stable art offset", () => {
    expect(spineArtOffset("steam:620")).toBe(spineArtOffset("steam:620"));
    expect(spineArtOffset("steam:620")).toBeGreaterThanOrEqual(8);
    expect(spineArtOffset("steam:620")).toBeLessThanOrEqual(60);
  });
});
