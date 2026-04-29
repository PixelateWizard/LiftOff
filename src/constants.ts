export const COLS = 6;
export const GAME_COLS = 5;
export const TABS = ["Home", "Games", "Apps", "Settings"] as const;
export const APP_VERSION = "1.2.2";
export const GITHUB_REPO = "PixelateWizard/LiftOff";

export const ACCENTS: Record<string, {
  primary: string; light: string; dark: string; glow: string; lightBg: string; lightPrimary?: string; darkText?: boolean; lightDarkText?: boolean;
}> = {
  ember:    { primary: "#e8714a", lightPrimary: "#e75a2b", light: "#ff9a6c", dark: "#c94f28", glow: "rgba(232,113,74,",  lightBg: "#f5e8e0", darkText: true, lightDarkText: false, },
  ocean:    { primary: "#4a9ee8", lightPrimary: "#438fd1", light: "#9dd0ff", dark: "#2878c9", glow: "rgba(74,158,232,",  lightBg: "#ddeeff", darkText: true, lightDarkText: false,
   },
  neon:     { primary: "#4ae88a", lightPrimary: "#15803d", light: "#6cffaa", dark: "#28c96a", glow: "rgba(74,232,138,", lightBg: "#ddf5e8", darkText: true, lightDarkText: false,},
  rose:     { primary: "#E97CA9", lightPrimary: "#da4583", light: "#ff6caa", dark: "#c9286a", glow: "rgba(232,74,138,",  lightBg: "#f5dde8", darkText: true, lightDarkText: false, },
  midnight: { primary: "#8a4ae8", light: "#aa6cff", dark: "#6a28c9", glow: "rgba(138,74,232,",  lightBg: "#e8ddff" },
  red:      { primary: "#e03030", light: "#ff6060", dark: "#b01010", glow: "rgba(224,48,48,",   lightBg: "#fde8e8", },
  silver:   { primary: "#909090", light: "#c0c0c0", dark: "#606060", glow: "rgba(144,144,144,", lightBg: "#f0f0f0", darkText: true },
  white:    { primary: "#d8d8d8", light: "#ffffff", dark: "#aaaaaa", glow: "rgba(220,220,220,", lightBg: "#f8f8f8", darkText: true },
};

export const THEMES: Record<string, { text: string; textDim: string; textFaint: string }> = {
  dark:  { text: "#f5ede8", textDim: "rgba(245,237,232,0.4)", textFaint: "rgba(245,237,232,0.3)" },
  light: { text: "#2a1a0e", textDim: "rgba(42,26,14,0.5)",    textFaint: "rgba(42,26,14,0.35)"  },
};

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

export const SCAN_KEYS = ["scan_steam", "scan_xbox", "scan_uwp", "scan_desktop", "scan_battlenet"] as const;

export const DEFAULT_SETTINGS = {
  accent: "ember", theme: "dark", stars_enabled: true, wide_layout: false, transparent_bars: false, transparent_topbar: false, transparent_bottombar: false, hide_bottom_bar: false,
  default_tab: "Home", scan_steam: true, scan_xbox: true,
  scan_uwp: true, scan_desktop: true, scan_battlenet: true, repeat_speed: "normal",
  launch_at_startup: false, animated_heroes: "animated", ui_scale: 1.0,
  language: "auto", home_cover_scale: 1.0, game_cover_scale: 1.0, time_format: "auto", show_date: true, show_battery: true, show_clock: true, cinematic_home: false,
  nav_bumpers_pos: "bottom",
  tabbar_show_buttons: "tabbar", tabbar_text_tabs: false, tabbar_with_background: false, tabbar_font_weight: "medium",
  bottombar_alignment: "left", tabbar_label_case: "default",
  show_home_collections: false, show_home_collection_names: true,
  gamepad_platform: "xbox", gamepad_icons_colored: false, gamepad_icons_filled: true, gamepad_icons_theme_color: false,
  gamepad_btn_size: "small", gamepad_auto_detect: true,
} as const;

export type AccentKey = keyof typeof ACCENTS;

export type { Settings } from "./types";
