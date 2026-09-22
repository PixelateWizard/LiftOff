const mediaBase = (url?: string | null) => (url || "").split("?")[0].toLowerCase();

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
