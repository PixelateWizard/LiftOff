import { describe, expect, it } from "vitest";
import type { DriveStorageInfo } from "../types";
import { getInstallSpaceVerdict, XBOX_INSTALL_HEADROOM_BYTES } from "./installStorage";

const drive = (freeBytes: number): DriveStorageInfo => ({
  mountPoint: "C:\\",
  label: "Windows",
  totalBytes: 2_000_000_000,
  freeBytes,
  driveKind: "fixed",
  isDefaultInstallDrive: true,
});

describe("install storage verdict", () => {
  it("fails open when size or storage data is unavailable", () => {
    expect(getInstallSpaceVerdict(null, drive(1_000_000_000))).toBe("unknown");
    expect(getInstallSpaceVerdict(100_000_000, null)).toBe("unknown");
  });

  it("requires the reported size plus staging headroom", () => {
    const size = 100_000_000;
    expect(getInstallSpaceVerdict(size, drive(size + XBOX_INSTALL_HEADROOM_BYTES))).toBe("enough");
    expect(getInstallSpaceVerdict(size, drive(size + XBOX_INSTALL_HEADROOM_BYTES - 1))).toBe("insufficient");
  });
});
