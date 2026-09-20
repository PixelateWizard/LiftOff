import { describe, expect, it } from "vitest";
import en from "../../locales/en.json";
import es from "../../locales/es.json";
import fr from "../../locales/fr.json";
import { ACCOUNT_ROWS, ESSENTIAL_ROWS, HOME_MODE_OPTIONS, HOME_ROWS, LANGUAGE_OPTIONS, PROGRESS_STEPS, SOURCE_ROWS, STEP_ORDER, TAB_ICON_OPTIONS, VISUAL_ROWS, homeModeCardIndex, shouldSkipOnboardingStep, stepCount, tabIconModeCardIndex, visualTabbarTriggersOn, visualTopBumpersOn, visibleProgressSteps } from "./steps";
import { LOFI_SCENE_OPTIONS } from "../../constants";

describe("onboarding row translations", () => {
  for (const [locale, resources] of Object.entries({ en, fr, es })) {
    it(`resolves every Home, source, account, and essential label in ${locale}`, () => {
      for (const row of [...HOME_ROWS, ...VISUAL_ROWS, ...SOURCE_ROWS, ...ACCOUNT_ROWS, ...ESSENTIAL_ROWS]) {
        const value = row.labelKey.split(".").reduce<any>((node, key) => node?.[key], resources);
        expect(typeof value, row.labelKey).toBe("string");
        expect(value.length, row.labelKey).toBeGreaterThan(0);
      }
      for (const step of STEP_ORDER) {
        const value = ["onboarding", step, "title"].reduce<any>((node, key) => node?.[key], resources);
        expect(typeof value, `onboarding.${step}.title`).toBe("string");
        expect(value.length, `onboarding.${step}.title`).toBeGreaterThan(0);
      }
      for (const key of ["previousOption", "nextOption"]) {
        const value = ["onboarding", key].reduce<any>((node, part) => node?.[part], resources);
        expect(typeof value, `onboarding.${key}`).toBe("string");
        expect(value.length, `onboarding.${key}`).toBeGreaterThan(0);
      }
      for (const mode of HOME_MODE_OPTIONS) {
        const value = ["settings", "homeModeValues", mode].reduce<any>((node, key) => node?.[key], resources);
        expect(typeof value, `settings.homeModeValues.${mode}`).toBe("string");
        expect(value.length, `settings.homeModeValues.${mode}`).toBeGreaterThan(0);
      }
      const lockedValue = ["onboarding", "home", "legacyHeroLocked"].reduce<any>((node, part) => node?.[part], resources);
      expect(typeof lockedValue, "onboarding.home.legacyHeroLocked").toBe("string");
      expect(lockedValue.length, "onboarding.home.legacyHeroLocked").toBeGreaterThan(0);
    });
  }

  it("places the Home preferences after surface selection", () => {
    expect(STEP_ORDER[STEP_ORDER.indexOf("surface") + 1]).toBe("home");
    expect(PROGRESS_STEPS).toContain("home");
    expect(HOME_MODE_OPTIONS).toEqual(["semi", "immersive", "normal"]);
    expect(homeModeCardIndex("semi")).toBe(0);
    expect(homeModeCardIndex("immersive")).toBe(1);
    expect(homeModeCardIndex("normal")).toBe(2);
    expect(stepCount("home")).toBe(HOME_MODE_OPTIONS.length + HOME_ROWS.length);
    expect(LANGUAGE_OPTIONS).toEqual(["auto", "en", "fr", "es"]);
    expect(stepCount("welcome")).toBe(LANGUAGE_OPTIONS.length);
  });

  it("places visual bar preferences after Home and exposes tab-icon cards", () => {
    expect(STEP_ORDER[STEP_ORDER.indexOf("home") + 1]).toBe("visual");
    expect(PROGRESS_STEPS).toContain("visual");
    expect(TAB_ICON_OPTIONS).toEqual(["text", "icons", "both"]);
    expect(tabIconModeCardIndex("text")).toBe(0);
    expect(tabIconModeCardIndex("icons")).toBe(1);
    expect(tabIconModeCardIndex("both")).toBe(2);
    expect(visualTopBumpersOn("header")).toBe(true);
    expect(visualTopBumpersOn("bottom")).toBe(false);
    expect(visualTopBumpersOn("hidden")).toBe(false);
    expect(visualTabbarTriggersOn("tabbar")).toBe(true);
    expect(visualTabbarTriggersOn("bottom")).toBe(false);
    expect(visualTabbarTriggersOn("hidden")).toBe(false);
    expect(VISUAL_ROWS.every((row) => row.kind !== "cycle")).toBe(true);
    expect(stepCount("visual")).toBe(TAB_ICON_OPTIONS.length + VISUAL_ROWS.length);
  });

  it("offers Lo-fi scenes after theme and skips that step for other themes", () => {
    expect(STEP_ORDER[STEP_ORDER.indexOf("theme") + 1]).toBe("lofi_scene");
    expect(PROGRESS_STEPS).toContain("lofi_scene");
    expect(stepCount("lofi_scene")).toBe(LOFI_SCENE_OPTIONS.length);
    expect(shouldSkipOnboardingStep("lofi_scene", "lofi")).toBe(false);
    expect(shouldSkipOnboardingStep("lofi_scene", "space")).toBe(true);
    expect(visibleProgressSteps("lofi")).toContain("lofi_scene");
    expect(visibleProgressSteps("space")).not.toContain("lofi_scene");
    expect(shouldSkipOnboardingStep("surface", "onyx")).toBe(true);
    expect(shouldSkipOnboardingStep("surface", "lofi")).toBe(false);
  });
});
