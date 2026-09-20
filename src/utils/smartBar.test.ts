import { describe, expect, it } from "vitest";
import type { App } from "../types";
import {
  allowsBottomBumperBadges, collectDownloads, getBottomBarClearance, immersiveHeroCopyBottom,
  migrateBottomBarSettings, normalizeBottomBarMode, pickBarActivity, resolveBarHints,
  resolveNavBumpersPos,
} from "./smartBar";

const game = (over: Partial<App> = {}): App => ({ id: "g1", name: "Portal 2", app_type: "game", ...over } as App);
const app = (over: Partial<App> = {}): App => ({ id: "a1", name: "Calculator", app_type: "app", ...over } as App);

describe("bottom bar migration", () => {
  it("moves Full, Minimal and empty to Smart once and keeps Hidden", () => {
    expect(migrateBottomBarSettings({ bottombar_mode: "full" })).toEqual({ bottombar_mode: "smart", changed: true });
    expect(migrateBottomBarSettings({ bottombar_mode: "minimal" })).toEqual({ bottombar_mode: "smart", changed: true });
    expect(migrateBottomBarSettings({ bottombar_mode: "" })).toEqual({ bottombar_mode: "smart", changed: true });
    expect(migrateBottomBarSettings({ bottombar_mode: "hidden" })).toEqual({ bottombar_mode: "hidden", changed: true });
  });

  it("respects a Full choice made after the migration", () => {
    expect(migrateBottomBarSettings({ bottombar_mode: "full", bottombar_smart_migrated: true }))
      .toEqual({ bottombar_mode: "full", changed: false });
    expect(migrateBottomBarSettings({ bottombar_mode: "minimal", bottombar_smart_migrated: true }))
      .toEqual({ bottombar_mode: "smart", changed: true });
  });

  it("normalizes unknown modes to smart", () => {
    expect(normalizeBottomBarMode("minimal")).toBe("smart");
    expect(normalizeBottomBarMode(undefined)).toBe("smart");
    expect(normalizeBottomBarMode("full")).toBe("full");
  });

  it("reserves clearance per mode", () => {
    expect(getBottomBarClearance("full", true)).toBe(64);
    expect(getBottomBarClearance("full", false)).toBe(0);
    expect(getBottomBarClearance("smart", false)).toBe(76);
    expect(getBottomBarClearance("hidden", true)).toBe(0);
  });

  it("lifts unboxed Immersive copy above the Smart pill", () => {
    expect(immersiveHeroCopyBottom("smart", 0)).toBe(76);
    expect(immersiveHeroCopyBottom("smart", 24)).toBe(76);
    expect(immersiveHeroCopyBottom("smart", 122)).toBe(122);
    expect(immersiveHeroCopyBottom("full", 0)).toBe(0);
    expect(immersiveHeroCopyBottom("hidden", 24)).toBe(24);
  });

  it("keeps bottom bumper badges only on the Full bar", () => {
    expect(allowsBottomBumperBadges("full")).toBe(true);
    expect(allowsBottomBumperBadges("smart")).toBe(false);
    expect(allowsBottomBumperBadges("hidden")).toBe(false);
    expect(resolveNavBumpersPos("bottom", "full")).toBe("bottom");
    expect(resolveNavBumpersPos("bottom", "smart")).toBe("hidden");
    expect(resolveNavBumpersPos("header", "smart")).toBe("header");
    expect(resolveNavBumpersPos("hidden", "full")).toBe("hidden");
  });
});

describe("resolveBarHints", () => {
  const base = { running: false, installing: false, pinned: false, launchesDirectly: false };

  it("keeps the Details-first contract for games", () => {
    expect(resolveBarHints({ kind: "app", appId: "g1" }, { ...base, app: game() }).map((h) => h.labelKey))
      .toEqual(["smartBar.hint.details", "smartBar.hint.pin"]);
  });

  it("offers Play and Resume only where games launch directly", () => {
    const direct = { ...base, launchesDirectly: true };
    expect(resolveBarHints({ kind: "app", appId: "g1" }, { ...direct, app: game() })[0].labelKey).toBe("smartBar.hint.play");
    expect(resolveBarHints({ kind: "app", appId: "g1" }, { ...direct, running: true, app: game() })[0].labelKey).toBe("smartBar.hint.resume");
    expect(resolveBarHints({ kind: "app", appId: "g1" }, { ...direct, app: game({ installed: false }) })[0].labelKey).toBe("smartBar.hint.details");
  });

  it("labels apps, pins, hero close and settings rows", () => {
    expect(resolveBarHints({ kind: "app", appId: "a1" }, { ...base, pinned: true, app: app() }).map((h) => h.labelKey))
      .toEqual(["smartBar.hint.open", "smartBar.hint.unpin"]);
    expect(resolveBarHints({ kind: "app", appId: "g1", heroCloseAction: true }, { ...base, running: true, app: game() })[0].labelKey)
      .toBe("smartBar.hint.closeGame");
    expect(resolveBarHints({ kind: "setting", itemType: "toggle" }, null)[0].labelKey).toBe("smartBar.hint.toggle");
    expect(resolveBarHints({ kind: "setting", itemType: "slider" }, null)[0].btn).toBe("←→");
    expect(resolveBarHints({ kind: "search" }, null)).toEqual([]);
  });
});

describe("activity", () => {
  const lookup = (id: string) => (id === "steam://rungameid/1" ? game({ id }) : id === "xb" ? game({ id: "xb", name: "Forza" }) : undefined);

  it("collects Steam and store installs and skips uninstalls", () => {
    const downloads = collectDownloads(lookup,
      { "steam://rungameid/1": { pct: 42, state: "downloading", phase: "downloading" } },
      { xb: { pct: 0, state: "uninstalling" } });
    expect(downloads).toHaveLength(1);
    expect(downloads[0].pct).toBe(42);
    expect(downloads[0].indeterminate).toBe(false);
  });

  it("prioritizes downloads, then running, then update", () => {
    const d = collectDownloads(lookup, { "steam://rungameid/1": { pct: 10, state: "downloading" } }, {});
    const r = [{ app: game(), startedAt: 0 }];
    expect(pickBarActivity(d, r, { available: true, version: "2.0.1" })?.kind).toBe("install");
    expect(pickBarActivity([], r, { available: true, version: "2.0.1" })?.kind).toBe("running");
    expect(pickBarActivity([], [], { available: true, version: "2.0.1" })?.kind).toBe("update");
    expect(pickBarActivity([], [], { available: false, version: null })).toBeNull();
  });
});
