import { describe, expect, it } from "vitest";
import { resolveStoppedPlayback, type SpotifyTrack } from "./useSpotify";

const track = (overrides: Partial<SpotifyTrack> = {}): SpotifyTrack => ({
  id: "track-1",
  title: "Night Drive",
  artist: "LiftOff",
  durationMs: 180000,
  progressMs: 12000,
  isPlaying: false,
  shuffle: false,
  repeat: "off",
  ...overrides,
});

describe("resolveStoppedPlayback", () => {
  it("keeps paused now-playing when the user has not stopped", () => {
    const paused = track();
    expect(resolveStoppedPlayback(paused, false)).toEqual({ track: paused, stopped: false });
  });

  it("hides leftover paused playback after stop", () => {
    expect(resolveStoppedPlayback(track(), true)).toEqual({ track: null, stopped: true });
    expect(resolveStoppedPlayback(null, true)).toEqual({ track: null, stopped: true });
  });

  it("clears the stopped session when Spotify starts playing again", () => {
    const playing = track({ isPlaying: true });
    expect(resolveStoppedPlayback(playing, true)).toEqual({ track: playing, stopped: false });
  });
});
