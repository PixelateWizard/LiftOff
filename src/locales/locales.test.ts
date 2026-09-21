import { describe, expect, it } from "vitest";
import en from "./en.json";
import fr from "./fr.json";
import es from "./es.json";

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      flattenKeys(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return prefix ? [prefix] : [];
}

function leaf(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((node, key) => (node as Record<string, unknown>)?.[key], value);
}

describe("locale key trees", () => {
  const englishKeys = flattenKeys(en).sort();

  it.each([
    ["fr", fr],
    ["es", es],
  ] as const)("%s has the same keys as English", (locale, resources) => {
    expect(flattenKeys(resources).sort()).toEqual(englishKeys);
  });

  it("keeps interpolation placeholders aligned", () => {
    const placeholder = /\{\{[^}]+\}\}/g;
    for (const key of englishKeys) {
      const english = String(leaf(en, key));
      const expected = (english.match(placeholder) ?? []).sort();
      for (const [locale, resources] of [["fr", fr], ["es", es]] as const) {
        const translated = String(leaf(resources, key));
        expect(typeof translated, `${locale}:${key}`).toBe("string");
        expect(translated.length, `${locale}:${key}`).toBeGreaterThan(0);
        expect((translated.match(placeholder) ?? []).sort(), `${locale}:${key}`).toEqual(expected);
      }
    }
  });
});
