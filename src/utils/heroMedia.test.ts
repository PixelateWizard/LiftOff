import { describe, expect, it } from "vitest";
import { isAnimatedImageUrl, isHeroVideoLayer, isHeroVideoUrl } from "./heroMedia";

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

describe("hero media URL helpers", () => {
  it("classifies video and animated-image URLs", () => {
    expect(isHeroVideoUrl("hero.webm?token=1")).toBe(true);
    expect(isAnimatedImageUrl("hero.GIF")).toBe(true);
    expect(isAnimatedImageUrl("hero.jpg")).toBe(false);
  });
});
