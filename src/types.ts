/** Application/game entry in the library */
export interface App {
  id: string;
  name: string;
  app_type?: "game" | "app";
  source?: string;
  install_dir?: string;
  launch_path?: string;
  icon_base64?: string;
  installed?: boolean;
  playtime_minutes?: number;
  last_played?: number;
  steam_appid?: number;
  steam_icon_hash?: string;
  xbox_product_id?: string;
  installing?: boolean;
  installProgress?: number;
  runAsAdmin?: boolean;
  [key: string]: unknown;
}

export interface GameEntry extends App {
  app_type?: "game";
  runAsAdmin?: boolean;
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
  lightGlow?: string;
  darkText?: boolean;
  lightDarkText?: boolean;
}

export interface StoreScreenshot {
  thumb: string;
  full: string;
}

export interface StoreMovie {
  id: string;
  name: string;
  thumbnail: string;
  mp4?: string | null;
  webm?: string | null;
  hlsH264?: string | null;
  dashH264?: string | null;
  dashAv1?: string | null;
}

export interface StoreMetadata {
  cacheVersion?: number;
  source: string;
  appId: string;
  shortDescription: string;
  aboutHtml: string;
  developers: string[];
  publishers: string[];
  genres: string[];
  releaseDate?: string | null;
  headerImage?: string | null;
  background?: string | null;
  screenshots: StoreScreenshot[];
  movies: StoreMovie[];
  fetchedAt: number;
}

export interface XboxStatus {
  connected: boolean;
  gamertag?: string;
  xuid?: string;
  owned_count: number;
  updated_at?: number;
}

export interface XboxLoginPayload {
  gamertag: string;
  xuid: string;
  owned_count: number;
}

export interface XboxInstallProgress {
  productId: string;
  pct: number;
  state: string;
  errorCode: number;
}

// ── Settings value union types ─────────────────────────────────

export type ThemeMode        =
  | "space" | "sky" | "plasma" | "cinder" | "wash"
  | "aurora" | "synthwave" | "cyberpunk" | "lofi" | "forest" | "webcore" | "onyx"
  | "ember" | "dark" | "light" | "system";
export type DefaultTab       = "Home" | "Games" | "Apps";
export type RepeatSpeed      = "slow" | "normal" | "fast";
export type AnimatedHeroes   = "static" | "animated" | "custom";
export type UpdateChannel    = "stable" | "prerelease";
export type TimeFormat       = "auto" | "12h" | "24h";
export type NavBumpersPos    = "header" | "bottom" | "hidden";
export type TabbarButtons    = "tabbar" | "bottom" | "hidden";
export type TabbarFontWeight = "thin" | "medium" | "bold";
export type TabbarLabelCase  = "default" | "ucfirst" | "uppercase";
export type BottombarAlign   = "left" | "center" | "right";
export type GamepadPlatform  = "xbox" | "ps" | "switch";
export type GamepadBtnSize   = "small" | "medium" | "large";
export type GamesSort        = "recent" | "az" | "store";
export type FseReturnShortcut = "l3_r3" | "view_menu" | "lb_rb";

/** Full persisted settings object */
export interface Settings {
  accent: string;
  theme: ThemeMode;
  stars_enabled: boolean;
  ui_motion: boolean;
  onyx_top_light: boolean;
  lofi_music_enabled: boolean;
  sfx_enabled: boolean;
  wide_layout: boolean;
  wide_topbar: boolean;
  wide_bottombar: boolean;
  wide_games: boolean;
  wide_apps: boolean;
  wide_settings: boolean;
  topbar_background: boolean;
  bottombar_background: boolean;
  hide_bottom_bar: boolean;
  default_tab: DefaultTab;
  scan_steam: boolean;
  scan_xbox: boolean;
  scan_uwp: boolean;
  scan_desktop: boolean;
  scan_battlenet: boolean;
  scan_gog: boolean;
  scan_epic: boolean;
  fetch_store_metadata: boolean;
  show_uninstalled_games: boolean;
  steam_owned_library_seen: boolean;
  repeat_speed: RepeatSpeed;
  launch_at_startup: boolean;
  animated_heroes: AnimatedHeroes;
  update_channel: UpdateChannel;
  ui_scale: number;
  language: string;
  home_cover_scale: number;
  game_cover_scale: number;
  app_cover_scale: number;
  show_store_badges: boolean;
  games_sort: GamesSort;
  app_list_view: boolean;
  app_list_cols: number;
  time_format: TimeFormat;
  show_date: boolean;
  show_battery: boolean;
  show_clock: boolean;
  cinematic_home: boolean;
  home_mode: string;
  home_section_title_size: string;
  show_home_recents: boolean;
  hero_content_pos: string;
  show_immersive_hero_art: boolean;
  nav_bumpers_pos: NavBumpersPos;
  tabbar_show_buttons: TabbarButtons;
  tabbar_text_tabs: boolean;
  tabbar_with_background: boolean;
  tabbar_background_compact: boolean;
  tabbar_font_weight: TabbarFontWeight;
  tabbar_icon_mode: "text" | "icons" | "both";
  bottombar_alignment: BottombarAlign;
  bottombar_compact: string;
  tabbar_label_case: TabbarLabelCase;
  show_recent_games_only: boolean;
  show_home_collections: boolean;
  show_home_collection_names: boolean;
  show_hero_cover: boolean;
  show_home_pinned: boolean;
  home_pinned_pos: string;
  onyx_flat_settings: boolean;
  gamepad_platform: GamepadPlatform;
  gamepad_icons_colored: boolean;
  gamepad_icons_filled: boolean;
  gamepad_icons_theme_color: boolean;
  gamepad_btn_size: GamepadBtnSize;
  gamepad_auto_detect: boolean;
  haptic_feedback: boolean;
  fse_return_shortcut: FseReturnShortcut;
  surface_style: string;
  hide_on_launch: boolean;
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
  /** Appearance section category page index. */
  group?: number;
  /** Visual indentation — rendered as a child of the preceding parent row */
  indent?: boolean;
  /** Set by buildSettingsItems when the active theme forces this setting's value */
  locked?: boolean;
  /** The value the current theme forces for this setting (shown greyed on the right) */
  lockedValue?: string | boolean | number;
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

export interface SettingsSliderSubItem {
  key: keyof Settings;
  label: string;
  type: "slider";
  min: number;
  max: number;
  step: number;
  integer?: boolean;
}

export type SettingsSubItem = SettingsToggleSubItem | SettingsCycleSubItem | SettingsSliderSubItem;

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

export interface SettingsThemePickerItem extends SettingsItemBase {
  key: "theme";
  type: "theme_picker";
}

export interface SettingsSurfacePickerItem extends SettingsItemBase {
  key: "surface_style";
  type: "surface_picker";
}

export interface SettingsAppearanceCategoryItem extends SettingsItemBase {
  type: "appearance_category";
  categoryIndex: number;
  descriptionKey: string;
}

export interface SettingsAppearanceBackItem extends SettingsItemBase {
  type: "appearance_back";
  categoryIndex: number;
}

export interface SettingsSliderItem extends SettingsItemBase {
  key: keyof Settings;
  type: "slider";
  min: number;
  max: number;
  step: number;
  integer?: boolean;
}

export interface SettingsAccentItem extends SettingsItemBase {
  type: "accent";
}

export interface SettingsActionItem extends SettingsItemBase {
  type: "action";
}

export interface SettingsSpotifyItem extends SettingsItemBase {
  type: "spotify";
}

export interface SettingsSteamItem extends SettingsItemBase {
  type: "steam";
}

export interface SettingsXboxItem extends SettingsItemBase {
  type: "xbox";
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

export interface SettingsHomeCollectionItem {
  key: string;
  section: number;
  label: string;
  type: "home_collection_toggle";
  colName: string;
  indent?: boolean;
  locked?: boolean;
  lockedValue?: string | boolean | number;
}

export type SettingsItem =
  | SettingsDividerItem
  | SettingsToggleItem
  | SettingsCycleItem
  | SettingsThemePickerItem
  | SettingsSurfacePickerItem
  | SettingsAppearanceBackItem
  | SettingsSliderItem
  | SettingsAccentItem
  | SettingsActionItem
  | SettingsSpotifyItem
  | SettingsSteamItem
  | SettingsXboxItem
  | SettingsRefreshItem
  | SettingsUpdateItem
  | SettingsLinkItem
  | SettingsAttributionItem
  | SettingsIconPreviewItem
  | SettingsControllerTestItem
  | SettingsInfoItem
  | SettingsCustomFoldersItem
  | SettingsAppearanceCategoryItem
  | SettingsHomeCollectionItem;
