//Copyright (C) 2025 Taylor Denby

use std::os::windows::ffi::OsStrExt;
use std::os::windows::process::CommandExt;
use std::path::Path;
use base64::{Engine as _, engine::general_purpose};
use serde::{Deserialize, Serialize};
use windows::{
    Win32::UI::Shell::{SHGetFileInfoW, ShellExecuteW, SHFILEINFOW, SHGFI_FLAGS, SHGFI_ICON, SHGFI_LARGEICON},
    Win32::UI::WindowsAndMessaging::{
        DestroyIcon, DrawIconEx, GetForegroundWindow, DI_NORMAL, SW_SHOWNORMAL,
        EnumWindows, IsWindowVisible, GetWindowTextLengthW, GetWindowThreadProcessId,
        SetForegroundWindow, ShowWindow, SW_SHOW,
        GetSystemMetrics, SM_CXSCREEN, SM_CYSCREEN,
    },
    Win32::Foundation::{BOOL, LPARAM},
    Win32::Graphics::Gdi::{
        GetDC, ReleaseDC, GetDIBits, CreateCompatibleDC, CreateCompatibleBitmap, SelectObject,
        DeleteDC, DeleteObject, PatBlt, BLACKNESS,
        BITMAPINFOHEADER, BITMAPINFO, DIB_RGB_COLORS, RGBQUAD,
    },
    Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS},
};
use std::sync::atomic::{AtomicBool, AtomicIsize, Ordering};
use std::collections::HashMap;
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_autostart::ManagerExt;
use tauri::Manager;
use tauri::Emitter;

const SGDB_KEY: &str = env!("SGDB_API_KEY");
const RECENTS_MAX: usize = 10;
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// PNG size for embedded icons. UI tiles are ~48px; 128px gives headroom for high-DPI / focus scale
/// without huge JSON payloads (256px would be sharper but much larger base64).
const ICON_EXPORT_PX: i32 = 128;
/// `SHGFI_JUMBOICON` — request up to 256×256 source icon when available (Vista+).
const SHGFI_JUMBOICON: SHGFI_FLAGS = SHGFI_FLAGS(0x40000);

static GAMEPAD_READY: AtomicBool = AtomicBool::new(false);
static OUR_HWND: AtomicIsize = AtomicIsize::new(0);
static FRONTEND_HAS_CONTROL: AtomicBool = AtomicBool::new(false);

#[tauri::command]
fn set_frontend_active(active: bool) {
    FRONTEND_HAS_CONTROL.store(active, Ordering::Relaxed);
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AppEntry {
    pub id: String,
    pub name: String,
    pub icon_base64: Option<String>,
    pub launch_path: String,
    pub app_type: String,
    pub source: String, // "steam" | "xbox" | "uwp" | "desktop" | "other"
}

#[derive(Serialize, Deserialize, Clone)]
pub struct RecentEntry {
    pub id: String,
    pub name: String,
    pub launch_path: String,
    pub app_type: String,
    pub launched_at: u64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Settings {
    pub accent: String,
    pub theme: String,
    pub stars_enabled: bool,
    pub default_tab: String,
    pub scan_steam: bool,
    pub scan_xbox: bool,
    pub scan_uwp: bool,
    pub scan_desktop: bool,
    pub scan_battlenet: bool,
    pub repeat_speed: String,
    pub launch_at_startup: bool,
    pub animated_heroes: bool,
    // None means "not yet set by user"; frontend fills in auto-detected value.
    #[serde(default)]
    pub ui_scale: Option<f32>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            accent: "ember".to_string(),
            theme: "dark".to_string(),
            stars_enabled: true,
            default_tab: "Home".to_string(),
            scan_steam: true,
            scan_xbox: true,
            scan_uwp: true,
            scan_desktop: true,
            scan_battlenet: true,
            repeat_speed: "normal".to_string(),
            launch_at_startup: false,
            animated_heroes: true,
            ui_scale: None,
        }
    }
}

#[derive(Deserialize)] struct SgdbSearchResponse { success: bool, data: Option<Vec<SgdbGame>> }
#[derive(Deserialize)] struct SgdbGame { id: u64 }
#[derive(Deserialize)] struct SgdbGridResponse { success: bool, data: Option<Vec<SgdbGrid>> }
#[derive(Deserialize)] struct SgdbGrid { url: String }
#[derive(Deserialize)] struct SgdbHeroResponse { success: bool, data: Option<Vec<SgdbHero>> }
#[derive(Deserialize)] struct SgdbHero { url: String }
#[derive(Serialize)] struct GameArtBundle { grid: Option<String>, hero_animated: Option<String>, hero_static: Option<String> }

fn liftoff_dir() -> std::path::PathBuf { dirs::data_local_dir().unwrap_or_else(|| std::path::PathBuf::from(".")).join("LiftOff") }
fn recents_path() -> std::path::PathBuf { liftoff_dir().join("recents.json") }
fn art_cache_path() -> std::path::PathBuf { liftoff_dir().join("art_cache.json") }
fn hero_cache_path() -> std::path::PathBuf { liftoff_dir().join("hero_cache.json") }
fn hero_animated_cache_path() -> std::path::PathBuf { liftoff_dir().join("hero_animated_cache.json") }
fn settings_path() -> std::path::PathBuf { liftoff_dir().join("settings.json") }
fn pins_path() -> std::path::PathBuf { liftoff_dir().join("pins.json") }
fn hidden_path() -> std::path::PathBuf { liftoff_dir().join("hidden.json") }

fn art_dir() -> std::path::PathBuf { liftoff_dir().join("art") }
fn grid_art_dir() -> std::path::PathBuf { art_dir().join("grid") }
fn hero_static_art_dir() -> std::path::PathBuf { art_dir().join("hero_static") }
fn hero_animated_art_dir() -> std::path::PathBuf { art_dir().join("hero_animated") }

/// Scrub a game name into a safe filename (max 80 chars).
fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' { c } else { '_' })
        .take(80)
        .collect()
}

/// Extract the file extension from a URL (before any query string), e.g. "webm", "png".
fn url_ext(url: &str) -> &str {
    url.split('?').next()
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
    let bytes = client.get(url)
        .timeout(std::time::Duration::from_secs(60))
        .send().ok()?
        .bytes().ok()?;
    std::fs::write(&path, &bytes).ok()?;
    Some(path.to_string_lossy().into_owned())
}

fn load_recents() -> Vec<RecentEntry> {
    let path = recents_path();
    if !path.exists() { return vec![]; }
    std::fs::read_to_string(&path).ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default()
}

fn save_recents(recents: &Vec<RecentEntry>) {
    let path = recents_path();
    if let Some(parent) = path.parent() { let _ = std::fs::create_dir_all(parent); }
    if let Ok(json) = serde_json::to_string(recents) { let _ = std::fs::write(path, json); }
}

fn load_art_cache() -> HashMap<String, String> {
    let path = art_cache_path();
    if !path.exists() { return HashMap::new(); }
    std::fs::read_to_string(&path).ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default()
}

fn save_art_cache(cache: &HashMap<String, String>) {
    let path = art_cache_path();
    if let Some(parent) = path.parent() { let _ = std::fs::create_dir_all(parent); }
    if let Ok(json) = serde_json::to_string(cache) { let _ = std::fs::write(path, json); }
}

fn load_hero_cache() -> HashMap<String, String> {
    let path = hero_cache_path();
    if !path.exists() { return HashMap::new(); }
    std::fs::read_to_string(&path).ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default()
}

fn save_hero_cache(cache: &HashMap<String, String>) {
    let path = hero_cache_path();
    if let Some(parent) = path.parent() { let _ = std::fs::create_dir_all(parent); }
    if let Ok(json) = serde_json::to_string(cache) { let _ = std::fs::write(path, json); }
}

fn load_hero_animated_cache() -> HashMap<String, String> {
    let path = hero_animated_cache_path();
    if !path.exists() { return HashMap::new(); }
    std::fs::read_to_string(&path).ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default()
}

fn save_hero_animated_cache(cache: &HashMap<String, String>) {
    let path = hero_animated_cache_path();
    if let Some(parent) = path.parent() { let _ = std::fs::create_dir_all(parent); }
    if let Ok(json) = serde_json::to_string(cache) { let _ = std::fs::write(path, json); }
}

fn load_settings_inner() -> Settings {
    let path = settings_path();
    if !path.exists() { return Settings::default(); }
    std::fs::read_to_string(&path).ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default()
}

fn save_settings_inner(settings: &Settings) {
    let path = settings_path();
    if let Some(parent) = path.parent() { let _ = std::fs::create_dir_all(parent); }
    if let Ok(json) = serde_json::to_string(settings) { let _ = std::fs::write(path, json); }
}

fn load_pins_inner() -> Vec<String> {
    let path = pins_path();
    if !path.exists() { return vec![]; }
    std::fs::read_to_string(&path).ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default()
}

fn save_pins_inner(pins: &Vec<String>) {
    let path = pins_path();
    if let Some(parent) = path.parent() { let _ = std::fs::create_dir_all(parent); }
    if let Ok(json) = serde_json::to_string(pins) { let _ = std::fs::write(path, json); }
}

fn load_hidden_inner() -> Vec<String> {
    let path = hidden_path();
    if !path.exists() { return vec![]; }
    std::fs::read_to_string(&path).ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default()
}

fn save_hidden_inner(hidden: &Vec<String>) {
    let path = hidden_path();
    if let Some(parent) = path.parent() { let _ = std::fs::create_dir_all(parent); }
    if let Ok(json) = serde_json::to_string(hidden) { let _ = std::fs::write(path, json); }
}

fn custom_art_path() -> std::path::PathBuf { liftoff_dir().join("custom_art.json") }

fn load_custom_art_inner() -> HashMap<String, String> {
    let path = custom_art_path();
    if !path.exists() { return HashMap::new(); }
    std::fs::read_to_string(&path).ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default()
}

fn save_custom_art_inner(map: &HashMap<String, String>) {
    let path = custom_art_path();
    if let Some(parent) = path.parent() { let _ = std::fs::create_dir_all(parent); }
    if let Ok(json) = serde_json::to_string(map) { let _ = std::fs::write(path, json); }
}

#[derive(Serialize)]
struct ScreenResolution { width: i32, height: i32 }

#[tauri::command]
fn get_screen_resolution() -> ScreenResolution {
    unsafe {
        ScreenResolution {
            width:  GetSystemMetrics(SM_CXSCREEN),
            height: GetSystemMetrics(SM_CYSCREEN),
        }
    }
}

#[tauri::command] fn get_settings() -> Settings { load_settings_inner() }
#[tauri::command] fn clear_recents() -> Result<(), String> { save_recents(&vec![]); Ok(()) }
#[tauri::command] fn clear_art_cache() -> Result<(), String> {
    save_art_cache(&HashMap::new());
    save_hero_cache(&HashMap::new());
    save_hero_animated_cache(&HashMap::new());
    let _ = std::fs::remove_dir_all(art_dir());
    Ok(())
}
#[tauri::command] fn get_recents() -> Vec<RecentEntry> { load_recents() }
#[tauri::command] fn set_gamepad_ready() { GAMEPAD_READY.store(true, Ordering::Relaxed); }
#[tauri::command] fn get_custom_art() -> HashMap<String, String> { load_custom_art_inner() }
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
    if settings.launch_at_startup { let _ = autostart.enable(); } else { let _ = autostart.disable(); }
    save_settings_inner(&settings);
    Ok(())
}

#[derive(Serialize)]
struct BatteryInfo { percent: u32, charging: bool }

#[tauri::command]
fn get_battery() -> BatteryInfo {
    unsafe {
        let mut status = SYSTEM_POWER_STATUS::default();
        if GetSystemPowerStatus(&mut status).is_ok() {
            let charging = status.ACLineStatus == 1;
            let pct = status.BatteryLifePercent;
            // 255 = Windows "unknown" — reported when fully charged on some devices
            let percent = if pct <= 100 { pct as u32 } else { if charging { 100 } else { 0 } };
            return BatteryInfo { percent, charging };
        }
    }
    BatteryInfo { percent: 0, charging: false }
}

/// Read all three caches at once and return what's already stored — no HTTP calls.
/// Used at startup to instantly hydrate cached art before making any API requests.
#[tauri::command]
fn get_cached_art_bulk(game_names: Vec<String>) -> HashMap<String, GameArtBundle> {
    let grid_cache          = load_art_cache();
    let hero_static_cache   = load_hero_cache();
    let hero_animated_cache = load_hero_animated_cache();
    let mut result = HashMap::new();
    for name in game_names {
        let grid          = grid_cache.get(&name).filter(|s| !s.is_empty()).cloned();
        let hero_static   = hero_static_cache.get(&name).filter(|s| !s.is_empty()).cloned();
        let hero_animated = hero_animated_cache.get(&name).filter(|s| !s.is_empty()).cloned();
        result.insert(name, GameArtBundle { grid, hero_animated, hero_static });
    }
    result
}

#[tauri::command]
fn fetch_game_art(game_name: String) -> GameArtBundle {
    let mut grid_cache = load_art_cache();
    let mut hero_static_cache = load_hero_cache();
    let mut hero_animated_cache = load_hero_animated_cache();

    let grid_cached     = grid_cache.get(&game_name).cloned();
    let hero_static_cached   = hero_static_cache.get(&game_name).cloned();
    let hero_animated_cached = hero_animated_cache.get(&game_name).cloned();

    // All three checked (sentinel "" or real URL) — zero API calls
    if grid_cached.is_some() && hero_static_cached.is_some() && hero_animated_cached.is_some() {
        return GameArtBundle {
            grid:           grid_cached.filter(|s| !s.is_empty()),
            hero_animated:  hero_animated_cached.filter(|s| !s.is_empty()),
            hero_static:    hero_static_cached.filter(|s| !s.is_empty()),
        };
    }

    let client = match reqwest::blocking::Client::builder().timeout(std::time::Duration::from_secs(10)).build() {
        Ok(c) => c,
        Err(_) => return GameArtBundle {
            grid:          grid_cached.filter(|s| !s.is_empty()),
            hero_animated: hero_animated_cached.filter(|s| !s.is_empty()),
            hero_static:   hero_static_cached.filter(|s| !s.is_empty()),
        },
    };

    // One search call covers all three art types
    let search_url = format!("https://www.steamgriddb.com/api/v2/search/autocomplete/{}", urlencoding::encode(&game_name));
    let game_id = client.get(&search_url)
        .header("Authorization", format!("Bearer {}", SGDB_KEY))
        .send().ok()
        .and_then(|r| r.json::<SgdbSearchResponse>().ok())
        .filter(|d| d.success)
        .and_then(|d| d.data)
        .and_then(|items| items.into_iter().next())
        .map(|g| g.id);

    let Some(game_id) = game_id else {
        // Mark all unchecked as sentinel so we don't re-search next time
        if grid_cached.is_none()          { grid_cache.insert(game_name.clone(), String::new());          save_art_cache(&grid_cache); }
        if hero_animated_cached.is_none() { hero_animated_cache.insert(game_name.clone(), String::new()); save_hero_animated_cache(&hero_animated_cache); }
        if hero_static_cached.is_none()   { hero_static_cache.insert(game_name.clone(), String::new());   save_hero_cache(&hero_static_cache); }
        return GameArtBundle { grid: None, hero_animated: None, hero_static: None };
    };

    let grid = if let Some(cached) = grid_cached {
        if cached.is_empty() { None } else { Some(cached) }
    } else {
        let url = format!("https://www.steamgriddb.com/api/v2/grids/game/{}?dimensions=600x900&limit=1", game_id);
        let remote_url = client.get(&url).header("Authorization", format!("Bearer {}", SGDB_KEY))
            .send().ok()
            .and_then(|r| r.json::<SgdbGridResponse>().ok())
            .filter(|d| d.success)
            .and_then(|d| d.data)
            .and_then(|v| v.into_iter().next())
            .map(|g| g.url);
        // Download to disk; fall back to remote URL if download fails
        let result = remote_url.as_deref()
            .and_then(|u| download_file(&client, u, &grid_art_dir(), &game_name))
            .or(remote_url);
        grid_cache.insert(game_name.clone(), result.clone().unwrap_or_default());
        save_art_cache(&grid_cache);
        result
    };

    // Resolve cached values (None = uncached, Some("") = checked/none, Some(path) = has art)
    let static_cached_val   = hero_static_cached.as_deref().and_then(|s| if s.is_empty() { None } else { Some(s.to_string()) });
    let animated_cached_val = hero_animated_cached.as_deref().and_then(|s| if s.is_empty() { None } else { Some(s.to_string()) });
    let need_static   = hero_static_cached.is_none();
    let need_animated = hero_animated_cached.is_none();

    let (hero_static, hero_animated) = if need_static || need_animated {
        let fetch_hero_url = |extra_param: &str| -> Option<String> {
            let url = format!("https://www.steamgriddb.com/api/v2/heroes/game/{}?{}&limit=1", game_id, extra_param);
            client.get(&url)
                .header("Authorization", format!("Bearer {}", SGDB_KEY))
                .send().ok()
                .and_then(|r| r.json::<SgdbHeroResponse>().ok())
                .filter(|d| d.success)
                .and_then(|d| d.data)
                .and_then(|v| v.into_iter().next())
                .map(|h| h.url)
        };

        let found_static = if need_static {
            let remote = fetch_hero_url("types=static");
            remote.as_deref()
                .and_then(|u| download_file(&client, u, &hero_static_art_dir(), &game_name))
                .or(remote)
        } else { None };

        let found_animated = if need_animated {
            let remote = fetch_hero_url("types=animated");
            remote.as_deref()
                .and_then(|u| download_file(&client, u, &hero_animated_art_dir(), &game_name))
                .or(remote)
        } else { None };

        if need_animated { hero_animated_cache.insert(game_name.clone(), found_animated.clone().unwrap_or_default()); save_hero_animated_cache(&hero_animated_cache); }
        if need_static   { hero_static_cache.insert(game_name.clone(), found_static.clone().unwrap_or_default());     save_hero_cache(&hero_static_cache); }

        (static_cached_val.or(found_static), animated_cached_val.or(found_animated))
    } else {
        (static_cached_val, animated_cached_val)
    };

    GameArtBundle { grid, hero_animated, hero_static }
}

fn extract_icon_base64(path: &str) -> Option<String> {
    unsafe {
        let wide: Vec<u16> = std::ffi::OsStr::new(path).encode_wide().chain(std::iter::once(0)).collect();
        let cb = std::mem::size_of::<SHFILEINFOW>() as u32;
        let mut shfi = SHFILEINFOW::default();
        let mut result = SHGetFileInfoW(windows::core::PCWSTR(wide.as_ptr()), Default::default(), Some(&mut shfi), cb, SHGFI_ICON | SHGFI_JUMBOICON);
        if result == 0 || shfi.hIcon.is_invalid() {
            shfi = SHFILEINFOW::default();
            result = SHGetFileInfoW(windows::core::PCWSTR(wide.as_ptr()), Default::default(), Some(&mut shfi), cb, SHGFI_ICON | SHGFI_LARGEICON);
            if result == 0 || shfi.hIcon.is_invalid() { return None; }
        }
        let hicon = shfi.hIcon;

        // Rasterize with DrawIconEx at ICON_EXPORT_PX — avoids corrupt GetDIBits reads and keeps
        // enough resolution for crisp downscaling in the WebView (32×32 looked soft at 48px+ tiles).
        let px = ICON_EXPORT_PX;
        let px_u = px as u32;
        let px_us = px as usize;
        let hdc_screen = GetDC(None);
        if hdc_screen.is_invalid() { let _ = DestroyIcon(hicon); return None; }
        let hdc_mem = CreateCompatibleDC(hdc_screen);
        if hdc_mem.is_invalid() { let _ = ReleaseDC(None, hdc_screen); let _ = DestroyIcon(hicon); return None; }
        let hbm = CreateCompatibleBitmap(hdc_screen, px, px);
        if hbm.is_invalid() { let _ = DeleteDC(hdc_mem); let _ = ReleaseDC(None, hdc_screen); let _ = DestroyIcon(hicon); return None; }

        let old = SelectObject(hdc_mem, hbm);
        let _ = PatBlt(hdc_mem, 0, 0, px, px, BLACKNESS);
        let drawn = DrawIconEx(hdc_mem, 0, 0, hicon, px, px, 0, None, DI_NORMAL);
        let _ = SelectObject(hdc_mem, old);

        let mut bmi = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: px, biHeight: -px, biPlanes: 1, biBitCount: 32, biCompression: 0,
                biSizeImage: 0, biXPelsPerMeter: 0, biYPelsPerMeter: 0, biClrUsed: 0, biClrImportant: 0,
            },
            bmiColors: [RGBQUAD::default()],
        };
        let mut pixels: Vec<u8> = vec![0u8; px_us * px_us * 4];
        let lines = GetDIBits(hdc_mem, hbm, 0, px_u, Some(pixels.as_mut_ptr() as *mut _), &mut bmi, DIB_RGB_COLORS);

        let _ = DeleteObject(hbm);
        let _ = DeleteDC(hdc_mem);
        let _ = ReleaseDC(None, hdc_screen);
        let _ = DestroyIcon(hicon);

        if drawn.is_err() || lines == 0 { return None; }
        for chunk in pixels.chunks_mut(4) { chunk.swap(0, 2); }
        match lodepng::encode32(&pixels, px_us, px_us) { Ok(png_bytes) => Some(general_purpose::STANDARD.encode(&png_bytes)), Err(_) => None }
    }
}

/// Resolve a UWP icon PNG from the package's install directory.
/// `logo_hint` is the relative path from the manifest (e.g. "Assets\Square44x44Logo.png").
/// We try the exact path first, then scan the Assets folder for any scale/theme variant.
fn extract_uwp_icon_base64(install_location: &str, logo_hint: &str) -> Option<String> {
    let hint_path = std::path::Path::new(logo_hint);
    let stem = hint_path.file_stem()?.to_string_lossy().to_string();
    let base_stem = stem.split('.').next().unwrap_or(&stem);
    let assets_dir = std::path::Path::new(install_location).join(
        hint_path.parent().unwrap_or(std::path::Path::new("Assets")),
    );

    let png_to_b64 = |p: &std::path::Path| -> Option<String> {
        let bytes = std::fs::read(p).ok()?;
        if bytes.len() < 8 || &bytes[0..8] != b"\x89PNG\r\n\x1a\n" { return None; }
        Some(general_purpose::STANDARD.encode(&bytes))
    };

    let exact = std::path::Path::new(install_location).join(logo_hint);
    if exact.exists() {
        if let Some(b64) = png_to_b64(&exact) { return Some(b64); }
    }

    if assets_dir.is_dir() {
        if let Ok(dir) = std::fs::read_dir(&assets_dir) {
            let mut candidates: Vec<std::path::PathBuf> = dir
                .flatten()
                .map(|e| e.path())
                .filter(|p| {
                    p.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase() == "png"
                        && p.file_stem()
                            .and_then(|s| s.to_str())
                            .map(|s| s.starts_with(base_stem))
                            .unwrap_or(false)
                })
                .collect();

            // Prefer larger scale variants so downscaled icons stay sharp (object-fit handles size in UI).
            candidates.sort_by_key(|p| {
                let s = p.to_string_lossy().to_lowercase();
                if s.contains("scale-200") { 0 }
                else if s.contains("scale-150") { 1 }
                else if s.contains("scale-125") { 2 }
                else if s.contains("scale-100") { 3 }
                else { 4 }
            });

            for candidate in &candidates {
                if let Some(b64) = png_to_b64(candidate) { return Some(b64); }
            }
        }
    }

    None
}

fn scan_folder(folder: &str, app_type: &str) -> Vec<AppEntry> {
    let mut entries = Vec::new();
    let path = Path::new(folder);
    if !path.exists() { return entries; }
    if let Ok(dir) = std::fs::read_dir(path) {
        for entry in dir.flatten() {
            let p = entry.path();
            let path_str = p.to_string_lossy().to_string();
            // Exclude LiftOff's own build artifacts
            if path_str.contains("target\\release") || path_str.contains("target/release") { continue; }
            let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
            if ext == "lnk" || ext == "exe" {
                let name = p.file_stem().and_then(|n| n.to_str()).unwrap_or("Unknown").to_string();
                let icon = extract_icon_base64(&path_str);
                entries.push(AppEntry {
                    id: path_str.clone(),
                    name,
                    icon_base64: icon,
                    launch_path: path_str,
                    app_type: app_type.to_string(),
                    source: "desktop".to_string(),
                });
            }
        }
    }
    entries
}

fn is_valid_display_name(name: &str) -> bool {
    if name.chars().filter(|c| *c == '-').count() >= 3 { return false; }
    if name.contains('.') && !name.contains(' ') { return false; }
    if name.starts_with("ms-resource:") { return false; }
    if name.contains('{') || name.contains('}') { return false; }
    if name.len() > 8 && name.chars().all(|c| c.is_ascii_hexdigit() || c == '-') { return false; }
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
                    if (-not $name -or $name -match '^\s*$' -or $name -match 'ms-resource') { try { $name = $pkg.Name } catch {} }
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
    let output = match output { Ok(o) => o, Err(_) => return apps };
    let stdout = String::from_utf8_lossy(&output.stdout);
    let skip_prefixes = ["Microsoft.NET", "Microsoft.VCLibs", "Microsoft.UI.Xaml", "Microsoft.WindowsAppRuntime", "Microsoft.DesktopAppInstaller"];
    for line in stdout.lines() {
        let parts: Vec<&str> = line.splitn(6, '\t').collect();
        if parts.len() < 2 { continue; }
        let name             = parts[0].trim().to_string();
        let aumid            = parts[1].trim().to_string();
        let app_id           = if parts.len() >= 3 { parts[2].trim() } else { "" };
        let has_mgc          = if parts.len() >= 4 { parts[3].trim() == "True" } else { false };
        let install_location = if parts.len() >= 5 { parts[4].trim() } else { "" };
        let logo_hint        = if parts.len() >= 6 { parts[5].trim() } else { "" };
        if name.is_empty() || aumid.is_empty() || !is_valid_display_name(&name) { continue; }
        if skip_prefixes.iter().any(|p| aumid.starts_with(p)) { continue; }
        let is_xbox_game = app_id == "Game" || has_mgc;
        let app_type = if is_xbox_game { "game" } else { "app" };
        let source   = if is_xbox_game { "xbox" } else { "uwp" };
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
        });
    }
    apps
}

fn get_steam_install_path() -> Option<String> {
    unsafe {
        use windows::Win32::System::Registry::{
            RegCloseKey, RegOpenKeyExW, RegQueryValueExW, HKEY, HKEY_LOCAL_MACHINE, KEY_READ,
        };
        use windows::core::PCWSTR;
        let subkeys = ["SOFTWARE\\WOW6432Node\\Valve\\Steam", "SOFTWARE\\Valve\\Steam"];
        let value_name: Vec<u16> = std::ffi::OsStr::new("InstallPath")
            .encode_wide().chain(std::iter::once(0)).collect();
        for subkey in &subkeys {
            let wide_key: Vec<u16> = std::ffi::OsStr::new(subkey)
                .encode_wide().chain(std::iter::once(0)).collect();
            let mut hkey = HKEY::default();
            if RegOpenKeyExW(HKEY_LOCAL_MACHINE, PCWSTR(wide_key.as_ptr()), 0, KEY_READ, &mut hkey).is_ok() {
                let mut buf = vec![0u8; 1024];
                let mut buf_len = buf.len() as u32;
                let ok = RegQueryValueExW(
                    hkey, PCWSTR(value_name.as_ptr()), None, None,
                    Some(buf.as_mut_ptr()), Some(&mut buf_len),
                ).is_ok();
                let _ = RegCloseKey(hkey);
                if ok && buf_len >= 2 {
                    let wchars: Vec<u16> = buf[..buf_len as usize]
                        .chunks_exact(2)
                        .map(|c| u16::from_le_bytes([c[0], c[1]]))
                        .collect();
                    let path = String::from_utf16_lossy(&wchars).trim_end_matches('\0').to_string();
                    if !path.is_empty() { return Some(path); }
                }
            }
        }
        None
    }
}

fn battlenet_exec_code(uid: &str) -> Option<&'static str> {
    match uid.to_lowercase().as_str() {
        "osi"             => Some("OSI"),   // Diablo II Resurrected
        "fenris"          => Some("Fen"),   // Diablo IV
        "d3"              => Some("D3"),    // Diablo III
        "lazarus"         => Some("LAZR"),  // Diablo Immortal
        "wow"             => Some("WoW"),   // World of Warcraft
        "wow_classic"     => Some("WoWC"),  // WoW Classic
        "wow_classic_era" => Some("WoWe"),  // WoW Classic Era
        "s2"              => Some("S2"),    // StarCraft II
        "s1"              => Some("S1"),    // StarCraft Remastered
        "w3"              => Some("W3"),    // Warcraft III Reforged
        "wtcg"            => Some("WTCG"),  // Hearthstone
        "hero"            => Some("Hero"),  // Heroes of the Storm
        "pro"             => Some("Pro"),   // Overwatch 2
        "viper"           => Some("VIPR"),  // Overwatch (legacy)
        "dst2"            => Some("DST2"),  // Destiny 2
        _                 => None,
    }
}

fn find_battlenet_exe() -> Option<String> {
    let candidates = [
        r"C:\Program Files (x86)\Battle.net\Battle.net.exe",
        r"C:\Program Files\Battle.net\Battle.net.exe",
    ];
    candidates.iter().find(|p| std::path::Path::new(p).exists()).map(|p| p.to_string())
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
    let output = match output { Ok(o) => o, Err(_) => return vec![] };
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut games = Vec::new();
    for line in stdout.lines() {
        let parts: Vec<&str> = line.splitn(3, '\t').collect();
        if parts.len() < 2 { continue; }
        let name    = parts[0].trim().to_string();
        let install = parts[1].trim();
        let uid     = if parts.len() >= 3 { parts[2].trim() } else { "" };
        if name.is_empty() { continue; }
        // Use Battle.net.exe --exec="launch CODE" to start the game without the launcher window.
        // Fall back to direct game exe if the code isn't known, then battlenet:// URI as last resort.
        let launch_path = if let Some(code) = battlenet_exec_code(uid) {
            if let Some(bnet) = find_battlenet_exe() {
                format!("bnet-exec:{}|{}", bnet, code)
            } else {
                find_bnet_game_exe(install).unwrap_or_default()
            }
        } else {
            find_bnet_game_exe(install)
                .unwrap_or_else(|| if !uid.is_empty() { format!("battlenet://{}", uid) } else { String::new() })
        };
        if launch_path.is_empty() { continue; }
        let icon = find_game_icon(install);
        let id = format!("battlenet:{}", name.to_lowercase().replace(' ', "_").replace([':', '\'', '"'], ""));
        games.push(AppEntry { id, name, icon_base64: icon, launch_path, app_type: "game".to_string(), source: "battlenet".to_string() });
    }
    games
}

fn find_main_exe_in_dir(dir: &str) -> Option<String> {
    let path = Path::new(dir);
    let skip = ["unins", "crash", "update", "error", "report", "helper", "agent", "redist", "setup", "install", "vcredist"];
    let mut candidates: Vec<String> = Vec::new();
    if let Ok(entries) = std::fs::read_dir(path) {
        for e in entries.flatten() {
            let p = e.path();
            if p.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase() == "exe" {
                let name = p.file_name().and_then(|n| n.to_str()).unwrap_or("").to_lowercase();
                if skip.iter().any(|s| name.contains(s)) { continue; }
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
    let skip = ["unins", "crash", "update", "error", "report", "helper", "agent",
                "redist", "setup", "install", "vcredist", "launcher"];
    let mut candidates: Vec<String> = Vec::new();
    if let Ok(entries) = std::fs::read_dir(path) {
        for e in entries.flatten() {
            let p = e.path();
            if p.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase() == "exe" {
                let name = p.file_name().and_then(|n| n.to_str()).unwrap_or("").to_lowercase();
                if skip.iter().any(|s| name.contains(s)) { continue; }
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

    // Build candidate steamapps dirs: registry-derived path first, then fallbacks
    let mut candidate_steamapps: Vec<String> = Vec::new();
    if let Some(steam_root) = get_steam_install_path() {
        candidate_steamapps.push(format!("{}\\steamapps", steam_root));
    }
    candidate_steamapps.push("C:\\Program Files (x86)\\Steam\\steamapps".to_string());
    candidate_steamapps.push("C:\\Program Files\\Steam\\steamapps".to_string());
    candidate_steamapps.dedup();

    // Extend library_paths with any additional folders listed in libraryfolders.vdf
    let mut library_paths: Vec<String> = candidate_steamapps.clone();
    for steamapps in &candidate_steamapps {
        let vdf_path = format!("{}\\libraryfolders.vdf", steamapps);
        if let Ok(content) = std::fs::read_to_string(&vdf_path) {
            for line in content.lines() {
                if line.trim().contains("\"path\"") {
                    if let Some(start) = line.rfind('"') {
                        let rest = &line[..start];
                        if let Some(start2) = rest.rfind('"') {
                            let extra = format!("{}\\steamapps", &rest[start2 + 1..].replace("\\\\", "\\"));
                            if !library_paths.contains(&extra) { library_paths.push(extra); }
                        }
                    }
                }
            }
        }
    }
    for library in &library_paths {
        let lib_path = Path::new(library);
        if !lib_path.exists() { continue; }
        if let Ok(dir) = std::fs::read_dir(lib_path) {
            for entry in dir.flatten() {
                let p = entry.path();
                if p.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase() != "acf" { continue; }
                if let Ok(content) = std::fs::read_to_string(&p) {
                    let mut name = String::new();
                    let mut install_dir = String::new();
                    let mut app_id = String::new();
                    for line in content.lines() {
                        let line = line.trim();
                        if line.starts_with("\"name\"") { name = extract_vdf_value(line); }
                        else if line.starts_with("\"installdir\"") { install_dir = extract_vdf_value(line); }
                        else if line.starts_with("\"appid\"") { app_id = extract_vdf_value(line); }
                    }
                    if name.is_empty() || app_id.is_empty() { continue; }
                    let launch_path = format!("steam://rungameid/{}", app_id);
                    let icon = find_game_icon(&format!("{}\\common\\{}", library, install_dir));
                    games.push(AppEntry {
                        id: launch_path.clone(),
                        name,
                        icon_base64: icon,
                        launch_path,
                        app_type: "game".to_string(),
                        source: "steam".to_string(),
                    });
                }
            }
        }
    }
    games
}

fn extract_vdf_value(line: &str) -> String {
    let parts: Vec<&str> = line.splitn(4, '"').collect();
    if parts.len() >= 4 { parts[3].trim_end_matches('"').to_string() } else { String::new() }
}

fn find_game_icon(game_dir: &str) -> Option<String> {
    let path = Path::new(game_dir);
    if !path.exists() { return None; }
    if let Ok(dir) = std::fs::read_dir(path) {
        for entry in dir.flatten() {
            let p = entry.path();
            if p.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase() == "exe" {
                if let Some(icon) = extract_icon_base64(&p.to_string_lossy()) { return Some(icon); }
            }
        }
    }
    None
}

#[tauri::command]
fn get_apps() -> Vec<AppEntry> {
    let settings = load_settings_inner();
    let hidden   = load_hidden_inner();
    let mut apps: Vec<AppEntry> = Vec::new();

    // 1. Existing Desktop/Start Menu Scan
    if settings.scan_desktop {
        let user_desktop = dirs::desktop_dir().map(|p| p.to_string_lossy().to_string()).unwrap_or_default();
        let start_menu_user = dirs::data_dir().map(|p| p.join("Microsoft\\Windows\\Start Menu\\Programs").to_string_lossy().to_string()).unwrap_or_default();
        let start_menu_common = "C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs".to_string();
        for folder in [&user_desktop, &start_menu_user, &start_menu_common] {
            apps.extend(scan_folder(folder, "app"));
        }
    }

    // Steam launcher app entry — try registry path first, then fallbacks
    let steam_exe = get_steam_install_path()
        .map(|p| format!("{}\\Steam.exe", p))
        .and_then(|p| if std::path::Path::new(&p).exists() { Some(p) } else { None })
        .or_else(|| ["C:\\Program Files (x86)\\Steam\\Steam.exe", "C:\\Program Files\\Steam\\Steam.exe"]
            .iter().find(|&&p| std::path::Path::new(p).exists()).map(|p| p.to_string()));
    if let Some(steam_path) = steam_exe {
        if !apps.iter().any(|a| a.name.to_lowercase() == "steam") {
            apps.push(AppEntry {
                id: "steam_launcher".to_string(),
                name: "Steam".to_string(),
                icon_base64: extract_icon_base64(&steam_path),
                launch_path: steam_path,
                app_type: "app".to_string(),
                source: "desktop".to_string(),
            });
        }
    }

    // 2. UWP and Xbox scan
    if settings.scan_uwp || settings.scan_xbox {
        let uwp = scan_uwp_apps();
        for entry in uwp {
            if entry.source == "xbox" && !settings.scan_xbox { continue; }
            if entry.source == "uwp"  && !settings.scan_uwp  { continue; }
            apps.push(entry);
        }
    }

    // 3. Steam Games scan (this adds the games, not the app)
    if settings.scan_steam {
        apps.extend(scan_steam_games());
    }

    // 4. Battle.net Games scan
    if settings.scan_battlenet {
        apps.extend(scan_battlenet_games());
    }

    let mut seen = std::collections::HashSet::new();
    // Use the ID for de-duplication instead of just the name to be safer
    apps.retain(|a| seen.insert(a.id.clone()) && !hidden.contains(&a.id));
    apps
}

// Same as get_apps() but without filtering hidden entries.
// Used by the frontend to show proper names/icons for hidden apps in the Manage modal.
#[tauri::command]
fn get_all_apps() -> Vec<AppEntry> {
    let settings = load_settings_inner();
    let mut apps: Vec<AppEntry> = Vec::new();

    if settings.scan_desktop {
        let user_desktop = dirs::desktop_dir().map(|p| p.to_string_lossy().to_string()).unwrap_or_default();
        let start_menu_user = dirs::data_dir().map(|p| p.join("Microsoft\\Windows\\Start Menu\\Programs").to_string_lossy().to_string()).unwrap_or_default();
        let start_menu_common = "C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs".to_string();
        for folder in [&user_desktop, &start_menu_user, &start_menu_common] {
            apps.extend(scan_folder(folder, "app"));
        }
    }

    let steam_exe = get_steam_install_path()
        .map(|p| format!("{}\\Steam.exe", p))
        .and_then(|p| if std::path::Path::new(&p).exists() { Some(p) } else { None })
        .or_else(|| ["C:\\Program Files (x86)\\Steam\\Steam.exe", "C:\\Program Files\\Steam\\Steam.exe"]
            .iter().find(|&&p| std::path::Path::new(p).exists()).map(|p| p.to_string()));
    if let Some(steam_path) = steam_exe {
        if !apps.iter().any(|a| a.name.to_lowercase() == "steam") {
            apps.push(AppEntry {
                id: "steam_launcher".to_string(),
                name: "Steam".to_string(),
                icon_base64: extract_icon_base64(&steam_path),
                launch_path: steam_path,
                app_type: "app".to_string(),
                source: "desktop".to_string(),
            });
        }
    }

    if settings.scan_uwp || settings.scan_xbox {
        let uwp = scan_uwp_apps();
        for entry in uwp {
            if entry.source == "xbox" && !settings.scan_xbox { continue; }
            if entry.source == "uwp"  && !settings.scan_uwp  { continue; }
            apps.push(entry);
        }
    }

    if settings.scan_steam {
        apps.extend(scan_steam_games());
    }

    if settings.scan_battlenet {
        apps.extend(scan_battlenet_games());
    }

    // Deduplicate only — no hidden filter
    let mut seen = std::collections::HashSet::new();
    apps.retain(|a| seen.insert(a.id.clone()));
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

    if hwnd_val == state.our_hwnd { return BOOL(1); }
    if !IsWindowVisible(hwnd).as_bool() { return BOOL(1); }
    if GetWindowTextLengthW(hwnd) == 0 { return BOOL(1); }

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

#[tauri::command]
async fn launch_app(
    path: String,
    id: String,
    name: String,
    app_type: String,
    app_handle: tauri::AppHandle
) -> Result<(), String> {
    let mut recents = load_recents();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    recents.retain(|r| r.id != id);
    recents.insert(0, RecentEntry { id, name, launch_path: path.clone(), app_type, launched_at: now });
    recents.truncate(RECENTS_MAX);
    save_recents(&recents);

    // Snapshot existing windows before launch so the watcher can detect new ones.
    let existing = snapshot_visible_windows();
    let our_hwnd = OUR_HWND.load(Ordering::Relaxed);

    // child_pid: Some(pid) when we spawn the game directly (allows precise matching);
    // None for launcher-mediated paths where the game process is a grandchild.
    let child_pid: u32;

    if let Some(rest) = path.strip_prefix("bnet-exec:") {
        // "bnet-exec:{exe_path}|{code}" — Battle.net.exe --exec="launch CODE"
        if let Some((exe, code)) = rest.split_once('|') {
            std::process::Command::new(exe)
                .arg(format!("--exec=launch {}", code))
                .creation_flags(CREATE_NO_WINDOW)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        // BNet spawns the game as a separate process; use snapshot-diff approach.
        child_pid = 0;
    } else if path.starts_with("steam://") {
        // cmd /C start routes steam:// to the already-running Steam instance
        // without opening the full client window (same mechanism Steam's own shortcuts use)
        std::process::Command::new("cmd")
            .args(["/C", "start", &path])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| e.to_string())?;
        // Steam handles the launch; game PID is not recoverable from cmd.
        child_pid = 0;
    } else if path.starts_with("shell:") {
        // shell:AppsFolder\{aumid} — UWP / Xbox Game Pass titles.
        // cmd /C start is required; direct spawn can't resolve shell: URIs.
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &path])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| e.to_string())?;
        child_pid = 0;
    } else if path.contains("://") {
        // ShellExecuteW for other URI schemes (https://, etc.)
        unsafe {
            let op:   Vec<u16> = std::ffi::OsStr::new("open").encode_wide().chain(std::iter::once(0)).collect();
            let file: Vec<u16> = std::ffi::OsStr::new(&path).encode_wide().chain(std::iter::once(0)).collect();
            ShellExecuteW(
                windows::Win32::Foundation::HWND::default(),
                windows::core::PCWSTR(op.as_ptr()),
                windows::core::PCWSTR(file.as_ptr()),
                windows::core::PCWSTR::null(),
                windows::core::PCWSTR::null(),
                SW_SHOWNORMAL,
            );
        }
        child_pid = 0;
    } else {
        // Direct exe — spawn without a cmd wrapper so we get the game's own PID.
        let child = std::process::Command::new(&path)
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| e.to_string())?;
        child_pid = child.id();
    }

    // Watch for the game window in a background thread, then notify the frontend.
    let handle = app_handle.clone();
    std::thread::spawn(move || {
        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(15);
        let mut found: isize = 0;

        while std::time::Instant::now() < deadline {
            std::thread::sleep(std::time::Duration::from_millis(250));
            found = poll_for_window(child_pid, &existing, our_hwnd);
            if found != 0 { break; }
        }

        if found != 0 {
            unsafe {
                let hwnd = windows::Win32::Foundation::HWND(found as _);
                let _ = SetForegroundWindow(hwnd);
                ShowWindow(hwnd, SW_SHOW);
            }
            let _ = handle.emit("launch-success", ());
        } else {
            let _ = handle.emit("launch-failed", ());
        }
    });

    Ok(())
}

fn is_our_window_focused() -> bool {
    let stored_hwnd = OUR_HWND.load(Ordering::Relaxed);
    if stored_hwnd == 0 { return true; }
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
    std::thread::spawn(move || {
        loop {
            if FRONTEND_HAS_CONTROL.load(Ordering::Relaxed) {
                std::thread::sleep(std::time::Duration::from_millis(500));
                continue;
            }
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec![])))
        .invoke_handler(tauri::generate_handler![
            get_apps, get_all_apps, launch_app, fetch_game_art, get_cached_art_bulk, get_recents, get_battery,
            set_gamepad_ready, get_settings, save_settings, clear_recents,
            clear_art_cache, set_frontend_active, open_osk,
            get_pins, toggle_pin,
            get_hidden, toggle_hidden,
            get_custom_art, set_custom_art, clear_custom_art,
            get_screen_resolution
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            let hwnd = window.hwnd().unwrap();
            OUR_HWND.store(hwnd.0 as isize, Ordering::Relaxed);
            let _ = window.set_focus();
            start_gamepad_listener(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}