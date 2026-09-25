import { describe, expect, it } from "vitest";
import { heroFallbackBlurPx, heroUploadSize, isAnimatedImageUrl, isHeroVideoLayer, isHeroVideoUrl, nativeHeroFrameStyle, resolveHeroType } from "./heroMedia";

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

  it("saves a 4K upload at 3840 wide without upscaling a 1080p source", () => {
    expect(heroUploadSize(3840, 2160)).toEqual({ width: 3840, height: 1240 });
    expect(heroUploadSize(1920, 1080)).toEqual({ width: 1920, height: 620 });
    expect(heroUploadSize(7680, 4320)).toEqual({ width: 3840, height: 1240 });
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
