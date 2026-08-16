import { describe, expect, it } from "vitest";
import type { App } from "../types";
import { getLibraryEntryFocusSection } from "./libraryFocus";

const game = { id: "game", app_type: "game", installed: true } as App;
const app = { id: "app", app_type: "app", installed: true } as App;

describe("library entry focus", () => {
  it("uses only pins visible in the destination library", () => {
    expect(getLibraryEntryFocusSection({
      tab: "Games",
      apps: [game, app],
      pinnedIds: [app.id],
    })).toBe("grid");
    expect(getLibraryEntryFocusSection({
      tab: "Apps",
      apps: [game, app],
      pinnedIds: [game.id],
    })).toBe("grid");
  });

  it("starts on visible pins in an All library", () => {
    expect(getLibraryEntryFocusSection({
      tab: "Games",
      apps: [game],
      pinnedIds: [game.id],
    })).toBe("pinned");
    expect(getLibraryEntryFocusSection({
      tab: "Apps",
      apps: [app],
      pinnedIds: [app.id],
    })).toBe("pinned");
  });

  it("starts on the grid when the selected source or collection hides pins", () => {
    expect(getLibraryEntryFocusSection({
      tab: "Games",
      apps: [game],
      pinnedIds: [game.id],
      gameSourceTab: "Steam",
    })).toBe("grid");
    expect(getLibraryEntryFocusSection({
      tab: "Apps",
      apps: [app],
      pinnedIds: [app.id],
      appCollectionTab: "Utilities",
    })).toBe("grid");
  });

  it("ignores pinned games excluded by the install filter", () => {
    expect(getLibraryEntryFocusSection({
      tab: "Games",
      apps: [{ ...game, installed: false }],
      pinnedIds: [game.id],
      showUninstalledGames: false,
    })).toBe("grid");
  });
});
