import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ControllerToolsModal from "./ControllerToolsModal";

vi.mock("../../contexts/ThemeContext", () => ({
  useTheme: () => ({
    glass: {},
    accent: { glow: "rgba(0,0,0,", primary: "#fff", darkText: false },
    theme: { text: "#fff", textDim: "#aaa", textFaint: "#888" },
    isDark: true,
    surfaceStyle: "glass",
    surface: {},
    resolvedTheme: "space",
  }),
}));
vi.mock("../GamepadBtn", () => ({ GamepadBtn: () => null }));
vi.mock("../ui", () => ({ GamepadIconPreview: () => <div data-testid="icon-preview" /> }));
vi.mock("../ControllerTestWidget", () => ({ ControllerTestWidget: () => <div data-testid="controller-test" /> }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("ControllerToolsModal controller isolation", () => {
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
    pressed = [];
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

  it("closes the button preview on B after the opening press is released", () => {
    const onClose = vi.fn();
    pressed = [1];
    act(() => root.render(
      <ControllerToolsModal mode="icons" onClose={onClose} />,
    ));

    runFrame(0);
    expect(onClose).not.toHaveBeenCalled();

    pressed = [];
    runFrame(16);
    pressed = [1];
    runFrame(32);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps B for the tester and closes on BACK after release", () => {
    const onClose = vi.fn();
    pressed = [8];
    act(() => root.render(
      <ControllerToolsModal mode="test" onClose={onClose} />,
    ));

    runFrame(0);
    expect(onClose).not.toHaveBeenCalled();

    pressed = [];
    runFrame(16);
    pressed = [1];
    runFrame(32);
    expect(onClose).not.toHaveBeenCalled();

    pressed = [];
    runFrame(48);
    pressed = [8];
    runFrame(64);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
