import { describe, expect, it } from "vitest";
import { resolveSplashStatusKey } from "./splashStatus";

describe("resolveSplashStatusKey", () => {
  it("prefers live scan-phase copy until the phase goes stale", () => {
    expect(resolveSplashStatusKey("desktop", false, false, 0)).toBe("splash.status.scanDesktop");
    expect(resolveSplashStatusKey("desktop", true, false, 0)).toBe("splash.status.stillWorking");
    expect(resolveSplashStatusKey("steam", false, true, 4)).toBe("splash.status.stillWorking");
  });

  it("falls back to rotating splash phrases when no phase has arrived", () => {
    expect(resolveSplashStatusKey(null, false, false, 0)).toBe("splash.status.starting");
    expect(resolveSplashStatusKey(null, false, false, 4)).toBe("splash.status.almostReady");
  });
});
