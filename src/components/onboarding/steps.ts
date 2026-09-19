import { ACCENTS, SURFACE_STYLE_OPTIONS, THEME_OPTIONS } from "../../constants";

export type StepKey =
  | "welcome"
  | "theme"
  | "accent"
  | "surface"
  | "home"
  | "sources"
  | "accounts"
  | "essentials"
  | "done";

export const STEP_ORDER: StepKey[] = [
  "welcome",
  "theme",
  "accent",
  "surface",
  "home",
  "sources",
  "accounts",
  "essentials",
  "done",
];

export const PROGRESS_STEPS: StepKey[] = [
  "theme",
  "accent",
  "surface",
  "home",
  "sources",
  "accounts",
  "essentials",
];

export const LANGUAGE_OPTIONS = ["auto", "en", "fr"] as const;
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
export type HomeRow =
  | { key: "home_mode"; kind: "cycle"; labelKey: string; options: readonly string[] }
  | { key: "show_immersive_hero_art"; kind: "toggle"; labelKey: string };

export const HOME_ROWS: HomeRow[] = [
  { key: "home_mode", kind: "cycle", labelKey: "settings.homeMode", options: ["normal", "semi", "immersive"] },
  { key: "show_immersive_hero_art", kind: "toggle", labelKey: "settings.showGameHeroBanner" },
];


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
    case "welcome": return 3;
    case "theme": return 4;
    case "accent": return 6;
    case "surface": return 4;
    default: return 1;
  }
}

export function stepCount(step: StepKey): number {
  switch (step) {
    case "welcome": return LANGUAGE_OPTIONS.length;
    case "theme": return THEME_ITEMS.length;
    case "accent": return ACCENT_ITEMS.length;
    case "surface": return SURFACE_ITEMS.length;
    case "home": return HOME_ROWS.length;
    case "sources": return SOURCE_ROWS.length;
    case "accounts": return ACCOUNT_ROWS.length;
    case "essentials": return ESSENTIAL_ROWS.length;
    default: return 0;
  }
}

export function isSingleSelect(step: StepKey): boolean {
  return step === "welcome" || step === "theme" || step === "accent" || step === "surface";
}
