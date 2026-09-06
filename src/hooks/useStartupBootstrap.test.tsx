import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStartupBootstrap } from "./useStartupBootstrap";
import { consumeFseReloadFlag } from "../utils/fseReload";

const { invoke, rumble, quarantine } = vi.hoisted(() => ({
  invoke: vi.fn(() => Promise.resolve()), rumble: vi.fn(),
  quarantine: vi.fn(),
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("../utils/gamepad", () => ({ rumble, suspendGamepadInputUntilButtonsReleased: quarantine }));

let root: Root;
let host: HTMLDivElement;
let startup: ReturnType<typeof useStartupBootstrap>;
const sound = vi.fn();
function Harness() {
  startup = useStartupBootstrap({ onAppLoaded: sound });
  return <span>{startup.loading ? "splash" : "ready"}</span>;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  sessionStorage.clear();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});

describe("FSE recovery startup", () => {
  it("consumes only the exact reload marker and removes stale markers", () => {
    sessionStorage.setItem("liftoff:fse-reload", "invalid");
    expect(consumeFseReloadFlag()).toBe(false);
    expect(sessionStorage.getItem("liftoff:fse-reload")).toBeNull();
    sessionStorage.setItem("liftoff:fse-reload", "1");
    expect(consumeFseReloadFlag()).toBe(true);
    expect(consumeFseReloadFlag()).toBe(false);
  });

  it("skips the exit delay and cues across rerenders but still signals gamepad readiness", () => {
    sessionStorage.setItem("liftoff:fse-reload", "1");
    act(() => root.render(<Harness />));
    act(() => root.render(<Harness />));
    act(() => vi.advanceTimersByTime(350));
    act(() => startup.onLoaded());
    act(() => vi.advanceTimersByTime(0));
    expect(host.textContent).toBe("ready");
    act(() => vi.advanceTimersByTime(2100));
    expect(startup.isReadyRef.current).toBe(true);
    expect(invoke).toHaveBeenCalledWith("set_gamepad_ready");
    expect(rumble).not.toHaveBeenCalled();
    expect(sound).not.toHaveBeenCalled();
    expect(quarantine).toHaveBeenCalledOnce();
    expect(invoke).not.toHaveBeenCalledWith("native_startup_rumble", expect.anything());
  });

  it("preserves ordinary startup timing and cues", () => {
    act(() => root.render(<Harness />));
    act(() => startup.onLoaded());
    act(() => vi.advanceTimersByTime(799));
    expect(host.textContent).toBe("splash");
    act(() => vi.advanceTimersByTime(1));
    expect(host.textContent).toBe("ready");
    expect(sound).toHaveBeenCalledOnce();
    expect(rumble).toHaveBeenCalledWith("startupReady", true);
  });

  it("retains the load-error fallback during recovery", () => {
    sessionStorage.setItem("liftoff:fse-reload", "1");
    act(() => root.render(<Harness />));
    act(() => startup.onLoadError());
    expect(host.textContent).toBe("ready");
  });
});
