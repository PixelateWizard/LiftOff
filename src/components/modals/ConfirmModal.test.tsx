import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ConfirmModal from "./ConfirmModal";

vi.mock("../../contexts/ThemeContext", () => ({
  useTheme: () => ({
    glass: {},
    accent: { glow: "rgba(0,0,0," },
    theme: { text: "#fff" },
    isDark: true,
    surfaceStyle: "glass",
    surface: {},
    resolvedTheme: "glass",
  }),
}));
vi.mock("../GamepadBtn", () => ({ GamepadBtn: () => null }));

describe("ConfirmModal controller isolation", () => {
  let container: HTMLDivElement;
  let root: Root;
  let nextFrame: FrameRequestCallback | undefined;
  let pressed: number[];

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      nextFrame = callback;
      return 1;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    pressed = [0];
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [{
        mapping: "standard",
        axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 16 }, (_, index) => ({
          pressed: pressed.includes(index),
          touched: pressed.includes(index),
          value: pressed.includes(index) ? 1 : 0,
        })),
      } as Gamepad],
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  function runFrame(now: number) {
    const callback = nextFrame;
    expect(callback).toBeDefined();
    act(() => callback?.(now));
  }

  it("requires release before the opening A press can confirm", () => {
    const onConfirm = vi.fn();
    act(() => root.render(
      <ConfirmModal message="Confirm?" onConfirm={onConfirm} onCancel={vi.fn()} />,
    ));

    for (let frame = 0; frame < 21; frame += 1) runFrame(frame * 16);
    expect(onConfirm).not.toHaveBeenCalled();

    pressed = [];
    runFrame(400);
    pressed = [0];
    runFrame(416);

    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
