import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CloudGamePickerModal from "./CloudGamePickerModal";

const game = vi.hoisted(() => ({
  name: "Cloud Test Game",
  slug: "cloud-test-game",
  productId: "9TESTGAME",
  boxArtUrl: "https://example.com/cover.jpg",
}));

vi.mock("../../data/xcloudGames.json", () => ({ default: [game] }));
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (command: string) => command === "get_xcloud_games"
    ? { games: [game], source: "bundled" }
    : null),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? ({
      "addEntry.addCloudGame": "Add Cloud Game",
      "addEntry.cloudAddToLibrary": "Add to Library",
      "addEntry.cloudRemoveFromLibrary": "Remove from Library",
      "addEntry.cloudBackToGames": "Back to games",
      "details.about": "About",
      "details.media": "Media",
    }[key] ?? key),
  }),
}));
vi.mock("../../contexts/ThemeContext", () => ({
  useTheme: () => ({
    accent: { primary: "#ff6b3d", dark: "#cc4020", glow: "rgba(255,107,61,", darkText: false },
    theme: { text: "#fff", textDim: "#aaa", textFaint: "#777" },
    isDark: true,
  }),
}));
vi.mock("../../hooks/useStoreMetadata", () => ({
  useStoreMetadata: () => ({
    loading: false,
    error: null,
    data: {
      appId: "9TESTGAME",
      shortDescription: "A Store description.",
      aboutHtml: "",
      screenshots: [{ thumb: "https://example.com/shot-thumb.jpg", full: "https://example.com/shot.jpg" }],
      movies: [],
    },
  }),
}));
vi.mock("../GamepadKeyboard", () => ({ default: () => null }));
vi.mock("./ModalShell", () => ({
  default: ({ title, children }: { title: string; children: ReactNode }) => (
    <section aria-label={title}>{children}</section>
  ),
}));

describe("CloudGamePickerModal", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [] });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("opens details before adding and preserves one-level Back behavior", async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    await act(async () => {
      root.render(<CloudGamePickerModal onConfirm={onConfirm} onClose={onClose} />);
    });

    const cover = container.querySelector<HTMLImageElement>('img[alt="Cloud Test Game"]');
    const card = cover?.closest("button") as HTMLButtonElement;
    expect(card).toBeTruthy();
    expect(card.style.transform).toBe("none");
    expect(card.style.border).toContain("2px");

    await act(async () => card.click());
    expect(onConfirm).not.toHaveBeenCalled();
    expect(container.textContent).toContain("A Store description.");
    expect(container.querySelector('img[alt="Screenshot 1"]')).toBeTruthy();

    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(container.querySelector('img[alt="Cloud Test Game"]')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();

    const returnedCard = container.querySelector<HTMLImageElement>('img[alt="Cloud Test Game"]')?.closest("button") as HTMLButtonElement;
    await act(async () => returnedCard.click());
    const addButton = [...container.querySelectorAll("button")]
      .find((button) => button.textContent?.includes("Add to Library"));
    expect(addButton).toBeTruthy();
    act(() => addButton?.click());
    expect(onConfirm).toHaveBeenCalledWith(game);
  });

  it("uses spatial preview navigation and lets gamepad input activate Back to games", async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    await act(async () => {
      root.render(<CloudGamePickerModal onConfirm={onConfirm} onClose={onClose} />);
    });

    const card = container.querySelector<HTMLImageElement>('img[alt="Cloud Test Game"]')?.closest("button") as HTMLButtonElement;
    await act(async () => card.click());
    expect(container.querySelector('[data-cloud-preview-focus="primary"]')?.getAttribute("aria-current")).toBe("true");

    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })));
    expect(container.querySelector('[data-cloud-preview-focus="back"]')?.getAttribute("aria-current")).toBe("true");

    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
    expect(container.querySelector('img[alt="Cloud Test Game"]')).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    const returnedCard = container.querySelector<HTMLImageElement>('img[alt="Cloud Test Game"]')?.closest("button") as HTMLButtonElement;
    await act(async () => returnedCard.click());
    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));
    expect(container.querySelector('[data-cloud-preview-focus="media"]')?.getAttribute("aria-current")).toBe("true");
    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })));
    expect(container.querySelector('[data-cloud-preview-focus="primary"]')?.getAttribute("aria-current")).toBe("true");
  });

  it("offers Remove from Library for an existing Cloud entry", async () => {
    const onConfirm = vi.fn();
    const onRemove = vi.fn();
    await act(async () => {
      root.render(
        <CloudGamePickerModal
          onConfirm={onConfirm}
          onRemove={onRemove}
          isInLibrary={() => true}
          onClose={vi.fn()}
        />,
      );
    });

    const card = container.querySelector<HTMLImageElement>('img[alt="Cloud Test Game"]')?.closest("button") as HTMLButtonElement;
    await act(async () => card.click());
    const removeButton = [...container.querySelectorAll("button")]
      .find((button) => button.textContent?.includes("Remove from Library"));
    expect(removeButton).toBeTruthy();
    act(() => removeButton?.click());
    expect(onRemove).toHaveBeenCalledWith(game);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
