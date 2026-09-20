import { describe, expect, it } from "vitest";
import { isArtBackfillPending } from "./useArtBackfill";

describe("isArtBackfillPending", () => {
  it("queues installed and uninstalled games that were never attempted", () => {
    expect(isArtBackfillPending({ id: "g1", app_type: "game" }, {}, new Set())).toBe(true);
    expect(isArtBackfillPending({ id: "g2", app_type: "game" }, {}, new Set())).toBe(true);
  });

  it("skips resolved, in-flight, and non-game entries", () => {
    expect(isArtBackfillPending({ id: "g1", app_type: "game" }, { g1: "" }, new Set())).toBe(false);
    expect(isArtBackfillPending({ id: "g1", app_type: "game" }, {}, new Set(["g1"]))).toBe(false);
    expect(isArtBackfillPending({ id: "a1", app_type: "app" }, {}, new Set())).toBe(false);
  });
});
