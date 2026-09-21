import { describe, expect, it } from "vitest";
import { HOME_MODE_PREVIEWS, TAB_ICON_PREVIEWS } from "./previews";

describe("onboarding previews", () => {
  it("inlines Home and tab stills as data URLs", () => {
    expect(HOME_MODE_PREVIEWS.semi).toMatch(/^data:image\/jpeg/);
    expect(HOME_MODE_PREVIEWS.immersive).toMatch(/^data:image\/jpeg/);
    expect(HOME_MODE_PREVIEWS.normal).toMatch(/^data:image\/jpeg/);
    expect(TAB_ICON_PREVIEWS.text).toMatch(/^data:image\/png/);
    expect(TAB_ICON_PREVIEWS.icons).toMatch(/^data:image\/png/);
    expect(TAB_ICON_PREVIEWS.both).toMatch(/^data:image\/png/);
  });
});
