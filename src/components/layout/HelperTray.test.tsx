import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HelperTray } from "./HelperTray";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("../../contexts/ThemeContext", () => ({
  useTheme: () => ({
    glassBar: {},
    accent: { primary: "#5af", glow: "rgba(80,160,255," },
    theme: { text: "#fff", textDim: "#aaa", textFaint: "#777" },
    isDark: true,
    surfaceStyle: "glass",
    surface: { panelBg: "#111" },
    resolvedTheme: "space",
  }),
}));
vi.mock("../../hooks/useSystemControls", () => ({
  useSystemControls: () => ({
    volume: { percent: 50 },
    brightness: null,
    requestVolume: vi.fn(),
    requestBrightness: vi.fn(),
  }),
}));
vi.mock("../GamepadBtn", () => ({ GamepadBtn: () => null }));

const baseProps = (): ComponentProps<typeof HelperTray> => ({
  open: true,
  mode: "minimal",
  spotify: {
    track: null,
    status: { connected: false },
    requiresPremium: false,
    previous: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    next: vi.fn(),
    seek: vi.fn(),
  } as ComponentProps<typeof HelperTray>["spotify"],
  pinnedApps: [
    { id: "steam://rungameid/620", name: "Portal 2", app_type: "game" },
    { id: "calculator", name: "Calculator", app_type: "app" },
  ],
  onClose: vi.fn(),
  onOpenPlaylists: vi.fn(),
  onConnectSpotify: vi.fn(),
  onOpenSettings: vi.fn(),
  onOpenPower: vi.fn(),
  onRefreshLibrary: vi.fn(),
  onOpenControls: vi.fn(),
  onOpenPinned: vi.fn(),
});

describe("HelperTray pinned shortcuts", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: vi.fn(),
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    delete (HTMLElement.prototype as { scrollTo?: unknown }).scrollTo;
    vi.unstubAllGlobals();
  });

  it("renders both pinned games and apps", () => {
    act(() => root.render(<HelperTray {...baseProps()} />));

    expect(container.querySelector('[data-helper-pinned="steam://rungameid/620"]')?.textContent).toContain("Portal 2");
    expect(container.querySelector('[data-helper-pinned="calculator"]')?.textContent).toContain("Calculator");
  });

  it("moves from system controls into pins and activates the focused pin", () => {
    const props = baseProps();
    act(() => root.render(<HelperTray {...props} />));

    for (const key of ["ArrowDown", "ArrowDown", "Enter"]) {
      act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })));
    }

    expect(props.onOpenPinned).toHaveBeenCalledWith(props.pinnedApps[0]);
  });
});
