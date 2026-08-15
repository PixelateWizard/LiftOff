import { describe, expect, it } from "vitest";
import { formatBytes } from "./formatBytes";

describe("formatBytes", () => {
  it("keeps existing Details size formatting", () => {
    expect(formatBytes(512 * 1024 * 1024)).toBe("512 MB");
    expect(formatBytes(78.5 * 1024 * 1024 * 1024)).toBe("79 GB");
    expect(formatBytes(1.5 * 1024 * 1024 * 1024)).toBe("1.5 GB");
  });
});
