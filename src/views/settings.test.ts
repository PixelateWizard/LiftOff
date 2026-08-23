import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../constants";
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
  it("removes bottom from the user-facing Normal Home view", () => {
    const settings = { ...DEFAULT_SETTINGS, home_mode: "semi" };
    expect(getSettingCycleOptions(pinnedPositionItem, settings)).toEqual(["none", "top"]);
  });

  it.each(["normal", "immersive"])("keeps bottom available in %s Home", home_mode => {
    const settings = { ...DEFAULT_SETTINGS, home_mode };
    expect(getSettingCycleOptions(pinnedPositionItem, settings)).toEqual(["none", "top", "bottom"]);
  });
});

describe("Data settings navigation", () => {
  it("renders device storage but excludes it from gamepad focus", () => {
    const t = (key: string) => key;
    const items = buildSettingsItems(t as never, "default");
    expect(items.some((item) => item.key === "device_storage" && item.type === "storage_info")).toBe(true);
    expect(getSectionNavigableItems(4, items, DEFAULT_SETTINGS).some((item) => item.key === "device_storage")).toBe(false);
  });
});

describe("Helper bar settings", () => {
  it("offers all three display modes and only exposes track peeking in hidden mode", () => {
    const t = (key: string) => key;
    const items = buildSettingsItems(t as never, "default");
    const mode = items.find((item) => item.key === "bottombar_mode");
    expect(mode?.type).toBe("cycle");
    if (mode?.type === "cycle") expect(mode.options).toEqual(["full", "minimal", "hidden"]);

    const full = getSectionNavigableItems(0, items, { ...DEFAULT_SETTINGS, bottombar_mode: "full" }, undefined, 3);
    const hidden = getSectionNavigableItems(0, items, { ...DEFAULT_SETTINGS, bottombar_mode: "hidden" }, undefined, 3);
    expect(full.some((item) => item.key === "bottombar_peek_on_track")).toBe(false);
    expect(hidden.some((item) => item.key === "bottombar_peek_on_track")).toBe(true);
  });
});
