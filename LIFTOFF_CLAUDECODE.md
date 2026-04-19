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
- `Settings` — accent, theme, stars_enabled, default_tab, scan_steam, scan_xbox, scan_uwp, scan_desktop, repeat_speed, launch_at_startup

**Persistent storage** (all in `%LOCALAPPDATA%/LiftOff/`):
- `pins.json` — Vec<String> of pinned app IDs
- `hidden.json` — Vec<String> of hidden app IDs
- `recents.json` — Vec<RecentEntry>
- `art_cache.json` — HashMap<String, String> (game name → SGDB image URL)
- `settings.json` — Settings struct

**Tauri commands:**
- `get_all_apps` — scans all sources, returns ALL apps including hidden ones. **This is the only scan called on startup** — hidden filtering is done client-side in JS using the `get_hidden` result.
- `get_apps` — same scan but filters hidden IDs before returning. Still registered but no longer called on startup; kept for potential future use.
- `launch_app(path, id, name, app_type)` — launches via `cmd /C start`, updates recents
- `get_recents` / `clear_recents`
- `get_pins` / `toggle_pin(app_id)`
- `get_hidden` / `toggle_hidden(app_id)`
- `fetch_game_art(game_name)` — SteamGridDB lookup, cached in `art_cache.json`
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

**Icon extraction (`extract_icon_base64`):**
- Icons are **not** read with `GetDIBits` directly from `ICONINFO.hbmColor` at a fixed size — `SHGFI_LARGEICON` / jumbo sources can use bitmaps larger than the assumed size, which previously produced **corrupt PNGs** (huge / clipped / top-left-only in the UI).
- **Approach:** `SHGetFileInfoW` → `HICON` (try **`SHGFI_JUMBOICON`** first, then fall back to **`SHGFI_LARGEICON`**), then **`DrawIconEx`** onto a square DIB, then **`GetDIBits`** from that bitmap, BGRA→RGBA swap, **`lodepng::encode32`**.
- **Export size:** `ICON_EXPORT_PX` (currently **128**) — high enough to stay sharp when the WebView displays icons at ~48px+ and scales; tunable in `lib.rs`.
- **UWP:** `extract_uwp_icon_base64` prefers **larger** `scale-*` variants (200 → 150 → 125 → 100) when multiple PNGs match, so downscaling stays sharp; `object-fit: contain` in the UI handles layout.

**SGDB API key** is read at compile time via `env!("SGDB_API_KEY")` in `lib.rs`. The key lives in `src-tauri/.env` (gitignored). `build.rs` reads `.env` and passes each key as `cargo:rustc-env=`. For CI/CD, set `SGDB_API_KEY` as an environment variable instead.

---

## Frontend (`src/App.jsx`)

### Constants (top of file)
- `APP_VERSION = "1.0.0"` — compared against GitHub Releases API for update checks
- `GITHUB_REPO = "taylo/liftoff"` — **update this to your actual GitHub owner/repo before release**

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

### Startup sequence
On mount, `Promise.all([invoke("get_all_apps"), invoke("get_hidden")])` fires alongside parallel calls for `get_settings`, `get_recents`, `get_pins`. When the Promise.all resolves:
1. `allAppsRef.current` is populated with all apps (including hidden)
2. Hidden IDs are stored; visible apps = `all.filter(a => !hidden.includes(a.id))`
3. `fetchGameArt` fires for all visible games in **parallel** (one invoke per game, no await)
4. Splash exits after 800ms

This replaced the previous two-call approach (`get_apps` + `get_all_apps` in parallel) which caused resource contention (double PowerShell UWP scan, double icon extraction).

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
- Switching main tabs (LB/RB) lands on **first pinned item** if any pins exist, otherwise **first grid item**
- LT/RT source switches on Games tab: "All" subtab lands on first pinned or first grid; Steam/Xbox/Other always land on first grid item
- Navigating up from `pinned` or first row of `grid` goes to `subtabs`
- `subtabs` row: source pills (Games only) + single "Manage" button
- Source pills auto-switch on focus (no Enter needed)
- LT/RT cycles source from anywhere on the Games tab

### Modal System (`HideModal`)
- **Unified "Manage" modal** — shows all apps (visible + hidden) in one list. Checked = visible, unchecked = hidden. Uncheck to hide, check to restore. "Save N changes" button.
- `HideModal` is defined **outside** the `App` function to keep a stable component type across re-renders (clock ticker was causing unmount/remount every 10s, resetting state)
- `allAppsRef` — ref populated on startup via `get_all_apps()`; used by modal to look up full name/icon/source for hidden entries
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
- `checkForUpdates()` — fetches `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, compares tag to `APP_VERSION`, updates `updateStatus`/`updateInfo`

### Settings Items
Defined as `SETTINGS_ITEMS` array with types: `accent`, `cycle`, `toggle`, `divider`, `action`, `link`, `info`, `update`, `attribution`

The `update` type renders the "Check for Updates" row in the ABOUT section. When status is `"available"`, pressing A opens the GitHub releases page in browser.

### App icons (UI)
- **`AppIcon`** wraps `data:image/png;base64` icons in a fixed-size box with **`overflow: hidden`**, **`objectFit: "contain"`**, **`objectPosition: "center"`**
- **Recent cards** on Home tab look up the full `AppEntry` from `allAppsRef` to get `icon_base64` (since `RecentEntry` doesn't store icons)
- **Manage modal** list rows and **launch overlay** fallback icon use the same containment pattern

### Splash screen (`SplashScreen`)
- Splash CSS is injected in a `useEffect`, so the first paint can occur before the styles exist
- The rocket wrapper, `splash-word` div, and `splash-dots` div all use **inline `style={{ opacity: 0 }}`** so nothing flashes before the CSS animations kick in

---

## Remaining Tasks Before v1

*(none)*

---

## Known Good State

All of the following are working as of this handoff:
- App scanning: Steam, Xbox/Game Pass, UWP Store apps, Desktop shortcuts
- UWP icon extraction from disk PNG assets; desktop/Steam shortcut icons rasterized via `DrawIconEx` at `ICON_EXPORT_PX` with jumbo/large fallback
- No console window flash on launch (CREATE_NO_WINDOW everywhere)
- LiftOff's own dev build excluded from scan results
- Game art fetching from SteamGridDB with local cache; fetches fire in parallel on startup
- Single library scan on startup (no duplicate PowerShell/icon-extraction work)
- Gamepad navigation with hold-repeat across all tabs/sections
- Tab switching (LB/RB) lands on first pinned item or first grid item
- Source sub-tabs on Games tab (All/Steam/Xbox/Other) via LT/RT or d-pad; All lands on pinned-or-grid, others land on grid
- Pinned apps hidden on filtered sub-tabs (only shown on "All")
- Hide/Restore unified Manage modal with full gamepad nav, hold-repeat, Start=confirm, B=cancel
- All modal input isolation (no bleed-through to background UI)
- Settings: accent colors, theme, scan toggles, startup, repeat speed
- Check for Updates in Settings (GitHub Releases API, opens browser if update available)
- Search overlay with virtual keyboard
- Battery, clock display
- Splash screen with exit animation; no flash before CSS loads (inline opacity on all animated elements)
- Pins, recents, hidden state all persisted to disk
- Recent cards on Home tab show correct icons (looked up from allAppsRef)
- NSIS installer builds correctly; exe named LiftOff; package name `liftoff`
- README.md written

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
    main.rs        — calls liftoff_lib::run()
  tauri.conf.json
  Cargo.toml
  .env             — SGDB_API_KEY (gitignored)
  target/release/bundle/nsis/  ← installer here
```
