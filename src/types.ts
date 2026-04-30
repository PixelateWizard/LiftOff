/** Application/game entry in the library */
export interface App {
  id: string;
  name: string;
  app_type?: "game" | "app";
  source?: string;
  launch_path?: string;
  icon_base64?: string;
  [key: string]: unknown;
}

/** Theme text colors */
export interface ThemeColors {
  text: string;
  textDim: string;
  textFaint: string;
}

/** Accent color palette */
export interface AccentColors {
  primary: string;
  light: string;
  dark: string;
  glow: string;
  lightBg: string;
  lightPrimary?: string;
  darkText?: boolean;
  lightDarkText?: boolean;
}

// ── Settings value union types ─────────────────────────────────

export type ThemeMode        = "dark" | "light" | "system";
export type DefaultTab       = "Home" | "Games" | "Apps";
export type RepeatSpeed      = "slow" | "normal" | "fast";
export type AnimatedHeroes   = "static" | "animated" | "custom";
export type TimeFormat       = "auto" | "12h" | "24h";
export type NavBumpersPos    = "header" | "bottom" | "hidden";
export type TabbarButtons    = "tabbar" | "bottom" | "hidden";
export type TabbarFontWeight = "thin" | "medium" | "bold";
export type TabbarLabelCase  = "default" | "ucfirst" | "uppercase";
export type BottombarAlign   = "left" | "center" | "right";
export type GamepadPlatform  = "xbox" | "ps" | "switch";
export type GamepadBtnSize   = "small" | "medium" | "large";

/** Full persisted settings object */
export interface Settings {
  accent: string;
  theme: ThemeMode;
  stars_enabled: boolean;
  wide_layout: boolean;
  transparent_bars: boolean;
  transparent_topbar: boolean;
  transparent_bottombar: boolean;
  hide_bottom_bar: boolean;
  default_tab: DefaultTab;
  scan_steam: boolean;
  scan_xbox: boolean;
  scan_uwp: boolean;
  scan_desktop: boolean;
  scan_battlenet: boolean;
  repeat_speed: RepeatSpeed;
  launch_at_startup: boolean;
  animated_heroes: AnimatedHeroes;
  ui_scale: number;
  language: string;
  home_cover_scale: number;
  game_cover_scale: number;
  time_format: TimeFormat;
  show_date: boolean;
  show_battery: boolean;
  show_clock: boolean;
  cinematic_home: boolean;
  nav_bumpers_pos: NavBumpersPos;
  tabbar_show_buttons: TabbarButtons;
  tabbar_text_tabs: boolean;
  tabbar_with_background: boolean;
  tabbar_font_weight: TabbarFontWeight;
  bottombar_alignment: BottombarAlign;
  tabbar_label_case: TabbarLabelCase;
  show_home_collections: boolean;
  show_home_collection_names: boolean;
  show_hero_cover: boolean;
  gamepad_platform: GamepadPlatform;
  gamepad_icons_colored: boolean;
  gamepad_icons_filled: boolean;
  gamepad_icons_theme_color: boolean;
  gamepad_btn_size: GamepadBtnSize;
  gamepad_auto_detect: boolean;
}

/** Custom folder entry from the backend */
export interface CustomFolder {
  id: string;
  path: string;
  source: string;
  app_type: string;
  enabled: boolean;
}

// ── Settings item discriminated union ─────────────────────────

interface SettingsItemBase {
  key: string;
  section: number;
  label: string;
}

export interface SettingsDividerItem extends SettingsItemBase {
  type: "divider";
}

export interface SettingsToggleSubItem {
  key: keyof Settings;
  label: string;
  type: "toggle";
}

export interface SettingsCycleSubItem {
  key: keyof Settings;
  label: string;
  type: "cycle";
  options: readonly string[];
}

export type SettingsSubItem = SettingsToggleSubItem | SettingsCycleSubItem;

export interface SettingsToggleItem extends SettingsItemBase {
  key: keyof Settings;
  type: "toggle";
  subItems?: SettingsSubItem[];
}

export interface SettingsCycleItem extends SettingsItemBase {
  key: keyof Settings;
  type: "cycle";
  options: readonly string[];
}

export interface SettingsSliderItem extends SettingsItemBase {
  key: keyof Settings;
  type: "slider";
  min: number;
  max: number;
  step: number;
}

export interface SettingsAccentItem extends SettingsItemBase {
  type: "accent";
}

export interface SettingsActionItem extends SettingsItemBase {
  type: "action";
}

export interface SettingsRefreshItem extends SettingsItemBase {
  type: "refresh";
}

export interface SettingsUpdateItem extends SettingsItemBase {
  type: "update";
}

export interface SettingsLinkItem extends SettingsItemBase {
  type: "link";
}

export interface SettingsAttributionItem extends SettingsItemBase {
  type: "attribution";
  author: string;
  license: string;
  url: string;
}

export interface SettingsIconPreviewItem extends SettingsItemBase {
  type: "icon_preview";
}

export interface SettingsControllerTestItem extends SettingsItemBase {
  type: "controller_test";
}

export interface SettingsInfoItem extends SettingsItemBase {
  type: "info";
}

export interface SettingsCustomFoldersItem extends SettingsItemBase {
  type: "custom_folders";
}

export type SettingsItem =
  | SettingsDividerItem
  | SettingsToggleItem
  | SettingsCycleItem
  | SettingsSliderItem
  | SettingsAccentItem
  | SettingsActionItem
  | SettingsRefreshItem
  | SettingsUpdateItem
  | SettingsLinkItem
  | SettingsAttributionItem
  | SettingsIconPreviewItem
  | SettingsControllerTestItem
  | SettingsInfoItem
  | SettingsCustomFoldersItem;
