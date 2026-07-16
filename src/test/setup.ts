import { vi } from "vitest";

Object.defineProperty(navigator, "getGamepads", {
  configurable: true,
  value: vi.fn(() => []),
});
