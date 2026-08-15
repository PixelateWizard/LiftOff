import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { GameDetailsModal } from "./GameDetailsModal";

vi.mock("../hooks/useStoreMetadata", () => ({
  useStoreMetadata: () => ({ data: null, loading: false, error: null }),
}));
vi.mock("./ui/StoreBadge", () => ({ StoreBadge: () => null }));

const labels: Record<string, string> = {
  "install.install": "Install",
  "install.confirmTitle": "Install Test Game?",
  "install.installSize": "Install size",
  "install.sizeUnknown": "Size unavailable",
  "install.freeSpace": "Free space",
  "install.freeSpaceOn": "free space on drive",
  "install.freeSpaceUnknown": "Unavailable",
  "install.notEnoughSpace": "Not enough free space",
  "install.spaceUnknownNote": "Storage could not be confirmed",
  "install.confirmInstall": "Install",
  "install.close": "Cancel",
};

const baseProps = (): ComponentProps<typeof GameDetailsModal> => ({
  app: { id: "xbox:test", name: "Test Game", source: "xbox", installed: false, xbox_product_id: "9P8DL6W0JBB8" },
  animatedHeroes: "static",
  effectsEnabled: false,
  installed: false,
  canXboxInstall: true,
  onPlay: vi.fn(),
  onXboxInstall: vi.fn(),
  onTogglePin: vi.fn(),
  isPinned: false,
  onToggleHidden: vi.fn(),
  isHidden: false,
  onRunAsAdminToggle: vi.fn(),
  runAsAdmin: false,
  onChangeArt: vi.fn(),
  onChangeHeroArt: vi.fn(),
  onCollections: vi.fn(),
  onRename: vi.fn(),
  onMoveToApps: vi.fn(),
  onClose: vi.fn(),
  accent: { primary: "#4aa3ff", light: "#77baff", dark: "#1768aa", glow: "rgba(74,163,255," , lightBg: "#eef7ff" },
  accentName: "ocean",
  theme: { text: "#fff", textDim: "#aaa", textFaint: "#777" },
  isDark: true,
  surfaceStyle: "glass",
  glass: {},
  t: (key) => labels[key] ?? key,
});

describe("Microsoft catalog install confirmation", () => {
  let container: HTMLDivElement;
  let root: Root;
  let nextFrame: FrameRequestCallback | undefined;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      nextFrame = callback;
      return 1;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    Object.defineProperty(Element.prototype, "scrollIntoView", {
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
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    vi.unstubAllGlobals();
  });

  function render(props: Partial<ComponentProps<typeof GameDetailsModal>>) {
    act(() => root.render(<GameDetailsModal {...baseProps()} {...props} />));
    const primary = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "Install");
    expect(primary).toBeDefined();
    act(() => primary?.click());
    return container.querySelector('[role="dialog"]') as HTMLElement | null;
  }

  function runFrame(now: number) {
    const callback = nextFrame;
    expect(callback).toBeDefined();
    act(() => callback?.(now));
  }

  it("allows confirmation when size and free space are known and sufficient", () => {
    const onXboxInstall = vi.fn();
    const dialog = render({
      xboxInstallSizeBytes: 100_000_000,
      installTargetDrive: { mountPoint: "C:\\", label: "Windows", totalBytes: 2_000_000_000, freeBytes: 1_000_000_000, driveKind: "fixed", isDefaultInstallDrive: true },
      onXboxInstall,
    });
    expect(dialog?.textContent).toContain("Install Test Game?");
    expect(dialog?.querySelectorAll("button")).toHaveLength(2);
    act(() => (dialog?.querySelector("button") as HTMLButtonElement).click());
    expect(onXboxInstall).toHaveBeenCalledOnce();
  });

  it("removes the install action for a confirmed shortfall", () => {
    const onXboxInstall = vi.fn();
    const dialog = render({
      xboxInstallSizeBytes: 1_000_000_000,
      installTargetDrive: { mountPoint: "C:\\", label: "Windows", totalBytes: 2_000_000_000, freeBytes: 1_100_000_000, driveKind: "fixed", isDefaultInstallDrive: true },
      onXboxInstall,
    });
    expect(dialog?.textContent).toContain("Not enough free space");
    expect(dialog?.querySelectorAll("button")).toHaveLength(1);
    expect(dialog?.querySelector("button")?.textContent).toBe("Cancel");
    expect(onXboxInstall).not.toHaveBeenCalled();
  });

  it("fails open when catalog or storage data is unavailable", () => {
    const dialog = render({ xboxInstallSizeBytes: null, installTargetDrive: null });
    expect(dialog?.textContent).toContain("Size unavailable");
    expect(dialog?.textContent).toContain("Storage could not be confirmed");
    expect(dialog?.querySelectorAll("button")).toHaveLength(2);
  });

  it("isolates controller navigation and back handling inside the confirmation", () => {
    let pressed: number[] = [];
    const gamepad = (): Gamepad => ({
      mapping: "standard",
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 16 }, (_, index) => ({
        pressed: pressed.includes(index),
        touched: pressed.includes(index),
        value: pressed.includes(index) ? 1 : 0,
      })),
    } as Gamepad);
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [gamepad()],
    });
    const onXboxInstall = vi.fn();
    const onClose = vi.fn();
    render({
      xboxInstallSizeBytes: 100_000_000,
      installTargetDrive: { mountPoint: "C:\\", label: "Windows", totalBytes: 2_000_000_000, freeBytes: 1_000_000_000, driveKind: "fixed", isDefaultInstallDrive: true },
      onXboxInstall,
      onClose,
    });
    for (let frame = 0; frame < 21; frame += 1) runFrame(frame * 16);

    pressed = [15];
    runFrame(400);
    pressed = [];
    runFrame(416);
    pressed = [0];
    runFrame(432);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(onXboxInstall).not.toHaveBeenCalled();

    pressed = [];
    runFrame(448);
    const primary = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "Install");
    act(() => primary?.click());
    pressed = [1];
    runFrame(464);
    runFrame(480);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });
});
