import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, HOME_PINNED_SHELF_ENABLED } from "../constants";
import type { SettingsCycleItem } from "../types";
import { buildSettingsItems, getSectionNavigableItems, getSettingCycleOptions } from "./settings";

const pinnedPositionItem: SettingsCycleItem = {
  key: "home_pinned_pos",
  section: 0,
  label: "Pinned apps position",
  type: "cycle",
  options: ["none", "top", "bottom"],
};

describe("Home pinned-position options", () => {
  it("keeps the Home pinned-pills row off so pins stay in the helper tray", () => {
    expect(HOME_PINNED_SHELF_ENABLED).toBe(false);
    const t = (key: string) => key;
    const items = buildSettingsItems(t as never, "default");
    expect(items.some((item) => item.key === "home_pinned_pos")).toBe(false);
    expect(getSectionNavigableItems(0, items, DEFAULT_SETTINGS, undefined, 1).some((item) => item.key === "home_pinned_pos")).toBe(false);
  });

  it("still hides bottom from Normal Home if the shelf is re-enabled", () => {
    const settings = { ...DEFAULT_SETTINGS, home_mode: "semi" };
    expect(getSettingCycleOptions(pinnedPositionItem, settings)).toEqual(["none", "top"]);
  });

  it.each(["normal", "immersive"])("keeps bottom available in %s Home if the shelf is re-enabled", home_mode => {
    const settings = { ...DEFAULT_SETTINGS, home_mode };
    expect(getSettingCycleOptions(pinnedPositionItem, settings)).toEqual(["none", "top", "bottom"]);
  });
});

describe("Home hero-banner setting", () => {
  it("is skipped by controller navigation in Legacy Home but available in Normal and Immersive", () => {
    const t = (key: string) => key;
    const items = buildSettingsItems(t as never, "default");

    for (const home_mode of ["semi", "immersive"]) {
      const navigable = getSectionNavigableItems(0, items, { ...DEFAULT_SETTINGS, home_mode }, undefined, 1);
      expect(navigable.some((item) => item.key === "show_immersive_hero_art")).toBe(true);
    }

    const legacy = getSectionNavigableItems(0, items, { ...DEFAULT_SETTINGS, home_mode: "normal" }, undefined, 1);
    expect(legacy.some((item) => item.key === "show_immersive_hero_art")).toBe(false);
  });
});

describe("Data settings navigation", () => {
  it("renders device storage but excludes it from gamepad focus", () => {
    const t = (key: string) => key;
    const items = buildSettingsItems(t as never, "default");
    expect(items.some((item) => item.key === "device_storage" && item.type === "storage_info")).toBe(true);
    expect(getSectionNavigableItems(4, items, DEFAULT_SETTINGS).some((item) => item.key === "device_storage")).toBe(false);
  });

  it("includes factory reset as a Data action", () => {
    const t = (key: string) => key;
    const items = buildSettingsItems(t as never, "default");
    expect(items.some((item) => item.key === "factory_reset" && item.type === "action")).toBe(true);
    expect(getSectionNavigableItems(4, items, DEFAULT_SETTINGS).some((item) => item.key === "factory_reset")).toBe(true);
  });
});

describe("Helper bar settings", () => {
  it("offers Smart, Full and Hidden and scopes the indented options by mode", () => {
    const t = (key: string) => key;
    const items = buildSettingsItems(t as never, "default");
    const mode = items.find((item) => item.key === "bottombar_mode");
    expect(mode?.type).toBe("cycle");
    if (mode?.type === "cycle") expect(mode.options).toEqual(["smart", "full", "hidden"]);

    const smart = getSectionNavigableItems(0, items, { ...DEFAULT_SETTINGS, bottombar_mode: "smart" }, undefined, 3);
    const full = getSectionNavigableItems(0, items, { ...DEFAULT_SETTINGS, bottombar_mode: "full" }, undefined, 3);
    const hidden = getSectionNavigableItems(0, items, { ...DEFAULT_SETTINGS, bottombar_mode: "hidden" }, undefined, 3);

    expect(smart.some((item) => item.key === "bottombar_idle_collapse")).toBe(true);
    expect(full.some((item) => item.key === "bottombar_idle_collapse")).toBe(false);
    expect(hidden.some((item) => item.key === "bottombar_idle_collapse")).toBe(false);

    expect(full.some((item) => item.key === "bottombar_peek_on_track")).toBe(false);
    expect(hidden.some((item) => item.key === "bottombar_peek_on_track")).toBe(true);
    expect(items.some((item) => item.key === "bottombar_compact")).toBe(false);

    const background = items.find((item) => item.key === "bottombar_background");
    expect(background?.subItems?.some((sub) => sub.key === "bottombar_compact")).toBe(false);
  });

  it("hides bottom bumper placement unless the Full bar is showing", () => {
    const bumpers: SettingsCycleItem = {
      key: "nav_bumpers_pos",
      section: 0,
      label: "Bumper Badges",
      type: "cycle",
      options: ["header", "bottom", "hidden"],
    };
    expect(getSettingCycleOptions(bumpers, { ...DEFAULT_SETTINGS, bottombar_mode: "smart" })).toEqual(["header", "hidden"]);
    expect(getSettingCycleOptions(bumpers, { ...DEFAULT_SETTINGS, bottombar_mode: "hidden" })).toEqual(["header", "hidden"]);
    expect(getSettingCycleOptions(bumpers, { ...DEFAULT_SETTINGS, bottombar_mode: "full" })).toEqual(["header", "bottom", "hidden"]);
  });
});

describe("Lo-fi scene picker", () => {
  it("exposes a picture picker row on Lo-fi and hides it on other themes", () => {
    const t = (key: string) => key;
    const lofiItems = buildSettingsItems(t as never, "lofi");
    const scene = lofiItems.find((item) => item.key === "lofi_scene");
    expect(scene?.type).toBe("lofi_scene_picker");
    const lofiEffects = lofiItems.find((item) => item.key === "stars_enabled");
    expect(lofiEffects?.subItems?.some((sub) => sub.key === "lofi_music_enabled")).toBe(true);
    expect(lofiEffects?.subItems?.some((sub) => sub.key === "lofi_scene")).toBe(false);

    const spaceItems = buildSettingsItems(t as never, "space");
    expect(spaceItems.some((item) => item.key === "lofi_scene")).toBe(false);
    const spaceEffects = spaceItems.find((item) => item.key === "stars_enabled");
    expect(spaceEffects?.subItems).toBeUndefined();
  });
});

describe("Language options", () => {
  it("offers Auto, English, French, and Spanish", () => {
    const t = (key: string) => key;
    const items = buildSettingsItems(t as never, "space");
    const language = items.find((item) => item.key === "language");
    expect(language?.type).toBe("cycle");
    if (language?.type === "cycle") expect(language.options).toEqual(["auto", "en", "fr", "es"]);
  });
});

describe("Controller settings navigation", () => {
  it("exposes button-preview and tester rows to gamepad focus", () => {
    const t = (key: string) => key;
    const items = buildSettingsItems(t as never, "space");
    expect(items.some((item) => item.key === "gamepad_icon_preview" && item.type === "icon_preview")).toBe(true);
    expect(items.some((item) => item.key === "controller_test" && item.type === "controller_test")).toBe(true);

    const navigable = getSectionNavigableItems(3, items, DEFAULT_SETTINGS);
    expect(navigable.some((item) => item.key === "gamepad_icon_preview")).toBe(true);
    expect(navigable.some((item) => item.key === "controller_test")).toBe(true);
  });
});
