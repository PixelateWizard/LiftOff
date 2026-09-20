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
