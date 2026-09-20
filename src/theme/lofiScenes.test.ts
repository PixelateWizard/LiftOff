import { describe, expect, it } from "vitest";
import { LOFI_SCENE_OPTIONS } from "../constants";
import { resolveLofiScene } from "./lofiScenes";

describe("resolveLofiScene", () => {
  it("keeps known scenes and falls unknown values back to cozy", () => {
    for (const scene of LOFI_SCENE_OPTIONS) {
      expect(resolveLofiScene(scene)).toBe(scene);
    }
    expect(resolveLofiScene("study")).toBe("cozy");
    expect(resolveLofiScene("unknown")).toBe("cozy");
    expect(resolveLofiScene(undefined)).toBe("cozy");
  });
});
