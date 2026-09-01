import { describe, expect, it, vi } from "vitest";
import { refreshLibrarySources } from "./libraryRefresh";

describe("refreshLibrarySources", () => {
  it("waits for the connected Steam cache refresh before rescanning", async () => {
    const calls: string[] = [];
    let finishSteam: (() => void) | undefined;
    const refresh = refreshLibrarySources({
      steamConnected: true,
      refreshSteamOwned: () => new Promise<void>((resolve) => {
        finishSteam = () => {
          calls.push("steam");
          resolve();
        };
      }),
      refreshSteamStatus: () => calls.push("status"),
      refreshLocalLibrary: () => calls.push("local"),
    });

    expect(calls).toEqual([]);
    finishSteam?.();
    await refresh;

    expect(calls).toEqual(["steam", "status", "local"]);
  });

  it("still rescans locally when the Steam refresh fails", async () => {
    const refreshLocalLibrary = vi.fn();
    await refreshLibrarySources({
      steamConnected: true,
      refreshSteamOwned: () => Promise.reject(new Error("offline")),
      refreshSteamStatus: vi.fn(),
      refreshLocalLibrary,
    });

    expect(refreshLocalLibrary).toHaveBeenCalledOnce();
  });

  it("skips the remote request when Steam is disconnected", async () => {
    const refreshSteamOwned = vi.fn();
    const refreshLocalLibrary = vi.fn();
    await refreshLibrarySources({
      steamConnected: false,
      refreshSteamOwned,
      refreshSteamStatus: vi.fn(),
      refreshLocalLibrary,
    });

    expect(refreshSteamOwned).not.toHaveBeenCalled();
    expect(refreshLocalLibrary).toHaveBeenCalledOnce();
  });
});
