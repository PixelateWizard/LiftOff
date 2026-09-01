import { describe, expect, it } from "vitest";
import { resolveNativeBackgroundRgb } from "./nativeBackground";

describe("resolveNativeBackgroundRgb", () => {
  it("resolves a flat theme background", () => {
    expect(resolveNativeBackgroundRgb("#070910")).toEqual([7, 9, 16]);
  });

  it("leaves the previous native colour in place for a gradient", () => {
    expect(resolveNativeBackgroundRgb("linear-gradient(#070910, #100806)")).toBeNull();
  });
});
