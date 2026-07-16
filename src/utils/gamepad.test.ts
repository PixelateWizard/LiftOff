import { describe, expect, it } from "vitest";
import {
  detectPlatform,
  readGpState,
  shouldHandleDirectionRepeat,
} from "./gamepad";

function gamepad({
  axes = [0, 0, 0, 0],
  pressed = [],
}: {
  axes?: number[];
  pressed?: number[];
} = {}): Gamepad {
  return {
    axes,
    buttons: Array.from({ length: 16 }, (_, index) => ({
      pressed: pressed.includes(index),
      touched: pressed.includes(index),
      value: pressed.includes(index) ? 1 : 0,
    })),
  } as Gamepad;
}

describe("readGpState", () => {
  it("maps standard face and d-pad buttons", () => {
    const state = readGpState(gamepad({ pressed: [0, 12, 15] }));

    expect(state.Enter).toBe(true);
    expect(state.ArrowUp).toBe(true);
    expect(state.ArrowRight).toBe(true);
    expect(state.Escape).toBe(false);
  });

  it("supports stick and hat-axis navigation", () => {
    const state = readGpState(gamepad({ axes: [-0.8, 0.7, 0, 0, 1, 0, 1, -1] }));

    expect(state.ArrowLeft).toBe(true);
    expect(state.ArrowDown).toBe(true);
    expect(state.ArrowRight).toBe(true);
    expect(state.ArrowUp).toBe(true);
  });
});

describe("shouldHandleDirectionRepeat", () => {
  it("fires immediately, then respects the initial and repeat delays", () => {
    const pressTime: Record<string, number> = {};
    const repeating: Record<string, boolean> = {};

    expect(shouldHandleDirectionRepeat("ArrowDown", { ArrowDown: true }, {}, 100, pressTime, repeating)).toBe(true);
    expect(shouldHandleDirectionRepeat("ArrowDown", { ArrowDown: true }, { ArrowDown: true }, 449, pressTime, repeating)).toBe(false);
    expect(shouldHandleDirectionRepeat("ArrowDown", { ArrowDown: true }, { ArrowDown: true }, 450, pressTime, repeating)).toBe(true);
    expect(shouldHandleDirectionRepeat("ArrowDown", { ArrowDown: true }, { ArrowDown: true }, 549, pressTime, repeating)).toBe(false);
    expect(shouldHandleDirectionRepeat("ArrowDown", { ArrowDown: true }, { ArrowDown: true }, 550, pressTime, repeating)).toBe(true);
  });
});

describe("detectPlatform", () => {
  it.each([
    ["Xbox Wireless Controller", "xbox"],
    ["Sony DualSense 054c", "ps"],
    ["Nintendo Switch Pro Controller", "switch"],
    ["Generic USB Controller", null],
  ])("detects %s", (id, expected) => {
    expect(detectPlatform(id)).toBe(expected);
  });
});
