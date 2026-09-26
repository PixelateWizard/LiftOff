const mediaBase = (url?: string | null) => (url || "").split("?")[0].toLowerCase();

/** Largest hero still we keep. Bigger files are scaled down; smaller ones are not enlarged. */
export const HERO_UPLOAD_MAX_WIDTH = 3840;
export const HERO_UPLOAD_MAX_HEIGHT = 2160;

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
 * Fallback for heroes that stay inside the scaled root (rounded Legacy cards
 * and UI scale at or below 1). Full-bleed heroes are portaled instead: a
 * counter-scale here is still resampled by the root transform.
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

/** Fit an upload inside 3840×2160. The picture's own shape is kept, and it is never enlarged. */
export function heroUploadSize(sourceWidth: number, sourceHeight: number): { width: number; height: number } {
  const safeWidth = Math.max(1, sourceWidth);
  const safeHeight = Math.max(1, sourceHeight);
  const scale = Math.min(1, HERO_UPLOAD_MAX_WIDTH / safeWidth, HERO_UPLOAD_MAX_HEIGHT / safeHeight);
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  };
}

/**
 * Where a hero still sits inside the on-screen frame, in the same pixel space
 * as that frame. A picture large enough to fill the frame is covered. A smaller
 * one stays at its own pixels, top-aligned, so a 4K TV does not stretch it.
 */
export function heroSharpFrame(
  sourceWidth: number,
  sourceHeight: number,
  frameWidth: number,
  frameHeight: number,
): { x: number; y: number; width: number; height: number } {
  const srcW = Math.max(1, sourceWidth);
  const srcH = Math.max(1, sourceHeight);
  const frameW = Math.max(1, frameWidth);
  const frameH = Math.max(1, frameHeight);
  const cover = Math.max(frameW / srcW, frameH / srcH);
  if (cover <= 1) return { x: 0, y: 0, width: frameW, height: frameH };
  const scale = Math.min(1, frameW / srcW, frameH / srcH);
  const width = Math.round(srcW * scale);
  const height = Math.round(srcH * scale);
  return { x: Math.round((frameW - width) / 2), y: 0, width, height };
}

/** Cover-fallback blur is specified in the media box. Enlarge it with the native frame so the on-screen radius stays put. */
export function heroFallbackBlurPx(basePx: number, uiScale: number): number {
  return basePx * (uiScale > 1 ? uiScale : 1);
}

export interface HeroBackdropHole {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * CSS variables that punch the hero's layout rectangle out of the scaled
 * theme background. The hero image itself is painted outside that scale.
 * An empty hole restores the full background.
 */
export function heroBackdropMaskVars(hole: HeroBackdropHole | null): Record<string, string> {
  if (!hole || hole.width <= 1 || hole.height <= 1) {
    return {
      "--liftoff-hole-image": "none",
      "--liftoff-hole-size": "auto",
      "--liftoff-hole-position": "0px 0px",
      "--liftoff-hole-repeat": "no-repeat",
      "--liftoff-hole-composite": "add",
    };
  }
  const x = Math.round(hole.x * 100) / 100;
  const y = Math.round(hole.y * 100) / 100;
  const width = Math.round(hole.width * 100) / 100;
  const height = Math.round(hole.height * 100) / 100;
  return {
    "--liftoff-hole-image": "linear-gradient(#000,#000), linear-gradient(#000,#000)",
    "--liftoff-hole-size": `100% 100%, ${width}px ${height}px`,
    "--liftoff-hole-position": `0px 0px, ${x}px ${y}px`,
    "--liftoff-hole-repeat": "no-repeat, no-repeat",
    "--liftoff-hole-composite": "exclude",
  };
}

export function applyHeroBackdropMask(hole: HeroBackdropHole | null) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(heroBackdropMaskVars(hole))) {
    root.style.setProperty(key, value);
  }
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
