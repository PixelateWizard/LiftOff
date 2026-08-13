import { describe, expect, it } from "vitest";
import type { App } from "../types";
import { xboxPackageFamilyNameFor } from "./xboxProductId";

function app(source: string, id: string) {
  return { source, id } as App;
}

describe("xboxPackageFamilyNameFor", () => {
  it.each(["xbox", "uwp", "XBOX"])("extracts the package family name for %s entries", (source) => {
    expect(xboxPackageFamilyNameFor(app(source, "Studio.Game_123abc!Game")))
      .toBe("Studio.Game_123abc");
  });

  it("rejects owned catalog IDs and unrelated sources", () => {
    expect(xboxPackageFamilyNameFor(app("xbox", "xbox-owned:12345"))).toBeNull();
    expect(xboxPackageFamilyNameFor(app("steam", "Studio.Game_123abc!Game"))).toBeNull();
  });
});
