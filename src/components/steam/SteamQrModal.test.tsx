import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SteamQrModal } from "./SteamQrModal";

vi.mock("../../contexts/ThemeContext", () => ({
  useTheme: () => ({
    glass: {},
    accent: { primary: "#fff", glow: "rgba(0,0,0,", darkText: false },
    theme: { text: "#fff", textDim: "#aaa", textFaint: "#666" },
    isDark: true,
    surfaceStyle: "glass",
    surface: {},
    resolvedTheme: "space",
    materialTokens: {},
  }),
}));

const theme = { text: "#fff", textDim: "#aaa", textFaint: "#666" } as const;
const accent = { primary: "#6cf", glow: "rgba(0,0,0,", darkText: false };

describe("SteamQrModal controller isolation", () => {
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

  function runFrame() {
    const callback = nextFrame;
    expect(callback).toBeDefined();
    act(() => callback?.(16));
  }

  it("ignores the opening A press, then closes on B", () => {
    const onClose = vi.fn();
    const onBegin = vi.fn();
    act(() => root.render(
      <SteamQrModal
        open
        phase="waiting"
        qrUrl="https://example.test/steam"
        accent={accent as never}
        theme={theme as never}
        isDark
        surfaceStyle="glass"
        glass={{}}
        onBegin={onBegin}
        onClose={onClose}
        t={(key) => key}
      />,
    ));

    runFrame();
    expect(onClose).not.toHaveBeenCalled();
    expect(onBegin).not.toHaveBeenCalled();

    pressed = [];
    runFrame();
    pressed = [1];
    runFrame();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("uses Segoe UI instead of the document serif fallback", () => {
    act(() => root.render(
      <SteamQrModal
        open
        phase="waiting"
        qrUrl="https://example.test/steam"
        accent={accent as never}
        theme={theme as never}
        isDark
        surfaceStyle="glass"
        glass={{}}
        onBegin={() => {}}
        onClose={() => {}}
        t={(key) => key}
      />,
    ));
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.style.fontFamily).toContain("Segoe UI");
  });
});
