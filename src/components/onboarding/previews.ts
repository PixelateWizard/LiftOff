import type { HomeModeOption, TabIconModeOption } from "./steps";
import homeNormalPreview from "../../assets/onboarding/home-normal.jpg?inline";
import homeImmersivePreview from "../../assets/onboarding/home-immersive.jpg?inline";
import homeLegacyPreview from "../../assets/onboarding/home-legacy.jpg?inline";
import tabsTextPreview from "../../assets/onboarding/tabs-text.png?inline";
import tabsIconsPreview from "../../assets/onboarding/tabs-icons.png?inline";
import tabsBothPreview from "../../assets/onboarding/tabs-both.png?inline";

export const HOME_MODE_PREVIEWS: Record<HomeModeOption, string> = {
  semi: homeNormalPreview,
  immersive: homeImmersivePreview,
  normal: homeLegacyPreview,
};

export const TAB_ICON_PREVIEWS: Record<TabIconModeOption, string> = {
  text: tabsTextPreview,
  icons: tabsIconsPreview,
  both: tabsBothPreview,
};

export function preloadOnboardingPreviews(): void {
  const urls = [...Object.values(HOME_MODE_PREVIEWS), ...Object.values(TAB_ICON_PREVIEWS)];
  for (const url of urls) {
    const image = new Image();
    image.src = url;
  }
}
