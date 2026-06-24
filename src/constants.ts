export const COLS = 6;
export const GAME_COLS = 5;
export const TABS = ["Home", "Games", "Apps", "Settings"] as const;
export const APP_VERSION = "2.0.0-alpha-5";
export const GITHUB_REPO = "PixelateWizard/LiftOff";

// Key: `admin_pref_${gameId}`, Value: boolean
export const getRunAsAdmin = (id: string): boolean =>
  JSON.parse(localStorage.getItem(`admin_pref_${id}`) ?? "false");

export const setRunAsAdmin = (id: string, val: boolean): void =>
  localStorage.setItem(`admin_pref_${id}`, JSON.stringify(val));

export type AccentConfig = {
  primary: string; light: string; dark: string; glow: string; lightBg: string; lightPrimary?: string; lightGlow?: string; darkText?: boolean; lightDarkText?: boolean;
};

export const ACCENTS: Record<string, AccentConfig> = {
  ember:    { primary: "#e8714a", lightPrimary: "#e75a2b", light: "#ff9a6c", dark: "#c94f28", glow: "rgba(232,113,74,",  lightBg: "#f5e8e0", darkText: true, lightDarkText: false, },
  ocean:    { primary: "#4a9ee8", lightPrimary: "#438fd1", light: "#9dd0ff", dark: "#2878c9", glow: "rgba(74,158,232,",  lightBg: "#ddeeff", darkText: true, lightDarkText: false,
   },
  neon:     { primary: "#44d62c", lightPrimary: "#1a8a09", light: "#72f550", dark: "#2aa316", glow: "rgba(68,214,44,",  lightBg: "#e0f5d9", darkText: true, lightDarkText: false },
  rose:     { primary: "#E97CA9", lightPrimary: "#da4583", light: "#ff6caa", dark: "#c9286a", glow: "rgba(232,74,138,",  lightBg: "#f5dde8", darkText: true, lightDarkText: false, },
  midnight: { primary: "#8a4ae8", light: "#aa6cff", dark: "#6a28c9", glow: "rgba(138,74,232,",  lightBg: "#e8ddff" },
  nova:      { primary: "#e03030", light: "#ff6060", dark: "#b01010", glow: "rgba(224,48,48,",   lightBg: "#fde8e8", },
  steel:   { primary: "#909090", lightPrimary: "#747474", light: "#c0c0c0", dark: "#606060", glow: "rgba(144,144,144,", lightBg: "#f0f0f0", darkText: true },
  lunar:    { primary: "#dcdcdc", lightPrimary: "#1c1c1c", light: "#f5f5f5", dark: "#a8a8a8", glow: "rgba(220,220,220,", lightGlow: "rgba(28,28,28,", lightBg: "#ececec", darkText: true, lightDarkText: false, },
  atomic:   { primary: "#e8c53a", lightPrimary: "#8a6e00", light: "#f5dc6e", dark: "#c4a020", glow: "rgba(232,197,58,",  lightBg: "#f5f0d0", darkText: true, lightDarkText: false },
  aqua:     { primary: "#2ecfcf", lightPrimary: "#0a8a8a", light: "#6ee8e8", dark: "#18a8a8", glow: "rgba(46,207,207,",  lightBg: "#d6f5f5", darkText: true, lightDarkText: false },
  sage:     { primary: "#5ec97a", lightPrimary: "#2a7a42", light: "#8ee8a4", dark: "#38a858", glow: "rgba(94,201,122,",  lightBg: "#dff2e6", darkText: true, lightDarkText: false },
  copper:   { primary: "#a86030", lightPrimary: "#6e3a10", light: "#c87840", dark: "#884820", glow: "rgba(168,96,48,",   lightBg: "#f0e8dc", darkText: true, lightDarkText: false },
};

export const THEMES: Record<string, { text: string; textDim: string; textFaint: string }> = {
  space:  { text: "#f5ede8", textDim: "rgba(245,237,232,0.4)", textFaint: "rgba(245,237,232,0.3)" },
  sky:    { text: "#2a1a0e", textDim: "rgba(42,26,14,0.5)",    textFaint: "rgba(42,26,14,0.35)"  },
  plasma: { text: "#f7f1ff", textDim: "rgba(247,241,255,0.44)", textFaint: "rgba(247,241,255,0.30)" },
  cinder: { text: "#fff0e6", textDim: "rgba(255,240,230,0.44)", textFaint: "rgba(255,240,230,0.30)" },
  wash:   { text: "#241b16", textDim: "rgba(36,27,22,0.54)",    textFaint: "rgba(36,27,22,0.36)" },
  aurora:    { text: "#dff4ff", textDim: "rgba(223,244,255,0.42)", textFaint: "rgba(223,244,255,0.28)" },
  synthwave: { text: "#ffe8f8", textDim: "rgba(255,232,248,0.40)", textFaint: "rgba(255,232,248,0.28)" },
  cyberpunk: { text: "#e4f8ff", textDim: "rgba(228,248,255,0.40)", textFaint: "rgba(228,248,255,0.24)" },
  lofi:      { text: "#fff0e8", textDim: "rgba(255,240,232,0.52)", textFaint: "rgba(255,240,232,0.34)" },
  forest:    { text: "#d4edd8", textDim: "rgba(212,237,216,0.40)", textFaint: "rgba(212,237,216,0.26)" },
  webcore:   { text: "#1a1a1a", textDim: "rgba(0,0,0,0.55)",       textFaint: "rgba(0,0,0,0.35)"       },
  onyx:      { text: "#d0dcff", textDim: "rgba(208,220,255,0.40)", textFaint: "rgba(208,220,255,0.26)" },
};

export const THEME_OPTIONS = [
  "space", "sky", "plasma", "cinder", "wash",
  "aurora", "synthwave", "cyberpunk", "lofi", "forest", "webcore", "onyx",
] as const;

export const SURFACE_STYLE_OPTIONS = ["glass", "aero", "material", "clear", "obsidian", "neon", "win9x"] as const;

export const THEME_SURFACE_DEFAULTS: Record<string, string> = {
  space: "clear",
  sky: "aero",
  plasma: "neon",
  cinder: "glass",
  wash: "material",
  aurora: "glass",
  synthwave: "aero",
  cyberpunk: "neon",
  lofi: "obsidian",
  forest: "glass",
  webcore: "win9x",
  onyx: "glass",
};

/**
 * Settings that a theme forces regardless of user preference.
 * Add an entry here when a new theme needs to lock specific settings.
 * The values are applied at runtime and shown as greyed-out in the settings UI.
 */
export const THEME_LOCKED_SETTINGS: Partial<Record<string, Partial<Record<string, string | boolean | number>>>> = {
  onyx: {
    surface_style: "clear",
  },
  cyberpunk: {
    surface_style: "neon",
  },
};

/**
 * Custom app background colors for themes that override the default computed bg.
 * Add an entry here when a new theme requires a specific background color.
 */
export const THEME_BG_COLORS: Partial<Record<string, string>> = {
  onyx: "#070c1a",
};

export const normalizeThemeKey = (theme: string | undefined) => {
  if (theme === "light") return "sky";
  if (theme === "dark" || theme === "system") return "space";
  if (theme === "ember") return "cinder";
  if (theme === "bloom") return "wash";
  return THEME_OPTIONS.includes(theme as any) ? theme as typeof THEME_OPTIONS[number] : "space";
};

export const isDarkThemeKey = (theme: string | undefined) => !["sky", "wash", "webcore"].includes(normalizeThemeKey(theme));


export const CLOUD_SHAPES = [
  `<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg"><ellipse cx="100" cy="55" rx="95" ry="28"/><ellipse cx="70" cy="45" rx="45" ry="35"/><ellipse cx="110" cy="38" rx="52" ry="40"/><ellipse cx="150" cy="48" rx="38" ry="30"/></svg>`,
  `<svg viewBox="0 0 160 60" xmlns="http://www.w3.org/2000/svg"><ellipse cx="80" cy="42" rx="75" ry="20"/><ellipse cx="55" cy="32" rx="38" ry="28"/><ellipse cx="95" cy="26" rx="42" ry="30"/><ellipse cx="128" cy="35" rx="30" ry="22"/></svg>`,
  `<svg viewBox="0 0 120 50" xmlns="http://www.w3.org/2000/svg"><ellipse cx="60" cy="35" rx="56" ry="18"/><ellipse cx="42" cy="26" rx="30" ry="22"/><ellipse cx="72" cy="20" rx="34" ry="26"/><ellipse cx="95" cy="28" rx="24" ry="18"/></svg>`,
  `<svg viewBox="0 0 240 55" xmlns="http://www.w3.org/2000/svg"><ellipse cx="120" cy="38" rx="115" ry="18"/><ellipse cx="80" cy="28" rx="50" ry="24"/><ellipse cx="140" cy="22" rx="55" ry="26"/><ellipse cx="190" cy="32" rx="45" ry="20"/></svg>`,
];

export const CLOUD_CONFIGS = [
  { shape: 0, width: 280, top: "8%",  duration: 90,  delay: -45,  opacity: 0.75 },
  { shape: 1, width: 200, top: "22%", duration: 110, delay: -22,  opacity: 0.65 },
  { shape: 2, width: 140, top: "40%", duration: 75,  delay: -60,  opacity: 0.70 },
  { shape: 3, width: 320, top: "60%", duration: 130, delay: -85,  opacity: 0.60 },
  { shape: 0, width: 180, top: "72%", duration: 95,  delay: -10,  opacity: 0.72 },
  { shape: 1, width: 240, top: "15%", duration: 120, delay: -100, opacity: 0.62 },
  { shape: 2, width: 160, top: "50%", duration: 85,  delay: -38,  opacity: 0.68 },
  { shape: 3, width: 200, top: "85%", duration: 100, delay: -70,  opacity: 0.60 },
  { shape: 0, width: 120, top: "5%",  duration: 80,  delay: -15,  opacity: 0.55 },
  { shape: 1, width: 260, top: "30%", duration: 115, delay: -55,  opacity: 0.63 },
  { shape: 2, width: 190, top: "65%", duration: 105, delay: -88,  opacity: 0.67 },
  { shape: 3, width: 150, top: "80%", duration: 88,  delay: -33,  opacity: 0.58 },
  { shape: 0, width: 340, top: "45%", duration: 140, delay: -72,  opacity: 0.50 },
  { shape: 1, width: 110, top: "18%", duration: 72,  delay: -48,  opacity: 0.70 },
  { shape: 2, width: 220, top: "90%", duration: 95,  delay: -20,  opacity: 0.55 },
  { shape: 3, width: 170, top: "55%", duration: 108, delay: -95,  opacity: 0.62 },
];

export const KB_ALPHA = [
  ["q","w","e","r","t","y","u","i","o","p"],
  ["a","s","d","f","g","h","j","k","l"],
  ["z","x","c","v","b","n","m"],
];

export const KB_NUMS = [
  ["1","2","3","4","5","6","7","8","9","0"],
  ["-","_","=","+","[","]","{","}","\\","|"],
  [";","'",",",".","!","@","#","$","%","^"],
];

export const SCAN_KEYS = ["scan_steam", "scan_xbox", "scan_uwp", "scan_desktop", "scan_battlenet", "scan_gog", "scan_epic"] as const;

export const DEFAULT_SETTINGS = {
  accent: "ember", theme: "space", stars_enabled: true, ui_motion: true, lofi_music_enabled: true, wide_layout: false, wide_topbar: false, wide_bottombar: false, wide_games: false, wide_apps: false, wide_settings: false, topbar_background: true, bottombar_background: true, hide_bottom_bar: false,
  default_tab: "Home", scan_steam: true, scan_xbox: true,
  scan_uwp: true, scan_desktop: true, scan_battlenet: true, scan_gog: true, scan_epic: true, fetch_store_metadata: true, show_uninstalled_games: false, steam_owned_library_seen: false, repeat_speed: "normal",
  launch_at_startup: false, animated_heroes: "animated", update_channel: "stable", ui_scale: 1.0,
  language: "auto", home_cover_scale: 1.0, game_cover_scale: 1.0, app_cover_scale: 1.0, show_store_badges: true, games_sort: "recent", app_list_view: false, app_list_cols: 1, time_format: "auto", show_date: true, show_battery: true, show_clock: true, cinematic_home: false, home_mode: "semi", home_section_title_size: "small", show_home_recents: true, hero_content_pos: "bottom", show_immersive_hero_art: true,
  nav_bumpers_pos: "bottom",
  tabbar_show_buttons: "tabbar", tabbar_text_tabs: false, tabbar_with_background: false, tabbar_background_compact: false, tabbar_font_weight: "medium", tabbar_icon_mode: "text",
  bottombar_alignment: "left", bottombar_compact: "off", tabbar_label_case: "default",
  show_recent_games_only: false, show_home_collections: false, show_home_collection_names: true, show_hero_cover: true, show_home_pinned: true, home_pinned_pos: "bottom", onyx_flat_settings: true,
  gamepad_platform: "xbox", gamepad_icons_colored: false, gamepad_icons_filled: true, gamepad_icons_theme_color: false,
  gamepad_btn_size: "small", gamepad_auto_detect: true, haptic_feedback: true,
  surface_style: "clear",
  onyx_top_light: true,
  hide_on_launch: true,
} as const;

export type AccentKey = keyof typeof ACCENTS;

export type { Settings } from "./types";
