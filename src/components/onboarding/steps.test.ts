import { describe, expect, it } from "vitest";
import en from "../../locales/en.json";
import fr from "../../locales/fr.json";
import { ACCOUNT_ROWS, ESSENTIAL_ROWS, HOME_ROWS, PROGRESS_STEPS, SOURCE_ROWS, STEP_ORDER, stepCount } from "./steps";

describe("onboarding row translations", () => {
  for (const [locale, resources] of Object.entries({ en, fr })) {
    it(`resolves every Home, source, account, and essential label in ${locale}`, () => {
      for (const row of [...HOME_ROWS, ...SOURCE_ROWS, ...ACCOUNT_ROWS, ...ESSENTIAL_ROWS]) {
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
      const lockedValue = ["onboarding", "home", "legacyHeroLocked"].reduce<any>((node, part) => node?.[part], resources);
      expect(typeof lockedValue, "onboarding.home.legacyHeroLocked").toBe("string");
      expect(lockedValue.length, "onboarding.home.legacyHeroLocked").toBeGreaterThan(0);
    });
  }

  it("places the Home preferences after surface selection", () => {
    expect(STEP_ORDER[STEP_ORDER.indexOf("surface") + 1]).toBe("home");
    expect(PROGRESS_STEPS).toContain("home");
    expect(stepCount("home")).toBe(HOME_ROWS.length);
  });
});
