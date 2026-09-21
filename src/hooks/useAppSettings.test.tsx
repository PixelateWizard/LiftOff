import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../constants";
import { useAppSettings } from "./useAppSettings";

const { invoke, saveCalls, saveResolvers } = vi.hoisted(() => ({
  invoke: vi.fn(),
  saveCalls: [] as Array<Record<string, unknown>>,
  saveResolvers: [] as Array<() => void>,
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke }));

let root: Root;
let host: HTMLDivElement;
let settingsApi: ReturnType<typeof useAppSettings>;

function Harness() {
  settingsApi = useAppSettings({
    onScanKeyChange: vi.fn(),
    autoScaleRef: { current: 1 },
  });
  return null;
}

beforeEach(() => {
  vi.clearAllMocks();
  saveCalls.length = 0;
  saveResolvers.length = 0;
  invoke.mockImplementation((command: string, args?: Record<string, unknown>) => {
    if (command === "get_screen_resolution") return Promise.resolve({ width: 1920, height: 1080 });
    if (command === "get_settings") {
      return Promise.resolve({
        ...DEFAULT_SETTINGS,
        onboarding_complete: false,
        bottombar_smart_migrated: true,
      });
    }
    if (command === "save_settings") {
      saveCalls.push(args?.settings as Record<string, unknown>);
      return new Promise<void>((resolve) => saveResolvers.push(resolve));
    }
    return Promise.resolve(null);
  });
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("onboarding settings persistence", () => {
  it("serializes step saves and keeps the final theme and completion state", async () => {
    await act(async () => {
      root.render(<Harness />);
      await Promise.resolve();
      await Promise.resolve();
    });

    let sceneSave!: Promise<void>;
    let finalSave!: Promise<void>;
    act(() => {
      settingsApi.previewSettings({ theme: "lofi" });
      sceneSave = settingsApi.updateSettingsBatch({ lofi_scene: "dog" });
      finalSave = settingsApi.updateSettingsBatch({ onboarding_complete: true });
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(saveCalls).toHaveLength(1);
    expect(saveCalls[0]).toMatchObject({
      theme: "lofi",
      lofi_scene: "dog",
      onboarding_complete: false,
    });

    saveResolvers.shift()?.();
    await act(async () => {
      await sceneSave;
      await Promise.resolve();
    });

    expect(saveCalls).toHaveLength(2);
    expect(saveCalls[1]).toMatchObject({
      theme: "lofi",
      lofi_scene: "dog",
      onboarding_complete: true,
    });

    saveResolvers.shift()?.();
    await act(async () => {
      await finalSave;
    });
  });
});
