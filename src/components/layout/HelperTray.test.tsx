import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HelperTray, getHelperTrayUnderlayFilter } from "./HelperTray";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const { themeMock, settingsMock } = vi.hoisted(() => ({
  themeMock: {
    glassBar: {},
    accent: { primary: "#5af", glow: "rgba(80,160,255," },
    theme: { text: "#fff", textDim: "#aaa", textFaint: "#777" },
    isDark: true,
    surfaceStyle: "glass",
    surface: { panelBg: "#111" },
    resolvedTheme: "space",
  },
  settingsMock: {
    settings: { ui_motion: true, lofi_music_enabled: true },
    updateSetting: vi.fn(),
  },
}));

vi.mock("../../contexts/ThemeContext", () => ({
  useTheme: () => themeMock,
}));
vi.mock("../../contexts/SettingsContext", () => ({
  useSettings: () => settingsMock,
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
  mode: "smart",
  spotify: {
    track: null,
    status: { connected: false },
    requiresPremium: false,
    previous: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
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
    vi.useFakeTimers();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    themeMock.resolvedTheme = "space";
    settingsMock.settings = { ui_motion: true, lofi_music_enabled: true };
    settingsMock.updateSetting.mockReset();
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
    vi.useRealTimers();
  });

  it("renders both pinned games and apps", () => {
    act(() => root.render(<HelperTray {...baseProps()} />));

    expect(container.querySelector('[data-helper-pinned="steam://rungameid/620"]')?.textContent).toContain("Portal 2");
    expect(container.querySelector('[data-helper-pinned="calculator"]')?.textContent).toContain("Calculator");
  });

  it("maps translucent tray surfaces to explicit underlay blur", () => {
    act(() => root.render(<HelperTray {...baseProps()} />));

    const tray = container.querySelector<HTMLElement>('[data-modal="helper"]');
    const frost = container.querySelector<HTMLElement>("[data-helper-tray-frost]");
    expect(frost?.style.backdropFilter).toBe("blur(18px) saturate(120%)");
    expect(tray?.style.backdropFilter).toBe("none");
    expect(getHelperTrayUnderlayFilter("glass")).toBe("blur(18px) saturate(120%)");
    expect(getHelperTrayUnderlayFilter("aero")).toBe("blur(16px) saturate(125%)");
    expect(getHelperTrayUnderlayFilter("clear")).toBe("blur(12px) saturate(105%)");
    expect(getHelperTrayUnderlayFilter("obsidian")).toBe("blur(18px) saturate(110%)");
    expect(getHelperTrayUnderlayFilter("material")).toBe("blur(16px) saturate(115%)");
    expect(getHelperTrayUnderlayFilter("win9x")).toBe("blur(16px) saturate(115%)");
    expect(getHelperTrayUnderlayFilter("neon")).toBe("blur(16px) saturate(115%)");
  });

  it("moves from system controls into pins and activates the focused pin", () => {
    const props = baseProps();
    act(() => root.render(<HelperTray {...props} />));

    for (const key of ["ArrowDown", "ArrowDown", "Enter"]) {
      act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })));
    }

    expect(props.onOpenPinned).toHaveBeenCalledWith(props.pinnedApps[0]);
  });

  it("opens on the first running entry and routes Resume/Close/Details", () => {
    const game = { id: "steam://rungameid/620", name: "Portal 2", app_type: "game" } as never;
    const dl = { id: "steam://rungameid/400", name: "Portal", app_type: "game" } as never;
    const props = {
      ...baseProps(),
      runningEntries: [{ app: game, startedAt: Date.now() - 5 * 60000 }],
      downloadEntries: [{ app: dl, pct: 42, indeterminate: false, phase: "downloading", bytesDone: 0, bytesTotal: 0 }],
      onResumeRunning: vi.fn(),
      onCloseRunning: vi.fn(),
      onOpenDownload: vi.fn(),
    };
    act(() => root.render(<HelperTray {...props} />));
    act(() => vi.advanceTimersByTime(300));

    expect(container.querySelector('[data-helper-running="steam://rungameid/620"]')).not.toBeNull();
    expect(container.querySelector('[data-helper-download="steam://rungameid/400"]')).not.toBeNull();

    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
    expect(props.onResumeRunning).toHaveBeenCalledWith(game);
    expect(props.onOpenPinned).not.toHaveBeenCalled();

    for (const key of ["ArrowRight", "Enter"]) act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })));
    expect(props.onCloseRunning).toHaveBeenCalledWith(game);

    for (const key of ["ArrowRight", "Enter"]) act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })));
    expect(props.onOpenDownload).toHaveBeenCalledWith(dl);
  });

  it("omits the activity section when nothing is running or downloading", () => {
    act(() => root.render(<HelperTray {...baseProps()} />));
    expect(container.querySelector("[data-helper-activity]")).toBeNull();
  });
  it("keeps the tray mounted for its exit animation", () => {
    const props = baseProps();
    act(() => root.render(<HelperTray {...props} />));
    act(() => root.render(<HelperTray {...props} open={false} />));

    expect(container.querySelector('[data-modal="helper"]')).not.toBeNull();
    expect(container.querySelector('[data-tray-state="closing"]')).not.toBeNull();

    act(() => vi.advanceTimersByTime(160));
    expect(container.querySelector('[data-modal="helper"]')).toBeNull();
  });

  it("omits the Lo-fi music toggle outside the Lo-fi theme", () => {
    act(() => root.render(<HelperTray {...baseProps()} />));
    expect(container.querySelector('[data-helper-shortcut="lofiMusic"]')).toBeNull();
  });

  it("toggles persisted Lo-fi music from the helper tray", () => {
    themeMock.resolvedTheme = "lofi";
    act(() => root.render(<HelperTray {...baseProps()} />));

    const toggle = container.querySelector<HTMLButtonElement>('[data-helper-shortcut="lofiMusic"]');
    expect(toggle).not.toBeNull();
    expect(toggle?.getAttribute("aria-pressed")).toBe("true");

    act(() => toggle?.click());
    expect(settingsMock.updateSetting).toHaveBeenCalledWith("lofi_music_enabled", false);
  });

  it("stops Spotify playback from the transport row", () => {
    const props = baseProps();
    props.spotify.track = {
      id: "track-1",
      title: "Night Drive",
      artist: "LiftOff",
      durationMs: 180000,
      progressMs: 12000,
      isPlaying: true,
      shuffle: false,
      repeat: "off",
    } as ComponentProps<typeof HelperTray>["spotify"]["track"];
    act(() => root.render(<HelperTray {...props} />));

    const stop = container.querySelector<HTMLButtonElement>('button[aria-label="spotify.stop"]');
    expect(stop).not.toBeNull();
    act(() => stop?.click());
    expect(props.spotify.stop).toHaveBeenCalled();
  });
});
