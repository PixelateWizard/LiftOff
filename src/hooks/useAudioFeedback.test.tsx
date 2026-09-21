import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAudioFeedback } from "./useAudioFeedback";

class FakeBufferSource {
  buffer: AudioBuffer | null = null;
  detune = { value: 0 };
  started = false;
  connect() { return this; }
  start() { this.started = true; }
}

class FakeAudioContext {
  state: AudioContextState = "suspended";
  destination = {};
  sources: FakeBufferSource[] = [];
  async resume() { this.state = "running"; }
  async decodeAudioData() { return { duration: 1 } as AudioBuffer; }
  createBufferSource() {
    const source = new FakeBufferSource();
    this.sources.push(source);
    return source as unknown as AudioBufferSourceNode;
  }
  createGain() {
    return { gain: { value: 1 }, connect() { return this; } } as unknown as GainNode;
  }
  createBiquadFilter() {
    return { type: "lowpass", frequency: { value: 0 }, connect() { return this; } } as unknown as BiquadFilterNode;
  }
}

let ctx: FakeAudioContext;
let root: Root;
let host: HTMLDivElement;
let playAppLoadedSound: () => void;

function Harness() {
  const audio = useAudioFeedback();
  playAppLoadedSound = audio.playAppLoadedSound;
  return null;
}

beforeEach(() => {
  ctx = undefined as unknown as FakeAudioContext;
  vi.stubGlobal("AudioContext", class extends FakeAudioContext {
    constructor() {
      super();
      ctx = this;
    }
  });
  vi.stubGlobal("fetch", async () => new Response(new ArrayBuffer(8)));
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe("useAudioFeedback", () => {
  it("plays a queued splash-complete cue after the buffer decodes and the context resumes", async () => {
    act(() => root.render(<Harness />));
    act(() => playAppLoadedSound());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(ctx).toBeTruthy();
    expect(ctx.state).toBe("running");
    expect(ctx.sources.some((source) => source.started)).toBe(true);
  });
});
