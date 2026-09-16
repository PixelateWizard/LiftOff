import { describe, expect, it } from "vitest";
import type { ThemeValue } from "../../contexts/ThemeContext";
import { modalPanelStyle, modalSurfaceStyle } from "./modalStyles";

describe("modal surface inheritance", () => {
  for (const surfaceStyle of ["glass", "aero", "clear", "material", "obsidian", "neon", "win9x"]) {
    it(`preserves the entire ${surfaceStyle} material without opaque or accent overrides`, () => {
      const value = {
        resolvedTheme: "space", surfaceStyle, theme: { text: "#123" },
        materialTokens: { "--material-elevation-2": "#eee" },
        glass: { background: "rgba(10, 20, 30, 0.2)", border: "2px solid red", boxShadow: "inset 0 1px 2px blue", backdropFilter: "blur(18px)" },
        surface: { panelBg: "#ccc", borderRaised: "white black black white", panelShadow: "1px 1px 0 black" },
      } as unknown as ThemeValue;
      expect(modalPanelStyle(value, { width: "400px", maxHeight: "80vh", padding: "24px" })).toMatchObject({
        ...value.glass, ...value.materialTokens,
        ...(surfaceStyle === "win9x" ? { background: "#ccc", border: "2px solid", borderColor: "white black black white", boxShadow: "1px 1px 0 black" } : {}),
        borderRadius: surfaceStyle === "win9x" ? 0 : surfaceStyle === "material" ? 16 : 24,
      });
      expect(modalSurfaceStyle({ ...value, resolvedTheme: "cyberpunk" }).borderRadius).toBe(0);
    });
  }
});
