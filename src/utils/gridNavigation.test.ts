import { describe, expect, it } from "vitest";
import { moveGridFocus } from "./gridNavigation";

describe("moveGridFocus", () => {
  it("keeps horizontal focus inside the current visual row", () => {
    expect(moveGridFocus(2, 7, 3, "right")).toBe(2);
    expect(moveGridFocus(3, 7, 3, "left")).toBe(3);
  });

  it("moves vertically by column and clamps an incomplete final row", () => {
    expect(moveGridFocus(1, 7, 3, "down")).toBe(4);
    expect(moveGridFocus(4, 7, 3, "down")).toBe(6);
    expect(moveGridFocus(6, 7, 3, "up")).toBe(3);
  });

  it("stays at the top and bottom grid edges", () => {
    expect(moveGridFocus(1, 7, 3, "up")).toBe(1);
    expect(moveGridFocus(6, 7, 3, "down")).toBe(6);
  });
});
