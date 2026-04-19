# LiftOff — Claude Code Handoff

## Project Overview

**LiftOff** is a Windows desktop game/app launcher built with Tauri 2 (Rust backend + React frontend). It's designed primarily for gamepad/controller navigation and targets a Steam Deck / HTPC-style use case.

- **Stack:** Tauri 2, Rust (`src-tauri/src/lib.rs`), React (`src/App.jsx`)
- **Identifier:** `com.taylo.liftoff`
- **Version:** `1.0.0`
- **Installer:** NSIS bundle at `src-tauri/target/release/bundle/nsis/`
- **Dev command:** `npm run dev` (frontend) + `cargo tauri dev`
- **Build:** `cargo tauri build` → use NSIS installer for testing, not raw `.exe`

---

## Architecture

### Backend (`src-tauri/src/lib.rs`)

**Key data structures:**
- `AppEntry` — `{ id, name, icon_base64, launch_path, app_type, source }`
  - `app_type`: `"game"` | `"app"`
  - `source`: `"steam"` | `"xbox"` | `"uwp"` | `"desktop"`
- `RecentEntry` — `{ id, name, launch_path, app_type, launched_at }` (no icon — look up via `allAppsRef` in frontend)
- `BatteryInfo` — `{ percent: u32, charging: bool }`
- `Settings` — accent, theme, stars_enabled, default_tab, scan_steam, scan_xbox, scan_uwp, scan_desktop, repeat_speed, launch_at_startup

**Persistent storage** (all in `%LOCALAPPDATA%/LiftOff/`):
- `pins.json` — Vec<String> of pinned app IDs
- `hidden.json` — Vec<String> of hidden app IDs
- `recents.json` — Vec<RecentEntry>
- `art_cache.json` — HashMap<String, String> (game name → SGDB image URL)
- `settings.json` — Settings struct

**Tauri commands:**
- `get_all_apps` — scans all sources, returns ALL apps including hidden ones. **This is the only scan called on startup** — hidden filtering is done client-side in JS using the `get_hidden` result.
- `get_apps` — same scan but filters hidden IDs before returning. Still registered but no longer called on startup.
- `launch_app(path, id, name, app_type)` — launches via `cmd /C start`, updates recents
- `get_recents` / `clear_recents`
- `get_pins` / `toggle_pin(app_id)`
- `get_hidden` / `toggle_hidden(app_id)`
- `fetch_game_art(game_name)` — SteamGridDB lookup, cached in `art_cache.json`
- `get_settings` / `save_settings(settings)`
- `clear_art_cache`
- `get_battery` — returns `BatteryInfo { percent, charging }` via Win32 `GetSystemPowerStatus`. `ACLineStatus == 1` = charging. `BatteryLifePercent == 255` = unknown (fully charged on some devices) — handled by returning 100 when charging.
- `open_osk` — opens TabTip / on-screen keyboard
- `set_gamepad_ready` / `set_frontend_active(active)`

**Important implementation notes:**
- All `Command::new` spawns use `CREATE_NO_WINDOW` (`0x08000000`) flag — critical to prevent console flashes
- UWP icons extracted from disk PNG assets (not `SHGetFileInfoW` which doesn't work for UWP)
- Xbox Game Pass games identified by `MicrosoftGame.config` presence or `app_id == "Game"`
- `scan_folder()` excludes paths containing `target\release` or `target/release` to hide dev build
- `get_apps()` respects all `scan_*` settings toggles and filters hidden IDs before returning

**Icon extraction (`extract_icon_base64`):**
- **Approach:** `SHGetFileInfoW` → `HICON` (try **`SHGFI_JUMBOICON`** first, then fall back to **`SHGFI_LARGEICON`**), then **`DrawIconEx`** onto a square DIB, then **`GetDIBits`** from that bitmap, BGRA→RGBA swap, **`lodepng::encode32`**.
- **Export size:** `ICON_EXPORT_PX` (currently **128**) — tunable in `lib.rs`.
- **UWP:** `extract_uwp_icon_base64` prefers **larger** `scale-*` variants (200 → 150 → 125 → 100).

**SGDB API key** is read at compile time via `env!("SGDB_API_KEY")` in `lib.rs`. The key lives in `src-tauri/.env` (gitignored). `build.rs` reads `.env` and passes each key as `cargo:rustc-env=`.

---

## Frontend (`src/App.jsx`)

### Constants (top of file)
- `APP_VERSION = "1.0.0"` — compared against GitHub Releases API for update checks
- `GITHUB_REPO = "PixelateWizard/LiftOff"` — used for update check and releases link

### State
- `tab` — "Home" | "Games" | "Apps" | "Settings"
- `apps` — visible AppEntry list (all apps minus hidden, filtered client-side from `allAppsRef`)
- `recent` — recently launched apps
- `pins` — pinned app IDs
- `hidden` — hidden app IDs
- `gameSourceTab` — "All" | "Steam" | "Xbox" | "Other" (Games tab sub-filter)
- `showHideModal` — boolean (true while Manage modal is open)
- `settings` — Settings object
- `gameArt` — { [appId]: imageUrl } from SGDB
- `focusSection` — "hero" | "pinned" | "recent" | "grid" | "subtabs"
- `focusIndex` — current position within section
- `updateStatus` — null | "checking" | "up_to_date" | "available" | "error"
- `updateInfo` — latest version string when an update is available
- `libraryRefreshStatus` — null | "scanning" | "done"
- `charging` — boolean, whether device is plugged in

### Startup sequence
On mount, `Promise.all([invoke("get_all_apps"), invoke("get_hidden")])` fires alongside parallel calls for `get_settings`, `get_recents`, `get_pins`. When the Promise.all resolves:
1. `allAppsRef.current` is populated with all apps (including hidden)
2. Hidden IDs are stored; visible apps = `all.filter(a => !hidden.includes(a.id))`
3. `fetchGameArt` fires for all visible games in **parallel** (one invoke per game, no await)
4. Splash exits after 800ms

Battery polls every **10 seconds** (was 60s).

### Gamepad Input System
Two parallel input paths:
1. **RAF poll** (`useEffect` with `requestAnimationFrame`) — reads Gamepad API directly, handles hold-repeat, fires `handleNavRef.current(key)`
2. **Tauri listeners** — `gamepad-button` and `gamepad-axis` events from backend

**Button mapping:**
- A (btn 0) = Enter/launch
- B (btn 1) = Escape/back
- X (btn 2) = ButtonX (pin)
- Y (btn 3) = ButtonY (search)
- LB (btn 4) = BumperLeft (prev tab)
- RB (btn 5) = BumperRight (next tab)
- LT (btn 6) = TriggerLeft (prev source sub-tab on Games)
- RT (btn 7) = TriggerRight (next source sub-tab on Games)
- Menu/Start (btn 9) = Start (open Manage modal on Games/Apps)

### Navigation Sections (Games/Apps tab)
`subtabs` → `pinned` → `grid`
- Switching main tabs (LB/RB) lands on **first pinned item** if any pins exist, otherwise **first grid item**
- LT/RT source switches: "All" subtab lands on first pinned or first grid; Steam/Xbox/Other always land on first grid item
- Navigating up from `pinned` or first row of `grid` goes to `subtabs`
- `subtabs` row: source pills (Games only) + single "Manage" button
- Source pills auto-switch on focus (no Enter needed)

### Modal System (`HideModal`)
- **Unified "Manage" modal** — shows all apps (visible + hidden) in one list. Checked = visible, unchecked = hidden.
- `HideModal` defined **outside** `App` function — stable component type prevents re-mount on clock re-renders
- `allAppsRef` — ref populated on startup via `get_all_apps()`; used by modal to look up full name/icon for hidden entries
- Modal has its own RAF gamepad poll with `startReleased` guard and `suppressUntilRelease` bleed prevention

### Library Refresh
- `refreshLibrary()` — re-runs `Promise.all([get_all_apps, get_hidden])`, updates all app state + triggers `fetchGameArt` for new games
- Triggered automatically when any scan toggle (`scan_steam`, `scan_xbox`, `scan_uwp`, `scan_desktop`) is changed
- Also available as a manual "Refresh Library" button in Settings → LIBRARY section
- While scanning, a **blocking overlay modal** renders (`zIndex: 5000`) with animated dots and "Refreshing library…" text — prevents interaction during scan

### Key Helpers
- `triggerLaunch(app, rec)` — plays launch sound, calls `launchApp`, updates recent state
- `togglePin(app)` — calls backend, updates state
- `toggleHidden(appId)` — calls backend, removes/restores from apps state (uses `allAppsRef`)
- `refreshLibrary()` — re-scans library, shows blocking overlay, sets status to "done" for 2.5s
- `checkForUpdates()` — fetches GitHub Releases API, compares to `APP_VERSION`
- `updateSetting(key, value)` — saves setting + triggers refresh if key is a scan toggle

### Settings Items
Types: `accent`, `cycle`, `toggle`, `divider`, `action`, `link`, `info`, `update`, `refresh`, `attribution`

- `refresh` type: "Refresh Library" — shows scanning status on right, triggers `refreshLibrary()`
- `update` type: "Check for Updates" — shows check status, opens releases page if update available

### Theming
- `ACCENTS` — ember, ocean, neon, rose, midnight
- Neon accent has `lightPrimary: "#15803d"` — used in light mode instead of `primary` (#4ae88a) for WCAG AA compliance (4.7:1 contrast vs white)
- `accent` is computed after `isDark` so `lightPrimary` can be applied: `(!isDark && _baseAccent.lightPrimary) ? { ..._baseAccent, primary: _baseAccent.lightPrimary } : _baseAccent`

### App icons (UI)
- **`AppIcon`** wraps `data:image/png;base64` icons with `overflow: hidden`, `objectFit: contain`
- **Recent cards** on Home tab look up the full `AppEntry` from `allAppsRef` to get `icon_base64`

### Splash screen (`SplashScreen`)
- CSS injected in `useEffect` — rocket wrapper, `splash-word`, and `splash-dots` all have inline `opacity: 0` to prevent flash before CSS loads

### Battery / Charging
- `get_battery` returns `{ percent, charging }`
- Battery fill turns green when charging, red when ≤20%, accent color otherwise
- Lightning bolt SVG overlays the battery icon center when charging
- Percentage text also turns green when charging

### Hero (Home tab) — Light mode
- Base background uses `appBg` (accent lightBg) instead of hardcoded `#0a0502`
- Blurred art: `brightness(0.92) saturate(0.9)` in light mode
- Side vignette and bottom fade use `appBg` with opacity, blending seamlessly into the page
- All text uses `theme.text` / `theme.textDim` (dark in light mode) for WCAG compliance

---

## Remaining Tasks Before v1

*(none)*

---

## Future Plans (Post-v1)

- **Game videos in hero** — autoplay trailer/clip in the hero spotlight
- **Rearrange pinned items** — drag or controller-based reordering of pinned apps
- **In-app browser** — lightweight browser overlay for game wikis, store pages, etc.
- **More customization options** — additional accent colors, layout options, font sizes
- **System settings controls** — display brightness, volume, Wi-Fi and Bluetooth toggles from within the app
- **Additional game libraries** — GOG, Battle.net, Epic Games, and other launcher integrations

---

## Known Good State

- App scanning: Steam, Xbox/Game Pass, UWP Store apps, Desktop shortcuts
- Single library scan on startup; auto-refresh when scan toggles change; manual Refresh Library button
- Blocking overlay modal during library refresh
- UWP/desktop/Steam icon extraction via `DrawIconEx` at 128px with jumbo/large fallback
- No console window flash on launch (CREATE_NO_WINDOW everywhere)
- Game art fetching from SteamGridDB with local cache; parallel fetches on startup
- Gamepad navigation with hold-repeat across all tabs/sections
- Tab switching lands on first pinned item or first grid item
- Source sub-tabs on Games tab (All/Steam/Xbox/Other) via LT/RT or d-pad
- Unified Manage modal with full gamepad nav, input isolation, bleed prevention
- Settings: accent colors (WCAG-compliant in light mode for neon), theme, scan toggles, startup, repeat speed
- Check for Updates (GitHub Releases API); Refresh Library (manual + auto on toggle change)
- Search overlay with virtual keyboard
- Battery icon shows percent + charging indicator (lightning bolt + green color); polls every 10s
- Hero section fully themed for light mode (no hardcoded dark colors, WCAG-compliant text)
- Splash screen: no flash before CSS loads (inline opacity on all animated elements)
- Recent cards show correct icons (looked up from allAppsRef)
- Settings scroll margin accounts for sticky nav bar (80px top margin)
- NSIS installer builds correctly; package named `liftoff`, exe `LiftOff`
- README.md written; LIFTOFF_CLAUDECODE.md gitignored
- Git repo: single `main` branch at github.com/PixelateWizard/LiftOff

## File Structure Notes
```
src/
  App.jsx          — entire frontend (single file)
  assets/
    uiSound.mp3
    uiSoundAlt.mp3
    appLaunchSound.wav
    gameLaunchSound.wav
    appLoadedSound.wav

src-tauri/
  src/
    lib.rs         — entire backend (single file)
    main.rs        — calls liftoff_lib::run()
  tauri.conf.json
  Cargo.toml
  .env             — SGDB_API_KEY (gitignored)
  target/release/bundle/nsis/  ← installer here
```
