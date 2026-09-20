import { describe, expect, it } from "vitest";
import {
  ACCOUNT_DIALOG_Z,
  ONBOARDING_BENEATH_ACCOUNT_Z,
  ONBOARDING_OVERLAY_Z,
} from "./modalStyles";

describe("account dialog stacking", () => {
  it("keeps Steam/Microsoft/Spotify connect dialogs above first-run setup", () => {
    expect(ACCOUNT_DIALOG_Z).toBeGreaterThan(ONBOARDING_OVERLAY_Z);
    expect(ONBOARDING_BENEATH_ACCOUNT_Z).toBeLessThan(ONBOARDING_OVERLAY_Z);
    expect(ONBOARDING_BENEATH_ACCOUNT_Z).toBeLessThan(ACCOUNT_DIALOG_Z);
  });
});
