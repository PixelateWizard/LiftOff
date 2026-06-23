//Copyright (C) 2025 Taylor Denby

use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::io::{Read, Seek, SeekFrom, Write};
use std::net::TcpListener;
use std::os::windows::ffi::OsStrExt;
use std::os::windows::process::CommandExt;
use std::path::Path;
use std::process::Stdio;
use std::sync::atomic::{AtomicBool, AtomicIsize, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::Emitter;
use tauri::Manager;
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_autostart::ManagerExt;
use windows::core::PWSTR;
use windows::{
    Win32::Foundation::{CloseHandle, BOOL, LPARAM, WIN32_ERROR, WPARAM},
    Win32::Graphics::Gdi::{
        CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC, GetDIBits,
        PatBlt, ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER, BLACKNESS, DIB_RGB_COLORS,
        RGBQUAD,
    },
    Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS},
    Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, TerminateProcess, PROCESS_NAME_WIN32,
        PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_TERMINATE,
    },
    Win32::UI::Input::XboxController::{XInputSetState, XINPUT_VIBRATION},
    Win32::UI::Shell::{
        SHGetFileInfoW, ShellExecuteW, SHFILEINFOW, SHGFI_FLAGS, SHGFI_ICON, SHGFI_LARGEICON,
    },
    Win32::UI::WindowsAndMessaging::{
        DestroyIcon, DrawIconEx, EnumWindows, GetForegroundWindow, GetSystemMetrics,
        GetWindowTextLengthW, GetWindowTextW, GetWindowThreadProcessId, IsWindowVisible,
        PostMessageW, SetForegroundWindow, ShowWindow, DI_NORMAL, SM_CXSCREEN, SM_CYSCREEN,
        SW_SHOW, SW_SHOWNORMAL, WM_CLOSE,
    },
};

const SGDB_KEY: &str = env!("SGDB_API_KEY");
const RECENTS_MAX: usize = 10;
const XCLOUD_REMOTE_URL: &str =
    "https://raw.githubusercontent.com/PixelateWizard/LiftOff/main/src/data/xcloudGames.json";
const XCLOUD_BUNDLED_JSON: &str = include_str!("../../src/data/xcloudGames.json");
const XCLOUD_REFRESH_INTERVAL_SECS: u64 = 24 * 60 * 60;
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// PNG size for embedded icons. UI tiles are ~48px; 128px gives headroom for high-DPI / focus scale
/// without huge JSON payloads (256px would be sharper but much larger base64).
const ICON_EXPORT_PX: i32 = 128;
/// `SHGFI_JUMBOICON` — request up to 256×256 source icon when available (Vista+).
const SHGFI_JUMBOICON: SHGFI_FLAGS = SHGFI_FLAGS(0x40000);

static GAMEPAD_READY: AtomicBool = AtomicBool::new(false);
static OUR_HWND: AtomicIsize = AtomicIsize::new(0);
static FRONTEND_HAS_CONTROL: AtomicBool = AtomicBool::new(false);

struct LaunchedTarget {
    name: String,
    launch_path: String,
    source: String,
    pid: Option<u32>,
    launched_at: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LaunchAppResult {
    launch_mode: String,
    child_pid: Option<u32>,
    detail: Option<String>,
    fallback_reason: Option<String>,
}

static LAUNCHED: Mutex<Option<HashMap<String, LaunchedTarget>>> = Mutex::new(None);

fn launched_store() -> std::sync::MutexGuard<'static, Option<HashMap<String, LaunchedTarget>>> {
    let mut guard = LAUNCHED.lock().unwrap();
    if guard.is_none() {
        *guard = Some(HashMap::new());
    }
    guard
}

#[tauri::command]
fn set_frontend_active(active: bool) {
    FRONTEND_HAS_CONTROL.store(active, Ordering::Relaxed);
}

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct AppEntry {
    pub id: String,
    pub name: String,
    pub icon_base64: Option<String>,
    pub launch_path: String,
    pub app_type: String,
    pub source: String, // "steam" | "xbox" | "uwp" | "desktop" | "other"
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub install_dir: Option<String>,
    #[serde(default = "default_true")]
    pub installed: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub playtime_minutes: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_played: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub steam_appid: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub steam_icon_hash: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct RecentEntry {
    pub id: String,
    pub name: String,
    pub launch_path: String,
    pub app_type: String,
    pub launched_at: u64,
}

fn default_animated_heroes() -> String {
    "animated".to_string()
}
fn deser_animated_heroes<'de, D: serde::Deserializer<'de>>(d: D) -> Result<String, D::Error> {
    struct V;
    impl<'de> serde::de::Visitor<'de> for V {
        type Value = String;
        fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
            write!(f, "bool or string")
        }
        fn visit_bool<E: serde::de::Error>(self, v: bool) -> Result<String, E> {
            Ok(if v { "animated" } else { "static" }.to_string())
        }
        fn visit_str<E: serde::de::Error>(self, v: &str) -> Result<String, E> {
            Ok(v.to_owned())
        }
        fn visit_string<E: serde::de::Error>(self, v: String) -> Result<String, E> {
            Ok(v)
        }
    }
    d.deserialize_any(V)
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Settings {
    pub accent: String,
    pub theme: String,
    pub stars_enabled: bool,
    #[serde(default = "default_true")]
    pub ui_motion: bool,
    pub onyx_top_light: bool,
    #[serde(default = "default_true")]
    pub lofi_music_enabled: bool,
    pub default_tab: String,
    pub scan_steam: bool,
    pub scan_xbox: bool,
    pub scan_uwp: bool,
    pub scan_desktop: bool,
    pub scan_battlenet: bool,
    #[serde(default = "default_true")]
    pub scan_gog: bool,
    #[serde(default = "default_true")]
    pub scan_epic: bool,
    pub repeat_speed: String,
    pub launch_at_startup: bool,
    #[serde(
        deserialize_with = "deser_animated_heroes",
        default = "default_animated_heroes"
    )]
    pub animated_heroes: String,
    #[serde(default = "default_update_channel")]
    pub update_channel: String,
    // None means "not yet set by user"; frontend fills in auto-detected value.
    #[serde(default)]
    pub ui_scale: Option<f32>,
    // Display settings (PR #4)
    #[serde(default = "default_language")]
    pub language: String,
    #[serde(default = "default_time_format")]
    pub time_format: String,
    #[serde(default = "default_true")]
    pub show_clock: bool,
    #[serde(default = "default_true")]
    pub show_date: bool,
    #[serde(default = "default_true")]
    pub show_battery: bool,
    // Layout settings (PR #5 / moi952)
    #[serde(default)]
    pub wide_layout: bool,
    #[serde(default)]
    pub wide_topbar: bool,
    #[serde(default)]
    pub wide_bottombar: bool,
    #[serde(default)]
    pub wide_games: bool,
    #[serde(default)]
    pub wide_apps: bool,
    #[serde(default)]
    pub wide_settings: bool,
    #[serde(default)]
    pub cinematic_home: bool,
    #[serde(default = "default_home_mode")]
    pub home_mode: String,
    #[serde(default = "default_home_section_title_size")]
    pub home_section_title_size: String,
    #[serde(default = "default_true")]
    pub show_home_recents: bool,
    #[serde(default = "default_hero_content_pos")]
    pub hero_content_pos: String,
    #[serde(default = "default_true")]
    pub show_immersive_hero_art: bool,
    #[serde(default)]
    pub hide_bottom_bar: bool,
    #[serde(default = "default_true")]
    pub topbar_background: bool,
    #[serde(default = "default_true")]
    pub bottombar_background: bool,
    #[serde(default = "default_cover_scale")]
    pub home_cover_scale: f32,
    #[serde(default = "default_cover_scale")]
    pub game_cover_scale: f32,
    #[serde(default = "default_cover_scale")]
    pub app_cover_scale: f32,
    #[serde(default = "default_true")]
    pub show_store_badges: bool,
    #[serde(default = "default_games_sort")]
    pub games_sort: String,
    #[serde(default)]
    pub app_list_view: bool,
    #[serde(default = "default_app_list_cols")]
    pub app_list_cols: i32,
    // Navigation bar settings (moi952 PRs)
    #[serde(default = "default_nav_bumpers_pos")]
    pub nav_bumpers_pos: String,
    #[serde(default = "default_tabbar_show_buttons")]
    pub tabbar_show_buttons: String,
    #[serde(default)]
    pub tabbar_text_tabs: bool,
    #[serde(default)]
    pub tabbar_with_background: bool,
    #[serde(default)]
    pub tabbar_background_compact: bool,
    #[serde(default = "default_tabbar_font_weight")]
    pub tabbar_font_weight: String,
    #[serde(default = "default_tabbar_icon_mode")]
    pub tabbar_icon_mode: String,
    #[serde(default = "default_tabbar_label_case")]
    pub tabbar_label_case: String,
    #[serde(default = "default_bottombar_alignment")]
    pub bottombar_alignment: String,
    #[serde(default = "default_bottombar_compact")]
    pub bottombar_compact: String,
    // Home collections
    #[serde(default)]
    pub show_recent_games_only: bool,
    #[serde(default)]
    pub show_home_collections: bool,
    #[serde(default = "default_true")]
    pub show_home_collection_names: bool,
    #[serde(default = "default_true")]
    pub show_hero_cover: bool,
    #[serde(default = "default_true")]
    pub show_home_pinned: bool,
    #[serde(default = "default_home_pinned_pos")]
    pub home_pinned_pos: String,
    #[serde(default = "default_true")]
    pub onyx_flat_settings: bool,
    // Gamepad icon settings (moi952 PRs)
    #[serde(default = "default_gamepad_platform")]
    pub gamepad_platform: String,
    #[serde(default)]
    pub gamepad_icons_colored: bool,
    #[serde(default = "default_true")]
    pub gamepad_icons_filled: bool,
    #[serde(default)]
    pub gamepad_icons_theme_color: bool,
    #[serde(default = "default_gamepad_btn_size")]
    pub gamepad_btn_size: String,
    #[serde(default = "default_true")]
    pub gamepad_auto_detect: bool,
    #[serde(default = "default_true")]
    pub haptic_feedback: bool,
    #[serde(default = "default_topbar_show_bumpers")]
    pub topbar_show_bumpers: bool,
    #[serde(default = "default_surface_style")]
    pub surface_style: String,
}

fn default_language() -> String {
    "auto".to_string()
}
fn default_time_format() -> String {
    "auto".to_string()
}
fn default_cover_scale() -> f32 {
    1.0
}
fn default_app_list_cols() -> i32 {
    1
}
fn default_nav_bumpers_pos() -> String {
    "bottom".to_string()
}
fn default_tabbar_show_buttons() -> String {
    "tabbar".to_string()
}
fn default_tabbar_font_weight() -> String {
    "medium".to_string()
}
fn default_tabbar_label_case() -> String {
    "default".to_string()
}
fn default_tabbar_icon_mode() -> String {
    "text".to_string()
}
fn default_bottombar_alignment() -> String {
    "left".to_string()
}
fn default_bottombar_compact() -> String {
    "off".to_string()
}
fn default_home_mode() -> String {
    "semi".to_string()
}
fn default_home_section_title_size() -> String {
    "small".to_string()
}
fn default_hero_content_pos() -> String {
    "bottom".to_string()
}
fn default_home_pinned_pos() -> String {
    "bottom".to_string()
}
fn default_gamepad_platform() -> String {
    "xbox".to_string()
}
fn default_gamepad_btn_size() -> String {
    "small".to_string()
}
fn default_topbar_show_bumpers() -> bool {
    false
}
fn default_surface_style() -> String {
    "clear".to_string()
}
fn default_update_channel() -> String {
    "stable".to_string()
}
fn default_games_sort() -> String {
    "recent".to_string()
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            accent: "ember".to_string(),
            theme: "space".to_string(),
            stars_enabled: true,
            ui_motion: true,
            lofi_music_enabled: true,
            default_tab: "Home".to_string(),
            scan_steam: true,
            scan_xbox: true,
            scan_uwp: true,
            scan_desktop: true,
            scan_battlenet: true,
            scan_gog: true,
            scan_epic: true,
            repeat_speed: "normal".to_string(),
            launch_at_startup: false,
            animated_heroes: "animated".to_string(),
            update_channel: "stable".to_string(),
            ui_scale: None,
            language: "auto".to_string(),
            time_format: "auto".to_string(),
            show_clock: true,
            show_date: true,
            show_battery: true,
            wide_layout: false,
            wide_topbar: false,
            wide_bottombar: false,
            wide_games: false,
            wide_apps: false,
            wide_settings: false,
            cinematic_home: false,
            home_mode: "semi".to_string(),
            home_section_title_size: "small".to_string(),
            show_home_recents: true,
            hero_content_pos: "bottom".to_string(),
            show_immersive_hero_art: true,
            onyx_top_light: true,
            hide_bottom_bar: false,
            topbar_background: true,
            bottombar_background: true,
            home_cover_scale: 1.0,
            game_cover_scale: 1.0,
            app_cover_scale: 1.0,
            show_store_badges: true,
            games_sort: "recent".to_string(),
            app_list_view: false,
            app_list_cols: 1,
            nav_bumpers_pos: "bottom".to_string(),
            tabbar_show_buttons: "tabbar".to_string(),
            tabbar_text_tabs: false,
            tabbar_with_background: false,
            tabbar_background_compact: false,
            tabbar_font_weight: "medium".to_string(),
            tabbar_icon_mode: "text".to_string(),
            tabbar_label_case: "default".to_string(),
            bottombar_alignment: "left".to_string(),
            bottombar_compact: "off".to_string(),
            show_recent_games_only: false,
            show_home_collections: false,
            show_home_collection_names: true,
            show_hero_cover: true,
            show_home_pinned: true,
            home_pinned_pos: "bottom".to_string(),
            onyx_flat_settings: true,
            gamepad_platform: "xbox".to_string(),
            gamepad_icons_colored: false,
            gamepad_icons_filled: true,
            gamepad_icons_theme_color: false,
            gamepad_btn_size: "small".to_string(),
            gamepad_auto_detect: true,
            haptic_feedback: true,
            topbar_show_bumpers: false,
            surface_style: "clear".to_string(),
        }
    }
}

#[derive(Deserialize)]
struct SgdbSearchResponse {
    success: bool,
    data: Option<Vec<SgdbGame>>,
}
#[derive(Deserialize)]
struct SgdbGame {
    id: u64,
}
#[derive(Deserialize)]
struct SgdbGridResponse {
    success: bool,
    data: Option<Vec<SgdbGrid>>,
}
#[derive(Deserialize)]
struct SgdbGrid {
    url: String,
}
#[derive(Deserialize)]
struct SgdbHeroResponse {
    success: bool,
    data: Option<Vec<SgdbHero>>,
}
#[derive(Deserialize)]
struct SgdbHero {
    url: String,
}
#[derive(Serialize)]
struct GameArtBundle {
    grid: Option<String>,
    hero_animated: Option<String>,
    hero_static: Option<String>,
}

#[derive(Deserialize)]
struct SgdbArtAuthor {
    name: Option<String>,
}
#[derive(Deserialize)]
struct SgdbArtItem {
    url: String,
    thumb: Option<String>,
    mime: Option<String>,
    width: Option<u32>,
    height: Option<u32>,
    author: Option<SgdbArtAuthor>,
    style: Option<String>,
    upvotes: Option<i32>,
    downvotes: Option<i32>,
}
#[derive(Deserialize)]
struct SgdbArtResponse {
    success: bool,
    data: Option<Vec<SgdbArtItem>>,
}
#[derive(Serialize, Clone)]
pub struct SgdbArtResult {
    pub url: String,
    pub thumb: String,
    pub is_animated: bool,
    pub width: u32,
    pub height: u32,
    pub author: String,
    pub style: String,
    pub upvotes: i32,
    pub downvotes: i32,
}

fn liftoff_dir() -> std::path::PathBuf {
    dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("LiftOff")
}
fn recents_path() -> std::path::PathBuf {
    liftoff_dir().join("recents.json")
}
fn art_cache_path() -> std::path::PathBuf {
    liftoff_dir().join("art_cache.json")
}
fn hero_cache_path() -> std::path::PathBuf {
    liftoff_dir().join("hero_cache.json")
}
fn hero_animated_cache_path() -> std::path::PathBuf {
    liftoff_dir().join("hero_animated_cache.json")
}
fn settings_path() -> std::path::PathBuf {
    liftoff_dir().join("settings.json")
}
fn pins_path() -> std::path::PathBuf {
    liftoff_dir().join("pins.json")
}
fn hidden_path() -> std::path::PathBuf {
    liftoff_dir().join("hidden.json")
}
fn recent_games_path() -> std::path::PathBuf {
    liftoff_dir().join("recent_games.json")
}
fn custom_names_path() -> std::path::PathBuf {
    liftoff_dir().join("custom_names.json")
}

fn xcloud_cache_path() -> std::path::PathBuf {
    liftoff_dir().join("xcloud_games_cache.json")
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct XCloudGameEntry {
    name: String,
    slug: String,
    product_id: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct XCloudCache {
    fetched_at: u64,
    games: Vec<XCloudGameEntry>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct XCloudListResponse {
    games: Vec<XCloudGameEntry>,
    fetched_at: Option<u64>,
    source: String,
    refresh_error: Option<String>,
}

fn unix_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn valid_xcloud_slug(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 160
        && value
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
}

fn valid_xcloud_product_id(value: &str) -> bool {
    (8..=20).contains(&value.len())
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric())
}

fn validated_xcloud_entries(entries: Vec<XCloudGameEntry>) -> Vec<XCloudGameEntry> {
    let mut seen_slugs = HashSet::new();
    let mut seen_products = HashSet::new();
    let mut valid = Vec::new();
    for mut entry in entries {
        entry.name = entry.name.trim().to_string();
        entry.slug = entry.slug.trim().to_string();
        entry.product_id = entry.product_id.trim().to_string();
        if entry.name.is_empty()
            || entry.name.len() > 200
            || !valid_xcloud_slug(&entry.slug)
            || !valid_xcloud_product_id(&entry.product_id)
            || !seen_slugs.insert(entry.slug.clone())
            || !seen_products.insert(entry.product_id.clone())
        {
            eprintln!(
                "Ignoring invalid or duplicate xCloud seed entry: {}",
                entry.name
            );
            continue;
        }
        valid.push(entry);
    }
    valid.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));
    valid
}

fn bundled_xcloud_games() -> Vec<XCloudGameEntry> {
    serde_json::from_str::<Vec<XCloudGameEntry>>(XCLOUD_BUNDLED_JSON)
        .map(validated_xcloud_entries)
        .unwrap_or_default()
}

fn read_xcloud_cache() -> Option<XCloudCache> {
    let raw = std::fs::read_to_string(xcloud_cache_path()).ok()?;
    let mut cache = serde_json::from_str::<XCloudCache>(&raw).ok()?;
    cache.games = validated_xcloud_entries(cache.games);
    (!cache.games.is_empty()).then_some(cache)
}

fn write_xcloud_cache(cache: &XCloudCache) -> Result<(), String> {
    let path = xcloud_cache_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let json = serde_json::to_string_pretty(cache).map_err(|error| error.to_string())?;
    std::fs::write(path, json).map_err(|error| error.to_string())
}

async fn fetch_xcloud_games() -> Result<Vec<XCloudGameEntry>, String> {
    let response = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .user_agent("LiftOff xCloud list refresh/1.0")
        .build()
        .map_err(|error| error.to_string())?
        .get(XCLOUD_REMOTE_URL)
        .send()
        .await
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?;
    let entries = response
        .json::<Vec<XCloudGameEntry>>()
        .await
        .map_err(|error| error.to_string())?;
    let games = validated_xcloud_entries(entries);
    if games.is_empty() {
        return Err("The downloaded xCloud list contained no valid games.".to_string());
    }
    Ok(games)
}

async fn load_xcloud_games(force_refresh: bool) -> XCloudListResponse {
    let cache = read_xcloud_cache();
    let cache_is_fresh = cache.as_ref().is_some_and(|cached| {
        unix_timestamp().saturating_sub(cached.fetched_at) < XCLOUD_REFRESH_INTERVAL_SECS
    });
    if cache_is_fresh && !force_refresh {
        let cached = cache.expect("fresh cache must exist");
        return XCloudListResponse {
            games: cached.games,
            fetched_at: Some(cached.fetched_at),
            source: "cache".to_string(),
            refresh_error: None,
        };
    }

    match fetch_xcloud_games().await {
        Ok(games) => {
            let fetched_at = unix_timestamp();
            let cache = XCloudCache {
                fetched_at,
                games: games.clone(),
            };
            let refresh_error = write_xcloud_cache(&cache).err();
            XCloudListResponse {
                games,
                fetched_at: Some(fetched_at),
                source: "remote".to_string(),
                refresh_error,
            }
        }
        Err(error) => {
            eprintln!("xCloud list refresh failed: {error}");
            if let Some(cached) = cache {
                XCloudListResponse {
                    games: cached.games,
                    fetched_at: Some(cached.fetched_at),
                    source: "stale-cache".to_string(),
                    refresh_error: Some(error),
                }
            } else {
                XCloudListResponse {
                    games: bundled_xcloud_games(),
                    fetched_at: None,
                    source: "bundled".to_string(),
                    refresh_error: Some(error),
                }
            }
        }
    }
}

#[tauri::command]
async fn get_xcloud_games(force: bool) -> XCloudListResponse {
    load_xcloud_games(force).await
}

fn load_custom_names() -> std::collections::HashMap<String, String> {
    let path = custom_names_path();
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_custom_names(names: &std::collections::HashMap<String, String>) {
    let path = custom_names_path();
    if let Ok(json) = serde_json::to_string_pretty(names) {
        let _ = std::fs::write(path, json);
    }
}

// ── Recategorization overrides (move between Games/Apps + force source) ──
// Keyed by app/game id. app_type: Some("game") | Some("app") | None (no override).
// source: Some("xbox"|"steam"|"<custom>") | None (no override).
#[derive(Serialize, Deserialize, Clone, Default)]
pub struct CategoryOverride {
    #[serde(default)]
    pub app_type: Option<String>,
    #[serde(default)]
    pub source: Option<String>,
}

fn custom_categories_path() -> std::path::PathBuf {
    liftoff_dir().join("custom_categories.json")
}

fn load_custom_categories() -> std::collections::HashMap<String, CategoryOverride> {
    let path = custom_categories_path();
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_custom_categories(map: &std::collections::HashMap<String, CategoryOverride>) {
    let path = custom_categories_path();
    if let Ok(json) = serde_json::to_string_pretty(map) {
        let _ = std::fs::write(path, json);
    }
}

fn art_dir() -> std::path::PathBuf {
    liftoff_dir().join("art")
}
fn grid_art_dir() -> std::path::PathBuf {
    art_dir().join("grid")
}
fn hero_static_art_dir() -> std::path::PathBuf {
    art_dir().join("hero_static")
}
fn hero_animated_art_dir() -> std::path::PathBuf {
    art_dir().join("hero_animated")
}

/// Scrub a game name into a safe filename (max 80 chars).
fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' {
                c
            } else {
                '_'
            }
        })
        .take(80)
        .collect()
}

/// Extract the file extension from a URL (before any query string), e.g. "webm", "png".
fn url_ext(url: &str) -> &str {
    url.split('?')
        .next()
        .and_then(|u| u.rsplit('.').next())
        .filter(|e| !e.is_empty() && e.len() <= 5 && e.chars().all(|c| c.is_ascii_alphanumeric()))
        .unwrap_or("bin")
}

/// Download `url` into `dir/{sanitized_name}.{ext}` and return the absolute path.
/// Returns None if the download or write fails; the caller should fall back to the remote URL.
fn download_file(
    client: &reqwest::blocking::Client,
    url: &str,
    dir: &std::path::Path,
    name: &str,
) -> Option<String> {
    let path = dir.join(format!("{}.{}", sanitize_filename(name), url_ext(url)));
    if path.exists() {
        return Some(path.to_string_lossy().into_owned());
    }
    let _ = std::fs::create_dir_all(dir);
    let response = client
        .get(url)
        .timeout(std::time::Duration::from_secs(60))
        .send()
        .ok()?;
    if !response.status().is_success() {
        return None;
    }
    let bytes = response.bytes().ok()?;
    std::fs::write(&path, &bytes).ok()?;
    Some(path.to_string_lossy().into_owned())
}

fn load_recents() -> Vec<RecentEntry> {
    let path = recents_path();
    if !path.exists() {
        return vec![];
    }
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_recents(recents: &Vec<RecentEntry>) {
    let path = recents_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string(recents) {
        let _ = std::fs::write(path, json);
    }
}

fn load_recent_games() -> Vec<RecentEntry> {
    let path = recent_games_path();
    if !path.exists() {
        return vec![];
    }
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_recent_games(recents: &Vec<RecentEntry>) {
    let path = recent_games_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string(recents) {
        let _ = std::fs::write(path, json);
    }
}

fn load_art_cache() -> HashMap<String, String> {
    let path = art_cache_path();
    if !path.exists() {
        return HashMap::new();
    }
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_art_cache(cache: &HashMap<String, String>) {
    let path = art_cache_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string(cache) {
        let _ = std::fs::write(path, json);
    }
}

fn load_hero_cache() -> HashMap<String, String> {
    let path = hero_cache_path();
    if !path.exists() {
        return HashMap::new();
    }
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_hero_cache(cache: &HashMap<String, String>) {
    let path = hero_cache_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string(cache) {
        let _ = std::fs::write(path, json);
    }
}

fn load_hero_animated_cache() -> HashMap<String, String> {
    let path = hero_animated_cache_path();
    if !path.exists() {
        return HashMap::new();
    }
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_hero_animated_cache(cache: &HashMap<String, String>) {
    let path = hero_animated_cache_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string(cache) {
        let _ = std::fs::write(path, json);
    }
}

fn load_settings_inner() -> Settings {
    let path = settings_path();
    if !path.exists() {
        return Settings::default();
    }
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_settings_inner(settings: &Settings) {
    let path = settings_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string(settings) {
        let _ = std::fs::write(path, json);
    }
}

// Steam QR sign-in ----------------------------------------------------------
//
// Auth uses Steam's HTTPS WebAPI protobuf endpoints, not the Steam CM socket
// stack. The refresh token is stored only in Windows Credential Manager; local
// JSON contains account metadata and owned-library cache entries only.

const STEAM_KEYRING_SERVICE: &str = "com.taylo.liftoff.steam";
const STEAM_QR_TIMEOUT_SECS: u64 = 180;
const STEAM_WEBBROWSER_PLATFORM: u64 = 2;

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct SteamAccountMeta {
    #[serde(default)]
    pub account_name: String,
    #[serde(default)]
    pub steamid: String,
    #[serde(default)]
    pub owned_count: usize,
    #[serde(default)]
    pub updated_at: i64,
}

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct SteamStatus {
    pub connected: bool,
    pub account_name: Option<String>,
    pub steamid: Option<String>,
    pub owned_count: usize,
    pub updated_at: Option<i64>,
}

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct SteamLoginPayload {
    pub account_name: String,
    pub steamid: String,
    pub owned_count: usize,
}

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct SteamOwnedGameCache {
    pub appid: u32,
    pub name: String,
    #[serde(default)]
    pub playtime_minutes: u32,
    #[serde(default)]
    pub rtime_last_played: i64,
    #[serde(default)]
    pub icon_hash: Option<String>,
}

struct SteamSession {
    account_name: String,
    steamid: String,
    access_token: String,
}

#[derive(Default)]
struct SteamBeginResponse {
    client_id: u64,
    challenge_url: String,
    request_id: Vec<u8>,
    interval: f32,
}

#[derive(Default)]
struct SteamPollResponse {
    new_client_id: u64,
    new_challenge_url: String,
    refresh_token: String,
    access_token: String,
    had_remote_interaction: bool,
    account_name: String,
}

fn steam_account_path() -> std::path::PathBuf {
    liftoff_dir().join("steam_account.json")
}

fn steam_owned_path() -> std::path::PathBuf {
    liftoff_dir().join("steam_owned.json")
}

fn load_steam_account_meta() -> Option<SteamAccountMeta> {
    let path = steam_account_path();
    std::fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
}

fn save_steam_account_meta(meta: &SteamAccountMeta) {
    let path = steam_account_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string_pretty(meta) {
        let _ = std::fs::write(path, json);
    }
}

fn steam_refresh_entry(account: &str) -> keyring::Result<keyring::Entry> {
    keyring::Entry::new(
        STEAM_KEYRING_SERVICE,
        &format!("steam-refresh-token:{account}"),
    )
}

fn store_steam_refresh_token(account: &str, token: &str) -> keyring::Result<()> {
    steam_refresh_entry(account)?.set_password(token)
}

fn load_steam_refresh_token(account: &str) -> Option<String> {
    steam_refresh_entry(account).ok()?.get_password().ok()
}

fn clear_steam_refresh_token(account: &str) {
    let _ = steam_refresh_entry(account).and_then(|entry| entry.delete_credential());
}

fn load_owned_steam_games() -> Vec<SteamOwnedGameCache> {
    let path = steam_owned_path();
    std::fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_owned_steam_games(games: &[SteamOwnedGameCache]) {
    let path = steam_owned_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string_pretty(games) {
        let _ = std::fs::write(path, json);
    }
}

fn unix_now_i64() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or_default()
}

fn proto_key(field: u32, wire_type: u8) -> u64 {
    ((field as u64) << 3) | wire_type as u64
}

fn proto_varint(buf: &mut Vec<u8>, mut value: u64) {
    while value >= 0x80 {
        buf.push((value as u8) | 0x80);
        value >>= 7;
    }
    buf.push(value as u8);
}

fn proto_field_varint(buf: &mut Vec<u8>, field: u32, value: u64) {
    proto_varint(buf, proto_key(field, 0));
    proto_varint(buf, value);
}

fn proto_field_i32(buf: &mut Vec<u8>, field: u32, value: i32) {
    proto_field_varint(buf, field, value as i64 as u64);
}

fn proto_field_fixed64(buf: &mut Vec<u8>, field: u32, value: u64) {
    proto_varint(buf, proto_key(field, 1));
    buf.extend_from_slice(&value.to_le_bytes());
}

fn proto_field_string(buf: &mut Vec<u8>, field: u32, value: &str) {
    proto_varint(buf, proto_key(field, 2));
    proto_varint(buf, value.len() as u64);
    buf.extend_from_slice(value.as_bytes());
}

fn proto_field_bytes(buf: &mut Vec<u8>, field: u32, value: &[u8]) {
    proto_varint(buf, proto_key(field, 2));
    proto_varint(buf, value.len() as u64);
    buf.extend_from_slice(value);
}

fn build_steam_device_details() -> Vec<u8> {
    let mut buf = Vec::new();
    proto_field_string(&mut buf, 1, "LiftOff");
    proto_field_varint(&mut buf, 2, STEAM_WEBBROWSER_PLATFORM);
    proto_field_i32(&mut buf, 3, -1);
    buf
}

fn build_steam_qr_begin_request() -> Vec<u8> {
    let mut buf = Vec::new();
    proto_field_string(&mut buf, 1, "LiftOff");
    proto_field_varint(&mut buf, 2, STEAM_WEBBROWSER_PLATFORM);
    proto_field_bytes(&mut buf, 3, &build_steam_device_details());
    proto_field_string(&mut buf, 4, "Community");
    buf
}

fn build_steam_poll_request(client_id: u64, request_id: &[u8]) -> Vec<u8> {
    let mut buf = Vec::new();
    proto_field_varint(&mut buf, 1, client_id);
    proto_field_bytes(&mut buf, 2, request_id);
    buf
}

fn build_steam_generate_access_request(refresh_token: &str, steamid: u64) -> Vec<u8> {
    let mut buf = Vec::new();
    proto_field_string(&mut buf, 1, refresh_token);
    proto_field_fixed64(&mut buf, 2, steamid);
    buf
}

fn read_proto_varint(data: &[u8], index: &mut usize) -> Option<u64> {
    let mut shift = 0;
    let mut value = 0u64;
    while *index < data.len() && shift < 64 {
        let byte = data[*index];
        *index += 1;
        value |= ((byte & 0x7f) as u64) << shift;
        if byte & 0x80 == 0 {
            return Some(value);
        }
        shift += 7;
    }
    None
}

fn read_proto_len(data: &[u8], index: &mut usize) -> Option<Vec<u8>> {
    let len = read_proto_varint(data, index)? as usize;
    if data.len().saturating_sub(*index) < len {
        return None;
    }
    let value = data[*index..*index + len].to_vec();
    *index += len;
    Some(value)
}

fn skip_proto_field(data: &[u8], index: &mut usize, wire_type: u8) -> Option<()> {
    match wire_type {
        0 => {
            read_proto_varint(data, index)?;
        }
        1 => *index = index.checked_add(8)?,
        2 => {
            let len = read_proto_varint(data, index)? as usize;
            *index = index.checked_add(len)?;
        }
        5 => *index = index.checked_add(4)?,
        _ => return None,
    }
    if *index <= data.len() {
        Some(())
    } else {
        None
    }
}

fn decode_steam_begin_response(data: &[u8]) -> SteamBeginResponse {
    let mut response = SteamBeginResponse::default();
    let mut index = 0usize;
    while index < data.len() {
        let Some(key) = read_proto_varint(data, &mut index) else {
            break;
        };
        let field = (key >> 3) as u32;
        let wire = (key & 0x7) as u8;
        match (field, wire) {
            (1, 0) => response.client_id = read_proto_varint(data, &mut index).unwrap_or_default(),
            (2, 2) => {
                response.challenge_url =
                    String::from_utf8_lossy(&read_proto_len(data, &mut index).unwrap_or_default())
                        .to_string();
            }
            (3, 2) => response.request_id = read_proto_len(data, &mut index).unwrap_or_default(),
            (4, 5) => {
                if data.len().saturating_sub(index) >= 4 {
                    response.interval = f32::from_le_bytes([
                        data[index],
                        data[index + 1],
                        data[index + 2],
                        data[index + 3],
                    ]);
                    index += 4;
                } else {
                    break;
                }
            }
            _ => {
                if skip_proto_field(data, &mut index, wire).is_none() {
                    break;
                }
            }
        }
    }
    response
}

fn decode_steam_poll_response(data: &[u8]) -> SteamPollResponse {
    let mut response = SteamPollResponse::default();
    let mut index = 0usize;
    while index < data.len() {
        let Some(key) = read_proto_varint(data, &mut index) else {
            break;
        };
        let field = (key >> 3) as u32;
        let wire = (key & 0x7) as u8;
        match (field, wire) {
            (1, 0) => {
                response.new_client_id = read_proto_varint(data, &mut index).unwrap_or_default()
            }
            (2, 2) => {
                response.new_challenge_url =
                    String::from_utf8_lossy(&read_proto_len(data, &mut index).unwrap_or_default())
                        .to_string();
            }
            (3, 2) => {
                response.refresh_token =
                    String::from_utf8_lossy(&read_proto_len(data, &mut index).unwrap_or_default())
                        .to_string();
            }
            (4, 2) => {
                response.access_token =
                    String::from_utf8_lossy(&read_proto_len(data, &mut index).unwrap_or_default())
                        .to_string();
            }
            (5, 0) => {
                response.had_remote_interaction =
                    read_proto_varint(data, &mut index).unwrap_or(0) != 0
            }
            (6, 2) => {
                response.account_name =
                    String::from_utf8_lossy(&read_proto_len(data, &mut index).unwrap_or_default())
                        .to_string();
            }
            _ => {
                if skip_proto_field(data, &mut index, wire).is_none() {
                    break;
                }
            }
        }
    }
    response
}

fn decode_steam_access_response(data: &[u8]) -> (String, Option<String>) {
    let mut access_token = String::new();
    let mut refresh_token = None;
    let mut index = 0usize;
    while index < data.len() {
        let Some(key) = read_proto_varint(data, &mut index) else {
            break;
        };
        let field = (key >> 3) as u32;
        let wire = (key & 0x7) as u8;
        match (field, wire) {
            (1, 2) => {
                access_token =
                    String::from_utf8_lossy(&read_proto_len(data, &mut index).unwrap_or_default())
                        .to_string();
            }
            (2, 2) => {
                refresh_token = Some(
                    String::from_utf8_lossy(&read_proto_len(data, &mut index).unwrap_or_default())
                        .to_string(),
                );
            }
            _ => {
                if skip_proto_field(data, &mut index, wire).is_none() {
                    break;
                }
            }
        }
    }
    (
        access_token,
        refresh_token.filter(|token| !token.is_empty()),
    )
}

fn steam_auth_post(method: &str, request: Vec<u8>) -> Result<Vec<u8>, String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(|_| "Steam auth client failed".to_string())?;
    let url = format!(
        "https://api.steampowered.com/IAuthenticationService/{}/v1/",
        method
    );
    let encoded = general_purpose::STANDARD.encode(request);
    let response = client
        .post(url)
        .form(&[("input_protobuf_encoded", encoded)])
        .send()
        .map_err(|_| "Steam auth request failed".to_string())?;
    let status = response.status();
    let eresult = response
        .headers()
        .get("x-eresult")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());
    let bytes = response
        .bytes()
        .map_err(|_| "Steam auth response failed".to_string())?;
    if !status.is_success() {
        return Err(format!("Steam auth HTTP {}", status.as_u16()));
    }
    if let Some(code) = eresult {
        if code != "1" {
            return Err(format!("Steam auth EResult {}", code));
        }
    }
    Ok(bytes.to_vec())
}

fn jwt_steamid(access_token: &str) -> Result<String, String> {
    let payload = access_token
        .split('.')
        .nth(1)
        .ok_or_else(|| "Steam token payload missing".to_string())?;
    let decoded = general_purpose::URL_SAFE_NO_PAD
        .decode(payload)
        .or_else(|_| general_purpose::URL_SAFE.decode(payload))
        .map_err(|_| "Steam token payload decode failed".to_string())?;
    let value: serde_json::Value = serde_json::from_slice(&decoded)
        .map_err(|_| "Steam token payload parse failed".to_string())?;
    value
        .get("sub")
        .and_then(|v| v.as_str())
        .filter(|s| s.chars().all(|c| c.is_ascii_digit()))
        .map(|s| s.to_string())
        .ok_or_else(|| "Steam token steamid missing".to_string())
}

fn generate_steam_access_token(account: &str, steamid: &str) -> Result<SteamSession, String> {
    let refresh_token = load_steam_refresh_token(account)
        .ok_or_else(|| "Steam refresh token unavailable".to_string())?;
    let steamid_u64 = steamid
        .parse::<u64>()
        .map_err(|_| "Steam account id invalid".to_string())?;
    let response = steam_auth_post(
        "GenerateAccessTokenForApp",
        build_steam_generate_access_request(&refresh_token, steamid_u64),
    )?;
    let (access_token, new_refresh) = decode_steam_access_response(&response);
    if access_token.is_empty() {
        return Err("Steam access token unavailable".to_string());
    }
    if let Some(token) = new_refresh {
        let _ = store_steam_refresh_token(account, &token);
    }
    Ok(SteamSession {
        account_name: account.to_string(),
        steamid: steamid.to_string(),
        access_token,
    })
}

fn fetch_owned_games_for_session(
    session: &SteamSession,
) -> Result<Vec<SteamOwnedGameCache>, String> {
    #[derive(Deserialize)]
    struct OwnedResponse {
        response: OwnedBody,
    }
    #[derive(Deserialize, Default)]
    struct OwnedBody {
        #[serde(default)]
        games: Vec<OwnedGame>,
    }
    #[derive(Deserialize)]
    struct OwnedGame {
        appid: u32,
        name: String,
        #[serde(default)]
        playtime_forever: u32,
        #[serde(default)]
        rtime_last_played: i64,
        #[serde(default)]
        img_icon_url: Option<String>,
    }

    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|_| "Steam owned-games client failed".to_string())?;
    let response = client
        .get("https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/")
        .query(&[
            ("access_token", session.access_token.as_str()),
            ("steamid", session.steamid.as_str()),
            ("include_appinfo", "true"),
            ("include_played_free_games", "true"),
            ("format", "json"),
        ])
        .send()
        .map_err(|_| "Steam owned-games request failed".to_string())?;
    if !response.status().is_success() {
        return Err(format!(
            "Steam owned-games HTTP {}",
            response.status().as_u16()
        ));
    }
    let parsed = response
        .json::<OwnedResponse>()
        .map_err(|_| "Steam owned-games response parse failed".to_string())?;
    Ok(parsed
        .response
        .games
        .into_iter()
        .filter(|game| !game.name.trim().is_empty())
        .map(|game| SteamOwnedGameCache {
            appid: game.appid,
            name: game.name,
            playtime_minutes: game.playtime_forever,
            rtime_last_played: game.rtime_last_played,
            icon_hash: game.img_icon_url,
        })
        .collect())
}

fn cache_owned_games_for_session(
    session: &SteamSession,
) -> Result<Vec<SteamOwnedGameCache>, String> {
    let games = fetch_owned_games_for_session(session)?;
    save_owned_steam_games(&games);
    save_steam_account_meta(&SteamAccountMeta {
        account_name: session.account_name.clone(),
        steamid: session.steamid.clone(),
        owned_count: games.len(),
        updated_at: unix_now_i64(),
    });
    Ok(games)
}

fn run_steam_qr_login(app: tauri::AppHandle) -> Result<SteamSession, String> {
    let begin_bytes = steam_auth_post("BeginAuthSessionViaQR", build_steam_qr_begin_request())?;
    let begin = decode_steam_begin_response(&begin_bytes);
    if begin.client_id == 0 || begin.challenge_url.is_empty() || begin.request_id.is_empty() {
        return Err("Steam QR challenge missing".to_string());
    }
    let _ = app.emit("steam-qr-url", begin.challenge_url.clone());
    let interval = begin.interval.max(2.0).min(10.0);
    let started = Instant::now();
    let mut client_id = begin.client_id;
    let mut sent_confirmed = false;

    loop {
        if started.elapsed() > Duration::from_secs(STEAM_QR_TIMEOUT_SECS) {
            let _ = app.emit("steam-qr-expired", ());
            return Err("expired".to_string());
        }
        std::thread::sleep(Duration::from_secs_f32(interval));
        let poll_bytes = steam_auth_post(
            "PollAuthSessionStatus",
            build_steam_poll_request(client_id, &begin.request_id),
        )?;
        let poll = decode_steam_poll_response(&poll_bytes);
        if poll.new_client_id != 0 {
            client_id = poll.new_client_id;
        }
        if !poll.new_challenge_url.is_empty() {
            let _ = app.emit("steam-qr-url", poll.new_challenge_url.clone());
        }
        if poll.had_remote_interaction && !sent_confirmed {
            sent_confirmed = true;
            let _ = app.emit("steam-qr-confirmed", ());
        }
        if !poll.refresh_token.is_empty() && !poll.access_token.is_empty() {
            let steamid = jwt_steamid(&poll.access_token)?;
            let account = if poll.account_name.trim().is_empty() {
                steamid.clone()
            } else {
                poll.account_name
            };
            store_steam_refresh_token(&account, &poll.refresh_token)
                .map_err(|_| "Steam token storage failed".to_string())?;
            return Ok(SteamSession {
                account_name: account,
                steamid,
                access_token: poll.access_token,
            });
        }
    }
}

fn steam_status_inner() -> SteamStatus {
    let Some(meta) = load_steam_account_meta() else {
        return SteamStatus::default();
    };
    let connected =
        !meta.account_name.is_empty() && load_steam_refresh_token(&meta.account_name).is_some();
    SteamStatus {
        connected,
        account_name: if meta.account_name.is_empty() {
            None
        } else {
            Some(meta.account_name)
        },
        steamid: if meta.steamid.is_empty() {
            None
        } else {
            Some(meta.steamid)
        },
        owned_count: meta.owned_count,
        updated_at: if meta.updated_at > 0 {
            Some(meta.updated_at)
        } else {
            None
        },
    }
}

fn emit_steam_account_changed(app: &tauri::AppHandle) {
    let _ = app.emit("steam-account-changed", steam_status_inner());
}

fn merge_owned_steam_games(apps: &mut Vec<AppEntry>, installed: &[AppEntry]) {
    let installed_ids: std::collections::HashSet<String> =
        installed.iter().map(|app| app.id.clone()).collect();
    for owned in load_owned_steam_games() {
        let id = format!("steam://rungameid/{}", owned.appid);
        if installed_ids.contains(&id) {
            continue;
        }
        apps.push(AppEntry {
            id: id.clone(),
            name: owned.name,
            icon_base64: None,
            launch_path: id,
            app_type: "game".to_string(),
            source: "steam".to_string(),
            install_dir: None,
            installed: false,
            playtime_minutes: Some(owned.playtime_minutes),
            last_played: if owned.rtime_last_played > 0 {
                Some(owned.rtime_last_played)
            } else {
                None
            },
            steam_appid: Some(owned.appid),
            steam_icon_hash: owned.icon_hash,
        });
    }
}

#[tauri::command]
fn steam_account_status() -> SteamStatus {
    steam_status_inner()
}

#[tauri::command]
fn steam_qr_begin(app_handle: tauri::AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || match run_steam_qr_login(app_handle.clone()) {
        Ok(session) => {
            let owned_count = cache_owned_games_for_session(&session)
                .map(|games| games.len())
                .unwrap_or_default();
            let payload = SteamLoginPayload {
                account_name: session.account_name,
                steamid: session.steamid,
                owned_count,
            };
            let _ = app_handle.emit("steam-login-success", payload);
            emit_steam_account_changed(&app_handle);
        }
        Err(error) if error == "expired" => {}
        Err(_) => {
            let _ = app_handle.emit("steam-login-error", "Steam sign-in failed");
        }
    });
    Ok(())
}

#[tauri::command]
fn fetch_steam_owned_games(app_handle: tauri::AppHandle) -> Result<(), String> {
    let status = steam_status_inner();
    let Some(account) = status.account_name else {
        return Err("Steam account not connected".to_string());
    };
    let Some(steamid) = status.steamid else {
        return Err("Steam account id missing".to_string());
    };
    tauri::async_runtime::spawn_blocking(move || {
        let result = generate_steam_access_token(&account, &steamid)
            .and_then(|session| cache_owned_games_for_session(&session).map(|games| games.len()));
        match result {
            Ok(count) => {
                let _ = app_handle.emit("steam-owned-refresh", count);
                emit_steam_account_changed(&app_handle);
            }
            Err(_) => {
                let _ = app_handle.emit("steam-login-error", "Steam library refresh failed");
            }
        }
    });
    Ok(())
}

#[tauri::command]
fn steam_logout(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(meta) = load_steam_account_meta() {
        clear_steam_refresh_token(&meta.account_name);
    }
    let _ = std::fs::remove_file(steam_account_path());
    let _ = std::fs::remove_file(steam_owned_path());
    emit_steam_account_changed(&app_handle);
    Ok(())
}

// Spotify integration -------------------------------------------------------
//
// Auth uses Authorization Code with PKCE. No client secret is ever used or
// stored. Users provide their own Client ID because Spotify Development Mode
// apps are capped for shared distribution, matching LiftOff's user-supplied
// credential pattern for SteamGridDB.
//
// Secret handling:
// - refresh_token: Windows Credential Manager via keyring, never on disk/logged
// - client_id: spotify.json, not a secret
// - access_token: returned to the frontend for the session only, never persisted

const SPOTIFY_KEYRING_SERVICE: &str = "com.taylo.liftoff.spotify";
const SPOTIFY_KEYRING_USER: &str = "refresh_token";
// Must stay in sync with the frontend SPOTIFY_REDIRECT_URI added with the UI.
const SPOTIFY_REDIRECT_PORT: u16 = 8888;
const SPOTIFY_SCOPES: &str = "user-read-playback-state user-modify-playback-state \
user-read-currently-playing user-read-private streaming playlist-read-private playlist-read-collaborative";

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct SpotifyConfig {
    #[serde(default)]
    pub client_id: String,
    #[serde(default)]
    pub connected: bool,
    #[serde(default)]
    pub product: String,
}

fn spotify_config_path() -> std::path::PathBuf {
    liftoff_dir().join("spotify.json")
}

fn load_spotify_config() -> SpotifyConfig {
    let path = spotify_config_path();
    if !path.exists() {
        return SpotifyConfig::default();
    }
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_spotify_config(cfg: &SpotifyConfig) {
    let path = spotify_config_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string(cfg) {
        let _ = std::fs::write(path, json);
    }
}

fn store_refresh_token(token: &str) -> Result<(), String> {
    let entry = keyring::Entry::new(SPOTIFY_KEYRING_SERVICE, SPOTIFY_KEYRING_USER)
        .map_err(|e| format!("keyring init failed: {e}"))?;
    entry
        .set_password(token)
        .map_err(|e| format!("keyring store failed: {e}"))
}

fn load_refresh_token() -> Option<String> {
    let entry = keyring::Entry::new(SPOTIFY_KEYRING_SERVICE, SPOTIFY_KEYRING_USER).ok()?;
    entry.get_password().ok()
}

fn clear_refresh_token() {
    if let Ok(entry) = keyring::Entry::new(SPOTIFY_KEYRING_SERVICE, SPOTIFY_KEYRING_USER) {
        let _ = entry.delete_credential();
    }
}

fn random_url_safe(len: usize) -> String {
    let mut bytes = vec![0u8; len];
    getrandom::getrandom(&mut bytes).expect("getrandom failed");
    general_purpose::URL_SAFE_NO_PAD.encode(&bytes)
}

fn pkce_challenge(verifier: &str) -> String {
    use sha2::{Digest, Sha256};
    let digest = Sha256::digest(verifier.as_bytes());
    general_purpose::URL_SAFE_NO_PAD.encode(digest)
}

#[derive(Serialize)]
struct SpotifyAuthResult {
    ok: bool,
    product: String,
}

#[tauri::command]
async fn spotify_begin_auth(
    client_id: String,
    app_handle: tauri::AppHandle,
) -> Result<SpotifyAuthResult, String> {
    let client_id = client_id.trim().to_string();
    if client_id.is_empty() {
        return Err("Client ID is empty".into());
    }

    let verifier = random_url_safe(64);
    let challenge = pkce_challenge(&verifier);
    let state = random_url_safe(16);
    let redirect_uri = format!("http://127.0.0.1:{SPOTIFY_REDIRECT_PORT}/callback");

    let listener = TcpListener::bind(("127.0.0.1", SPOTIFY_REDIRECT_PORT))
        .map_err(|e| format!("Could not bind redirect port {SPOTIFY_REDIRECT_PORT}: {e}. Make sure no other app is using it and that http://127.0.0.1:{SPOTIFY_REDIRECT_PORT}/callback is registered as a Redirect URI in your Spotify app."))?;

    let auth_url = format!(
        "https://accounts.spotify.com/authorize?response_type=code&client_id={}&scope={}&code_challenge_method=S256&code_challenge={}&redirect_uri={}&state={}",
        urlencoding::encode(&client_id),
        urlencoding::encode(SPOTIFY_SCOPES),
        urlencoding::encode(&challenge),
        urlencoding::encode(&redirect_uri),
        urlencoding::encode(&state),
    );

    use tauri_plugin_opener::OpenerExt;
    app_handle
        .opener()
        .open_url(auth_url, None::<&str>)
        .map_err(|e| format!("Could not open browser: {e}"))?;

    tauri::async_runtime::spawn_blocking(move || {
        let (code, returned_state) = wait_for_callback(listener)?;
        if returned_state != state { return Err("State mismatch; aborting Spotify authorization.".into()); }

        let tokens = spotify_exchange_code(&client_id, &code, &verifier, &redirect_uri)?;
        store_refresh_token(&tokens.refresh_token)?;
        if load_refresh_token().is_none() {
            return Err("Spotify connected in the browser, but LiftOff could not read the saved refresh token from Windows Credential Manager.".into());
        }

        let product = spotify_fetch_product(&tokens.access_token).unwrap_or_else(|| "unknown".to_string());
        let mut cfg = load_spotify_config();
        cfg.client_id = client_id;
        cfg.connected = true;
        cfg.product = product.clone();
        save_spotify_config(&cfg);

        cache_access_token(&tokens.access_token, tokens.expires_in);
        Ok(SpotifyAuthResult { ok: true, product })
    })
    .await
    .map_err(|e| format!("auth task panicked: {e}"))?
}

fn wait_for_callback(listener: TcpListener) -> Result<(String, String), String> {
    listener.set_nonblocking(false).ok();
    let (mut stream, _) = listener
        .accept()
        .map_err(|e| format!("accept failed: {e}"))?;

    let mut buf = [0u8; 2048];
    let n = stream
        .read(&mut buf)
        .map_err(|e| format!("read failed: {e}"))?;
    let req = String::from_utf8_lossy(&buf[..n]);
    let first = req.lines().next().unwrap_or("");
    let path = first.split_whitespace().nth(1).unwrap_or("");

    let body = "<html><body style='font-family:sans-serif;background:#0b110d;color:#eafff6;text-align:center;padding-top:80px'><h2>LiftOff is connected to Spotify</h2><p>You can close this tab and return to LiftOff.</p></body></html>";
    let resp = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: {}\r\n\r\n{}",
        body.len(),
        body
    );
    let _ = stream.write_all(resp.as_bytes());

    let query = path.split('?').nth(1).unwrap_or("");
    let mut code = String::new();
    let mut state = String::new();
    for pair in query.split('&') {
        let mut it = pair.splitn(2, '=');
        match (it.next(), it.next()) {
            (Some("code"), Some(v)) => {
                code = urlencoding::decode(v).unwrap_or_default().into_owned()
            }
            (Some("state"), Some(v)) => {
                state = urlencoding::decode(v).unwrap_or_default().into_owned()
            }
            (Some("error"), Some(v)) => return Err(format!("Spotify returned error: {v}")),
            _ => {}
        }
    }

    if code.is_empty() {
        return Err("No authorization code in callback.".into());
    }
    Ok((code, state))
}

struct SpotifyTokens {
    access_token: String,
    refresh_token: String,
    expires_in: u64,
}

// One pooled HTTP client for all Spotify traffic. Connection reuse avoids a
// fresh TLS handshake on every poll/control call, and the timeouts keep a
// flaky request from hanging a control press indefinitely.
static SPOTIFY_HTTP: std::sync::OnceLock<reqwest::blocking::Client> = std::sync::OnceLock::new();

fn spotify_http() -> reqwest::blocking::Client {
    SPOTIFY_HTTP
        .get_or_init(|| {
            reqwest::blocking::Client::builder()
                .connect_timeout(Duration::from_secs(6))
                .timeout(Duration::from_secs(12))
                .build()
                .unwrap_or_else(|_| reqwest::blocking::Client::new())
        })
        .clone()
}

// All Spotify Web API work is blocking (reqwest::blocking + keyring), so it
// must never run on the main thread where it would serialize with every other
// Tauri command and stall control presses behind in-flight polls.
async fn run_spotify_blocking<T, F>(task: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(task)
        .await
        .map_err(|e| format!("Spotify task failed: {e}"))?
}

fn spotify_exchange_code(
    client_id: &str,
    code: &str,
    verifier: &str,
    redirect_uri: &str,
) -> Result<SpotifyTokens, String> {
    let client = spotify_http();
    let resp = client
        .post("https://accounts.spotify.com/api/token")
        .form(&[
            ("grant_type", "authorization_code"),
            ("code", code),
            ("redirect_uri", redirect_uri),
            ("client_id", client_id),
            ("code_verifier", verifier),
        ])
        .send()
        .map_err(|e| format!("token request failed: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("token exchange failed: HTTP {}", resp.status()));
    }

    let v: serde_json::Value = resp
        .json()
        .map_err(|e| format!("token parse failed: {e}"))?;
    let access = v["access_token"]
        .as_str()
        .ok_or("no access_token")?
        .to_string();
    let refresh = v["refresh_token"]
        .as_str()
        .ok_or("no refresh_token")?
        .to_string();
    let expires = v["expires_in"].as_u64().unwrap_or(3600);
    Ok(SpotifyTokens {
        access_token: access,
        refresh_token: refresh,
        expires_in: expires,
    })
}

fn spotify_fetch_product(access_token: &str) -> Option<String> {
    let client = spotify_http();
    let resp = client
        .get("https://api.spotify.com/v1/me")
        .bearer_auth(access_token)
        .send()
        .ok()?;
    if !resp.status().is_success() {
        return None;
    }
    let v: serde_json::Value = resp.json().ok()?;
    v["product"].as_str().map(|s| s.to_string())
}

struct CachedToken {
    token: String,
    expires_at: Instant,
}

static SPOTIFY_TOKEN: Mutex<Option<CachedToken>> = Mutex::new(None);

fn cache_access_token(token: &str, expires_in: u64) {
    let ttl = Duration::from_secs(expires_in.saturating_sub(60).max(30));
    if let Ok(mut guard) = SPOTIFY_TOKEN.lock() {
        *guard = Some(CachedToken {
            token: token.to_string(),
            expires_at: Instant::now() + ttl,
        });
    }
}

fn cached_access_token() -> Option<String> {
    let guard = SPOTIFY_TOKEN.lock().ok()?;
    let cached = guard.as_ref()?;
    if Instant::now() < cached.expires_at {
        Some(cached.token.clone())
    } else {
        None
    }
}

fn refresh_access_token() -> Result<String, String> {
    let cfg = load_spotify_config();
    if cfg.client_id.is_empty() {
        return Err("Not connected".into());
    }
    let refresh = load_refresh_token().ok_or("No refresh token stored")?;

    let client = spotify_http();
    let resp = client
        .post("https://accounts.spotify.com/api/token")
        .form(&[
            ("grant_type", "refresh_token"),
            ("refresh_token", refresh.as_str()),
            ("client_id", cfg.client_id.as_str()),
        ])
        .send()
        .map_err(|e| format!("refresh request failed: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("refresh failed: HTTP {}", resp.status()));
    }

    let v: serde_json::Value = resp
        .json()
        .map_err(|e| format!("refresh parse failed: {e}"))?;
    let access = v["access_token"]
        .as_str()
        .ok_or("no access_token on refresh")?
        .to_string();
    let expires = v["expires_in"].as_u64().unwrap_or(3600);
    if let Some(new_refresh) = v["refresh_token"].as_str() {
        let _ = store_refresh_token(new_refresh);
    }
    cache_access_token(&access, expires);
    Ok(access)
}

fn spotify_access_token_blocking() -> Result<String, String> {
    if let Some(token) = cached_access_token() {
        return Ok(token);
    }
    refresh_access_token()
}

#[tauri::command]
async fn spotify_access_token() -> Result<String, String> {
    run_spotify_blocking(spotify_access_token_blocking).await
}

#[derive(Serialize)]
struct SpotifyStatus {
    connected: bool,
    client_id_set: bool,
    product: String,
}

#[tauri::command]
async fn spotify_status() -> SpotifyStatus {
    // Keyring + file reads are blocking; keep them off the main thread.
    run_spotify_blocking(|| {
        let cfg = load_spotify_config();
        Ok(SpotifyStatus {
            connected: cfg.connected && load_refresh_token().is_some(),
            client_id_set: !cfg.client_id.is_empty(),
            product: cfg.product,
        })
    })
    .await
    .unwrap_or(SpotifyStatus {
        connected: false,
        client_id_set: false,
        product: String::new(),
    })
}

#[tauri::command]
async fn spotify_disconnect() -> Result<(), String> {
    run_spotify_blocking(|| {
        clear_refresh_token();
        if let Ok(mut guard) = SPOTIFY_TOKEN.lock() {
            *guard = None;
        }

        let mut cfg = load_spotify_config();
        cfg.connected = false;
        cfg.product = String::new();
        save_spotify_config(&cfg);
        Ok(())
    })
    .await
}

fn spotify_api(
    method: &str,
    path: &str,
    body: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    fn once(
        token: &str,
        method: &str,
        url: &str,
        body: &Option<serde_json::Value>,
    ) -> Result<reqwest::blocking::Response, String> {
        let client = spotify_http();
        let mut req = match method {
            "GET" => client.get(url),
            "PUT" => client.put(url),
            "POST" => client.post(url),
            other => return Err(format!("unsupported method {other}")),
        }
        .bearer_auth(token);
        if let Some(json) = body {
            req = req.json(json);
        } else if method == "PUT" || method == "POST" {
            req = req.body(Vec::new());
        }
        req.send().map_err(|e| format!("request failed: {e}"))
    }

    let url = format!("https://api.spotify.com/v1{path}");
    let token = spotify_access_token_blocking()?;
    let mut resp = once(&token, method, &url, &body)?;

    if resp.status().as_u16() == 401 {
        let token = refresh_access_token()?;
        resp = once(&token, method, &url, &body)?;
    }

    let status = resp.status();
    if status.as_u16() == 204 {
        return Ok(serde_json::Value::Null);
    }

    let text = resp.text().unwrap_or_default();
    if !status.is_success() {
        return Err(spotify_api_error(status, &text));
    }

    if method != "GET" {
        return Ok(serde_json::Value::Null);
    }
    if text.trim().is_empty() {
        return Ok(serde_json::Value::Null);
    }
    serde_json::from_str(&text).map_err(|e| format!("parse failed: {e}"))
}

fn spotify_api_error(status: reqwest::StatusCode, body: &str) -> String {
    let parsed: Option<serde_json::Value> = serde_json::from_str(body).ok();
    let error = parsed.as_ref().and_then(|v| v.get("error"));
    let reason = error
        .and_then(|v| v.get("reason"))
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let message = error
        .and_then(|v| v.get("message"))
        .and_then(|v| v.as_str())
        .or_else(|| {
            parsed
                .as_ref()
                .and_then(|v| v.get("error_description"))
                .and_then(|v| v.as_str())
        })
        .unwrap_or("");
    let combined = format!("{reason} {message}").to_ascii_uppercase();

    if combined.contains("PREMIUM") {
        return "PREMIUM_REQUIRED".into();
    }
    if status.as_u16() == 404 || combined.contains("NO ACTIVE DEVICE") {
        return "NO_ACTIVE_DEVICE".into();
    }
    if !message.is_empty() {
        return format!("Spotify API error: HTTP {status} - {message}");
    }
    format!("Spotify API error: HTTP {status}")
}

#[tauri::command]
async fn spotify_playback_state() -> Result<serde_json::Value, String> {
    run_spotify_blocking(|| spotify_api("GET", "/me/player", None)).await
}

#[tauri::command]
async fn spotify_playlists() -> Result<serde_json::Value, String> {
    run_spotify_blocking(|| spotify_api("GET", "/me/playlists?limit=50", None)).await
}

#[tauri::command]
async fn spotify_devices() -> Result<serde_json::Value, String> {
    run_spotify_blocking(spotify_devices_blocking).await
}

fn spotify_devices_blocking() -> Result<serde_json::Value, String> {
    spotify_api("GET", "/me/player/devices", None)
}

fn spotify_available_device_id() -> Result<Option<String>, String> {
    let payload = spotify_devices_blocking()?;
    let devices = payload
        .get("devices")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    let device_id = |device: &serde_json::Value| {
        device
            .get("id")
            .and_then(|v| v.as_str())
            .filter(|id| !id.trim().is_empty())
            .map(|id| id.to_string())
    };
    let device_type = |device: &serde_json::Value| {
        device
            .get("type")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_ascii_lowercase()
    };

    if let Some(computer) = devices
        .iter()
        .find(|device| device_type(device) == "computer")
        .and_then(device_id)
    {
        return Ok(Some(computer));
    }

    let active = devices
        .iter()
        .find(|device| {
            device
                .get("is_active")
                .and_then(|v| v.as_bool())
                .unwrap_or(false)
        })
        .and_then(device_id);
    if active.is_some() {
        return Ok(active);
    }

    if let Some(non_phone) = devices
        .iter()
        .find(|device| {
            let kind = device_type(device);
            kind != "smartphone" && kind != "tablet"
        })
        .and_then(device_id)
    {
        return Ok(Some(non_phone));
    }

    Ok(devices.iter().find_map(device_id))
}

fn spotify_play_path(device_id: Option<&str>) -> String {
    match device_id.filter(|id| !id.trim().is_empty()) {
        Some(id) => format!("/me/player/play?device_id={}", urlencoding::encode(id)),
        None => "/me/player/play".to_string(),
    }
}

fn spotify_play_with_device_retry(
    body: Option<serde_json::Value>,
    device_id: Option<String>,
) -> Result<(), String> {
    let preferred_device_id = match device_id.filter(|id| !id.trim().is_empty()) {
        Some(id) => Some(id),
        None => spotify_available_device_id()?,
    };
    let path = spotify_play_path(preferred_device_id.as_deref());
    match spotify_api("PUT", &path, body.clone()) {
        Ok(_) => Ok(()),
        Err(err) if err.contains("NO_ACTIVE_DEVICE") && preferred_device_id.is_none() => {
            let Some(device_id) = spotify_available_device_id()? else {
                return Err(err);
            };
            let path = spotify_play_path(Some(&device_id));
            spotify_api("PUT", &path, body).map(|_| ())
        }
        Err(err) => Err(err),
    }
}

#[tauri::command]
async fn spotify_play(device_id: Option<String>) -> Result<(), String> {
    run_spotify_blocking(move || spotify_play_with_device_retry(None, device_id)).await
}

#[tauri::command]
async fn spotify_pause() -> Result<(), String> {
    run_spotify_blocking(|| spotify_api("PUT", "/me/player/pause", None).map(|_| ())).await
}

#[tauri::command]
async fn spotify_next() -> Result<(), String> {
    run_spotify_blocking(|| spotify_api("POST", "/me/player/next", None).map(|_| ())).await
}

#[tauri::command]
async fn spotify_previous() -> Result<(), String> {
    run_spotify_blocking(|| spotify_api("POST", "/me/player/previous", None).map(|_| ())).await
}

#[tauri::command]
async fn spotify_seek(position_ms: u64) -> Result<(), String> {
    run_spotify_blocking(move || {
        spotify_api(
            "PUT",
            &format!("/me/player/seek?position_ms={position_ms}"),
            None,
        )
        .map(|_| ())
    })
    .await
}

#[tauri::command]
async fn spotify_set_shuffle(state: bool) -> Result<(), String> {
    run_spotify_blocking(move || {
        spotify_api("PUT", &format!("/me/player/shuffle?state={state}"), None).map(|_| ())
    })
    .await
}

#[tauri::command]
async fn spotify_set_repeat(mode: String) -> Result<(), String> {
    run_spotify_blocking(move || {
        let mode = match mode.as_str() {
            "off" | "context" | "track" => mode.as_str(),
            _ => "off",
        };
        spotify_api("PUT", &format!("/me/player/repeat?state={mode}"), None).map(|_| ())
    })
    .await
}

#[tauri::command]
async fn spotify_play_context(
    context_uri: String,
    device_id: Option<String>,
) -> Result<(), String> {
    run_spotify_blocking(move || {
        let body = serde_json::json!({
            "context_uri": context_uri,
            "offset": { "position": 0 },
            "position_ms": 0,
        });
        spotify_play_with_device_retry(Some(body), device_id)
    })
    .await
}

#[tauri::command]
async fn spotify_transfer(device_id: String) -> Result<(), String> {
    run_spotify_blocking(move || {
        let body = serde_json::json!({ "device_ids": [device_id], "play": true });
        spotify_api("PUT", "/me/player", Some(body)).map(|_| ())
    })
    .await
}

fn load_pins_inner() -> Vec<String> {
    let path = pins_path();
    if !path.exists() {
        return vec![];
    }
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_pins_inner(pins: &Vec<String>) {
    let path = pins_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string(pins) {
        let _ = std::fs::write(path, json);
    }
}

fn load_hidden_inner() -> Vec<String> {
    let path = hidden_path();
    if !path.exists() {
        return vec![];
    }
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_hidden_inner(hidden: &Vec<String>) {
    let path = hidden_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string(hidden) {
        let _ = std::fs::write(path, json);
    }
}

// ── Custom entries (manually added apps + scan folders) ────────────────────────

#[derive(Serialize, Deserialize, Clone)]
pub struct CustomFolder {
    pub id: String,
    pub path: String,
    pub source: String,
    pub app_type: String,
    #[serde(default = "default_true")]
    pub enabled: bool,
}
fn default_true() -> bool {
    true
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AppCollection {
    pub id: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct CustomData {
    #[serde(default)]
    pub apps: Vec<AppEntry>,
    #[serde(default)]
    pub folders: Vec<CustomFolder>,
    #[serde(default)]
    pub app_collections: Vec<AppCollection>,
    #[serde(default)]
    pub app_memberships: HashMap<String, Vec<String>>,
    #[serde(default)]
    pub game_collections: Vec<AppCollection>,
    #[serde(default)]
    pub game_memberships: HashMap<String, Vec<String>>,
}

fn custom_data_path() -> std::path::PathBuf {
    liftoff_dir().join("custom_data.json")
}

fn load_custom_data() -> CustomData {
    let path = custom_data_path();
    if !path.exists() {
        return CustomData::default();
    }
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_custom_data(data: &CustomData) {
    let path = custom_data_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string(data) {
        let _ = std::fs::write(path, json);
    }
}

fn custom_art_path() -> std::path::PathBuf {
    liftoff_dir().join("custom_art.json")
}

fn load_custom_art_inner() -> HashMap<String, String> {
    let path = custom_art_path();
    if !path.exists() {
        return HashMap::new();
    }
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_custom_art_inner(map: &HashMap<String, String>) {
    let path = custom_art_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string(map) {
        let _ = std::fs::write(path, json);
    }
}

// ── File browser ───────────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub extension: String,
}

#[tauri::command]
fn list_dir(path: String) -> Vec<FileEntry> {
    let p = std::path::Path::new(&path);
    if !p.exists() || !p.is_dir() {
        return vec![];
    }
    let mut dirs: Vec<FileEntry> = Vec::new();
    let mut files: Vec<FileEntry> = Vec::new();
    if let Ok(rd) = std::fs::read_dir(p) {
        for entry in rd.flatten() {
            let ep = entry.path();
            let name = ep
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .to_string();
            if name.starts_with('$') {
                continue;
            }
            let path_str = ep.to_string_lossy().to_string();
            let ext = ep
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();
            if ep.is_dir() {
                dirs.push(FileEntry {
                    name,
                    path: path_str,
                    is_dir: true,
                    extension: String::new(),
                });
            } else if ext == "exe" || ext == "lnk" {
                files.push(FileEntry {
                    name,
                    path: path_str,
                    is_dir: false,
                    extension: ext,
                });
            }
        }
    }
    dirs.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    dirs.extend(files);
    dirs
}

#[tauri::command]
fn get_drives() -> Vec<FileEntry> {
    let mut drives = Vec::new();
    for c in b'A'..=b'Z' {
        let drive = format!("{}:\\", c as char);
        if std::path::Path::new(&drive).exists() {
            drives.push(FileEntry {
                name: drive.clone(),
                path: drive,
                is_dir: true,
                extension: String::new(),
            });
        }
    }
    drives
}

#[tauri::command]
fn get_custom_data() -> CustomData {
    load_custom_data()
}

#[tauri::command]
fn add_custom_app(
    name: String,
    path: String,
    app_type: String,
    source: String,
    id: Option<String>,
) -> Result<AppEntry, String> {
    let mut data = load_custom_data();
    let id = id
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| {
            format!(
                "custom_{}",
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis()
            )
        });
    let icon = if path.starts_with("http://") || path.starts_with("https://") {
        None
    } else {
        extract_icon_base64(&path)
    };
    let entry = AppEntry {
        id,
        name,
        icon_base64: icon,
        launch_path: path,
        app_type,
        source,
        install_dir: None,
        installed: true,
        ..Default::default()
    };
    if let Some(existing) = data.apps.iter_mut().find(|app| app.id == entry.id) {
        *existing = entry.clone();
    } else {
        data.apps.push(entry.clone());
    }
    save_custom_data(&data);
    Ok(entry)
}

#[tauri::command]
fn remove_custom_app(id: String) -> Result<(), String> {
    let mut data = load_custom_data();
    data.apps.retain(|a| a.id != id);
    save_custom_data(&data);
    Ok(())
}

#[tauri::command]
fn rename_custom_app(id: String, name: String) -> Result<(), String> {
    let mut data = load_custom_data();
    if let Some(app) = data.apps.iter_mut().find(|a| a.id == id) {
        app.name = name;
    }
    save_custom_data(&data);
    Ok(())
}

#[tauri::command]
fn rename_app(id: String, name: String) -> Result<(), String> {
    // For custom apps, also update the name in custom_data.json
    if id.starts_with("custom_") {
        let mut data = load_custom_data();
        if let Some(app) = data.apps.iter_mut().find(|a| a.id == id) {
            app.name = name.clone();
        }
        save_custom_data(&data);
    }
    // Store override in custom_names.json for all app types
    let mut names = load_custom_names();
    names.insert(id, name);
    save_custom_names(&names);
    Ok(())
}

#[tauri::command]
fn get_custom_categories() -> std::collections::HashMap<String, CategoryOverride> {
    load_custom_categories()
}

/// Set (or clear) the category override for an app/game id.
/// Passing both fields as None removes the override entirely.
#[tauri::command]
fn set_app_category(
    id: String,
    app_type: Option<String>,
    source: Option<String>,
) -> Result<(), String> {
    // Validate app_type: only "game" or "app" are accepted; anything else is dropped.
    let app_type = app_type.filter(|t| t == "game" || t == "app");
    // Validate source: must be non-empty when present.
    let source = source.filter(|s| !s.trim().is_empty());

    let mut map = load_custom_categories();
    if app_type.is_none() && source.is_none() {
        map.remove(&id);
    } else {
        map.insert(id, CategoryOverride { app_type, source });
    }
    save_custom_categories(&map);
    Ok(())
}

#[tauri::command]
fn remove_custom_source(source: String) -> Result<(), String> {
    let mut data = load_custom_data();
    for app in data.apps.iter_mut() {
        if app.source == source {
            app.source = "other".to_string();
        }
    }
    for folder in data.folders.iter_mut() {
        if folder.source == source {
            folder.source = "other".to_string();
        }
    }
    save_custom_data(&data);
    Ok(())
}

#[tauri::command]
fn add_custom_folder(
    path: String,
    source: String,
    app_type: String,
) -> Result<CustomFolder, String> {
    let mut data = load_custom_data();
    let id = format!(
        "folder_{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
    );
    let folder = CustomFolder {
        id,
        path,
        source,
        app_type,
        enabled: true,
    };
    data.folders.push(folder.clone());
    save_custom_data(&data);
    Ok(folder)
}

#[tauri::command]
fn remove_custom_folder(id: String) -> Result<(), String> {
    let mut data = load_custom_data();
    data.folders.retain(|f| f.id != id);
    save_custom_data(&data);
    Ok(())
}

#[tauri::command]
fn toggle_custom_folder(id: String, enabled: bool) -> Result<(), String> {
    let mut data = load_custom_data();
    if let Some(f) = data.folders.iter_mut().find(|f| f.id == id) {
        f.enabled = enabled;
    }
    save_custom_data(&data);
    Ok(())
}

#[tauri::command]
fn get_app_collections() -> Vec<AppCollection> {
    load_custom_data().app_collections
}

#[tauri::command]
fn create_app_collection(name: String) -> Result<AppCollection, String> {
    let mut data = load_custom_data();
    let id = format!(
        "col_{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
    );
    let col = AppCollection { id, name };
    data.app_collections.push(col.clone());
    save_custom_data(&data);
    Ok(col)
}

#[tauri::command]
fn delete_app_collection(id: String) -> Result<(), String> {
    let mut data = load_custom_data();
    data.app_collections.retain(|c| c.id != id);
    data.app_memberships.retain(|_, v| {
        v.retain(|cid| cid != &id);
        true
    });
    save_custom_data(&data);
    Ok(())
}

#[tauri::command]
fn rename_app_collection(id: String, name: String) -> Result<(), String> {
    let mut data = load_custom_data();
    if let Some(c) = data.app_collections.iter_mut().find(|c| c.id == id) {
        c.name = name;
    }
    save_custom_data(&data);
    Ok(())
}

#[tauri::command]
fn get_app_memberships() -> HashMap<String, Vec<String>> {
    load_custom_data().app_memberships
}

#[tauri::command]
fn set_app_memberships(app_id: String, collection_ids: Vec<String>) -> Result<(), String> {
    let mut data = load_custom_data();
    if collection_ids.is_empty() {
        data.app_memberships.remove(&app_id);
    } else {
        data.app_memberships.insert(app_id, collection_ids);
    }
    save_custom_data(&data);
    Ok(())
}

#[tauri::command]
fn get_game_collections() -> Vec<AppCollection> {
    load_custom_data().game_collections
}

#[tauri::command]
fn create_game_collection(name: String) -> Result<AppCollection, String> {
    let mut data = load_custom_data();
    let id = format!(
        "gcol_{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
    );
    let col = AppCollection { id, name };
    data.game_collections.push(col.clone());
    save_custom_data(&data);
    Ok(col)
}

#[tauri::command]
fn delete_game_collection(id: String) -> Result<(), String> {
    let mut data = load_custom_data();
    data.game_collections.retain(|c| c.id != id);
    data.game_memberships.retain(|_, v| {
        v.retain(|cid| cid != &id);
        true
    });
    save_custom_data(&data);
    Ok(())
}

#[tauri::command]
fn rename_game_collection(id: String, name: String) -> Result<(), String> {
    let mut data = load_custom_data();
    if let Some(c) = data.game_collections.iter_mut().find(|c| c.id == id) {
        c.name = name;
    }
    save_custom_data(&data);
    Ok(())
}

#[tauri::command]
fn get_game_memberships() -> HashMap<String, Vec<String>> {
    load_custom_data().game_memberships
}

#[tauri::command]
fn set_game_memberships(app_id: String, collection_ids: Vec<String>) -> Result<(), String> {
    let mut data = load_custom_data();
    if collection_ids.is_empty() {
        data.game_memberships.remove(&app_id);
    } else {
        data.game_memberships.insert(app_id, collection_ids);
    }
    save_custom_data(&data);
    Ok(())
}

#[derive(Serialize)]
struct ScreenResolution {
    width: i32,
    height: i32,
}

#[tauri::command]
fn get_screen_resolution() -> ScreenResolution {
    unsafe {
        ScreenResolution {
            width: GetSystemMetrics(SM_CXSCREEN),
            height: GetSystemMetrics(SM_CYSCREEN),
        }
    }
}

fn get_primary_display_resolution() -> (i32, i32) {
    unsafe { (GetSystemMetrics(SM_CXSCREEN), GetSystemMetrics(SM_CYSCREEN)) }
}

enum BrowserFamily {
    Chromium,
    Unsupported,
}

fn registry_string_value(
    root: windows::Win32::System::Registry::HKEY,
    subkey: &str,
    value: Option<&str>,
) -> Option<String> {
    unsafe {
        use windows::core::PCWSTR;
        use windows::Win32::System::Registry::{
            RegCloseKey, RegOpenKeyExW, RegQueryValueExW, HKEY, KEY_READ,
        };

        let wide_key: Vec<u16> = std::ffi::OsStr::new(subkey)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();
        let wide_value = value.map(|name| {
            std::ffi::OsStr::new(name)
                .encode_wide()
                .chain(std::iter::once(0))
                .collect::<Vec<u16>>()
        });
        let value_ptr = wide_value
            .as_ref()
            .map(|name| PCWSTR(name.as_ptr()))
            .unwrap_or_else(PCWSTR::null);
        let mut hkey = HKEY::default();
        if RegOpenKeyExW(root, PCWSTR(wide_key.as_ptr()), 0, KEY_READ, &mut hkey).is_err() {
            return None;
        }

        let mut buf_len = 0u32;
        let size_ok =
            RegQueryValueExW(hkey, value_ptr, None, None, None, Some(&mut buf_len)).is_ok();
        if !size_ok || buf_len < 2 {
            let _ = RegCloseKey(hkey);
            return None;
        }

        let mut buf = vec![0u8; buf_len as usize];
        let ok = RegQueryValueExW(
            hkey,
            value_ptr,
            None,
            None,
            Some(buf.as_mut_ptr()),
            Some(&mut buf_len),
        )
        .is_ok();
        let _ = RegCloseKey(hkey);
        if !ok || buf_len < 2 {
            return None;
        }

        let wchars: Vec<u16> = buf[..buf_len as usize]
            .chunks_exact(2)
            .map(|c| u16::from_le_bytes([c[0], c[1]]))
            .collect();
        let value = String::from_utf16_lossy(&wchars)
            .trim_end_matches('\0')
            .trim()
            .to_string();
        (!value.is_empty()).then_some(value)
    }
}

fn browser_exe_from_command(command: &str) -> Option<String> {
    let trimmed = command.trim();
    if let Some(rest) = trimmed.strip_prefix('"') {
        let end = rest.find('"')?;
        let exe = rest[..end].trim();
        return (!exe.is_empty()).then(|| exe.to_string());
    }

    let lower = trimmed.to_lowercase();
    let exe_end = lower.find(".exe").map(|idx| idx + 4)?;
    let exe = trimmed[..exe_end].trim().trim_matches('"');
    (!exe.is_empty()).then(|| exe.to_string())
}

fn browser_exe_filename(exe_path: &str) -> String {
    Path::new(exe_path)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or_default()
        .to_lowercase()
}

fn resolve_browser_exe_for_kiosk(exe_path: &str) -> Option<String> {
    let filename = browser_exe_filename(exe_path);
    if filename != "launcher.exe" {
        return Some(exe_path.to_string());
    }

    let path = Path::new(exe_path);
    let lower_path = exe_path.to_lowercase();
    let candidates = [
        path.with_file_name("opera.exe"),
        path.parent()
            .and_then(|parent| parent.parent())
            .map(|parent| parent.join("opera.exe"))
            .unwrap_or_default(),
    ];

    if lower_path.contains("opera") {
        return candidates
            .iter()
            .find(|candidate| candidate.exists())
            .map(|candidate| candidate.to_string_lossy().into_owned());
    }

    None
}

fn get_default_browser_exe() -> Option<String> {
    use windows::Win32::System::Registry::{HKEY_CLASSES_ROOT, HKEY_CURRENT_USER};

    let command = if let Some(prog_id) = registry_string_value(
        HKEY_CURRENT_USER,
        "Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\https\\UserChoice",
        Some("ProgId"),
    ) {
        let hkcu_command_key = format!("Software\\Classes\\{}\\shell\\open\\command", prog_id);
        let hkcr_command_key = format!("{}\\shell\\open\\command", prog_id);
        registry_string_value(HKEY_CURRENT_USER, &hkcu_command_key, None)
            .or_else(|| registry_string_value(HKEY_CLASSES_ROOT, &hkcr_command_key, None))
    } else {
        registry_string_value(HKEY_CLASSES_ROOT, "https\\shell\\open\\command", None)
    }?;
    browser_exe_from_command(&command).and_then(|exe| resolve_browser_exe_for_kiosk(&exe))
}

fn cloud_kiosk_profile_dir(browser_exe: &str) -> std::path::PathBuf {
    let profile_name = browser_exe_filename(browser_exe)
        .trim_end_matches(".exe")
        .replace(|ch: char| !ch.is_ascii_alphanumeric(), "_");
    liftoff_dir()
        .join("cloud-browser-profiles")
        .join(if profile_name.is_empty() {
            "chromium".to_string()
        } else {
            profile_name
        })
}

fn classify_browser(exe_path: &str) -> BrowserFamily {
    match browser_exe_filename(exe_path).as_str() {
        "msedge.exe" | "chrome.exe" | "opera.exe" | "opera_gx.exe" | "brave.exe"
        | "vivaldi.exe" => BrowserFamily::Chromium,
        _ => BrowserFamily::Unsupported,
    }
}

fn launch_cloud_game_kiosk(url: &str) -> Result<u32, String> {
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return Err("cloud kiosk launch requires an http(s) URL".to_string());
    }

    let browser_exe =
        get_default_browser_exe().ok_or_else(|| "no default browser detected".to_string())?;
    if !matches!(classify_browser(&browser_exe), BrowserFamily::Chromium) {
        return Err("default browser doesn't support kiosk mode".to_string());
    }

    let (width, height) = get_primary_display_resolution();
    let profile_dir = cloud_kiosk_profile_dir(&browser_exe);
    std::fs::create_dir_all(&profile_dir)
        .map_err(|e| format!("cloud kiosk profile unavailable: {}", e))?;
    let child = std::process::Command::new(&browser_exe)
        .arg("--kiosk")
        .arg("--edge-kiosk-type=fullscreen")
        .arg("--start-fullscreen")
        .arg("--new-window")
        .arg(format!("--window-size={},{}", width, height))
        .arg("--window-position=0,0")
        .arg("--no-first-run")
        .arg(format!("--user-data-dir={}", profile_dir.to_string_lossy()))
        .arg(url)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok(child.id())
}

#[tauri::command]
fn get_settings() -> Settings {
    load_settings_inner()
}
#[tauri::command]
fn clear_recents() -> Result<(), String> {
    save_recents(&vec![]);
    save_recent_games(&vec![]);
    Ok(())
}
#[tauri::command]
fn clear_art_cache() -> Result<(), String> {
    save_art_cache(&HashMap::new());
    save_hero_cache(&HashMap::new());
    save_hero_animated_cache(&HashMap::new());
    let _ = std::fs::remove_dir_all(art_dir());
    Ok(())
}
#[tauri::command]
fn get_recents() -> Vec<RecentEntry> {
    load_recents()
}
#[tauri::command]
fn get_recent_games() -> Vec<RecentEntry> {
    load_recent_games()
}
#[tauri::command]
fn set_gamepad_ready() {
    GAMEPAD_READY.store(true, Ordering::Relaxed);
}

fn set_xinput_vibration(left_motor_speed: u16, right_motor_speed: u16) {
    let vibration = XINPUT_VIBRATION {
        wLeftMotorSpeed: left_motor_speed,
        wRightMotorSpeed: right_motor_speed,
    };

    unsafe {
        for user_index in 0..4 {
            let _ = XInputSetState(user_index, &vibration);
        }
    }
}

#[tauri::command]
fn native_startup_rumble(pattern: String) {
    std::thread::spawn(move || match pattern.as_str() {
        "startup" => {
            set_xinput_vibration(0x3200, 0x1800);
            std::thread::sleep(Duration::from_millis(380));
            set_xinput_vibration(0, 0);
        }
        "startupReady" => {
            set_xinput_vibration(0x6800, 0x4200);
            std::thread::sleep(Duration::from_millis(130));
            set_xinput_vibration(0, 0);
            std::thread::sleep(Duration::from_millis(70));
            set_xinput_vibration(0xb000, 0x8800);
            std::thread::sleep(Duration::from_millis(300));
            set_xinput_vibration(0, 0);
        }
        _ => {}
    });
}
#[tauri::command]
fn get_custom_art() -> HashMap<String, String> {
    load_custom_art_inner()
}
#[tauri::command]
fn set_custom_art(id: String, data: String) -> Result<(), String> {
    let mut map = load_custom_art_inner();
    map.insert(id, data);
    save_custom_art_inner(&map);
    Ok(())
}
#[tauri::command]
fn clear_custom_art(id: String) -> Result<(), String> {
    let mut map = load_custom_art_inner();
    map.remove(&id);
    save_custom_art_inner(&map);
    Ok(())
}

#[tauri::command]
fn search_sgdb_art(game_name: String, art_type: String) -> Vec<SgdbArtResult> {
    let client = match reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
    {
        Ok(c) => c,
        Err(_) => return vec![],
    };

    let search_url = format!(
        "https://www.steamgriddb.com/api/v2/search/autocomplete/{}",
        urlencoding::encode(&game_name)
    );
    let game_id = match client
        .get(&search_url)
        .header("Authorization", format!("Bearer {}", SGDB_KEY))
        .send()
        .ok()
        .and_then(|r| r.json::<SgdbSearchResponse>().ok())
        .filter(|d| d.success)
        .and_then(|d| d.data)
        .and_then(|items| items.into_iter().next())
        .map(|g| g.id)
    {
        Some(id) => id,
        None => return vec![],
    };

    let fetch_art = |url: &str| -> Vec<SgdbArtItem> {
        client
            .get(url)
            .header("Authorization", format!("Bearer {}", SGDB_KEY))
            .send()
            .ok()
            .and_then(|r| r.json::<SgdbArtResponse>().ok())
            .filter(|d| d.success)
            .and_then(|d| d.data)
            .unwrap_or_default()
    };

    let mut forced_animated_urls: std::collections::HashSet<String> =
        std::collections::HashSet::new();

    let items: Vec<SgdbArtItem> = if art_type == "grid" {
        let url = format!(
            "https://www.steamgriddb.com/api/v2/grids/game/{}?dimensions=600x900&limit=20",
            game_id
        );
        fetch_art(&url)
    } else {
        let url1 = format!(
            "https://www.steamgriddb.com/api/v2/heroes/game/{}?limit=20",
            game_id
        );
        let url2 = format!(
            "https://www.steamgriddb.com/api/v2/heroes/game/{}?styles=alternate&limit=20",
            game_id
        );
        let url3 = format!(
            "https://www.steamgriddb.com/api/v2/heroes/game/{}?types=animated&limit=20",
            game_id
        );
        let mut seen = std::collections::HashSet::new();
        let mut combined = Vec::new();
        for item in fetch_art(&url3) {
            forced_animated_urls.insert(item.url.clone());
            if seen.insert(item.url.clone()) {
                combined.push(item);
            }
        }
        for item in fetch_art(&url1).into_iter().chain(fetch_art(&url2)) {
            if seen.insert(item.url.clone()) {
                combined.push(item);
            }
        }
        combined
    };

    items
        .into_iter()
        .map(|item| {
            let url_base = item.url.split('?').next().unwrap_or(&item.url);
            let is_animated = forced_animated_urls.contains(&item.url)
                || item.mime.as_deref().map_or_else(
                    || {
                        url_base.ends_with(".mp4")
                            || url_base.ends_with(".webm")
                            || url_base.ends_with(".gif")
                            || url_base.ends_with(".webp")
                    },
                    |m| m.starts_with("video/") || m == "image/gif" || m == "image/webp",
                );
            let raw_thumb = item.thumb.unwrap_or_else(|| item.url.clone());
            let thumb_base = raw_thumb.split('?').next().unwrap_or(&raw_thumb);
            let thumb = if thumb_base.ends_with(".webm") || thumb_base.ends_with(".mp4") {
                item.url.clone()
            } else {
                raw_thumb
            };
            SgdbArtResult {
                url: item.url,
                thumb,
                is_animated,
                width: item.width.unwrap_or(0),
                height: item.height.unwrap_or(0),
                author: item.author.and_then(|a| a.name).unwrap_or_default(),
                style: item.style.unwrap_or_default(),
                upvotes: item.upvotes.unwrap_or(0),
                downvotes: item.downvotes.unwrap_or(0),
            }
        })
        .filter(|item| {
            let url_base = item.url.split('?').next().unwrap_or(&item.url);
            !(item.is_animated && url_base.ends_with(".png"))
        })
        .collect()
}

#[tauri::command]
fn download_sgdb_art(game_name: String, url: String, art_type: String) -> Option<String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .ok()?;

    let url_base_for_type = url.split('?').next().unwrap_or(&url).to_lowercase();
    let is_animated = url_base_for_type.ends_with(".mp4")
        || url_base_for_type.ends_with(".webm")
        || url_base_for_type.ends_with(".gif")
        || url_base_for_type.ends_with(".webp");

    let dir = if art_type == "grid" {
        grid_art_dir()
    } else if is_animated {
        hero_animated_art_dir()
    } else {
        hero_static_art_dir()
    };

    // Use the URL's own filename so each distinct SGDB image gets a unique local file.
    // This prevents download_file's "return early if exists" from serving stale art when
    // the user picks a different image for a game that already has a cached cover.
    let url_base = url.split('?').next().unwrap_or(&url);
    let url_fname = url_base.rsplit('/').next().unwrap_or("art");
    let ext = url_ext(url_fname);
    let safe_stem: String = url_fname
        .trim_end_matches(&format!(".{}", ext))
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
        .take(40)
        .collect();
    let file_name = format!(
        "{}.{}",
        if safe_stem.is_empty() {
            "art".to_string()
        } else {
            safe_stem
        },
        ext
    );
    let path = dir.join(&file_name);
    let _ = std::fs::create_dir_all(&dir);
    if !path.exists() {
        let bytes = client
            .get(&url)
            .timeout(std::time::Duration::from_secs(60))
            .send()
            .ok()?
            .bytes()
            .ok()?;
        std::fs::write(&path, &bytes).ok()?;
    }
    let local_path = path.to_string_lossy().into_owned();

    if art_type == "grid" {
        let mut cache = load_art_cache();
        cache.insert(game_name, local_path.clone());
        save_art_cache(&cache);
    } else if is_animated {
        let mut cache = load_hero_animated_cache();
        cache.insert(game_name, local_path.clone());
        save_hero_animated_cache(&cache);
    } else {
        let mut cache = load_hero_cache();
        cache.insert(game_name, local_path.clone());
        save_hero_cache(&cache);
    }
    Some(local_path)
}

#[tauri::command]
fn get_pins() -> Vec<String> {
    load_pins_inner()
}

#[tauri::command]
fn toggle_pin(app_id: String) -> Vec<String> {
    let mut pins = load_pins_inner();
    if let Some(pos) = pins.iter().position(|id| id == &app_id) {
        pins.remove(pos);
    } else {
        pins.push(app_id);
    }
    save_pins_inner(&pins);
    pins
}

#[tauri::command]
fn get_hidden() -> Vec<String> {
    load_hidden_inner()
}

#[tauri::command]
fn toggle_hidden(app_id: String) -> Vec<String> {
    let mut hidden = load_hidden_inner();
    if let Some(pos) = hidden.iter().position(|id| id == &app_id) {
        hidden.remove(pos);
    } else {
        hidden.push(app_id);
    }
    save_hidden_inner(&hidden);
    hidden
}

#[tauri::command]
fn save_settings(settings: Settings, app_handle: tauri::AppHandle) -> Result<(), String> {
    let autostart = app_handle.autolaunch();
    if settings.launch_at_startup {
        let _ = autostart.enable();
    } else {
        let _ = autostart.disable();
    }
    save_settings_inner(&settings);
    Ok(())
}

#[tauri::command]
fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
fn restart_app(app: tauri::AppHandle) {
    app.restart();
}

#[derive(Serialize)]
struct BatteryInfo {
    percent: u32,
    charging: bool,
}

#[tauri::command]
fn get_battery() -> BatteryInfo {
    unsafe {
        let mut status = SYSTEM_POWER_STATUS::default();
        if GetSystemPowerStatus(&mut status).is_ok() {
            let charging = status.ACLineStatus == 1;
            let pct = status.BatteryLifePercent;
            // 255 = Windows "unknown" — reported when fully charged on some devices
            let percent = if pct <= 100 {
                pct as u32
            } else {
                if charging {
                    100
                } else {
                    0
                }
            };
            return BatteryInfo { percent, charging };
        }
    }
    BatteryInfo {
        percent: 0,
        charging: false,
    }
}

/// Read all three caches at once and return what's already stored — no HTTP calls.
/// Used at startup to instantly hydrate cached art before making any API requests.
#[tauri::command]
fn get_cached_art_bulk(game_names: Vec<String>) -> HashMap<String, GameArtBundle> {
    let grid_cache = load_art_cache();
    let hero_static_cache = load_hero_cache();
    let hero_animated_cache = load_hero_animated_cache();
    let mut result = HashMap::new();
    for name in game_names {
        let grid = grid_cache.get(&name).filter(|s| !s.is_empty()).cloned();
        let hero_static = hero_static_cache
            .get(&name)
            .filter(|s| !s.is_empty())
            .cloned();
        let hero_animated = hero_animated_cache
            .get(&name)
            .filter(|s| !s.is_empty())
            .cloned();
        result.insert(
            name,
            GameArtBundle {
                grid,
                hero_animated,
                hero_static,
            },
        );
    }
    result
}

#[tauri::command]
fn fetch_game_art(
    game_name: String,
    source: Option<String>,
    appid: Option<u32>,
    force_refresh: Option<bool>,
) -> GameArtBundle {
    let mut grid_cache = load_art_cache();
    let mut hero_static_cache = load_hero_cache();
    let mut hero_animated_cache = load_hero_animated_cache();

    let force_refresh = force_refresh.unwrap_or(false);
    let grid_cached_raw = grid_cache.get(&game_name).cloned();
    let hero_static_cached_raw = hero_static_cache.get(&game_name).cloned();
    let hero_animated_cached_raw = hero_animated_cache.get(&game_name).cloned();
    let has_real_art = |cached: &Option<String>| {
        cached
            .as_deref()
            .map(|value| !value.is_empty())
            .unwrap_or(false)
    };

    // Normal fetches respect blank sentinels; recovery fetches can retry stale blanks.
    if (has_real_art(&grid_cached_raw)
        && has_real_art(&hero_static_cached_raw)
        && has_real_art(&hero_animated_cached_raw))
        || (!force_refresh
            && grid_cached_raw.is_some()
            && hero_static_cached_raw.is_some()
            && hero_animated_cached_raw.is_some())
    {
        return GameArtBundle {
            grid: grid_cached_raw.filter(|s| !s.is_empty()),
            hero_animated: hero_animated_cached_raw.filter(|s| !s.is_empty()),
            hero_static: hero_static_cached_raw.filter(|s| !s.is_empty()),
        };
    }

    let refresh_empty = |cached: Option<String>| {
        if force_refresh && cached.as_deref() == Some("") {
            None
        } else {
            cached
        }
    };
    let grid_cached = refresh_empty(grid_cached_raw);
    let hero_static_cached = refresh_empty(hero_static_cached_raw);
    let hero_animated_cached = refresh_empty(hero_animated_cached_raw);

    let client = match reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
    {
        Ok(c) => c,
        Err(_) => {
            return GameArtBundle {
                grid: grid_cached.filter(|s| !s.is_empty()),
                hero_animated: hero_animated_cached.filter(|s| !s.is_empty()),
                hero_static: hero_static_cached.filter(|s| !s.is_empty()),
            }
        }
    };

    let is_steam = source
        .as_deref()
        .map(|value| value.eq_ignore_ascii_case("steam"))
        .unwrap_or(false);
    if is_steam {
        if let Some(appid) = appid {
            let steam_asset_urls = |filename: &str| -> [String; 2] {
                [
                    format!(
                        "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/{}/{}",
                        appid, filename
                    ),
                    format!(
                        "https://cdn.cloudflare.steamstatic.com/steam/apps/{}/{}",
                        appid, filename
                    ),
                ]
            };
            let try_download = |filename: &str, dir: &std::path::Path| -> Option<String> {
                for url in steam_asset_urls(filename) {
                    if let Some(path) = download_file(&client, &url, dir, &game_name) {
                        return Some(path);
                    }
                }
                None
            };

            let grid = if let Some(cached) = grid_cached.clone() {
                cached
            } else {
                let path = try_download("library_600x900.jpg", &grid_art_dir()).unwrap_or_default();
                grid_cache.insert(game_name.clone(), path.clone());
                save_art_cache(&grid_cache);
                path
            };
            let hero_static = if let Some(cached) = hero_static_cached.clone() {
                cached
            } else {
                let path =
                    try_download("library_hero.jpg", &hero_static_art_dir()).unwrap_or_default();
                hero_static_cache.insert(game_name.clone(), path.clone());
                save_hero_cache(&hero_static_cache);
                path
            };

            if !grid.is_empty() && !hero_static.is_empty() {
                if hero_animated_cached.is_none() {
                    hero_animated_cache.insert(game_name.clone(), String::new());
                    save_hero_animated_cache(&hero_animated_cache);
                }
                return GameArtBundle {
                    grid: if grid.is_empty() { None } else { Some(grid) },
                    hero_static: if hero_static.is_empty() {
                        None
                    } else {
                        Some(hero_static)
                    },
                    hero_animated: hero_animated_cached.and_then(|cached| {
                        if cached.is_empty() {
                            None
                        } else {
                            Some(cached)
                        }
                    }),
                };
            }
        }
    }

    // One search call covers all three art types
    let search_url = format!(
        "https://www.steamgriddb.com/api/v2/search/autocomplete/{}",
        urlencoding::encode(&game_name)
    );
    let game_id = client
        .get(&search_url)
        .header("Authorization", format!("Bearer {}", SGDB_KEY))
        .send()
        .ok()
        .and_then(|r| r.json::<SgdbSearchResponse>().ok())
        .filter(|d| d.success)
        .and_then(|d| d.data)
        .and_then(|items| items.into_iter().next())
        .map(|g| g.id);

    let Some(game_id) = game_id else {
        // Mark all unchecked as sentinel so we don't re-search next time
        if grid_cached.is_none() {
            grid_cache.insert(game_name.clone(), String::new());
            save_art_cache(&grid_cache);
        }
        if hero_animated_cached.is_none() {
            hero_animated_cache.insert(game_name.clone(), String::new());
            save_hero_animated_cache(&hero_animated_cache);
        }
        if hero_static_cached.is_none() {
            hero_static_cache.insert(game_name.clone(), String::new());
            save_hero_cache(&hero_static_cache);
        }
        return GameArtBundle {
            grid: None,
            hero_animated: None,
            hero_static: None,
        };
    };

    let grid = if let Some(cached) = grid_cached {
        if cached.is_empty() {
            None
        } else {
            Some(cached)
        }
    } else {
        let url = format!(
            "https://www.steamgriddb.com/api/v2/grids/game/{}?dimensions=600x900&limit=1",
            game_id
        );
        let remote_url = client
            .get(&url)
            .header("Authorization", format!("Bearer {}", SGDB_KEY))
            .send()
            .ok()
            .and_then(|r| r.json::<SgdbGridResponse>().ok())
            .filter(|d| d.success)
            .and_then(|d| d.data)
            .and_then(|v| v.into_iter().next())
            .map(|g| g.url);
        // Download to disk; fall back to remote URL if download fails
        let result = remote_url
            .as_deref()
            .and_then(|u| download_file(&client, u, &grid_art_dir(), &game_name))
            .or(remote_url);
        grid_cache.insert(game_name.clone(), result.clone().unwrap_or_default());
        save_art_cache(&grid_cache);
        result
    };

    // Resolve cached values (None = uncached, Some("") = checked/none, Some(path) = has art)
    let static_cached_val = hero_static_cached.as_deref().and_then(|s| {
        if s.is_empty() {
            None
        } else {
            Some(s.to_string())
        }
    });
    let animated_cached_val = hero_animated_cached.as_deref().and_then(|s| {
        if s.is_empty() {
            None
        } else {
            Some(s.to_string())
        }
    });
    let need_static = hero_static_cached.is_none();
    let need_animated = hero_animated_cached.is_none();

    let (hero_static, hero_animated) = if need_static || need_animated {
        let fetch_hero_url = |extra_param: &str| -> Option<String> {
            let url = format!(
                "https://www.steamgriddb.com/api/v2/heroes/game/{}?{}&limit=1",
                game_id, extra_param
            );
            client
                .get(&url)
                .header("Authorization", format!("Bearer {}", SGDB_KEY))
                .send()
                .ok()
                .and_then(|r| r.json::<SgdbHeroResponse>().ok())
                .filter(|d| d.success)
                .and_then(|d| d.data)
                .and_then(|v| v.into_iter().next())
                .map(|h| h.url)
        };

        let found_static = if need_static {
            let remote = fetch_hero_url("types=static");
            remote
                .as_deref()
                .and_then(|u| download_file(&client, u, &hero_static_art_dir(), &game_name))
                .or(remote)
        } else {
            None
        };

        let found_animated = if need_animated {
            let remote = fetch_hero_url("types=animated");
            remote
                .as_deref()
                .and_then(|u| download_file(&client, u, &hero_animated_art_dir(), &game_name))
                .or(remote)
        } else {
            None
        };

        if need_animated {
            hero_animated_cache.insert(
                game_name.clone(),
                found_animated.clone().unwrap_or_default(),
            );
            save_hero_animated_cache(&hero_animated_cache);
        }
        if need_static {
            hero_static_cache.insert(game_name.clone(), found_static.clone().unwrap_or_default());
            save_hero_cache(&hero_static_cache);
        }

        (
            static_cached_val.or(found_static),
            animated_cached_val.or(found_animated),
        )
    } else {
        (static_cached_val, animated_cached_val)
    };

    GameArtBundle {
        grid,
        hero_animated,
        hero_static,
    }
}

fn extract_icon_base64(path: &str) -> Option<String> {
    unsafe {
        let wide: Vec<u16> = std::ffi::OsStr::new(path)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();
        let cb = std::mem::size_of::<SHFILEINFOW>() as u32;
        let mut shfi = SHFILEINFOW::default();
        let mut result = SHGetFileInfoW(
            windows::core::PCWSTR(wide.as_ptr()),
            Default::default(),
            Some(&mut shfi),
            cb,
            SHGFI_ICON | SHGFI_JUMBOICON,
        );
        if result == 0 || shfi.hIcon.is_invalid() {
            shfi = SHFILEINFOW::default();
            result = SHGetFileInfoW(
                windows::core::PCWSTR(wide.as_ptr()),
                Default::default(),
                Some(&mut shfi),
                cb,
                SHGFI_ICON | SHGFI_LARGEICON,
            );
            if result == 0 || shfi.hIcon.is_invalid() {
                return None;
            }
        }
        let hicon = shfi.hIcon;

        // Rasterize with DrawIconEx at ICON_EXPORT_PX — avoids corrupt GetDIBits reads and keeps
        // enough resolution for crisp downscaling in the WebView (32×32 looked soft at 48px+ tiles).
        let px = ICON_EXPORT_PX;
        let px_u = px as u32;
        let px_us = px as usize;
        let hdc_screen = GetDC(None);
        if hdc_screen.is_invalid() {
            let _ = DestroyIcon(hicon);
            return None;
        }
        let hdc_mem = CreateCompatibleDC(hdc_screen);
        if hdc_mem.is_invalid() {
            let _ = ReleaseDC(None, hdc_screen);
            let _ = DestroyIcon(hicon);
            return None;
        }
        let hbm = CreateCompatibleBitmap(hdc_screen, px, px);
        if hbm.is_invalid() {
            let _ = DeleteDC(hdc_mem);
            let _ = ReleaseDC(None, hdc_screen);
            let _ = DestroyIcon(hicon);
            return None;
        }

        let old = SelectObject(hdc_mem, hbm);
        let _ = PatBlt(hdc_mem, 0, 0, px, px, BLACKNESS);
        let drawn = DrawIconEx(hdc_mem, 0, 0, hicon, px, px, 0, None, DI_NORMAL);
        let _ = SelectObject(hdc_mem, old);

        let mut bmi = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: px,
                biHeight: -px,
                biPlanes: 1,
                biBitCount: 32,
                biCompression: 0,
                biSizeImage: 0,
                biXPelsPerMeter: 0,
                biYPelsPerMeter: 0,
                biClrUsed: 0,
                biClrImportant: 0,
            },
            bmiColors: [RGBQUAD::default()],
        };
        let mut pixels: Vec<u8> = vec![0u8; px_us * px_us * 4];
        let lines = GetDIBits(
            hdc_mem,
            hbm,
            0,
            px_u,
            Some(pixels.as_mut_ptr() as *mut _),
            &mut bmi,
            DIB_RGB_COLORS,
        );

        let _ = DeleteObject(hbm);
        let _ = DeleteDC(hdc_mem);
        let _ = ReleaseDC(None, hdc_screen);
        let _ = DestroyIcon(hicon);

        if drawn.is_err() || lines == 0 {
            return None;
        }
        for chunk in pixels.chunks_mut(4) {
            chunk.swap(0, 2);
        }
        match lodepng::encode32(&pixels, px_us, px_us) {
            Ok(png_bytes) => Some(general_purpose::STANDARD.encode(&png_bytes)),
            Err(_) => None,
        }
    }
}

/// Resolve a UWP icon PNG from the package's install directory.
/// `logo_hint` is the relative path from the manifest (e.g. "Assets\Square44x44Logo.png").
/// We try the exact path first, then scan the Assets folder for any scale/theme variant.
fn extract_uwp_icon_base64(install_location: &str, logo_hint: &str) -> Option<String> {
    let hint_path = std::path::Path::new(logo_hint);
    let stem = hint_path.file_stem()?.to_string_lossy().to_string();
    let base_stem = stem.split('.').next().unwrap_or(&stem);
    let assets_dir = std::path::Path::new(install_location)
        .join(hint_path.parent().unwrap_or(std::path::Path::new("Assets")));

    let png_to_b64 = |p: &std::path::Path| -> Option<String> {
        let bytes = std::fs::read(p).ok()?;
        if bytes.len() < 8 || &bytes[0..8] != b"\x89PNG\r\n\x1a\n" {
            return None;
        }
        Some(general_purpose::STANDARD.encode(&bytes))
    };

    let exact = std::path::Path::new(install_location).join(logo_hint);
    if exact.exists() {
        if let Some(b64) = png_to_b64(&exact) {
            return Some(b64);
        }
    }

    if assets_dir.is_dir() {
        if let Ok(dir) = std::fs::read_dir(&assets_dir) {
            let mut candidates: Vec<std::path::PathBuf> = dir
                .flatten()
                .map(|e| e.path())
                .filter(|p| {
                    p.extension()
                        .and_then(|e| e.to_str())
                        .unwrap_or("")
                        .to_lowercase()
                        == "png"
                        && p.file_stem()
                            .and_then(|s| s.to_str())
                            .map(|s| s.starts_with(base_stem))
                            .unwrap_or(false)
                })
                .collect();

            // Prefer larger scale variants so downscaled icons stay sharp (object-fit handles size in UI).
            candidates.sort_by_key(|p| {
                let s = p.to_string_lossy().to_lowercase();
                if s.contains("scale-200") {
                    0
                } else if s.contains("scale-150") {
                    1
                } else if s.contains("scale-125") {
                    2
                } else if s.contains("scale-100") {
                    3
                } else {
                    4
                }
            });

            for candidate in &candidates {
                if let Some(b64) = png_to_b64(candidate) {
                    return Some(b64);
                }
            }
        }
    }

    None
}

fn scan_folder(folder: &str, app_type: &str) -> Vec<AppEntry> {
    scan_folder_with_source(folder, app_type, "desktop")
}

fn scan_folder_with_source(folder: &str, app_type: &str, source: &str) -> Vec<AppEntry> {
    let mut entries = Vec::new();
    scan_folder_recursive(Path::new(folder), app_type, source, 0, &mut entries);
    entries
}

fn scan_folder_recursive(
    path: &Path,
    app_type: &str,
    source: &str,
    depth: u32,
    entries: &mut Vec<AppEntry>,
) {
    if depth > 4 {
        return;
    }
    if !path.exists() {
        return;
    }
    let Ok(dir) = std::fs::read_dir(path) else {
        return;
    };
    for entry in dir.flatten() {
        let p = entry.path();
        let path_str = p.to_string_lossy().to_string();
        if path_str.contains("target\\release") || path_str.contains("target/release") {
            continue;
        }
        if p.is_dir() {
            scan_folder_recursive(&p, app_type, source, depth + 1, entries);
        } else {
            let ext = p
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();
            if ext == "lnk" || ext == "exe" {
                let name = p
                    .file_stem()
                    .and_then(|n| n.to_str())
                    .unwrap_or("Unknown")
                    .to_string();
                let icon = extract_icon_base64(&path_str);
                entries.push(AppEntry {
                    id: path_str.clone(),
                    name,
                    icon_base64: icon,
                    launch_path: path_str,
                    app_type: app_type.to_string(),
                    source: source.to_string(),
                    install_dir: None,
                    installed: true,
                    ..Default::default()
                });
            }
        }
    }
}

fn is_valid_display_name(name: &str) -> bool {
    if name.chars().filter(|c| *c == '-').count() >= 3 {
        return false;
    }
    if name.contains('.') && !name.contains(' ') {
        return false;
    }
    if name.starts_with("ms-resource:") {
        return false;
    }
    if name.contains('{') || name.contains('}') {
        return false;
    }
    if name.len() > 8 && name.chars().all(|c| c.is_ascii_hexdigit() || c == '-') {
        return false;
    }
    true
}

#[tauri::command]
fn open_osk() {
    let paths = [
        r"C:\Program Files\Common Files\microsoft shared\ink\TabTip.exe",
        r"C:\Windows\System32\TabTip.exe",
    ];
    for path in &paths {
        if std::path::Path::new(path).exists() {
            let _ = std::process::Command::new(path)
                .creation_flags(CREATE_NO_WINDOW)
                .spawn();
            return;
        }
    }
    let _ = std::process::Command::new("osk.exe")
        .creation_flags(CREATE_NO_WINDOW)
        .spawn();
}

fn scan_uwp_apps() -> Vec<AppEntry> {
    let mut apps = Vec::new();
    let output = std::process::Command::new("powershell").args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", r##"
        $startApps = @{}
        try { Get-StartApps | ForEach-Object { $startApps[$_.AppID] = $_.Name } } catch {}
        Get-AppxPackage | ForEach-Object {
            $pkg = $_
            try {
                $manifest = Get-AppxPackageManifest $pkg.PackageFullName
                $appNodes = $manifest.Package.Applications.Application
                $app = if ($appNodes -is [array]) { $appNodes[0] } else { $appNodes }
                if ($app -and $app.Id) {
                    $appId = $app.Id
                    $name = $null
                    try { $name = $manifest.Package.Properties.DisplayName } catch {}
                    if (-not $name -or $name -match '^\s*$' -or $name -match 'ms-resource') {
                        $aumid = "$($pkg.PackageFamilyName)!$appId"
                        if ($startApps.ContainsKey($aumid)) { $name = $startApps[$aumid] } else { try { $name = $pkg.Name } catch {} }
                    }
                    if ($name -and $appId) {
                        $aumid = "$($pkg.PackageFamilyName)!$appId"
                        $installLocation = $pkg.InstallLocation
                        $hasMgc = Test-Path "$installLocation\MicrosoftGame.config"
                        $logo = ""
                        try {
                            $ve = $app.VisualElements
                            $logo = if ($ve.Square44x44Logo) { $ve.Square44x44Logo }
                                    elseif ($ve.Logo) { $ve.Logo }
                                    else { "" }
                        } catch {}
                        Write-Output "$name`t$aumid`t$appId`t$hasMgc`t$installLocation`t$logo"
                    }
                }
            } catch {}
        }
    "##])
    .creation_flags(CREATE_NO_WINDOW)
    .output();
    let output = match output {
        Ok(o) => o,
        Err(_) => return apps,
    };
    let stdout = String::from_utf8_lossy(&output.stdout);
    let skip_prefixes = [
        "Microsoft.NET",
        "Microsoft.VCLibs",
        "Microsoft.UI.Xaml",
        "Microsoft.WindowsAppRuntime",
        "Microsoft.DesktopAppInstaller",
    ];
    for line in stdout.lines() {
        let parts: Vec<&str> = line.splitn(6, '\t').collect();
        if parts.len() < 2 {
            continue;
        }
        let name = parts[0].trim().to_string();
        let aumid = parts[1].trim().to_string();
        let app_id = if parts.len() >= 3 {
            parts[2].trim()
        } else {
            ""
        };
        let has_mgc = if parts.len() >= 4 {
            parts[3].trim() == "True"
        } else {
            false
        };
        let install_location = if parts.len() >= 5 {
            parts[4].trim()
        } else {
            ""
        };
        let logo_hint = if parts.len() >= 6 {
            parts[5].trim()
        } else {
            ""
        };
        if name.is_empty() || aumid.is_empty() || !is_valid_display_name(&name) {
            continue;
        }
        if skip_prefixes.iter().any(|p| aumid.starts_with(p)) {
            continue;
        }
        let is_xbox_game = app_id == "Game" || has_mgc;
        let app_type = if is_xbox_game { "game" } else { "app" };
        let source = if is_xbox_game { "xbox" } else { "uwp" };
        let icon_base64 = if !install_location.is_empty() && !logo_hint.is_empty() {
            extract_uwp_icon_base64(install_location, logo_hint)
        } else {
            None
        };
        apps.push(AppEntry {
            id: aumid.clone(),
            name,
            icon_base64,
            launch_path: format!("shell:AppsFolder\\{}", aumid),
            app_type: app_type.to_string(),
            source: source.to_string(),
            install_dir: if install_location.is_empty() {
                None
            } else {
                Some(install_location.to_string())
            },
            installed: true,
            ..Default::default()
        });
    }
    apps
}

fn get_steam_install_path() -> Option<String> {
    unsafe {
        use windows::core::PCWSTR;
        use windows::Win32::System::Registry::{
            RegCloseKey, RegOpenKeyExW, RegQueryValueExW, HKEY, HKEY_LOCAL_MACHINE, KEY_READ,
        };
        let subkeys = [
            "SOFTWARE\\WOW6432Node\\Valve\\Steam",
            "SOFTWARE\\Valve\\Steam",
        ];
        let value_name: Vec<u16> = std::ffi::OsStr::new("InstallPath")
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();
        for subkey in &subkeys {
            let wide_key: Vec<u16> = std::ffi::OsStr::new(subkey)
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();
            let mut hkey = HKEY::default();
            if RegOpenKeyExW(
                HKEY_LOCAL_MACHINE,
                PCWSTR(wide_key.as_ptr()),
                0,
                KEY_READ,
                &mut hkey,
            )
            .is_ok()
            {
                let mut buf = vec![0u8; 1024];
                let mut buf_len = buf.len() as u32;
                let ok = RegQueryValueExW(
                    hkey,
                    PCWSTR(value_name.as_ptr()),
                    None,
                    None,
                    Some(buf.as_mut_ptr()),
                    Some(&mut buf_len),
                )
                .is_ok();
                let _ = RegCloseKey(hkey);
                if ok && buf_len >= 2 {
                    let wchars: Vec<u16> = buf[..buf_len as usize]
                        .chunks_exact(2)
                        .map(|c| u16::from_le_bytes([c[0], c[1]]))
                        .collect();
                    let path = String::from_utf16_lossy(&wchars)
                        .trim_end_matches('\0')
                        .to_string();
                    if !path.is_empty() {
                        return Some(path);
                    }
                }
            }
        }
    }
    ["C:\\Program Files (x86)\\Steam", "C:\\Program Files\\Steam"]
        .iter()
        .find(|path| Path::new(path).join("Steam.exe").exists())
        .map(|path| path.to_string())
}

fn steam_library_paths() -> Vec<String> {
    let mut candidate_steamapps: Vec<String> = Vec::new();
    if let Some(steam_root) = get_steam_install_path() {
        candidate_steamapps.push(format!("{}\\steamapps", steam_root));
    }
    candidate_steamapps.push("C:\\Program Files (x86)\\Steam\\steamapps".to_string());
    candidate_steamapps.push("C:\\Program Files\\Steam\\steamapps".to_string());
    candidate_steamapps.dedup();

    let mut library_paths: Vec<String> = candidate_steamapps.clone();
    for steamapps in &candidate_steamapps {
        let vdf_path = format!("{}\\libraryfolders.vdf", steamapps);
        if let Ok(content) = std::fs::read_to_string(&vdf_path) {
            for line in content.lines() {
                if line.trim().contains("\"path\"") {
                    if let Some(start) = line.rfind('"') {
                        let rest = &line[..start];
                        if let Some(start2) = rest.rfind('"') {
                            let extra =
                                format!("{}\\steamapps", &rest[start2 + 1..].replace("\\\\", "\\"));
                            if !library_paths.contains(&extra) {
                                library_paths.push(extra);
                            }
                        }
                    }
                }
            }
        }
    }
    library_paths
}

fn dispatch_steam_uri(uri: &str) -> Result<(), String> {
    std::process::Command::new("explorer.exe")
        .arg(uri)
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn validate_steam_appid(appid: &str) -> Result<String, String> {
    let trimmed = appid.trim();
    if trimmed.is_empty() || !trimmed.chars().all(|ch| ch.is_ascii_digit()) {
        return Err("Steam app id invalid".to_string());
    }
    Ok(trimmed.to_string())
}

#[derive(Clone)]
struct SteamInstallManifest {
    state_flags: u32,
    size_on_disk: u64,
    bytes_downloaded: u64,
    bytes_to_download: u64,
    bytes_staged: u64,
    bytes_to_stage: u64,
    download_active: bool,
    installdir: String,
    library_path: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SteamInstallProgressPayload {
    appid: String,
    pct: f64,
    bytes_done: u64,
    bytes_total: u64,
    state: String,
    phase: String,
    live: bool,
}

#[derive(Serialize, Clone)]
struct SteamInstallDonePayload {
    appid: String,
}

fn parse_steam_install_manifest(content: &str) -> SteamInstallManifest {
    let mut manifest = SteamInstallManifest {
        state_flags: 0,
        size_on_disk: 0,
        bytes_downloaded: 0,
        bytes_to_download: 0,
        bytes_staged: 0,
        bytes_to_stage: 0,
        download_active: false,
        installdir: String::new(),
        library_path: String::new(),
    };
    for line in content.lines() {
        let line = line.trim();
        let value = || extract_vdf_value(line).parse::<u64>().unwrap_or(0);
        if line.starts_with("\"StateFlags\"") {
            manifest.state_flags = value().min(u32::MAX as u64) as u32;
        } else if line.starts_with("\"SizeOnDisk\"") {
            manifest.size_on_disk = value();
        } else if line.starts_with("\"BytesDownloaded\"") {
            manifest.bytes_downloaded = value();
        } else if line.starts_with("\"BytesToDownload\"") {
            manifest.bytes_to_download = value();
        } else if line.starts_with("\"BytesStaged\"") {
            manifest.bytes_staged = value();
        } else if line.starts_with("\"BytesToStage\"") {
            manifest.bytes_to_stage = value();
        } else if line.starts_with("\"installdir\"") {
            manifest.installdir = extract_vdf_value(line);
        }
    }
    manifest
}

const STEAM_STATE_FULLY_INSTALLED: u32 = 4;

fn steam_is_installed(state_flags: u32, size_on_disk: u64, install_dir_present: bool) -> bool {
    state_flags & STEAM_STATE_FULLY_INSTALLED != 0 && size_on_disk > 0 && install_dir_present
}

fn steam_install_dir_present(manifest: &SteamInstallManifest) -> bool {
    !manifest.installdir.is_empty()
        && Path::new(&manifest.library_path)
            .join("common")
            .join(&manifest.installdir)
            .is_dir()
}

fn read_steam_install_manifest(appid: &str) -> Option<SteamInstallManifest> {
    steam_library_paths().into_iter().find_map(|library| {
        let path = Path::new(&library).join(format!("appmanifest_{}.acf", appid));
        std::fs::read_to_string(path).ok().map(|content| {
            let mut manifest = parse_steam_install_manifest(&content);
            manifest.library_path = library.clone();
            manifest.download_active = Path::new(&library).join("downloading").join(appid).exists();
            manifest
        })
    })
}

fn parse_steam_install_log_phase(content: &str, appid: &str) -> Option<&'static str> {
    let app_marker = format!("AppID {} App update changed :", appid);
    for line in content.lines().rev() {
        if !line.contains(&app_marker) {
            continue;
        }
        if line.contains("None") || line.contains("Stopping") {
            return Some("paused");
        }
        if line.contains("Preallocating")
            || line.contains("Reconfiguring")
            || line.contains("Verifying Installed")
        {
            return Some("preparing");
        }
        if line.contains("Committing")
            || (line.contains("Staging") && !line.contains("Downloading"))
        {
            return Some("staging");
        }
        if line.contains("Downloading") {
            return Some("downloading");
        }
    }
    None
}

fn steam_install_log_phase(appid: &str) -> Option<&'static str> {
    let log_path = Path::new(&get_steam_install_path()?)
        .join("logs")
        .join("content_log.txt");
    let mut file = std::fs::File::open(log_path).ok()?;
    let len = file.metadata().ok()?.len();
    const LOG_TAIL_BYTES: u64 = 256 * 1024;
    file.seek(SeekFrom::Start(len.saturating_sub(LOG_TAIL_BYTES)))
        .ok()?;
    let mut bytes = Vec::with_capacity(len.min(LOG_TAIL_BYTES) as usize);
    file.read_to_end(&mut bytes).ok()?;
    parse_steam_install_log_phase(&String::from_utf8_lossy(&bytes), appid)
}

fn steam_install_progress_payload(
    appid: &str,
    manifest: &SteamInstallManifest,
    install_dir_present: bool,
    log_phase: Option<&str>,
) -> SteamInstallProgressPayload {
    let complete = steam_is_installed(
        manifest.state_flags,
        manifest.size_on_disk,
        install_dir_present,
    );
    let (bytes_done, bytes_total) = if manifest.bytes_to_stage > 0 {
        (
            manifest
                .bytes_downloaded
                .saturating_add(manifest.bytes_staged),
            manifest
                .bytes_to_download
                .saturating_add(manifest.bytes_to_stage),
        )
    } else {
        (manifest.bytes_downloaded, manifest.bytes_to_download)
    };
    let pct = if complete {
        100.0
    } else if bytes_total > 0 {
        (((bytes_done as f64 / bytes_total as f64) * 1000.0).round() / 10.0).min(99.9)
    } else {
        0.0
    }
    .clamp(0.0, 100.0);
    let fallback_phase = if complete {
        "complete"
    } else if manifest.bytes_to_stage > 0
        && manifest.bytes_downloaded >= manifest.bytes_to_download
        && manifest.bytes_staged < manifest.bytes_to_stage
    {
        "staging"
    } else if manifest.bytes_downloaded > 0 {
        "downloading"
    } else {
        "preparing"
    };
    let phase = if complete {
        "complete"
    } else {
        log_phase.unwrap_or(fallback_phase)
    };
    let live = !complete && matches!(phase, "preparing" | "downloading" | "staging");
    let state = if complete {
        "complete"
    } else if manifest.bytes_downloaded > 0 || manifest.bytes_to_download > 0 {
        "downloading"
    } else {
        "pending"
    };
    SteamInstallProgressPayload {
        appid: appid.to_string(),
        pct,
        bytes_done,
        bytes_total,
        state: state.to_string(),
        phase: phase.to_string(),
        live,
    }
}

fn steam_install_progress_snapshot(appid: &str) -> Option<SteamInstallProgressPayload> {
    read_steam_install_manifest(appid).and_then(|manifest| {
        let install_dir_present = steam_install_dir_present(&manifest);
        let installed = steam_is_installed(
            manifest.state_flags,
            manifest.size_on_disk,
            install_dir_present,
        );
        if !manifest.download_active && !installed && manifest.size_on_disk == 0 {
            None
        } else {
            Some(steam_install_progress_payload(
                appid,
                &manifest,
                install_dir_present,
                steam_install_log_phase(appid),
            ))
        }
    })
}

#[tauri::command]
async fn steam_install_progress(
    appid: String,
) -> Result<Option<SteamInstallProgressPayload>, String> {
    let appid = validate_steam_appid(&appid)?;
    tauri::async_runtime::spawn_blocking(move || Ok(steam_install_progress_snapshot(&appid)))
        .await
        .map_err(|e| format!("Steam progress task failed: {e}"))?
}

#[cfg(test)]
mod steam_install_progress_tests {
    use super::{
        parse_steam_install_log_phase, parse_steam_install_manifest,
        steam_install_progress_payload, steam_is_installed, steam_uninstall_is_complete,
    };

    #[test]
    fn download_and_staging_progress_uses_real_acf_counters() {
        let manifest = parse_steam_install_manifest(
            "\"StateFlags\" \"1538\"\n\"SizeOnDisk\" \"0\"\n\"BytesToDownload\" \"1000\"\n\"BytesDownloaded\" \"500\"\n\"BytesToStage\" \"4000\"\n\"BytesStaged\" \"1000\"",
        );
        let payload = steam_install_progress_payload("123", &manifest, false, None);

        assert_eq!(payload.pct, 30.0);
        assert_eq!(payload.bytes_done, 1500);
        assert_eq!(payload.bytes_total, 5000);
        assert_eq!(payload.state, "downloading");
        assert_eq!(payload.phase, "downloading");
    }

    #[test]
    fn keeps_fractional_download_progress_without_staging_data() {
        let manifest = parse_steam_install_manifest(
            "\"StateFlags\" \"2\"\n\"BytesToDownload\" \"10000\"\n\"BytesDownloaded\" \"1234\"",
        );
        let payload = steam_install_progress_payload("123", &manifest, false, None);

        assert_eq!(payload.pct, 12.3);
        assert_eq!(payload.bytes_done, 1234);
        assert_eq!(payload.bytes_total, 10000);
    }

    #[test]
    fn zero_download_bytes_reports_preparing_phase() {
        let manifest = parse_steam_install_manifest(
            "\"StateFlags\" \"1026\"\n\"SizeOnDisk\" \"0\"\n\"BytesToDownload\" \"10000\"\n\"BytesDownloaded\" \"0\"",
        );
        let payload = steam_install_progress_payload("123", &manifest, false, None);

        assert_eq!(payload.phase, "preparing");
        assert_eq!(payload.pct, 0.0);
    }

    #[test]
    fn installed_requires_flag_size_and_present_dir() {
        assert!(steam_is_installed(4, 12_772_699_651, true));
        assert!(!steam_is_installed(4, 12_772_699_651, false));
        assert!(!steam_is_installed(2, 12_772_699_651, true));
        assert!(!steam_is_installed(4, 0, true));
        assert!(steam_is_installed(6, 12_772_699_651, true));
    }

    #[test]
    fn completion_payload_matches_installed_check() {
        let manifest = parse_steam_install_manifest(
            "\"StateFlags\" \"4\"\n\"SizeOnDisk\" \"12772699651\"\n\"BytesToDownload\" \"0\"\n\"BytesDownloaded\" \"0\"",
        );
        let payload = steam_install_progress_payload("620", &manifest, true, None);

        assert_eq!(payload.state, "complete");
        assert_eq!(payload.phase, "complete");
        assert_eq!(payload.pct, 100.0);
    }

    #[test]
    fn stale_counters_do_not_force_complete_without_dir() {
        let manifest = parse_steam_install_manifest(
            "\"StateFlags\" \"514\"\n\"SizeOnDisk\" \"0\"\n\"BytesToDownload\" \"2288461696\"\n\"BytesDownloaded\" \"869427056\"",
        );
        let payload = steam_install_progress_payload("4704690", &manifest, false, None);

        assert_ne!(payload.state, "complete");
        assert!(payload.pct < 100.0);
    }

    #[test]
    fn latest_decisive_content_log_phase_wins() {
        let log = "[1] AppID 414700 App update changed : Running Update,Preallocating,\n\
[2] AppID 414700 App update changed : Running Update,\n\
[3] AppID 414700 App update changed : Running Update,Downloading,Staging,";
        assert_eq!(
            parse_steam_install_log_phase(log, "414700"),
            Some("downloading")
        );
    }

    #[test]
    fn stopped_content_log_phase_is_not_live() {
        let log = "[1] AppID 414700 App update changed : Running Update,Downloading,Staging,\n\
[2] AppID 414700 App update changed : Running Update,Stopping,\n\
[3] AppID 414700 App update changed : None";
        let manifest = parse_steam_install_manifest(
            "\"StateFlags\" \"514\"\n\"BytesToDownload\" \"1000\"\n\"BytesDownloaded\" \"100\"",
        );
        let phase = parse_steam_install_log_phase(log, "414700");
        let payload = steam_install_progress_payload("414700", &manifest, false, phase);

        assert_eq!(payload.phase, "paused");
        assert!(!payload.live);
        assert_eq!(payload.pct, 10.0);
    }

    #[test]
    fn partial_cancel_waits_for_download_workspace_to_disappear() {
        let mut manifest = parse_steam_install_manifest(
            "\"StateFlags\" \"514\"\n\"SizeOnDisk\" \"0\"\n\"BytesToDownload\" \"1000\"",
        );
        manifest.download_active = true;
        assert!(!steam_uninstall_is_complete(Some(&manifest), true));

        manifest.download_active = false;
        assert!(steam_uninstall_is_complete(Some(&manifest), true));
        assert!(steam_uninstall_is_complete(None, true));
    }
}

fn spawn_steam_install_watcher(app: tauri::AppHandle, appid: String) {
    std::thread::spawn(move || {
        let mut misses = 0u32;
        let mut saw_active_download = false;
        for _ in 0..4800 {
            if let Some(manifest) = read_steam_install_manifest(&appid) {
                misses = 0;
                let install_dir_present = steam_install_dir_present(&manifest);
                let installed = steam_is_installed(
                    manifest.state_flags,
                    manifest.size_on_disk,
                    install_dir_present,
                );
                if installed {
                    let _ = app.emit("steam-install-done", SteamInstallDonePayload { appid });
                    return;
                }
                if manifest.download_active {
                    saw_active_download = true;
                } else if saw_active_download {
                    let _ = app.emit("steam-uninstall-done", SteamInstallDonePayload { appid });
                    return;
                }
            } else {
                misses += 1;
                if misses > 80 {
                    let _ = app.emit("steam-install-error", SteamInstallDonePayload { appid });
                    return;
                }
            }
            std::thread::sleep(Duration::from_millis(500));
        }
        let _ = app.emit("steam-install-error", SteamInstallDonePayload { appid });
    });
}

fn steam_uninstall_is_complete(
    manifest: Option<&SteamInstallManifest>,
    cancelling_download: bool,
) -> bool {
    match manifest {
        None => true,
        Some(manifest) if cancelling_download => !manifest.download_active,
        Some(manifest) => !steam_is_installed(
            manifest.state_flags,
            manifest.size_on_disk,
            steam_install_dir_present(manifest),
        ),
    }
}

fn spawn_steam_uninstall_watcher(app: tauri::AppHandle, appid: String, cancelling_download: bool) {
    std::thread::spawn(move || {
        for _ in 0..240 {
            let manifest = read_steam_install_manifest(&appid);
            if steam_uninstall_is_complete(manifest.as_ref(), cancelling_download) {
                let _ = app.emit("steam-uninstall-done", SteamInstallDonePayload { appid });
                return;
            }
            std::thread::sleep(Duration::from_millis(250));
        }
        let _ = app.emit("steam-install-error", SteamInstallDonePayload { appid });
    });
}

#[tauri::command]
fn steam_install(app_handle: tauri::AppHandle, appid: String) -> Result<(), String> {
    let appid = validate_steam_appid(&appid)?;
    if get_steam_install_path().is_none() {
        return Err("steam-client-missing".to_string());
    }
    dispatch_steam_uri(&format!("steam://install/{}", appid))?;
    spawn_steam_install_watcher(app_handle, appid);
    Ok(())
}

#[tauri::command]
fn steam_uninstall(app_handle: tauri::AppHandle, appid: String) -> Result<(), String> {
    let appid = validate_steam_appid(&appid)?;
    if get_steam_install_path().is_none() {
        return Err("steam-client-missing".to_string());
    }
    let cancelling_download = read_steam_install_manifest(&appid)
        .map(|manifest| {
            !steam_is_installed(
                manifest.state_flags,
                manifest.size_on_disk,
                steam_install_dir_present(&manifest),
            )
        })
        .unwrap_or(false);
    dispatch_steam_uri(&format!("steam://uninstall/{}", appid))?;
    spawn_steam_uninstall_watcher(app_handle, appid, cancelling_download);
    Ok(())
}

#[tauri::command]
fn steam_verify(appid: String) -> Result<(), String> {
    let appid = validate_steam_appid(&appid)?;
    if get_steam_install_path().is_none() {
        return Err("steam-client-missing".to_string());
    }
    dispatch_steam_uri(&format!("steam://validate/{}", appid))
}

#[tauri::command]
fn steam_watch_install(app_handle: tauri::AppHandle, appid: String) -> Result<(), String> {
    let appid = validate_steam_appid(&appid)?;
    spawn_steam_install_watcher(app_handle, appid);
    Ok(())
}

fn battlenet_exec_code(uid: &str) -> Option<&'static str> {
    match uid.to_lowercase().as_str() {
        "osi" => Some("OSI"),              // Diablo II Resurrected
        "fenris" => Some("Fen"),           // Diablo IV
        "d3" => Some("D3"),                // Diablo III
        "lazarus" => Some("LAZR"),         // Diablo Immortal
        "wow" => Some("WoW"),              // World of Warcraft
        "wow_classic" => Some("WoWC"),     // WoW Classic
        "wow_classic_era" => Some("WoWe"), // WoW Classic Era
        "s2" => Some("S2"),                // StarCraft II
        "s1" => Some("S1"),                // StarCraft Remastered
        "w3" => Some("W3"),                // Warcraft III Reforged
        "wtcg" => Some("WTCG"),            // Hearthstone
        "hero" => Some("Hero"),            // Heroes of the Storm
        "pro" => Some("Pro"),              // Overwatch 2
        "viper" => Some("VIPR"),           // Overwatch (legacy)
        "dst2" => Some("DST2"),            // Destiny 2
        _ => None,
    }
}

fn find_battlenet_exe() -> Option<String> {
    let candidates = [
        r"C:\Program Files (x86)\Battle.net\Battle.net.exe",
        r"C:\Program Files\Battle.net\Battle.net.exe",
    ];
    candidates
        .iter()
        .find(|p| std::path::Path::new(p).exists())
        .map(|p| p.to_string())
}

fn scan_battlenet_games() -> Vec<AppEntry> {
    // Games are registered in the Uninstall key with Blizzard Uninstaller as their uninstall string.
    let output = std::process::Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", r#"
            $uninstKey = "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
            Get-ChildItem $uninstKey -ErrorAction SilentlyContinue | ForEach-Object {
                $p = Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue
                $uninstStr = if ($p.UninstallString) { $p.UninstallString } else { "" }
                if ($uninstStr -notmatch "Blizzard Uninstaller") { return }
                $name = $p.DisplayName
                $loc  = $p.InstallLocation
                if (-not $name -or $name -eq "Battle.net" -or -not $loc -or -not (Test-Path $loc)) { return }
                $uid = ""
                if ($uninstStr -match '--uid=([^\s"]+)') { $uid = $Matches[1] }
                Write-Output "$name`t$loc`t$uid"
            }
        "#])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    let output = match output {
        Ok(o) => o,
        Err(_) => return vec![],
    };
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut games = Vec::new();
    for line in stdout.lines() {
        let parts: Vec<&str> = line.splitn(3, '\t').collect();
        if parts.len() < 2 {
            continue;
        }
        let name = parts[0].trim().to_string();
        let install = parts[1].trim();
        let uid = if parts.len() >= 3 {
            parts[2].trim()
        } else {
            ""
        };
        if name.is_empty() {
            continue;
        }
        // Use Battle.net.exe --exec="launch CODE" to start the game without the launcher window.
        // Fall back to direct game exe if the code isn't known, then battlenet:// URI as last resort.
        let launch_path = if let Some(code) = battlenet_exec_code(uid) {
            if let Some(bnet) = find_battlenet_exe() {
                format!("bnet-exec:{}|{}", bnet, code)
            } else {
                find_bnet_game_exe(install).unwrap_or_default()
            }
        } else {
            find_bnet_game_exe(install).unwrap_or_else(|| {
                if !uid.is_empty() {
                    format!("battlenet://{}", uid)
                } else {
                    String::new()
                }
            })
        };
        if launch_path.is_empty() {
            continue;
        }
        let icon = find_game_icon(install);
        let id = format!(
            "battlenet:{}",
            name.to_lowercase()
                .replace(' ', "_")
                .replace([':', '\'', '"'], "")
        );
        games.push(AppEntry {
            id,
            name,
            icon_base64: icon,
            launch_path,
            app_type: "game".to_string(),
            source: "battlenet".to_string(),
            install_dir: Some(install.to_string()),
            installed: true,
            ..Default::default()
        });
    }
    games
}

fn scan_gog_games() -> Vec<AppEntry> {
    let output = std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            r#"
            $roots = @("HKLM:\SOFTWARE\WOW6432Node\GOG.com\Games", "HKLM:\SOFTWARE\GOG.com\Games")
            foreach ($root in $roots) {
                if (-not (Test-Path $root)) { continue }
                Get-ChildItem $root -ErrorAction SilentlyContinue | ForEach-Object {
                    $p = Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue
                    $name    = $p.gameName
                    $path    = $p.path
                    $exe     = $p.exe
                    $depends = $p.dependsOn
                    if (-not $name -or -not $path) { return }
                    Write-Output ("{0}`t{1}`t{2}`t{3}" -f $name, $path, $exe, $depends)
                }
            }
        "#,
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    let output = match output {
        Ok(o) => o,
        Err(_) => return vec![],
    };
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut games = Vec::new();
    let mut seen_exe = std::collections::HashSet::new();

    for line in stdout.lines() {
        let parts: Vec<&str> = line.splitn(4, '\t').collect();
        if parts.len() < 2 {
            continue;
        }

        let name = parts[0].trim().to_string();
        let install_dir = parts[1].trim();
        let exe = parts.get(2).map(|s| s.trim()).unwrap_or("");
        let depends = parts.get(3).map(|s| s.trim()).unwrap_or("");
        if name.is_empty() || install_dir.is_empty() || !depends.is_empty() {
            continue;
        }

        let exe_path = if exe.is_empty() {
            None
        } else {
            let raw = Path::new(exe);
            let candidate = if raw.is_absolute() {
                raw.to_path_buf()
            } else {
                Path::new(install_dir).join(raw)
            };
            if candidate.exists() {
                Some(candidate.to_string_lossy().to_string())
            } else {
                None
            }
        };
        let launch_path = exe_path
            .or_else(|| find_main_exe_in_dir(install_dir))
            .unwrap_or_default();
        if launch_path.is_empty() {
            continue;
        }

        if !seen_exe.insert(launch_path.to_lowercase()) {
            continue;
        }

        let icon = extract_icon_base64(&launch_path);
        let id = format!(
            "gog:{}",
            name.to_lowercase()
                .replace(' ', "_")
                .replace([':', '\'', '"'], "")
        );
        games.push(AppEntry {
            id,
            name,
            icon_base64: icon,
            launch_path,
            app_type: "game".to_string(),
            source: "gog".to_string(),
            install_dir: Some(install_dir.to_string()),
            installed: true,
            ..Default::default()
        });
    }

    games
}

#[derive(Deserialize)]
struct EpicManifest {
    #[serde(rename = "DisplayName")]
    display_name: Option<String>,
    #[serde(rename = "InstallLocation")]
    install_location: Option<String>,
    #[serde(rename = "LaunchExecutable")]
    launch_executable: Option<String>,
    #[serde(rename = "AppName")]
    app_name: Option<String>,
    #[serde(rename = "MainGameAppName")]
    main_game_app_name: Option<String>,
    #[serde(rename = "bIsApplication")]
    is_application: Option<bool>,
}

fn scan_epic_games() -> Vec<AppEntry> {
    let program_data =
        std::env::var("PROGRAMDATA").unwrap_or_else(|_| "C:\\ProgramData".to_string());
    let manifest_dir = Path::new(&program_data)
        .join("Epic")
        .join("EpicGamesLauncher")
        .join("Data")
        .join("Manifests");
    let entries = match std::fs::read_dir(&manifest_dir) {
        Ok(e) => e,
        Err(_) => return vec![],
    };

    let mut games = Vec::new();
    let mut seen_ids = std::collections::HashSet::new();

    for entry in entries.flatten() {
        let p = entry.path();
        if p.extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase()
            != "item"
        {
            continue;
        }

        let data = match std::fs::read_to_string(&p) {
            Ok(d) => d,
            Err(_) => continue,
        };
        let manifest: EpicManifest = match serde_json::from_str(&data) {
            Ok(m) => m,
            Err(_) => continue,
        };

        let name = manifest.display_name.unwrap_or_default();
        let install = manifest.install_location.unwrap_or_default();
        let exe_rel = manifest.launch_executable.unwrap_or_default();
        let app_id = manifest.app_name.unwrap_or_default();
        if name.is_empty() || install.is_empty() || exe_rel.is_empty() || app_id.is_empty() {
            continue;
        }
        if manifest.is_application == Some(false) {
            continue;
        }
        if let Some(main) = &manifest.main_game_app_name {
            if !main.is_empty() && *main != app_id {
                continue;
            }
        }

        let exe_rel_path = Path::new(&exe_rel);
        let exe_full = if exe_rel_path.is_absolute() {
            exe_rel_path.to_path_buf()
        } else {
            Path::new(&install).join(exe_rel_path)
        };
        if !exe_full.exists() {
            continue;
        }
        if !seen_ids.insert(app_id.to_lowercase()) {
            continue;
        }

        let launch_path = format!(
            "com.epicgames.launcher://apps/{}?action=launch&silent=true",
            app_id
        );
        let icon = extract_icon_base64(&exe_full.to_string_lossy());
        let id = format!("epic:{}", app_id.to_lowercase());
        games.push(AppEntry {
            id,
            name,
            icon_base64: icon,
            launch_path,
            app_type: "game".to_string(),
            source: "epic".to_string(),
            install_dir: Some(install),
            installed: true,
            ..Default::default()
        });
    }

    games
}

fn find_main_exe_in_dir(dir: &str) -> Option<String> {
    let path = Path::new(dir);
    let skip = [
        "unins", "crash", "update", "error", "report", "helper", "agent", "redist", "setup",
        "install", "vcredist",
    ];
    let mut candidates: Vec<String> = Vec::new();
    if let Ok(entries) = std::fs::read_dir(path) {
        for e in entries.flatten() {
            let p = e.path();
            if p.extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase()
                == "exe"
            {
                let name = p
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_lowercase();
                if skip.iter().any(|s| name.contains(s)) {
                    continue;
                }
                candidates.push(p.to_string_lossy().to_string());
            }
        }
    }
    // Prefer exes with "launcher" in the name, then shortest name (usually the main exe)
    candidates.sort_by_key(|p| {
        let n = p.to_lowercase();
        let pref = if n.contains("launcher") { 0 } else { 1 };
        (pref, p.len())
    });
    candidates.into_iter().next()
}

// Like find_main_exe_in_dir but also skips *launcher* exes — for Blizzard games where
// the Launcher.exe opens the full Battle.net window but the game EXE runs standalone.
fn find_bnet_game_exe(dir: &str) -> Option<String> {
    let path = Path::new(dir);
    let skip = [
        "unins", "crash", "update", "error", "report", "helper", "agent", "redist", "setup",
        "install", "vcredist", "launcher",
    ];
    let mut candidates: Vec<String> = Vec::new();
    if let Ok(entries) = std::fs::read_dir(path) {
        for e in entries.flatten() {
            let p = e.path();
            if p.extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase()
                == "exe"
            {
                let name = p
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_lowercase();
                if skip.iter().any(|s| name.contains(s)) {
                    continue;
                }
                candidates.push(p.to_string_lossy().to_string());
            }
        }
    }
    // Shortest name is typically the main game exe (e.g. D2R.exe over longer helpers)
    candidates.sort_by_key(|p| p.len());
    candidates.into_iter().next()
}

fn scan_steam_games() -> Vec<AppEntry> {
    let mut games = Vec::new();
    let library_paths = steam_library_paths();

    for library in &library_paths {
        let lib_path = Path::new(library);
        if !lib_path.exists() {
            continue;
        }
        if let Ok(dir) = std::fs::read_dir(lib_path) {
            for entry in dir.flatten() {
                let p = entry.path();
                if p.extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("")
                    .to_lowercase()
                    != "acf"
                {
                    continue;
                }
                if let Ok(content) = std::fs::read_to_string(&p) {
                    let mut manifest = parse_steam_install_manifest(&content);
                    manifest.library_path = library.clone();
                    if !steam_is_installed(
                        manifest.state_flags,
                        manifest.size_on_disk,
                        steam_install_dir_present(&manifest),
                    ) {
                        continue;
                    }
                    let mut name = String::new();
                    let mut install_dir = String::new();
                    let mut app_id = String::new();
                    for line in content.lines() {
                        let line = line.trim();
                        if line.starts_with("\"name\"") {
                            name = extract_vdf_value(line);
                        } else if line.starts_with("\"installdir\"") {
                            install_dir = extract_vdf_value(line);
                        } else if line.starts_with("\"appid\"") {
                            app_id = extract_vdf_value(line);
                        }
                    }
                    if name.is_empty() || app_id.is_empty() {
                        continue;
                    }
                    let launch_path = format!("steam://rungameid/{}", app_id);
                    let icon = find_game_icon(&format!("{}\\common\\{}", library, install_dir));
                    games.push(AppEntry {
                        id: launch_path.clone(),
                        name,
                        icon_base64: icon,
                        launch_path,
                        app_type: "game".to_string(),
                        source: "steam".to_string(),
                        install_dir: Some(format!("{}\\common\\{}", library, install_dir)),
                        installed: true,
                        steam_appid: app_id.parse::<u32>().ok(),
                        ..Default::default()
                    });
                }
            }
        }
    }
    games
}

fn is_xboxgames_path(value: &str) -> bool {
    value
        .replace('/', "\\")
        .to_lowercase()
        .contains(":\\xboxgames\\")
}

fn steam_app_id_for_size(id: &str, launch_path: &str, steam_appid: Option<u32>) -> Option<String> {
    if let Some(appid) = steam_appid {
        return Some(appid.to_string());
    }

    for value in [id, launch_path] {
        let lower = value.to_ascii_lowercase();
        let Some(index) = lower.find("steam://rungameid/") else {
            continue;
        };
        let start = index + "steam://rungameid/".len();
        let appid: String = value[start..]
            .chars()
            .take_while(|ch| ch.is_ascii_digit())
            .collect();
        if !appid.is_empty() {
            return Some(appid);
        }
    }

    None
}

fn steam_manifest_size(id: &str, launch_path: &str, steam_appid: Option<u32>) -> Option<u64> {
    let app_id = steam_app_id_for_size(id, launch_path, steam_appid)?;
    for library in steam_library_paths() {
        let manifest = Path::new(&library).join(format!("appmanifest_{}.acf", app_id));
        let Ok(content) = std::fs::read_to_string(manifest) else {
            continue;
        };
        for line in content.lines() {
            let line = line.trim();
            if line.starts_with("\"SizeOnDisk\"") {
                let raw = extract_vdf_value(line);
                if let Ok(size) = raw.parse::<u64>() {
                    if size > 0 {
                        return Some(size);
                    }
                }
            }
        }
    }
    None
}

fn install_size_candidates(dir: &str, source: &str) -> Vec<std::path::PathBuf> {
    let root = Path::new(dir).to_path_buf();
    let mut candidates = Vec::new();
    let content = root.join("Content");

    if source.eq_ignore_ascii_case("xbox") || source.eq_ignore_ascii_case("uwp") || content.exists() {
        candidates.push(content);
    }
    candidates.push(root);
    candidates
}

fn resolve_install_dir(
    id: &str,
    launch_path: &str,
    source: &str,
    install_dir: Option<&str>,
) -> Option<String> {
    let source = source.to_lowercase();

    if let Some(dir) = install_dir.map(str::trim).filter(|dir| !dir.is_empty()) {
        let path = Path::new(dir);
        if path.exists() {
            return Some(path.to_string_lossy().to_string());
        }
        let content = path.join("Content");
        if content.exists() {
            return Some(content.to_string_lossy().to_string());
        }
    }

    if source == "xbox" || source == "uwp" {
        return None;
    }

    if source != "xbox" && is_xboxgames_path(launch_path) {
        return None;
    }

    if source == "steam" {
        let app_id = id
            .strip_prefix("steam://rungameid/")
            .or_else(|| launch_path.strip_prefix("steam://rungameid/"))?;
        for library in steam_library_paths() {
            let manifest = Path::new(&library).join(format!("appmanifest_{}.acf", app_id));
            let Ok(content) = std::fs::read_to_string(manifest) else {
                continue;
            };
            let mut install_dir = String::new();
            for line in content.lines() {
                let line = line.trim();
                if line.starts_with("\"installdir\"") {
                    install_dir = extract_vdf_value(line);
                    break;
                }
            }
            if install_dir.is_empty() {
                continue;
            }
            let dir = Path::new(&library).join("common").join(install_dir);
            if dir.exists() {
                return Some(dir.to_string_lossy().to_string());
            }
        }
        return None;
    }

    let path = Path::new(launch_path);
    if path.is_dir() {
        return Some(path.to_string_lossy().to_string());
    }
    path.parent()
        .filter(|p| p.exists())
        .map(|p| p.to_string_lossy().to_string())
}

fn dir_size(path: &Path) -> Option<u64> {
    let mut total = 0u64;
    let mut stack = vec![path.to_path_buf()];
    let mut read_root = false;

    while let Some(dir) = stack.pop() {
        let entries = match std::fs::read_dir(&dir) {
            Ok(entries) => {
                if dir == path {
                    read_root = true;
                }
                entries
            }
            Err(_) => {
                if dir == path && !read_root {
                    return None;
                }
                continue;
            }
        };
        for entry in entries.flatten() {
            let Ok(file_type) = entry.file_type() else {
                continue;
            };
            if file_type.is_symlink() {
                continue;
            }
            if file_type.is_dir() {
                stack.push(entry.path());
            } else if file_type.is_file() {
                if let Ok(md) = entry.metadata() {
                    total = total.saturating_add(md.len());
                }
            }
        }
    }

    Some(total)
}

#[tauri::command]
fn get_install_size(
    id: String,
    launch_path: String,
    source: String,
    install_dir: Option<String>,
    steam_appid: Option<u32>,
) -> Option<u64> {
    if source.eq_ignore_ascii_case("steam") {
        if let Some(size) = steam_manifest_size(&id, &launch_path, steam_appid) {
            return Some(size);
        }
    }
    let dir = resolve_install_dir(&id, &launch_path, &source, install_dir.as_deref())?;
    let mut zero_size = false;
    for candidate in install_size_candidates(&dir, &source) {
        let Some(size) = dir_size(&candidate) else {
            continue;
        };
        if size > 0 {
            return Some(size);
        }
        zero_size = true;
    }
    if zero_size {
        Some(0)
    } else {
        None
    }
}

fn normalize_game_name_for_dedupe(name: &str) -> String {
    name.chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .flat_map(|c| c.to_lowercase())
        .collect()
}

fn drop_shadowed_xbox_duplicates(apps: &mut Vec<AppEntry>) {
    let xbox_names: std::collections::HashSet<String> = apps
        .iter()
        .filter(|app| app.source.eq_ignore_ascii_case("xbox") && app.app_type == "game")
        .map(|app| normalize_game_name_for_dedupe(&app.name))
        .filter(|name| !name.is_empty())
        .collect();

    if xbox_names.is_empty() {
        return;
    }

    apps.retain(|app| {
        if app.source.eq_ignore_ascii_case("xbox") {
            return true;
        }
        if app.app_type != "game" {
            return true;
        }
        let name = normalize_game_name_for_dedupe(&app.name);
        if !xbox_names.contains(&name) {
            return true;
        }
        let source = app.source.to_lowercase();
        if source.is_empty()
            || source == "desktop"
            || source == "other"
            || app.launch_path.to_lowercase().ends_with(".lnk")
        {
            return false;
        }
        let in_xbox_folder = is_xboxgames_path(&app.launch_path)
            || app
                .install_dir
                .as_deref()
                .map(is_xboxgames_path)
                .unwrap_or(false);
        !in_xbox_folder
    });
}

fn extract_vdf_value(line: &str) -> String {
    let parts: Vec<&str> = line.splitn(4, '"').collect();
    if parts.len() >= 4 {
        parts[3].trim_end_matches('"').to_string()
    } else {
        String::new()
    }
}

fn find_game_icon(game_dir: &str) -> Option<String> {
    let path = Path::new(game_dir);
    if !path.exists() {
        return None;
    }
    if let Ok(dir) = std::fs::read_dir(path) {
        for entry in dir.flatten() {
            let p = entry.path();
            if p.extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase()
                == "exe"
            {
                if let Some(icon) = extract_icon_base64(&p.to_string_lossy()) {
                    return Some(icon);
                }
            }
        }
    }
    None
}

#[tauri::command]
fn get_apps() -> Vec<AppEntry> {
    let settings = load_settings_inner();
    let hidden = load_hidden_inner();
    let mut apps: Vec<AppEntry> = Vec::new();

    // 1. Existing Desktop/Start Menu Scan
    if settings.scan_desktop {
        let user_desktop = dirs::desktop_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();
        let start_menu_user = dirs::data_dir()
            .map(|p| {
                p.join("Microsoft\\Windows\\Start Menu\\Programs")
                    .to_string_lossy()
                    .to_string()
            })
            .unwrap_or_default();
        let start_menu_common =
            "C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs".to_string();
        for folder in [&user_desktop, &start_menu_user, &start_menu_common] {
            apps.extend(scan_folder(folder, "app"));
        }
    }

    // Steam launcher app entry — try registry path first, then fallbacks
    let steam_exe = get_steam_install_path()
        .map(|p| format!("{}\\Steam.exe", p))
        .and_then(|p| {
            if std::path::Path::new(&p).exists() {
                Some(p)
            } else {
                None
            }
        })
        .or_else(|| {
            [
                "C:\\Program Files (x86)\\Steam\\Steam.exe",
                "C:\\Program Files\\Steam\\Steam.exe",
            ]
            .iter()
            .find(|&&p| std::path::Path::new(p).exists())
            .map(|p| p.to_string())
        });
    if let Some(steam_path) = steam_exe {
        if !apps.iter().any(|a| a.name.to_lowercase() == "steam") {
            apps.push(AppEntry {
                id: "steam_launcher".to_string(),
                name: "Steam".to_string(),
                icon_base64: extract_icon_base64(&steam_path),
                launch_path: steam_path,
                app_type: "app".to_string(),
                source: "desktop".to_string(),
                install_dir: None,
                installed: true,
                ..Default::default()
            });
        }
    }

    // 2. UWP and Xbox scan
    if settings.scan_uwp || settings.scan_xbox {
        let uwp = scan_uwp_apps();
        for entry in uwp {
            if entry.source == "xbox" && !settings.scan_xbox {
                continue;
            }
            if entry.source == "uwp" && !settings.scan_uwp {
                continue;
            }
            apps.push(entry);
        }
    }

    // 3. Steam Games scan (this adds the games, not the app)
    if settings.scan_steam {
        let installed = scan_steam_games();
        apps.extend(installed.clone());
        merge_owned_steam_games(&mut apps, &installed);
    }

    // 4. Battle.net Games scan
    if settings.scan_battlenet {
        apps.extend(scan_battlenet_games());
    }
    if settings.scan_gog {
        apps.extend(scan_gog_games());
    }
    if settings.scan_epic {
        apps.extend(scan_epic_games());
    }

    drop_shadowed_xbox_duplicates(&mut apps);

    let mut seen = std::collections::HashSet::new();
    // Use the ID for de-duplication instead of just the name to be safer
    apps.retain(|a| seen.insert(a.id.clone()) && !hidden.contains(&a.id));

    // Apply user category overrides (move between Games/Apps and/or force source).
    let categories = load_custom_categories();
    if !categories.is_empty() {
        for app in &mut apps {
            if let Some(ov) = categories.get(&app.id) {
                if let Some(t) = &ov.app_type {
                    app.app_type = t.clone();
                }
                if let Some(s) = &ov.source {
                    app.source = s.clone();
                }
            }
        }
    }

    drop_shadowed_xbox_duplicates(&mut apps);

    apps
}

// Same as get_apps() but without filtering hidden entries.
// Used by the frontend to show proper names/icons for hidden apps in the Manage modal.
#[tauri::command]
fn get_all_apps() -> Vec<AppEntry> {
    let settings = load_settings_inner();
    let mut apps: Vec<AppEntry> = Vec::new();

    if settings.scan_desktop {
        let user_desktop = dirs::desktop_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();
        let start_menu_user = dirs::data_dir()
            .map(|p| {
                p.join("Microsoft\\Windows\\Start Menu\\Programs")
                    .to_string_lossy()
                    .to_string()
            })
            .unwrap_or_default();
        let start_menu_common =
            "C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs".to_string();
        for folder in [&user_desktop, &start_menu_user, &start_menu_common] {
            apps.extend(scan_folder(folder, "app"));
        }
    }

    let steam_exe = get_steam_install_path()
        .map(|p| format!("{}\\Steam.exe", p))
        .and_then(|p| {
            if std::path::Path::new(&p).exists() {
                Some(p)
            } else {
                None
            }
        })
        .or_else(|| {
            [
                "C:\\Program Files (x86)\\Steam\\Steam.exe",
                "C:\\Program Files\\Steam\\Steam.exe",
            ]
            .iter()
            .find(|&&p| std::path::Path::new(p).exists())
            .map(|p| p.to_string())
        });
    if let Some(steam_path) = steam_exe {
        if !apps.iter().any(|a| a.name.to_lowercase() == "steam") {
            apps.push(AppEntry {
                id: "steam_launcher".to_string(),
                name: "Steam".to_string(),
                icon_base64: extract_icon_base64(&steam_path),
                launch_path: steam_path,
                app_type: "app".to_string(),
                source: "desktop".to_string(),
                install_dir: None,
                installed: true,
                ..Default::default()
            });
        }
    }

    if settings.scan_uwp || settings.scan_xbox {
        let uwp = scan_uwp_apps();
        for entry in uwp {
            if entry.source == "xbox" && !settings.scan_xbox {
                continue;
            }
            if entry.source == "uwp" && !settings.scan_uwp {
                continue;
            }
            apps.push(entry);
        }
    }

    if settings.scan_steam {
        let installed = scan_steam_games();
        apps.extend(installed.clone());
        merge_owned_steam_games(&mut apps, &installed);
    }

    if settings.scan_battlenet {
        apps.extend(scan_battlenet_games());
    }
    if settings.scan_gog {
        apps.extend(scan_gog_games());
    }
    if settings.scan_epic {
        apps.extend(scan_epic_games());
    }

    // Deduplicate only — no hidden filter
    let mut seen = std::collections::HashSet::new();
    apps.retain(|a| seen.insert(a.id.clone()));

    // Merge custom entries (manually added apps + scanned custom folders)
    let custom = load_custom_data();
    // Build a set of known launch paths (lowercase) from manually-added apps
    // so that folder scans don't produce duplicates for the same executable.
    let mut known_paths: std::collections::HashSet<String> = std::collections::HashSet::new();
    for app in &custom.apps {
        known_paths.insert(app.launch_path.to_lowercase());
        if seen.insert(app.id.clone()) {
            apps.push(app.clone());
        }
    }
    for folder in custom.folders {
        if !folder.enabled {
            continue;
        }
        for app in scan_folder_with_source(&folder.path, &folder.app_type, &folder.source) {
            if known_paths.contains(&app.launch_path.to_lowercase()) {
                continue;
            }
            if seen.insert(app.id.clone()) {
                known_paths.insert(app.launch_path.to_lowercase());
                apps.push(app);
            }
        }
    }

    // Apply user-defined name overrides
    let custom_names = load_custom_names();
    if !custom_names.is_empty() {
        for app in &mut apps {
            if let Some(name) = custom_names.get(&app.id) {
                app.name = name.clone();
            }
        }
    }

    // Apply user category overrides (move between Games/Apps and/or force source).
    // Runs after dedup and naming; mutates app_type/source in place only — never id or launch_path.
    let categories = load_custom_categories();
    if !categories.is_empty() {
        for app in &mut apps {
            if let Some(ov) = categories.get(&app.id) {
                if let Some(t) = &ov.app_type {
                    app.app_type = t.clone();
                }
                if let Some(s) = &ov.source {
                    app.source = s.clone();
                }
            }
        }
    }

    drop_shadowed_xbox_duplicates(&mut apps);

    apps
}

// ── Launch window watcher ─────────────────────────────────────
// Passed via LPARAM to EnumWindows callbacks; lives on the calling thread.
struct PollWindowState {
    target_pid: u32,
    existing: *const std::collections::HashSet<isize>,
    our_hwnd: isize,
    found: isize,
}

unsafe extern "system" fn enum_snapshot_callback(
    hwnd: windows::Win32::Foundation::HWND,
    lparam: LPARAM,
) -> BOOL {
    if IsWindowVisible(hwnd).as_bool() {
        let set = &mut *(lparam.0 as *mut std::collections::HashSet<isize>);
        set.insert(hwnd.0 as isize);
    }
    BOOL(1)
}

// Snapshot all currently visible top-level window handles.
fn snapshot_visible_windows() -> std::collections::HashSet<isize> {
    let mut set = std::collections::HashSet::new();
    unsafe {
        let _ = EnumWindows(
            Some(enum_snapshot_callback),
            LPARAM(&mut set as *mut _ as isize),
        );
    }
    set
}

unsafe extern "system" fn enum_find_window_callback(
    hwnd: windows::Win32::Foundation::HWND,
    lparam: LPARAM,
) -> BOOL {
    let state = &mut *(lparam.0 as *mut PollWindowState);
    let hwnd_val = hwnd.0 as isize;

    if hwnd_val == state.our_hwnd {
        return BOOL(1);
    }
    if !IsWindowVisible(hwnd).as_bool() {
        return BOOL(1);
    }
    if GetWindowTextLengthW(hwnd) == 0 {
        return BOOL(1);
    }

    let matched = if state.target_pid != 0 {
        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        pid == state.target_pid
    } else {
        !(*state.existing).contains(&hwnd_val)
    };

    if matched {
        state.found = hwnd_val;
        BOOL(0) // stop enumeration
    } else {
        BOOL(1) // continue
    }
}

// Poll once for a visible titled window belonging to `pid` (or any new window
// when pid == 0). Returns the HWND value or 0 if nothing was found.
fn poll_for_window(
    pid: u32,
    existing: &std::collections::HashSet<isize>,
    our_hwnd: isize,
) -> isize {
    let mut state = PollWindowState {
        target_pid: pid,
        existing: existing as *const _,
        our_hwnd,
        found: 0,
    };
    unsafe {
        let _ = EnumWindows(
            Some(enum_find_window_callback),
            LPARAM(&mut state as *mut _ as isize),
        );
    }
    state.found
}

#[derive(Serialize)]
struct LaunchFocusResult {
    running: bool,
    focused: bool,
    matched_window_title: Option<String>,
    matched_pid: Option<u32>,
    confidence: String,
}

#[derive(Serialize)]
struct RunningEntry {
    id: String,
    focused: bool,
    confidence: String,
}

#[derive(Serialize)]
struct CloseResult {
    attempted: bool,
    closed_now: bool,
}

#[derive(Clone)]
struct LaunchWindowCandidate {
    hwnd: isize,
    pid: u32,
    title: String,
    exe_path: Option<String>,
}

struct LaunchWindowCollectState {
    windows: *mut Vec<LaunchWindowCandidate>,
    our_hwnd: isize,
}

unsafe extern "system" fn enum_launch_window_callback(
    hwnd: windows::Win32::Foundation::HWND,
    lparam: LPARAM,
) -> BOOL {
    let state = &mut *(lparam.0 as *mut LaunchWindowCollectState);
    let hwnd_val = hwnd.0 as isize;

    if hwnd_val == state.our_hwnd {
        return BOOL(1);
    }
    if !IsWindowVisible(hwnd).as_bool() {
        return BOOL(1);
    }

    let Some(title) = get_window_title(hwnd) else {
        return BOOL(1);
    };
    let mut pid: u32 = 0;
    GetWindowThreadProcessId(hwnd, Some(&mut pid));
    (*state.windows).push(LaunchWindowCandidate {
        hwnd: hwnd_val,
        pid,
        title,
        exe_path: process_exe_path(pid),
    });

    BOOL(1)
}

fn get_window_title(hwnd: windows::Win32::Foundation::HWND) -> Option<String> {
    unsafe {
        let len = GetWindowTextLengthW(hwnd);
        if len <= 0 {
            return None;
        }

        let mut buf = vec![0u16; len as usize + 1];
        let copied = GetWindowTextW(hwnd, &mut buf);
        if copied <= 0 {
            return None;
        }

        let title = String::from_utf16_lossy(&buf[..copied as usize])
            .trim()
            .to_string();
        if title.is_empty() {
            None
        } else {
            Some(title)
        }
    }
}

fn process_exe_path(pid: u32) -> Option<String> {
    if pid == 0 {
        return None;
    }

    unsafe {
        let process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
        let mut buf = vec![0u16; 32768];
        let mut size = buf.len() as u32;
        let result = QueryFullProcessImageNameW(
            process,
            PROCESS_NAME_WIN32,
            PWSTR(buf.as_mut_ptr()),
            &mut size,
        );
        let _ = CloseHandle(process);

        result.ok()?;
        if size == 0 {
            return None;
        }
        Some(String::from_utf16_lossy(&buf[..size as usize]))
    }
}

// shell:AppsFolder launches provide no child PID and Xbox/GDK windows often do
// not title-match the store name, so package-backed targets are confirmed by
// Application User Model ID package family instead.
fn process_aumid(pid: u32) -> Option<String> {
    use windows::Win32::Storage::Packaging::Appx::GetApplicationUserModelId;

    if pid == 0 {
        return None;
    }

    unsafe {
        let process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
        let mut len: u32 = 0;
        let _ = GetApplicationUserModelId(process, &mut len, PWSTR::null());
        if len == 0 {
            let _ = CloseHandle(process);
            return None;
        }

        let mut buf = vec![0u16; len as usize];
        let rc = GetApplicationUserModelId(process, &mut len, PWSTR(buf.as_mut_ptr()));
        let _ = CloseHandle(process);

        if rc != WIN32_ERROR(0) {
            return None;
        }

        let end = (len as usize).saturating_sub(1);
        if end == 0 {
            return None;
        }
        Some(String::from_utf16_lossy(&buf[..end]))
    }
}

fn snapshot_process_aumids() -> Vec<String> {
    use windows::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W,
        TH32CS_SNAPPROCESS,
    };

    let mut aumids = Vec::new();
    unsafe {
        let Ok(snapshot) = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) else {
            return aumids;
        };
        let mut entry = PROCESSENTRY32W {
            dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
            ..Default::default()
        };
        if Process32FirstW(snapshot, &mut entry).is_ok() {
            loop {
                if let Some(aumid) = process_aumid(entry.th32ProcessID) {
                    aumids.push(aumid);
                }
                if Process32NextW(snapshot, &mut entry).is_err() {
                    break;
                }
            }
        }
        let _ = CloseHandle(snapshot);
    }
    aumids
}

fn aumid_family(aumid: &str) -> &str {
    aumid.split('!').next().unwrap_or(aumid)
}

fn package_target_running(launch_path: &str, process_aumids: &[String]) -> bool {
    let Some(target_aumid) = launch_path.strip_prefix("shell:AppsFolder\\") else {
        return false;
    };
    let target_family = aumid_family(target_aumid);
    if target_family.is_empty() {
        return false;
    }

    process_aumids
        .iter()
        .any(|aumid| aumid_family(aumid).eq_ignore_ascii_case(target_family))
}

fn foreground_process_aumid() -> Option<String> {
    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.0.is_null() {
            return None;
        }
        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        process_aumid(pid)
    }
}

// Returns true when a process with the given executable file name (e.g. "steam.exe")
// is currently running. Used for honest two-phase launch messaging.
fn is_process_running(exe_name: &str) -> bool {
    use windows::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W,
        TH32CS_SNAPPROCESS,
    };
    unsafe {
        let Ok(snapshot) = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) else {
            return false;
        };
        let mut entry = PROCESSENTRY32W {
            dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
            ..Default::default()
        };
        let mut found = false;
        if Process32FirstW(snapshot, &mut entry).is_ok() {
            loop {
                let end = entry
                    .szExeFile
                    .iter()
                    .position(|&c| c == 0)
                    .unwrap_or(entry.szExeFile.len());
                let name = String::from_utf16_lossy(&entry.szExeFile[..end]);
                if name.eq_ignore_ascii_case(exe_name) {
                    found = true;
                    break;
                }
                if Process32NextW(snapshot, &mut entry).is_err() {
                    break;
                }
            }
        }
        let _ = CloseHandle(snapshot);
        found
    }
}

fn collect_launch_windows() -> Vec<LaunchWindowCandidate> {
    let mut windows = Vec::new();
    let mut state = LaunchWindowCollectState {
        windows: &mut windows as *mut _,
        our_hwnd: OUR_HWND.load(Ordering::Relaxed),
    };

    unsafe {
        let _ = EnumWindows(
            Some(enum_launch_window_callback),
            LPARAM(&mut state as *mut _ as isize),
        );
    }

    windows
}

fn normalize_match_text(value: &str) -> String {
    value
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .flat_map(|c| c.to_lowercase())
        .collect()
}

fn launch_exe_path(launch_path: &str) -> Option<String> {
    let direct_path = if let Some(rest) = launch_path.strip_prefix("bnet-exec:") {
        rest.split_once('|').map(|(exe, _)| exe).unwrap_or(rest)
    } else {
        launch_path
    };

    let lower = direct_path.to_lowercase();
    if lower.ends_with(".exe")
        && !lower.starts_with("shell:")
        && !lower.contains("://")
        && !lower.ends_with(".lnk")
    {
        Some(direct_path.to_string())
    } else {
        None
    }
}

fn file_name_lower(path: &str) -> Option<String> {
    Path::new(path)
        .file_name()
        .and_then(|s| s.to_str())
        .map(|s| s.to_lowercase())
}

// Launcher/client windows must not be treated as a launched game's own window.
fn is_launcher_exe(exe_path: &Option<String>) -> bool {
    let Some(path) = exe_path else {
        return false;
    };
    let lower = path.to_lowercase();
    const LAUNCHER_EXES: &[&str] = &[
        "\\steam.exe",
        "\\steamwebhelper.exe",
        "\\battle.net.exe",
        "\\battle.net launcher.exe",
        "\\epicgameslauncher.exe",
        "\\galaxyclient.exe",
        "\\eadesktop.exe",
        "\\origin.exe",
        "\\xboxapp.exe",
        "\\gamingservices.exe",
    ];
    LAUNCHER_EXES
        .iter()
        .any(|needle| lower.ends_with(needle) || lower.contains(needle))
}

fn match_launch_window_score(
    candidate: &LaunchWindowCandidate,
    name: &str,
    launch_path: &str,
    source: &str,
) -> u32 {
    let source_lower = source.to_lowercase();
    let is_launcher_source = ["steam", "xbox", "uwp", "battle.net", "battlenet", "epic"]
        .iter()
        .any(|s| source_lower.contains(s));
    if is_launcher_source && is_launcher_exe(&candidate.exe_path) {
        return 0;
    }

    let name_norm = normalize_match_text(name);
    let title_norm = normalize_match_text(&candidate.title);
    let launch_exe = launch_exe_path(launch_path);
    let launch_file = launch_exe.as_deref().and_then(file_name_lower);
    let candidate_exe = candidate.exe_path.as_deref().unwrap_or_default();
    let candidate_file = file_name_lower(candidate_exe);
    let mut score = 0;

    if let (Some(expected), Some(actual)) = (launch_exe.as_ref(), candidate.exe_path.as_ref()) {
        if expected.eq_ignore_ascii_case(actual) {
            score = score.max(100);
        }
    }

    if let (Some(expected), Some(actual)) = (launch_file.as_ref(), candidate_file.as_ref()) {
        if expected == actual {
            score = score.max(90);
        }
    }

    if !name_norm.is_empty() && title_norm.contains(&name_norm) {
        score = score.max(60);
    }

    if let Some(actual) = candidate_file.as_ref() {
        let exe_stem = actual.trim_end_matches(".exe");
        let exe_norm = normalize_match_text(exe_stem);
        if exe_norm.len() >= 4
            && !name_norm.is_empty()
            && (name_norm.contains(&exe_norm) || exe_norm.contains(&name_norm))
        {
            score = score.max(50);
        }
    }

    if score == 0
        && ["steam", "xbox", "uwp", "battle.net", "battlenet", "epic"]
            .iter()
            .any(|s| source_lower.contains(s))
    {
        let matched_words = name
            .split(|c: char| !c.is_ascii_alphanumeric())
            .filter(|word| word.len() >= 4)
            .filter(|word| title_norm.contains(&normalize_match_text(word)))
            .count();
        if matched_words > 0 {
            score = 30;
        }
    }

    score
}

fn confidence_for_score(score: u32) -> String {
    if score >= 80 {
        "high".to_string()
    } else if score >= 45 {
        "medium".to_string()
    } else {
        "low".to_string()
    }
}

fn best_launch_window(
    name: &str,
    launch_path: &str,
    source: &str,
) -> Option<(LaunchWindowCandidate, u32)> {
    collect_launch_windows()
        .into_iter()
        .filter_map(|window| {
            let score = match_launch_window_score(&window, name, launch_path, source);
            (score > 0).then_some((window, score))
        })
        .max_by_key(|(_, score)| *score)
}

// Poll once for the best window matching this specific target (name/exe/source).
// Returns (hwnd, score) of the best match with score > 0, else None. Unlike
// poll_for_window's pid == 0 path, this never matches an unrelated new window
// such as Steam's own "launching" popup.
fn poll_for_matched_window(name: &str, launch_path: &str, source: &str) -> Option<(isize, u32)> {
    best_launch_window(name, launch_path, source).map(|(w, score)| (w.hwnd, score))
}

#[tauri::command]
fn check_launch_focus(name: String, launch_path: String, source: String) -> LaunchFocusResult {
    let foreground_hwnd = unsafe { GetForegroundWindow().0 as isize };
    let windows = collect_launch_windows();
    let process_aumids = if launch_path.starts_with("shell:AppsFolder\\") {
        snapshot_process_aumids()
    } else {
        Vec::new()
    };
    let mut best: Option<(LaunchWindowCandidate, u32)> = None;
    let mut focused = false;

    for window in windows {
        let score = match_launch_window_score(&window, &name, &launch_path, &source);
        if score == 0 {
            continue;
        }
        if window.hwnd == foreground_hwnd {
            focused = true;
        }
        if best
            .as_ref()
            .map(|(_, best_score)| score > *best_score)
            .unwrap_or(true)
        {
            best = Some((window, score));
        }
    }

    if let Some((window, score)) = best {
        LaunchFocusResult {
            running: true,
            focused,
            matched_window_title: Some(window.title),
            matched_pid: Some(window.pid),
            confidence: confidence_for_score(score),
        }
    } else if package_target_running(&launch_path, &process_aumids) {
        let focused = foreground_process_aumid()
            .as_deref()
            .zip(launch_path.strip_prefix("shell:AppsFolder\\"))
            .map(|(fg, target)| aumid_family(fg).eq_ignore_ascii_case(aumid_family(target)))
            .unwrap_or(false);
        LaunchFocusResult {
            running: true,
            focused,
            matched_window_title: None,
            matched_pid: None,
            confidence: "high".to_string(),
        }
    } else {
        LaunchFocusResult {
            running: false,
            focused: false,
            matched_window_title: None,
            matched_pid: None,
            confidence: "low".to_string(),
        }
    }
}

#[tauri::command]
fn try_focus_launched_app(name: String, launch_path: String, source: String) -> bool {
    let Some((window, _)) = best_launch_window(&name, &launch_path, &source) else {
        return false;
    };

    unsafe {
        let hwnd = windows::Win32::Foundation::HWND(window.hwnd as _);
        let _ = ShowWindow(hwnd, SW_SHOW);
        let _ = SetForegroundWindow(hwnd);
    }

    true
}

#[tauri::command]
fn get_running_launched() -> Vec<RunningEntry> {
    let foreground_hwnd = unsafe { GetForegroundWindow().0 as isize };
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let entries: Vec<(String, String, String, String, Option<u32>, u64)> = {
        let store = launched_store();
        store
            .as_ref()
            .map(|map| {
                map.iter()
                    .map(|(id, target)| {
                        (
                            id.clone(),
                            target.name.clone(),
                            target.launch_path.clone(),
                            target.source.clone(),
                            target.pid,
                            target.launched_at,
                        )
                    })
                    .collect()
            })
            .unwrap_or_default()
    };
    let windows = collect_launch_windows();
    let process_aumids = if entries
        .iter()
        .any(|(_, _, launch_path, _, _, _)| launch_path.starts_with("shell:AppsFolder\\"))
    {
        snapshot_process_aumids()
    } else {
        Vec::new()
    };
    let foreground_aumid = if process_aumids.is_empty() {
        None
    } else {
        foreground_process_aumid()
    };
    let mut running = Vec::new();
    let mut dead_ids = Vec::new();

    for (id, name, launch_path, source, pid, launched_at) in entries {
        let mut focused = false;
        let mut confidence = "low".to_string();
        let mut is_running = false;

        if let Some(process_id) = pid {
            if process_exe_path(process_id).is_some() {
                is_running = true;
                confidence = "high".to_string();
                focused = windows
                    .iter()
                    .any(|w| w.pid == process_id && w.hwnd == foreground_hwnd);
            }
        } else {
            let mut best_score = 0u32;
            for window in &windows {
                let score = match_launch_window_score(window, &name, &launch_path, &source);
                if score == 0 {
                    continue;
                }
                best_score = best_score.max(score);
                if window.hwnd == foreground_hwnd {
                    focused = true;
                }
            }
            if best_score > 0 {
                is_running = true;
                confidence = confidence_for_score(best_score);
            }

            if !is_running && package_target_running(&launch_path, &process_aumids) {
                is_running = true;
                confidence = "high".to_string();
                if let (Some(fg), Some(target)) = (
                    foreground_aumid.as_deref(),
                    launch_path.strip_prefix("shell:AppsFolder\\"),
                ) {
                    focused = aumid_family(fg).eq_ignore_ascii_case(aumid_family(target));
                }
            }
        }

        if is_running {
            running.push(RunningEntry {
                id,
                focused,
                confidence,
            });
        } else {
            let grace = if pid.is_none() { 180 } else { 60 };
            if now.saturating_sub(launched_at) > grace {
                dead_ids.push(id);
            }
        }
    }

    if !dead_ids.is_empty() {
        let mut store = launched_store();
        if let Some(map) = store.as_mut() {
            for id in dead_ids {
                map.remove(&id);
            }
        }
    }

    running
}

#[tauri::command]
fn focus_self() -> bool {
    let hwnd = OUR_HWND.load(Ordering::Relaxed);
    if hwnd == 0 {
        return false;
    }
    unsafe {
        let window = windows::Win32::Foundation::HWND(hwnd as _);
        let _ = ShowWindow(window, SW_SHOW);
        SetForegroundWindow(window).as_bool()
    }
}

#[tauri::command]
fn close_launched(name: String, launch_path: String, source: String) -> CloseResult {
    let Some((window, _)) = best_launch_window(&name, &launch_path, &source) else {
        return CloseResult {
            attempted: false,
            closed_now: false,
        };
    };

    unsafe {
        let hwnd = windows::Win32::Foundation::HWND(window.hwnd as _);
        let _ = PostMessageW(hwnd, WM_CLOSE, WPARAM(0), LPARAM(0));
    }

    let closed_now = best_launch_window(&name, &launch_path, &source).is_none();
    CloseResult {
        attempted: true,
        closed_now,
    }
}

#[tauri::command]
fn force_close_launched(name: String, launch_path: String, source: String) -> CloseResult {
    let tracked_pid = {
        let store = launched_store();
        store.as_ref().and_then(|map| {
            map.values()
                .find(|target| {
                    target.name == name
                        && target.launch_path == launch_path
                        && target.source == source
                })
                .and_then(|target| target.pid)
        })
    };
    let pid = tracked_pid
        .or_else(|| best_launch_window(&name, &launch_path, &source).map(|(window, _)| window.pid));

    let Some(pid) = pid.filter(|value| *value != 0) else {
        return CloseResult {
            attempted: false,
            closed_now: false,
        };
    };

    unsafe {
        if let Ok(process) = OpenProcess(PROCESS_TERMINATE, false, pid) {
            let _ = TerminateProcess(process, 1);
            let _ = CloseHandle(process);
        }
    }

    let closed_now = best_launch_window(&name, &launch_path, &source).is_none()
        && process_exe_path(pid).is_none();
    CloseResult {
        attempted: true,
        closed_now,
    }
}

#[tauri::command]
async fn launch_app(
    path: String,
    id: String,
    name: String,
    app_type: String,
    source: String,
    run_as_admin: Option<bool>,
    app_handle: tauri::AppHandle,
) -> Result<LaunchAppResult, String> {
    let id_for_tracking = id.clone();
    let name_for_tracking = name.clone();
    let path_for_tracking = path.clone();
    let source_for_tracking = source.clone();
    // Identity clones for the launch-window watcher thread (scored matching + phase events).
    let watch_name = name.clone();
    let watch_path = path.clone();
    let watch_source = source.clone();
    let mut recents = load_recents();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    recents.retain(|r| r.id != id);
    recents.insert(
        0,
        RecentEntry {
            id,
            name,
            launch_path: path.clone(),
            app_type: app_type.clone(),
            launched_at: now,
        },
    );
    recents.truncate(RECENTS_MAX);
    save_recents(&recents);

    if app_type == "game" {
        let game_entry = recents[0].clone();
        let mut recent_games = load_recent_games();
        recent_games.retain(|r| r.id != game_entry.id);
        recent_games.insert(0, game_entry);
        recent_games.truncate(20);
        save_recent_games(&recent_games);
    }

    // Snapshot existing windows before launch so the watcher can detect new ones.
    let existing = snapshot_visible_windows();
    let our_hwnd = OUR_HWND.load(Ordering::Relaxed);

    // Two-phase Steam messaging: only claim "Launching Steam…" when Steam was not
    // already running. Detect this BEFORE dispatching the launch so the spawn does
    // not race the check. If Steam is already up, skip straight to the game phase.
    let is_steam_launch = path.starts_with("steam://");
    let steam_was_running = is_steam_launch && is_process_running("steam.exe");

    // child_pid: Some(pid) when we spawn the game directly (allows precise matching);
    // None for launcher-mediated paths where the game process is a grandchild.
    let child_pid: u32;
    let mut launch_mode = "direct".to_string();
    let mut launch_detail: Option<String> = None;
    let mut fallback_reason: Option<String> = None;
    let cloud_kiosk_pid = if source.eq_ignore_ascii_case("cloud") {
        match launch_cloud_game_kiosk(&path) {
            Ok(pid) => {
                launch_mode = "cloud-kiosk".to_string();
                launch_detail = get_default_browser_exe()
                    .map(|browser| format!("{} pid={}", browser, pid));
                Some(pid)
            }
            Err(error) => {
                eprintln!("Cloud kiosk launch fallback: {}", error);
                launch_mode = "cloud-url-fallback".to_string();
                fallback_reason = Some(error);
                None
            }
        }
    } else {
        None
    };

    if let Some(pid) = cloud_kiosk_pid {
        child_pid = pid;
    } else if let Some(rest) = path.strip_prefix("bnet-exec:") {
        // "bnet-exec:{exe_path}|{code}" — Battle.net.exe --exec="launch CODE"
        if let Some((exe, code)) = rest.split_once('|') {
            std::process::Command::new(exe)
                .arg(format!("--exec=launch {}", code))
                .creation_flags(CREATE_NO_WINDOW)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        // BNet spawns the game as a separate process; use snapshot-diff approach.
        launch_mode = "battlenet".to_string();
        child_pid = 0;
    } else if path.starts_with("steam://") {
        // Route through explorer.exe so the launch is always dispatched at
        // Medium integrity (normal user level), even when LiftOff is elevated.
        // This keeps tools like AnyFSE, which hook into game launches at
        // normal integrity, able to intercept the launch correctly.
        dispatch_steam_uri(&path)?;
        launch_mode = "steam-uri".to_string();
        child_pid = 0;
    } else if path.starts_with("com.epicgames.launcher://") {
        // Epic's registered URL protocol must be opened through ShellExecute.
        // Passing it to explorer.exe can open a File Explorer window instead,
        // which then looks like a false launch window.
        unsafe {
            let op: Vec<u16> = std::ffi::OsStr::new("open")
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();
            let file: Vec<u16> = std::ffi::OsStr::new(&path)
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();
            let result = ShellExecuteW(
                windows::Win32::Foundation::HWND::default(),
                windows::core::PCWSTR(op.as_ptr()),
                windows::core::PCWSTR(file.as_ptr()),
                windows::core::PCWSTR::null(),
                windows::core::PCWSTR::null(),
                SW_SHOWNORMAL,
            );
            let result_code = result.0 as isize;
            if result_code <= 32 {
                return Err(format!(
                    "Epic protocol launch failed with ShellExecute code {}",
                    result_code
                ));
            }
        }
        launch_mode = "epic-uri".to_string();
        child_pid = 0;
    } else if path.starts_with("shell:") {
        // shell:AppsFolder\{aumid} — UWP / Xbox Game Pass titles.
        // cmd /C start is required; direct spawn can't resolve shell: URIs.
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &path])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| e.to_string())?;
        launch_mode = "shell-uri".to_string();
        child_pid = 0;
    } else if path.to_lowercase().ends_with(".lnk") {
        // Windows shortcut — ShellExecuteW with "open" lets Windows resolve the
        // .lnk natively, including any arguments embedded in the shortcut target.
        // cmd /C start can drop arguments for complex targets like Discord's updater.
        unsafe {
            let op: Vec<u16> = std::ffi::OsStr::new("open")
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();
            let file: Vec<u16> = std::ffi::OsStr::new(&path)
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();
            ShellExecuteW(
                windows::Win32::Foundation::HWND::default(),
                windows::core::PCWSTR(op.as_ptr()),
                windows::core::PCWSTR(file.as_ptr()),
                windows::core::PCWSTR::null(),
                windows::core::PCWSTR::null(),
                SW_SHOWNORMAL,
            );
        }
        launch_mode = "shortcut".to_string();
        child_pid = 0;
    } else if path.contains("://") {
        // ShellExecuteW for other URI schemes (https://, etc.)
        unsafe {
            let op: Vec<u16> = std::ffi::OsStr::new("open")
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();
            let file: Vec<u16> = std::ffi::OsStr::new(&path)
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();
            ShellExecuteW(
                windows::Win32::Foundation::HWND::default(),
                windows::core::PCWSTR(op.as_ptr()),
                windows::core::PCWSTR(file.as_ptr()),
                windows::core::PCWSTR::null(),
                windows::core::PCWSTR::null(),
                SW_SHOWNORMAL,
            );
        }
        if !source.eq_ignore_ascii_case("cloud") {
            launch_mode = "url".to_string();
        }
        child_pid = 0;
    } else {
        // Direct exe launches can either spawn normally or elevate just this process.
        let elevate = run_as_admin.unwrap_or(false);

        if elevate {
            // ShellExecuteW with "runas" triggers UAC for just this process.
            // LiftOff itself does not need to be running as admin.
            unsafe {
                let op: Vec<u16> = std::ffi::OsStr::new("runas")
                    .encode_wide()
                    .chain(std::iter::once(0))
                    .collect();
                let file: Vec<u16> = std::ffi::OsStr::new(&path)
                    .encode_wide()
                    .chain(std::iter::once(0))
                    .collect();
                ShellExecuteW(
                    windows::Win32::Foundation::HWND::default(),
                    windows::core::PCWSTR(op.as_ptr()),
                    windows::core::PCWSTR(file.as_ptr()),
                    windows::core::PCWSTR::null(),
                    windows::core::PCWSTR::null(),
                    SW_SHOWNORMAL,
                );
            }
            // PID not recoverable from ShellExecute; fast-dismiss after delay.
            launch_mode = "elevated".to_string();
            child_pid = 0;
        } else {
            let child = std::process::Command::new(&path)
                .creation_flags(CREATE_NO_WINDOW)
                .spawn()
                .map_err(|e| e.to_string())?;
            child_pid = child.id();
            launch_mode = "direct".to_string();
            launch_detail = Some(format!("pid={}", child_pid));
        }
    }

    {
        let pid = if child_pid != 0 {
            Some(child_pid)
        } else {
            None
        };
        let mut store = launched_store();
        if let Some(map) = store.as_mut() {
            map.insert(
                id_for_tracking,
                LaunchedTarget {
                    name: name_for_tracking,
                    launch_path: path_for_tracking,
                    source: source_for_tracking,
                    pid,
                    launched_at: now,
                },
            );
        }
    }

    // Watch for the launched window in a background thread, then notify the frontend.
    //
    // For .lnk shortcuts and shell:/URI launches (child_pid == 0 and no reliable
    // window to detect), we fast-dismiss after a short delay — the window watcher
    // can't find these reliably (already-running tray apps, indirect spawns, etc.).
    //
    let handle = app_handle.clone();
    let is_http_uri_launch =
        child_pid == 0 && (path.starts_with("http://") || path.starts_with("https://"));
    let is_lnk_or_indirect = (child_pid == 0 && app_type == "app") || is_http_uri_launch;
    std::thread::spawn(move || {
        if is_lnk_or_indirect {
            std::thread::sleep(std::time::Duration::from_millis(1500));
            let _ = handle.emit("launch-success", ());
            return;
        }

        // Honest two-phase messaging: only show "Launching Steam…" when Steam was
        // not already running. Once a matching window appears (or after a short
        // grace) we advance to the game phase so the overlay never lies or sticks.
        let mut phase_is_steam = is_steam_launch && !steam_was_running;
        if phase_is_steam {
            let _ = handle.emit("launch-phase", "steam");
        }

        // Full window-detection path for direct exe apps and all games.
        // Games confirm on the best-scoring window that matches THIS title/exe/source,
        // never on "any new window" — that false match is usually Steam's own
        // launching popup or client, not the game.
        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(15);
        let started = std::time::Instant::now();
        let mut found: isize = 0;

        loop {
            // 1) Preferred: a window that specifically matches this game.
            if let Some((hwnd, score)) =
                poll_for_matched_window(&watch_name, &watch_path, &watch_source)
            {
                // A real matching window means the game is presenting — leave the Steam phase.
                if phase_is_steam {
                    let _ = handle.emit("launch-phase", "game");
                    phase_is_steam = false;
                }
                // Confident match (medium+, score >= 45) — confirm immediately.
                if score >= 45 {
                    found = hwnd;
                    break;
                }
            }

            // 2) Fallback for direct-exe games with a real PID: the old PID match.
            if child_pid != 0 {
                let hwnd = poll_for_window(child_pid, &existing, our_hwnd);
                if hwnd != 0 {
                    found = hwnd;
                    break;
                }
            }

            // Advance to the game phase after a short grace even without a window yet,
            // so the overlay does not sit on "Launching Steam…" indefinitely.
            if phase_is_steam && started.elapsed() >= std::time::Duration::from_secs(2) {
                let _ = handle.emit("launch-phase", "game");
                phase_is_steam = false;
            }

            if std::time::Instant::now() >= deadline {
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(250));
        }

        if found != 0 {
            unsafe {
                let hwnd = windows::Win32::Foundation::HWND(found as _);
                let _ = SetForegroundWindow(hwnd);
                let _ = ShowWindow(hwnd, SW_SHOW);
            }
        }

        // Decision 2A: the spawn itself succeeded, so emit success whether or not a
        // window was confirmed. Steam fullscreen-exclusive games never present a
        // pollable window; the overlay's verify step softly dismisses them rather
        // than showing a scary "could not confirm" error.
        let _ = handle.emit("launch-success", ());
    });

    Ok(LaunchAppResult {
        launch_mode,
        child_pid: (child_pid != 0).then_some(child_pid),
        detail: launch_detail,
        fallback_reason,
    })
}

fn is_our_window_focused() -> bool {
    let stored_hwnd = OUR_HWND.load(Ordering::Relaxed);
    if stored_hwnd == 0 {
        return true;
    }
    unsafe {
        let foreground_hwnd = GetForegroundWindow();
        foreground_hwnd.0 as isize == stored_hwnd || foreground_hwnd.0.is_null()
    }
}

fn start_gamepad_listener(_app_handle: tauri::AppHandle) {
    unsafe {
        let foreground_hwnd = GetForegroundWindow();
        if foreground_hwnd.0 as isize != 0 {
            OUR_HWND.store(foreground_hwnd.0 as isize, Ordering::Relaxed);
        }
    }
    std::thread::spawn(move || loop {
        if FRONTEND_HAS_CONTROL.load(Ordering::Relaxed) {
            std::thread::sleep(std::time::Duration::from_millis(500));
            continue;
        }
        std::thread::sleep(std::time::Duration::from_millis(100));
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .invoke_handler(tauri::generate_handler![
            get_apps,
            get_all_apps,
            get_install_size,
            launch_app,
            check_launch_focus,
            try_focus_launched_app,
            get_running_launched,
            focus_self,
            close_launched,
            force_close_launched,
            fetch_game_art,
            get_cached_art_bulk,
            get_recents,
            get_recent_games,
            get_battery,
            set_gamepad_ready,
            native_startup_rumble,
            get_settings,
            save_settings,
            clear_recents,
            exit_app,
            restart_app,
            clear_art_cache,
            set_frontend_active,
            open_osk,
            spotify_begin_auth,
            spotify_access_token,
            spotify_status,
            spotify_disconnect,
            spotify_playback_state,
            spotify_playlists,
            spotify_devices,
            spotify_play,
            spotify_pause,
            spotify_next,
            spotify_previous,
            spotify_seek,
            spotify_set_shuffle,
            spotify_set_repeat,
            spotify_play_context,
            spotify_transfer,
            steam_qr_begin,
            steam_account_status,
            steam_logout,
            fetch_steam_owned_games,
            steam_install,
            steam_uninstall,
            steam_verify,
            steam_watch_install,
            steam_install_progress,
            get_pins,
            toggle_pin,
            get_hidden,
            toggle_hidden,
            get_custom_art,
            set_custom_art,
            clear_custom_art,
            get_screen_resolution,
            search_sgdb_art,
            download_sgdb_art,
            list_dir,
            get_drives,
            get_custom_data,
            add_custom_app,
            remove_custom_app,
            rename_custom_app,
            rename_app,
            remove_custom_source,
            get_custom_categories,
            set_app_category,
            add_custom_folder,
            remove_custom_folder,
            toggle_custom_folder,
            get_app_collections,
            create_app_collection,
            delete_app_collection,
            rename_app_collection,
            get_app_memberships,
            set_app_memberships,
            get_game_collections,
            create_game_collection,
            delete_game_collection,
            rename_game_collection,
            get_game_memberships,
            set_game_memberships,
            get_xcloud_games
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            let hwnd = window.hwnd().unwrap();
            OUR_HWND.store(hwnd.0 as isize, Ordering::Relaxed);
            let _ = window.set_focus();
            start_gamepad_listener(app.handle().clone());
            tauri::async_runtime::spawn(async {
                let _ = load_xcloud_games(false).await;
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
