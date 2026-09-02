import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { GameDetailsModal } from "./GameDetailsModal";

const hookState = vi.hoisted(() => ({
  deckCompat: undefined as undefined | { category: "unknown" | "unsupported" | "playable" | "verified"; fetchedAt: number },
  storeData: null as null | {
    controllerSupport?: "full" | "partial" | "none";
    screenshots?: Array<{ thumb: string; full: string }>;
    shortDescription?: string;
  },
}));

vi.mock("../hooks/useStoreMetadata", () => ({
  useStoreMetadata: () => ({ data: hookState.storeData, loading: false, error: null }),
}));
vi.mock("../hooks/useDeckCompat", () => ({
  useDeckCompat: () => hookState.deckCompat,
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
  "details.deckCompat.verified": "Deck verified",
  "details.deckCompat.playable": "Deck playable",
  "details.deckCompat.unsupported": "Deck unsupported",
  "details.deckCompat.unknown": "Deck compatibility unknown",
  "details.controllerSupport.full": "Full controller support",
  "details.controllerSupport.partial": "Partial controller support",
  "details.controllerSupport.none": "No controller support",
  "details.about": "ABOUT",
  "details.media": "MEDIA",
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

describe("Game Details modal", () => {
  let container: HTMLDivElement;
  let root: Root;
  let nextFrame: FrameRequestCallback | undefined;

  beforeEach(() => {
    hookState.deckCompat = undefined;
    hookState.storeData = null;
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

  it("pauses Details controller actions while a parent confirmation is open", () => {
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
    const onPlay = vi.fn();
    act(() => root.render(
      <GameDetailsModal
        {...baseProps()}
        installed
        canXboxInstall={false}
        interactionBlocked
        onPlay={onPlay}
      />,
    ));
    for (let frame = 0; frame < 21; frame += 1) runFrame(frame * 16);

    pressed = [0];
    runFrame(400);

    expect(onPlay).not.toHaveBeenCalled();
  });

  it("shows Deck and controller chips for a non-verified Steam game", () => {
    hookState.deckCompat = { category: "playable", fetchedAt: 1 };
    hookState.storeData = { controllerSupport: "partial" };
    act(() => root.render(
      <GameDetailsModal
        {...baseProps()}
        app={{ id: "steam:440", name: "Team Fortress 2", source: "steam", steam_appid: 440 }}
        installed
        canXboxInstall={false}
        storeMetaEnabled
      />,
    ));

    expect(container.textContent).toContain("Deck playable");
    expect(container.textContent).toContain("Partial controller support");
  });

  it("hides the redundant controller chip for a Deck-verified game", () => {
    hookState.deckCompat = { category: "verified", fetchedAt: 1 };
    hookState.storeData = { controllerSupport: "full" };
    act(() => root.render(
      <GameDetailsModal
        {...baseProps()}
        app={{ id: "steam:620", name: "Portal 2", source: "steam", steam_appid: 620 }}
        installed
        canXboxInstall={false}
        storeMetaEnabled
      />,
    ));

    expect(container.textContent).toContain("Deck verified");
    expect(container.textContent).not.toContain("Full controller support");
  });

  it("does not render compatibility chips for non-Steam games", () => {
    hookState.deckCompat = { category: "playable", fetchedAt: 1 };
    hookState.storeData = { controllerSupport: "partial" };
    act(() => root.render(<GameDetailsModal {...baseProps()} storeMetaEnabled />));

    expect(container.textContent).not.toContain("Deck playable");
    expect(container.textContent).not.toContain("Partial controller support");
  });

  it("uses an explicit theme foreground for store section labels", () => {
    hookState.storeData = {
      shortDescription: "A store description",
      screenshots: [{ thumb: "https://example.com/thumb.jpg", full: "https://example.com/full.jpg" }],
    };
    act(() => root.render(
      <GameDetailsModal
        {...baseProps()}
        app={{ id: "steam:620", name: "Portal 2", source: "steam", steam_appid: 620 }}
        installed
        canXboxInstall={false}
        theme={{ text: "var(--test-theme-text)", textDim: "#aaa", textFaint: "#777" }}
      />,
    ));

    const sectionLabels = Array.from(container.querySelectorAll<HTMLElement>("[data-details-section-label]"));
    expect(sectionLabels.map((label) => label.textContent)).toEqual(["ABOUT", "MEDIA"]);
    for (const label of sectionLabels) {
      expect(label.style.color).toBe("var(--test-theme-text)");
      expect(label.style.opacity).toBe("0.78");
    }
  });
});
