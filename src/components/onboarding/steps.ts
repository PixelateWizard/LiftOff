import { ACCENTS, LANGUAGE_OPTIONS, LOFI_SCENE_OPTIONS, LOFI_SCENE_PICKER_COLS, SURFACE_STYLE_OPTIONS, THEME_LOCKED_SETTINGS, THEME_OPTIONS, normalizeThemeKey } from "../../constants";

export type StepKey =
  | "welcome"
  | "theme"
  | "lofi_scene"
  | "accent"
  | "surface"
  | "home"
  | "visual"
  | "sources"
  | "accounts"
  | "essentials"
  | "done";

export const STEP_ORDER: StepKey[] = [
  "welcome",
  "theme",
  "lofi_scene",
  "accent",
  "surface",
  "home",
  "visual",
  "sources",
  "accounts",
  "essentials",
  "done",
];

export const PROGRESS_STEPS: StepKey[] = [
  "theme",
  "lofi_scene",
  "accent",
  "surface",
  "home",
  "visual",
  "sources",
  "accounts",
  "essentials",
];

export { LANGUAGE_OPTIONS } from "../../constants";
export const THEME_ITEMS = [...THEME_OPTIONS];
export const ACCENT_ITEMS = Object.keys(ACCENTS);
export const SURFACE_ITEMS = [...SURFACE_STYLE_OPTIONS];

export const SOURCE_ROWS = [
  { key: "scan_steam", labelKey: "settings.scanSteam" },
  { key: "scan_xbox", labelKey: "settings.scanXbox" },
  { key: "scan_epic", labelKey: "settings.scanEpic" },
  { key: "scan_gog", labelKey: "settings.scanGog" },
  { key: "scan_battlenet", labelKey: "settings.scanBattlenet" },
  { key: "scan_uwp", labelKey: "settings.scanStoreApps" },
  { key: "scan_desktop", labelKey: "settings.scanDesktop" },
] as const;

export type AccountKey = "steam" | "microsoft" | "spotify";

export const ACCOUNT_ROWS: Array<{ key: AccountKey; labelKey: string; hintKey: string }> = [
  { key: "steam", labelKey: "steam.title", hintKey: "steam.connectHint" },
  { key: "microsoft", labelKey: "xbox.title", hintKey: "xbox.connectHint" },
  { key: "spotify", labelKey: "spotify.title", hintKey: "onboarding.accounts.spotifyHint" },
];
export type HomeModeOption = "semi" | "immersive" | "normal";

export const HOME_MODE_OPTIONS: readonly HomeModeOption[] = ["semi", "immersive", "normal"];

export type HomeRow =
  | { key: "show_immersive_hero_art"; kind: "toggle"; labelKey: string };

export const HOME_ROWS: HomeRow[] = [
  { key: "show_immersive_hero_art", kind: "toggle", labelKey: "settings.showGameHeroBanner" },
];

export const HOME_BANNER_INDEX = HOME_MODE_OPTIONS.length;

export function homeModeCardIndex(mode: string): number {
  const index = HOME_MODE_OPTIONS.indexOf(mode as HomeModeOption);
  return index >= 0 ? index : 0;
}

export type TabIconModeOption = "text" | "icons" | "both";

export const TAB_ICON_OPTIONS: readonly TabIconModeOption[] = ["text", "icons", "both"];

export type VisualRow =
  | { key: "topbar_background" | "tabbar_with_background"; kind: "toggle"; labelKey: string }
  | { key: "nav_bumpers_top"; kind: "bumper_top"; labelKey: string }
  | { key: "tabbar_triggers"; kind: "trigger_tabbar"; labelKey: string };

export const VISUAL_ROWS: VisualRow[] = [
  { key: "topbar_background", kind: "toggle", labelKey: "settings.topbarBackground" },
  { key: "tabbar_with_background", kind: "toggle", labelKey: "settings.tabbarBackground" },
  { key: "nav_bumpers_top", kind: "bumper_top", labelKey: "settings.topbarShowBumpers" },
  { key: "tabbar_triggers", kind: "trigger_tabbar", labelKey: "settings.tabbarShowTriggers" },
];

export const VISUAL_ROWS_INDEX = TAB_ICON_OPTIONS.length;

export function tabIconModeCardIndex(mode: string): number {
  const index = TAB_ICON_OPTIONS.indexOf(mode as TabIconModeOption);
  return index >= 0 ? index : 0;
}

export function visualTopBumpersOn(pos: string | undefined): boolean {
  return pos === "header";
}

export function visualTabbarTriggersOn(pos: string | undefined): boolean {
  return pos === "tabbar";
}

export type EssentialRow =
  | { key: "default_tab"; kind: "cycle"; labelKey: string; options: readonly string[] }
  | { key: "hide_on_launch" | "launch_at_startup" | "haptic_feedback"; kind: "toggle"; labelKey: string };

export const ESSENTIAL_ROWS: EssentialRow[] = [
  { key: "default_tab", kind: "cycle", labelKey: "settings.defaultTab", options: ["Home", "Games", "Apps"] },
  { key: "hide_on_launch", kind: "toggle", labelKey: "settings.hideOnLaunch" },
  { key: "launch_at_startup", kind: "toggle", labelKey: "settings.launchAtStartup" },
  { key: "haptic_feedback", kind: "toggle", labelKey: "settings.hapticFeedback" },
];

export function stepCols(step: StepKey): number {
  switch (step) {
    case "welcome": return LANGUAGE_OPTIONS.length;
    case "theme": return 4;
    case "lofi_scene": return LOFI_SCENE_PICKER_COLS;
    case "accent": return 6;
    case "surface": return 4;
    case "home": return HOME_MODE_OPTIONS.length;
    case "visual": return TAB_ICON_OPTIONS.length;
    default: return 1;
  }
}

export function stepCount(step: StepKey): number {
  switch (step) {
    case "welcome": return LANGUAGE_OPTIONS.length;
    case "theme": return THEME_ITEMS.length;
    case "lofi_scene": return LOFI_SCENE_OPTIONS.length + 1;
    case "accent": return ACCENT_ITEMS.length;
    case "surface": return SURFACE_ITEMS.length;
    case "home": return HOME_MODE_OPTIONS.length + HOME_ROWS.length;
    case "visual": return TAB_ICON_OPTIONS.length + VISUAL_ROWS.length;
    case "sources": return SOURCE_ROWS.length;
    case "accounts": return ACCOUNT_ROWS.length;
    case "essentials": return ESSENTIAL_ROWS.length;
    default: return 0;
  }
}

export const LOFI_MUSIC_INDEX = LOFI_SCENE_OPTIONS.length;

export function isSingleSelect(step: StepKey): boolean {
  return step === "welcome" || step === "theme" || step === "accent" || step === "surface";
}

export function shouldPreviewFocusedValue(step: StepKey, index: number): boolean {
  return isSingleSelect(step) || (step === "home" && index < HOME_MODE_OPTIONS.length);
}

export function shouldSkipOnboardingStep(step: StepKey, theme?: string): boolean {
  const key = normalizeThemeKey(String(theme ?? ""));
  if (step === "surface") return Boolean(THEME_LOCKED_SETTINGS[key]?.surface_style);
  if (step === "lofi_scene") return key !== "lofi";
  return false;
}

export function visibleProgressSteps(theme?: string): StepKey[] {
  return PROGRESS_STEPS.filter((step) => step !== "lofi_scene" || !shouldSkipOnboardingStep("lofi_scene", theme));
}
