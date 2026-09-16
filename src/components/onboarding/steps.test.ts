import { describe, expect, it } from "vitest";
import en from "../../locales/en.json";
import fr from "../../locales/fr.json";
import { ACCOUNT_ROWS, ESSENTIAL_ROWS, SOURCE_ROWS } from "./steps";

describe("onboarding row translations", () => {
  for (const [locale, resources] of Object.entries({ en, fr })) {
    it(`resolves every source, account, and essential label in ${locale}`, () => {
      for (const row of [...SOURCE_ROWS, ...ACCOUNT_ROWS, ...ESSENTIAL_ROWS]) {
        const value = row.labelKey.split(".").reduce<any>((node, key) => node?.[key], resources);
        expect(typeof value, row.labelKey).toBe("string");
        expect(value.length, row.labelKey).toBeGreaterThan(0);
      }
    });
  }
});
