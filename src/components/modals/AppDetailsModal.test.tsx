import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppDetailsModal } from "./AppDetailsModal";
import type { App } from "../../types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("../../contexts/ThemeContext", () => ({
  useTheme: () => ({
    accent: { primary: "#5af", glow: "rgba(80,160,255," },
    theme: { text: "#fff", textDim: "#aaa", textFaint: "#777" },
    isDark: true,
    surfaceStyle: "glass",
    surface: { panelBg: "#111" },
    resolvedTheme: "space",
    glass: {},
    materialTokens: {},
  }),
}));
vi.mock("../../utils/gamepad", () => ({
  getBestGamepad: () => null,
  readGpState: vi.fn(),
  shouldHandleDirectionRepeat: vi.fn(),
  rumble: vi.fn(),
}));
vi.mock("../GamepadBtn", () => ({ GamepadBtn: () => null }));

const app = {
  id: "calculator",
  name: "Calculator",
  app_type: "app",
  install_dir: "C:\\Windows\\System32",
  launch_path: "C:\\Windows\\System32\\calc.exe",
} as App;

describe("AppDetailsModal", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("shows the app name, size, location, and context actions", () => {
    const onOpen = vi.fn();
    act(() => root.render(
      <AppDetailsModal
        app={app}
        sizeBytes={1024 * 1024}
        isPinned={false}
        isHidden={false}
        onOpen={onOpen}
        onClose={vi.fn()}
        onTogglePin={vi.fn()}
        onToggleHidden={vi.fn()}
        onChangeArt={vi.fn()}
        onCollections={vi.fn()}
        onRename={vi.fn()}
        onMoveToGames={vi.fn()}
      />,
    ));

    expect(container.textContent).toContain("Calculator");
    expect(container.textContent).toContain("details.sizeOnDisk");
    expect(container.textContent).toContain("1.0 MB");
    expect(container.textContent).toContain("C:\\Windows\\System32");
    expect(container.textContent).toContain("contextMenu.pin");
    expect(container.textContent).toContain("contextMenu.changeArt");
    expect(container.textContent).toContain("contextMenu.moveToGames");

    const open = container.querySelector("button");
    act(() => open?.click());
    expect(onOpen).toHaveBeenCalledOnce();
  });
});
