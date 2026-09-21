import { describe, expect, it } from "vitest";
import { LOFI_SCENE_OPTIONS } from "../constants";
import { LOFI_MUSIC_FILE, LOFI_SCENE_FILES, LOFI_SCENE_POSTERS, lofiSceneFile, lofiScenePoster, resolveLofiScene } from "./lofiScenes";

describe("resolveLofiScene", () => {
  it("keeps known scenes and falls unknown values back to cozy", () => {
    for (const scene of LOFI_SCENE_OPTIONS) {
      expect(resolveLofiScene(scene)).toBe(scene);
    }
    expect(resolveLofiScene("study")).toBe("cozy");
    expect(resolveLofiScene("unknown")).toBe("cozy");
    expect(resolveLofiScene(undefined)).toBe("cozy");
  });

  it("maps scenes to bundled media filenames", () => {
    expect(lofiSceneFile("dog")).toBe(LOFI_SCENE_FILES.dog);
    expect(lofiSceneFile("study")).toBe(LOFI_SCENE_FILES.cozy);
    expect(LOFI_MUSIC_FILE.endsWith(".mp3")).toBe(true);
  });

  it("inlines scene posters as data URLs", () => {
    for (const scene of LOFI_SCENE_OPTIONS) {
      expect(LOFI_SCENE_POSTERS[scene].startsWith("data:image/")).toBe(true);
      expect(lofiScenePoster(scene)).toBe(LOFI_SCENE_POSTERS[scene]);
    }
  });
});
