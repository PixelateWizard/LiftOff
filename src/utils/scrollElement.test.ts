import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RAPID_SMOOTH_MS,
  RETARGET_SCROLL_MS,
  scrollElementTo,
  scrollElementToRetargeted,
} from "./scrollElement";

function mockScroller(scrollTop: number, size?: { scrollHeight: number; clientHeight: number }) {
  return {
    scrollTop,
    scrollHeight: size?.scrollHeight,
    clientHeight: size?.clientHeight,
    scrollTo: vi.fn(function scrollTo(this: { scrollTop: number }, options: ScrollToOptions) {
      if (typeof options.top === "number") this.scrollTop = options.top;
    }),
  };
}

function mockAnimationFrames() {
  let nextId = 1;
  const callbacks = new Map<number, FrameRequestCallback>();
  vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
    const id = nextId++;
    callbacks.set(id, callback);
    return id;
  }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn((id: number) => {
    callbacks.delete(id);
  }));
  return {
    runAt(now: number) {
      const pending = [...callbacks.values()];
      callbacks.clear();
      pending.forEach(callback => callback(now));
    },
  };
}

describe("scrollElementTo", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it("does not call scrollTo when the delta is within the skip threshold", () => {
    const el = mockScroller(120);
    expect(scrollElementTo(el, 120.4, "smooth")).toBe(false);
    expect(el.scrollTo).not.toHaveBeenCalled();
  });

  it("uses native smooth scrollTo for an isolated discrete move", () => {
    const el = mockScroller(0);
    expect(scrollElementTo(el, 240, "smooth")).toBe(true);
    expect(el.scrollTo).toHaveBeenCalledWith({ top: 240, behavior: "smooth" });
  });

  it("does not restart a smooth animation already aimed at the same destination", () => {
    const el = mockScroller(0);
    expect(scrollElementTo(el, 240, "smooth")).toBe(true);
    el.scrollTop = 80;
    el.scrollTo.mockClear();
    expect(scrollElementTo(el, 241, "smooth")).toBe(false);
    expect(el.scrollTo).not.toHaveBeenCalled();
  });

  it("demotes a quick follow-up discrete move to auto so smooth animations cannot stack", () => {
    vi.spyOn(performance, "now").mockReturnValue(1000);
    const el = mockScroller(0);
    expect(scrollElementTo(el, 120, "smooth")).toBe(true);
    el.scrollTo.mockClear();
    vi.spyOn(performance, "now").mockReturnValue(1000 + RAPID_SMOOTH_MS - 10);
    expect(scrollElementTo(el, 240, "smooth")).toBe(true);
    expect(el.scrollTo).toHaveBeenCalledWith({ top: 240, behavior: "auto" });
  });

  it("keeps smooth after the rapid window so a later isolated tap still eases", () => {
    vi.spyOn(performance, "now").mockReturnValue(2000);
    const el = mockScroller(0);
    expect(scrollElementTo(el, 120, "smooth")).toBe(true);
    el.scrollTo.mockClear();
    vi.spyOn(performance, "now").mockReturnValue(2000 + RAPID_SMOOTH_MS + 20);
    expect(scrollElementTo(el, 240, "smooth")).toBe(true);
    expect(el.scrollTo).toHaveBeenCalledWith({ top: 240, behavior: "smooth" });
  });

  it("jumps immediately for auto behavior", () => {
    const el = mockScroller(0);
    expect(scrollElementTo(el, 240, "auto")).toBe(true);
    expect(el.scrollTo).toHaveBeenCalledWith({ top: 240, behavior: "auto" });
  });

  it("clamps past the max scroll offset", () => {
    const el = mockScroller(0, { scrollHeight: 500, clientHeight: 400 });
    expect(scrollElementTo(el, 999, "auto")).toBe(true);
    expect(el.scrollTo).toHaveBeenCalledWith({ top: 100, behavior: "auto" });
  });

  it("clamps negative destinations to zero", () => {
    const el = mockScroller(40);
    expect(scrollElementTo(el, -12, "auto")).toBe(true);
    expect(el.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
  });
});

describe("scrollElementToRetargeted", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("uses a short monotonic animation for a discrete move", () => {
    const frames = mockAnimationFrames();
    vi.spyOn(performance, "now").mockReturnValue(0);
    const el = mockScroller(0);

    expect(scrollElementToRetargeted(el, 240, "smooth")).toBe(true);
    expect(el.scrollTo).not.toHaveBeenCalled();

    frames.runAt(RETARGET_SCROLL_MS / 2);
    expect(el.scrollTop).toBe(210);
    expect(el.scrollTo).toHaveBeenLastCalledWith({ top: 210, behavior: "auto" });

    frames.runAt(RETARGET_SCROLL_MS);
    expect(el.scrollTop).toBe(240);
  });

  it("retargets quick taps from the current position without snapping", () => {
    const frames = mockAnimationFrames();
    const now = vi.spyOn(performance, "now").mockReturnValue(0);
    const el = mockScroller(0);

    scrollElementToRetargeted(el, 120, "smooth");
    frames.runAt(RETARGET_SCROLL_MS / 2);
    expect(el.scrollTop).toBe(105);

    now.mockReturnValue(RETARGET_SCROLL_MS / 2);
    const callsBeforeRetarget = el.scrollTo.mock.calls.length;
    expect(scrollElementToRetargeted(el, 240, "smooth")).toBe(true);
    expect(el.scrollTo).toHaveBeenCalledTimes(callsBeforeRetarget);

    frames.runAt(RETARGET_SCROLL_MS);
    expect(el.scrollTop).toBeGreaterThan(105);
    expect(el.scrollTop).toBeLessThan(240);
    frames.runAt(RETARGET_SCROLL_MS * 1.5);
    expect(el.scrollTop).toBe(240);
  });

  it("cancels tap motion and snaps when held repeat starts", () => {
    const frames = mockAnimationFrames();
    vi.spyOn(performance, "now").mockReturnValue(0);
    const el = mockScroller(0);

    scrollElementToRetargeted(el, 120, "smooth");
    frames.runAt(60);
    expect(scrollElementToRetargeted(el, 300, "auto")).toBe(true);
    expect(el.scrollTop).toBe(300);
    const callsAfterSnap = el.scrollTo.mock.calls.length;

    frames.runAt(RETARGET_SCROLL_MS);
    expect(el.scrollTo).toHaveBeenCalledTimes(callsAfterSnap);
  });

  it("does not restart motion already aimed at the same destination", () => {
    mockAnimationFrames();
    vi.spyOn(performance, "now").mockReturnValue(0);
    const el = mockScroller(0);

    expect(scrollElementToRetargeted(el, 240, "smooth")).toBe(true);
    expect(scrollElementToRetargeted(el, 241, "smooth")).toBe(false);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
  });
});
