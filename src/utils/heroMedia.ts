const mediaBase = (url?: string | null) => (url || "").split("?")[0].toLowerCase();

/** Steam hero banner ratio. 3840×1240 is the 4K-width version of 1920×620. */
export const HERO_UPLOAD_MAX_WIDTH = 3840;
export const HERO_UPLOAD_ASPECT = 1920 / 620;

export interface HeroFrameStyle {
  position: "absolute";
  inset?: 0;
  top?: 0;
  left?: 0;
  width?: string;
  height?: string;
  transform?: string;
  transformOrigin?: "top left";
}

/**
 * UI scale above 1 lays the app out smaller and bitmap-scales it up, which
 * softens hero art on 4K. Draw the media at the visual size, then counter-scale
 * so the root transform lands on native pixels. Scale at or below 1 already
 * supersamples, so leave that path alone.
 */
export function nativeHeroFrameStyle(uiScale: number): HeroFrameStyle {
  if (!(uiScale > 1)) return { position: "absolute", inset: 0 };
  return {
    position: "absolute",
    top: 0,
    left: 0,
    width: `${uiScale * 100}%`,
    height: `${uiScale * 100}%`,
    transform: `scale(${1 / uiScale})`,
    transformOrigin: "top left",
  };
}

/** Center-crop size for an uploaded hero. Never upscales, and caps width at 4K. */
export function heroUploadSize(sourceWidth: number, sourceHeight: number): { width: number; height: number } {
  const safeWidth = Math.max(1, sourceWidth);
  const safeHeight = Math.max(1, sourceHeight);
  const fittedWidth = Math.min(safeWidth, safeHeight * HERO_UPLOAD_ASPECT);
  const width = Math.max(1, Math.round(Math.min(HERO_UPLOAD_MAX_WIDTH, fittedWidth)));
  const height = Math.max(1, Math.round(width / HERO_UPLOAD_ASPECT));
  return { width, height };
}

/** Cover-fallback blur is specified in the media box. Enlarge it with the native frame so the on-screen radius stays put. */
export function heroFallbackBlurPx(basePx: number, uiScale: number): number {
  return basePx * (uiScale > 1 ? uiScale : 1);
}

export function isHeroVideoUrl(url?: string | null): boolean {
  return /\.(webm|mp4)$/i.test(mediaBase(url));
}

export function isAnimatedImageUrl(url?: string | null): boolean {
  return /\.(gif|webp)$/i.test(mediaBase(url));
}

export function isAnimatedMediaUrl(url?: string | null): boolean {
  return isHeroVideoUrl(url) || isAnimatedImageUrl(url);
}

/** True only when Animated mode has a real video URL to play. Missing URLs must not hide static art. */
export function isHeroVideoLayer(heroType: string, animatedUrl?: string | null): boolean {
  return heroType === "animated" && !!animatedUrl && !isAnimatedImageUrl(animatedUrl);
}

/** Custom mode is per game. Anything other than an explicit animated choice stays static. */
export function resolveHeroType(mode?: string | null, customType?: string | null): "static" | "animated" {
  if (mode === "static") return "static";
  if (mode === "animated") return "animated";
  return customType === "animated" ? "animated" : "static";
}
