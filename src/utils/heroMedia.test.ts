import { describe, expect, it } from "vitest";
import { applyHeroBackdropMask, heroBackdropMaskVars, heroFallbackBlurPx, heroSharpFrame, heroUploadSize, isAnimatedImageUrl, isHeroVideoLayer, isHeroVideoUrl, nativeHeroFrameStyle, resolveHeroType } from "./heroMedia";

describe("isHeroVideoLayer", () => {
  it("hides static art only when Animated mode has a video URL", () => {
    expect(isHeroVideoLayer("animated", "https://cdn.example/hero.webm")).toBe(true);
    expect(isHeroVideoLayer("animated", "file:///C:/art/hero.mp4")).toBe(true);
  });

  it("keeps static art when Animated mode has no video yet", () => {
    expect(isHeroVideoLayer("animated", undefined)).toBe(false);
    expect(isHeroVideoLayer("animated", "")).toBe(false);
    expect(isHeroVideoLayer("animated", "https://cdn.example/hero.webp")).toBe(false);
    expect(isHeroVideoLayer("static", "https://cdn.example/hero.webm")).toBe(false);
    expect(isHeroVideoLayer("custom", "https://cdn.example/hero.mp4")).toBe(false);
  });
});

describe("resolveHeroType", () => {
  it("keeps a per-game static pick ahead of a leftover animation", () => {
    expect(resolveHeroType("custom", "static")).toBe("static");
    expect(resolveHeroType("custom", undefined)).toBe("static");
    expect(resolveHeroType("custom", "animated")).toBe("animated");
  });

  it("lets the global mode override a per-game choice", () => {
    expect(resolveHeroType("static", "animated")).toBe("static");
    expect(resolveHeroType("animated", "static")).toBe("animated");
  });
});

describe("native hero resolution", () => {
  it("leaves scale at 1 on the normal layout box", () => {
    expect(nativeHeroFrameStyle(1)).toEqual({ position: "absolute", inset: 0 });
    expect(nativeHeroFrameStyle(0.75)).toEqual({ position: "absolute", inset: 0 });
  });

  it("paints above-1 UI scale at the visual size and counter-scales", () => {
    expect(nativeHeroFrameStyle(2)).toEqual({
      position: "absolute",
      top: 0,
      left: 0,
      width: "200%",
      height: "200%",
      transform: "scale(0.5)",
      transformOrigin: "top left",
    });
  });

  it("keeps a 4K upload's own shape and does not enlarge a smaller one", () => {
    expect(heroUploadSize(3840, 2160)).toEqual({ width: 3840, height: 2160 });
    expect(heroUploadSize(1920, 1080)).toEqual({ width: 1920, height: 1080 });
    expect(heroUploadSize(7680, 4320)).toEqual({ width: 3840, height: 2160 });
    expect(heroUploadSize(3840, 1240)).toEqual({ width: 3840, height: 1240 });
  });

  it("fills a 4K frame with a 4K still and leaves a short banner at its own pixels", () => {
    expect(heroSharpFrame(3840, 2160, 3840, 2160)).toEqual({ x: 0, y: 0, width: 3840, height: 2160 });
    expect(heroSharpFrame(7680, 4320, 3840, 2160)).toEqual({ x: 0, y: 0, width: 3840, height: 2160 });
    expect(heroSharpFrame(3840, 1240, 3840, 2160)).toEqual({ x: 0, y: 0, width: 3840, height: 1240 });
    expect(heroSharpFrame(1920, 1080, 3840, 2160)).toEqual({ x: 960, y: 0, width: 1920, height: 1080 });
    expect(heroSharpFrame(3840, 1240, 1920, 1080)).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
  });

  it("punches a layout-sized hole in the theme background and clears it afterwards", () => {
    expect(heroBackdropMaskVars(null)["--liftoff-hole-image"]).toBe("none");
    expect(heroBackdropMaskVars({ x: 10, y: 20, width: 300, height: 180 })["--liftoff-hole-size"]).toBe("100% 100%, 300px 180px");
    expect(heroBackdropMaskVars({ x: 10.126, y: 4, width: 8, height: 9 })["--liftoff-hole-position"]).toBe("0px 0px, 10.13px 4px");
    applyHeroBackdropMask({ x: 1, y: 2, width: 30, height: 40 });
    expect(document.documentElement.style.getPropertyValue("--liftoff-hole-composite")).toBe("exclude");
    applyHeroBackdropMask(null);
    expect(document.documentElement.style.getPropertyValue("--liftoff-hole-image")).toBe("none");
  });

  it("keeps fallback blur visually stable inside the enlarged frame", () => {
    expect(heroFallbackBlurPx(18, 1)).toBe(18);
    expect(heroFallbackBlurPx(18, 2)).toBe(36);
    expect(heroFallbackBlurPx(10, 0.75)).toBe(10);
  });
});

describe("hero media URL helpers", () => {
  it("classifies video and animated-image URLs", () => {
    expect(isHeroVideoUrl("hero.webm?token=1")).toBe(true);
    expect(isAnimatedImageUrl("hero.GIF")).toBe(true);
    expect(isAnimatedImageUrl("hero.jpg")).toBe(false);
  });
});
