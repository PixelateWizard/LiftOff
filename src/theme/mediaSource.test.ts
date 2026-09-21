import { afterEach, describe, expect, it, vi } from "vitest";

const { invoke, convertFileSrc } = vi.hoisted(() => ({
  invoke: vi.fn(async (_cmd: string, args: { name: string }) => `C:\\LiftOff\\media\\lofi\\${args.name}`),
  convertFileSrc: vi.fn((path: string) => `asset://localhost/${path}`),
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke, convertFileSrc }));

import { resolveLofiMediaUrl } from "./mediaSource";

describe("resolveLofiMediaUrl", () => {
  afterEach(() => {
    invoke.mockClear();
    convertFileSrc.mockClear();
  });

  it("returns data and blob URLs unchanged", async () => {
    await expect(resolveLofiMediaUrl("data:image/webp;base64,abc")).resolves.toBe("data:image/webp;base64,abc");
    await expect(resolveLofiMediaUrl("blob:http://localhost/1")).resolves.toBe("blob:http://localhost/1");
    expect(invoke).not.toHaveBeenCalled();
  });

  it("copies bundled media into app data and returns an asset URL", async () => {
    await expect(resolveLofiMediaUrl("lofi_dog.mp4")).resolves.toBe("asset://localhost/C:\\LiftOff\\media\\lofi\\lofi_dog.mp4");
    expect(invoke).toHaveBeenCalledWith("ensure_lofi_media", { name: "lofi_dog.mp4" });
    await expect(resolveLofiMediaUrl("lofi_dog.mp4")).resolves.toBe("asset://localhost/C:\\LiftOff\\media\\lofi\\lofi_dog.mp4");
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});
