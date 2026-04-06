# LiftOff — Claude Code Handoff

## Project Overview

**LiftOff** is a Windows desktop game/app launcher built with Tauri 2 (Rust backend + React frontend). It's designed primarily for gamepad/controller navigation and targets a Steam Deck / HTPC-style use case.

- **Stack:** Tauri 2, Rust (`src-tauri/src/lib.rs`), React (`src/App.jsx`)
- **Identifier:** `com.taylo.liftoff`
- **Version:** `0.1.0`
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
- `RecentEntry` — `{ id, name, launch_path, app_type, launched_at }`
- `Settings` — accent, theme, stars_enabled, default_tab, scan_steam, scan_xbox, scan_uwp, scan_desktop, repeat_speed, launch_at_startup

**Persistent storage** (all in `%LOCALAPPDATA%/LiftOff/`):
- `pins.json` — Vec<String> of pinned app IDs
- `hidden.json` — Vec<String> of hidden app IDs (filtered from `get_apps` return)
- `recents.json` — Vec<RecentEntry>
- `art_cache.json` — HashMap<String, String> (game name → SGDB image URL)
- `settings.json` — Settings struct

**Tauri commands:**
- `get_apps` — scans all sources, filters hidden, returns Vec<AppEntry>
- `get_all_apps` — same scan as `get_apps` but returns ALL apps including hidden ones (used to populate `allAppsRef` on startup so the Manage modal can show proper names/icons for hidden apps)
- `launch_app(path, id, name, app_type)` — launches via `cmd /C start`, updates recents
- `get_recents` / `clear_recents`
- `get_pins` / `toggle_pin(app_id)`
- `get_hidden` / `toggle_hidden(app_id)`
- `fetch_game_art(game_name)` — SteamGridDB lookup, cached
- `get_settings` / `save_settings(settings)`
- `clear_art_cache`
- `get_battery` — Win32 power status
- `open_osk` — opens TabTip / on-screen keyboard
- `set_gamepad_ready` / `set_frontend_active(active)`

**Important implementation notes:**
- All `Command::new` spawns use `CREATE_NO_WINDOW` (`0x08000000`) flag — critical to prevent console flashes
- UWP icons extracted from disk PNG assets (not `SHGetFileInfoW` which doesn't work for UWP)
- Xbox Game Pass games identified by `MicrosoftGame.config` presence or `app_id == "Game"`
- `scan_folder()` excludes paths containing `target\release` or `target/release` to hide dev build
- `get_apps()` respects all `scan_*` settings toggles and filters hidden IDs before returning

**SGDB API key** is currently hardcoded in `lib.rs` as `SGDB_KEY`. This needs to be moved to a build-time environment variable (see remaining tasks below).

---

## Frontend (`src/App.jsx`)

### State
- `tab` — "Home" | "Games" | "Apps" | "Settings"
- `apps` — Vec<AppEntry> from backend
- `recent` — recently launched apps
- `pins` — pinned app IDs
- `hidden` — hidden app IDs
- `gameSourceTab` — "All" | "Steam" | "Xbox" | "Other" (Games tab sub-filter)
- `showHideModal` — boolean (true while Manage modal is open)
- `settings` — Settings object
- `gameArt` — { [appId]: imageUrl } from SGDB
- `focusSection` — "hero" | "pinned" | "recent" | "grid" | "subtabs"
- `focusIndex` — current position within section

### Gamepad Input System
Two parallel input paths:
1. **RAF poll** (`useEffect` with `requestAnimationFrame`) — reads Gamepad API directly, handles hold-repeat for directions, fires `handleNavRef.current(key)`
2. **Tauri listeners** — `gamepad-button` and `gamepad-axis` events from backend (axis listener has its own repeat interval stored in `axisIntervalRef`/`axisTimeoutRef`)

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
- Navigating up from `pinned` or first row of `grid` goes to `subtabs`
- `subtabs` row: source pills (Games only) + single "Manage" button (no separate Restore button)
- Source pills auto-switch on focus (no Enter needed)
- LT/RT cycles source from anywhere on the Games tab

### Modal System (`HideModal`)
- **Unified "Manage" modal** — shows all apps (visible + hidden) in one list. Checked = visible, unchecked = hidden. Uncheck to hide, check to restore. "Save N changes" button.
- `HideModal` is defined **outside** the `App` function to keep a stable component type across re-renders (clock ticker was causing unmount/remount every 10s, resetting state)
- `allAppsRef` — ref populated on startup via `get_all_apps()` (includes hidden apps); used by modal to look up full name/icon/source for hidden entries
- Controlled by `showHideModal` boolean + `showHideModalRef` (ref kept in sync)
- `openHideModal()` — blurs DOM focus, sets ref true
- `closeHideModal()` — snapshots held buttons into `suppressUntilRelease`, sets ref false
- Modal has its own RAF gamepad poll with hold-repeat and `startReleased` guard
- Modal's `closed` local flag stops poll immediately on close before React cleanup
- Main RAF poll checks `suppressUntilRelease` to skip buttons held at modal-close time
- Global capture-phase event blocker kills all clicks outside `[data-modal-container]` while modal open
- Main content div gets `pointerEvents: none` while modal open

### Key Helpers
- `triggerLaunch(app, rec)` — plays launch sound, calls `launchApp`, updates recent state
- `togglePin(app)` — calls backend, updates state
- `toggleHidden(appId)` — calls backend, removes/restores from apps state reactively (uses `allAppsRef` to restore full object immediately)
- `openHideModal` / `closeHideModal` — modal lifecycle with all guards
- `updateSetting(key, value)` — updates state + saves to backend

### Settings Items
Defined as `SETTINGS_ITEMS` array with types: `accent`, `cycle`, `toggle`, `divider`, `action`, `link`, `info`

---

## Remaining Tasks Before v1

### 1. Attributions in Settings
Add a static credits section at the bottom of the Settings menu for sound effect attributions. Add new item type (e.g. `"attribution"`) or just `"info"` rows under a new `"CREDITS"` divider in `SETTINGS_ITEMS`.

### 2. Splash Screen Logo Flash
The rocket SVG logo flashes briefly mid-animation before the opening animation starts. Likely the SVG rendering before the CSS animation kicks in. Fix: set `opacity: 0` as the initial inline style on the logo element, then let the animation take over. Check the `splashRocket` keyframe — it starts at `opacity: 0` at 0% so the initial style should match.

### 3. Windows Code Signing
For SmartScreen not to flag the installer:
- Need an EV or OV code signing certificate (DigiCert, Sectigo, etc.)
- In `tauri.conf.json` under `bundle.windows`, add `"certificateThumbprint"` or `"signingIdentity"` 
- Tauri 2 docs: https://tauri.app/distribute/sign/windows/
- Without a cert, can at minimum self-sign for testing but users will see SmartScreen warning

### 4. Hide SGDB API Key
Currently hardcoded in `lib.rs` as:
```rust
const SGDB_KEY: &str = "515a2318c7d29c0786c3e2058615e8dc";
```
Move to build-time env var:
- In `lib.rs`: `const SGDB_KEY: &str = env!("SGDB_API_KEY");`
- Set `SGDB_API_KEY` in environment before building
- Add to `.gitignore` any `.env` files
- For CI/CD: set as a secret environment variable
- Optionally use a `build.rs` to read from `.env` file

---

## Known Good State

All of the following are working as of this handoff:
- App scanning: Steam, Xbox/Game Pass, UWP Store apps, Desktop shortcuts
- UWP icon extraction from disk PNG assets
- No console window flash on launch (CREATE_NO_WINDOW everywhere)
- LiftOff's own dev build excluded from scan results
- Game art fetching from SteamGridDB with local cache
- Gamepad navigation with hold-repeat across all tabs/sections
- Source sub-tabs on Games tab (All/Steam/Xbox/Other) via LT/RT or d-pad
- Pinned apps hidden on filtered sub-tabs (only shown on "All")
- Hide/Restore modal with full gamepad nav, hold-repeat, Start=confirm, B=cancel
- All modal input isolation (no bleed-through to background UI)
- Settings: accent colors, theme, scan toggles, startup, repeat speed
- Search overlay with virtual keyboard
- Battery, clock display
- Splash screen with exit animation
- Pins, recents, hidden state all persisted to disk
- NSIS installer builds correctly

## File Structure Notes
```
src/
  App.jsx          — entire frontend (single file)
  assets/
    uiSound.mp3
    uiSoundAlt.mp3
    appLaunchSound.wav   (splash screen sound)
    gameLaunchSound.wav  (game/app launch sound)
    appLoadedSound.wav

src-tauri/
  src/
    lib.rs         — entire backend (single file)
  tauri.conf.json
  Cargo.toml
  target/release/bundle/nsis/  ← installer here
```
