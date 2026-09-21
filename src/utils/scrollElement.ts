export type ScrollableElement = {
  scrollTop: number;
  scrollHeight?: number;
  clientHeight?: number;
  scrollTo: (options: ScrollToOptions) => void;
};

const lastTop = new WeakMap<object, number>();
const lastScrollAt = new WeakMap<object, number>();
const activeAnimations = new WeakMap<object, {
  frame: number;
  startTop: number;
  targetTop: number;
  startAt: number;
}>();

/** If a second discrete move arrives inside this window, use auto instead of stacking native smooth. */
export const RAPID_SMOOTH_MS = 350;
export const RETARGET_SCROLL_MS = 180;

function clampTop(el: ScrollableElement, top: number): number {
  const max = typeof el.scrollHeight === "number" && typeof el.clientHeight === "number"
    ? Math.max(0, el.scrollHeight - el.clientHeight)
    : Number.POSITIVE_INFINITY;
  return Math.max(0, Math.min(top, max));
}

/**
 * Native scrollTo with bounce guards: clamp to the scroll range, skip tiny
 * corrections, do not restart a smooth animation aimed at the same destination,
 * and demote overlapping discrete smooth moves to auto so Chromium cannot
 * rubber-band.
 */
export function scrollElementTo(
  el: ScrollableElement | null | undefined,
  top: number,
  behavior: ScrollBehavior = "auto",
  minDelta = 1,
): boolean {
  if (!el) return false;
  const next = clampTop(el, top);
  if (Math.abs(next - el.scrollTop) <= minDelta) return false;
  const now = performance.now();
  let resolved = behavior;
  if (behavior === "smooth") {
    const prev = lastTop.get(el);
    if (prev != null && Math.abs(prev - next) <= minDelta) return false;
    const prevAt = lastScrollAt.get(el);
    if (prevAt != null && now - prevAt < RAPID_SMOOTH_MS) resolved = "auto";
  }
  lastTop.set(el, next);
  lastScrollAt.set(el, now);
  el.scrollTo({ top: next, behavior: resolved });
  return true;
}

function cancelRetargetedScroll(el: ScrollableElement): void {
  const active = activeAnimations.get(el);
  if (!active) return;
  cancelAnimationFrame(active.frame);
  activeAnimations.delete(el);
}

/**
 * Monotonic vertical scroll for controller taps. A new tap retargets from the
 * current position instead of stacking Chromium smooth-scroll animations.
 * Auto behavior cancels the tween and snaps immediately for held repeat.
 */
export function scrollElementToRetargeted(
  el: ScrollableElement | null | undefined,
  top: number,
  behavior: ScrollBehavior = "auto",
  minDelta = 1,
): boolean {
  if (!el) return false;
  const next = clampTop(el, top);
  const active = activeAnimations.get(el);

  if (behavior !== "smooth") {
    cancelRetargetedScroll(el);
    if (Math.abs(next - el.scrollTop) <= minDelta) return false;
    el.scrollTo({ top: next, behavior: "auto" });
    return true;
  }

  if (active && Math.abs(active.targetTop - next) <= minDelta) return false;
  if (Math.abs(next - el.scrollTop) <= minDelta) {
    cancelRetargetedScroll(el);
    return false;
  }

  cancelRetargetedScroll(el);
  const animation = {
    frame: 0,
    startTop: el.scrollTop,
    targetTop: next,
    startAt: performance.now(),
  };
  const tick = (now: number) => {
    if (activeAnimations.get(el) !== animation) return;
    const progress = Math.min(1, Math.max(0, (now - animation.startAt) / RETARGET_SCROLL_MS));
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = animation.startTop + (animation.targetTop - animation.startTop) * eased;
    el.scrollTo({ top: progress >= 1 ? animation.targetTop : current, behavior: "auto" });
    if (progress >= 1) {
      activeAnimations.delete(el);
      return;
    }
    animation.frame = requestAnimationFrame(tick);
  };
  animation.frame = requestAnimationFrame(tick);
  activeAnimations.set(el, animation);
  return true;
}
