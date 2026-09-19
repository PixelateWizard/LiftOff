import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ACCENTS } from "./constants";

describe("accent placeholder artwork", () => {
  it.each(Object.keys(ACCENTS))("includes cover and hero placeholders for %s", (accent) => {
    const coverPath = resolve("public", "assets", `liftoff_cover_${accent}.svg`);
    const heroPath = resolve("public", "assets", `liftoff_hero_${accent}.png`);

    expect(
      existsSync(coverPath),
      `Missing portrait placeholder: ${coverPath}`,
    ).toBe(true);
    expect(
      existsSync(heroPath),
      `Missing hero placeholder: ${heroPath}`,
    ).toBe(true);
  });
});
