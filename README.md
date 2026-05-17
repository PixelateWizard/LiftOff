# LiftOff

A Windows game and app launcher built for gamepad-first navigation. Designed for HTPC / couch setups — pick up a controller and go.

[![Discord](https://img.shields.io/badge/Discord-join%20the%20community-5865F2?style=flat&logo=discord&logoColor=white)](https://discord.gg/F5ncP75WtD)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support%20development-orange?style=flat&logo=buy-me-a-coffee)](https://buymeacoffee.com/liftoff_handheld_launcher)

---

## Features

- **Gamepad-native** — full navigation with hold-repeat, no mouse required
- **Automatic library scanning** — Steam games, Xbox/Game Pass titles, UWP Store apps, Desktop shortcuts, and Battle.net games
- **Live library refresh** — rescan without restarting; auto-refreshes when scan settings change
- **Game art** — cover art and hero banners fetched automatically from SteamGridDB; cached locally to minimize API calls
- **Animated hero banners** — animated WebM/WebP/GIF hero art supported where available, with static fallback; per-game or global control via Hero Art Mode setting
- **Hero spotlight** — full-width landscape banner art in the Home tab hero section, with an immersive fullscreen layout option and surface-aware readability treatments
- **App cards** — non-game app cards use dark frosted glass with a subtle icon-color border accent
- **Custom cover art** — right-click or press Menu on any game or app to open the context menu, then choose **Change Art** (or **Change Hero Art** for games); games use a 2:3 portrait crop, apps use a square crop; reset to default anytime
- **Context menu** — right-click or press Menu on any card to Open, Pin/Unpin, Change Art, or (for games) Change Hero Art
- **Pinned apps** — pin your most-used games and apps to the top of any tab; Home pinned shelves support controller-friendly horizontal scrolling
- **Launch focus feedback** — after a launch succeeds, LiftOff checks whether Windows focused the app, keeps the overlay open if the app appears to be running behind LiftOff, and offers a controller-friendly **Try to focus again** action
- **Manage visibility** — hide apps from view and restore them anytime from the same menu
- **Search** — on-screen virtual keyboard for controller-only searching
- **Animated themes** — Space, Sky, Plasma, Cinder, Wash, Aurora, Synthwave, Lofi, Forest, and Webcore are animated environments; Webcore pairs with the Win9X surface for a retro desktop-shell look
- **Surface Style** — visual materials include Glass, Aero, Material, Clear, Obsidian, Neon, and Win9X, with theme-specific defaults that can still be overridden manually
- **Recent apps** — quick access to what you launched last; Home recents support large card sizes with horizontal gamepad scrolling
- **Battery indicator** — shows charge level and charging status with light/dark contrast-safe charging colors
- **Controller test** — live button and axis display in Settings to verify your gamepad mapping
- **Check for updates** — one-button update check from Settings
- **Splash screen** with launch sounds

---

## Installation

Download the latest installer from the [Releases](../../releases) page and run it.

> **Windows SmartScreen may show a warning** since the app is not code-signed. Click **More info → Run anyway** to proceed.

> **Steam** installs in non-default locations are supported via registry detection.

---

## Controls

| Button | Action |
|--------|--------|
| **A** | Launch / confirm |
| **B** | Back / cancel |
| **X** | Pin / unpin |
| **Y** | Search |
| **Menu (Start)** | Open context menu for focused card (Games / Apps tab) |
| **Select / Back** | Open Manage modal (Games / Apps tab) |
| **LB / RB** | Switch tabs |
| **LT / RT** | Switch game source filter (All / Steam / Xbox / Bnet / Other) |
| **D-pad / Left stick** | Navigate |
| **Right-click** | Context menu — Open, Pin/Unpin, Change Art, Change Hero Art |

### Context Menu (controller)

When a card is focused on the Games or Apps tab, press **Menu** to open the context menu. Navigate with **D-pad up/down**, confirm with **A**, and close with **B**. Games also have a **Change Hero Art** option to pick custom hero banner art from SteamGridDB.

### Launch Overlay (controller)

After launching an app or game, LiftOff keeps the launch overlay visible long enough to check whether Windows moved focus to the launched window. If the app is running but still behind LiftOff, use **D-pad / left stick** to choose between **Try to focus again** and **Got it**, press **A** to activate the focused button, or press **B** / **Escape** to dismiss. LiftOff only shows **Failed to launch** when the launch command itself fails.

---

## Tabs

**Home** — hero spotlight, recent apps, pinned apps

**Games** — all detected games with cover art, filterable by source (Steam / Xbox / Bnet / Other)

**Apps** — all detected non-game apps and shortcuts

**Settings** — accent color, theme, library scan toggles, startup behavior, repeat speed, controller test, update check, Discord, and more

---

## Settings

| Setting | Description |
|---------|-------------|
| Accent Color | Ember, Ocean, Neon, Rose, Midnight |
| Theme | Space / Sky / Plasma / Cinder / Wash / Aurora / Synthwave / Lofi / Forest / Webcore. Cyberpunk remains in code as a prototype but is temporarily hidden from the selector |
| Theme Surface Defaults | Space -> Clear, Sky -> Aero, Plasma -> Neon, Cinder -> Glass, Wash -> Material, Aurora -> Glass, Synthwave -> Aero, Lofi -> Obsidian, Forest -> Glass, Webcore -> Win9X; Surface Style can still be changed manually afterward |
| Surface Style | Glass - frosted blur panels; Aero - polished acrylic with specular highlights; Material - opaque paper-textured cards with shadow-based elevation; Clear - flat matte; Obsidian - dark restrained surfaces; Neon - high-glow arcade surfaces; Win9X - square retro desktop-shell surfaces with bevels, title bars, and no rounded corners |
| Immersive Home | Fullscreen cinematic hero with floating pinned shelf; when the bottom bar and collections drawer are hidden, pinned items and hero content settle into the freed bottom lane. The slide-up drawer supports horizontal recents and collection rows with unclipped focus shadows. Webcore/Win9X can hide the large hero artwork so the theme background remains visible |
| Show Cover on Home | Show the 2:3 cover art card in the hero section |
| Show Immersive Hero Art | When Immersive Home is enabled, show or hide the large background hero artwork while keeping hero selection and cover artwork visible |
| Show Pinned on Home | Show or hide the pinned items shelf on the home screen |
| Show Collections on Home | Display game/app collections as card rows on the home screen |
| Scan Steam | Include Steam games (supports custom install paths) |
| Scan Xbox | Include Xbox / Game Pass titles |
| Scan Store Apps | Include UWP / Microsoft Store apps |
| Scan Desktop Shortcuts | Include `.lnk` shortcuts from Desktop and Start Menu |
| Scan Battle.net | Include installed Blizzard / Battle.net games |
| Refresh Library | Rescan all sources immediately |
| Default Tab | Which tab opens on launch |
| Stick Repeat Speed | How fast held directions repeat (Slow / Normal / Fast) |
| Launch at Startup | Start LiftOff with Windows |
| Theme Effects | Toggle the active theme's background effects, including stars, clouds, plasma, cinder, wash, aurora, synthwave, lofi, forest, and Webcore effects |
| Lo-fi Music | When the Lofi theme is active, toggle the theme's looping background music |
| Hero Art Mode | Static / Animated / Custom — Static forces static banners everywhere; Animated uses animated art everywhere; Custom lets you choose per game via Change Hero Art |
| UI Scale | Override the automatic UI scale (useful for non-standard display sizes) |
| Controller Test | Live display of button states and axes for your active gamepad |
| Check for Updates | Check GitHub for a newer release |

---

## Building from Source

**Prerequisites:**
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/)
- [Tauri CLI](https://tauri.app/start/): `cargo install tauri-cli`

**Setup:**

```bash
# Install frontend dependencies
npm install

# Create src-tauri/.env with your SteamGridDB API key
echo SGDB_API_KEY=your_key_here > src-tauri/.env
```

Get a free SteamGridDB API key at [steamgriddb.com](https://www.steamgriddb.com/profile/preferences/api).

**Dev:**
```bash
cargo tauri dev
```

**Build installer:**
```bash
cargo tauri build
# Installer output: src-tauri/target/release/bundle/nsis/
```

---

## Data Storage

All persistent data is stored in `%LOCALAPPDATA%\LiftOff\`:

| File | Contents |
|------|----------|
| `settings.json` | User preferences |
| `pins.json` | Pinned app IDs |
| `hidden.json` | Hidden app IDs |
| `recents.json` | Recently launched apps |
| `art_cache.json` | Cached SteamGridDB cover art URLs (600×900) |
| `hero_cache.json` | Cached SteamGridDB static hero banner URLs (landscape) |
| `hero_animated_cache.json` | Cached SteamGridDB animated hero banner URLs (WebM) |
| `custom_art.json` | Per-app custom art (data URLs) — games store 600×900, apps store 500×500 |

---

## Planned Features

- Game videos in the hero spotlight
- Ability to rearrange pinned items
- In-app browser
- More customization options
- System settings controls (brightness, volume, Wi-Fi, Bluetooth)
- Additional game library support (GOG, Epic Games, etc.)

---

## SmartScreen Warning <a name="smartscreen"></a>

When you first launch LiftOff, Windows SmartScreen may show a warning saying the app is "unrecognized." This is normal for indie software that hasn't yet accumulated enough downloads to build a reputation with Microsoft's systems.

To proceed:
1. Click **"More info"**
2. Click **"Run anyway"**

LiftOff is open source — you can inspect every line of code in this repository. No telemetry, no accounts, nothing hidden.

---

## Contributors

- **[moi952](https://github.com/moi952)** — major contributor: French translation & full i18n system, SteamGridDB art browser, custom game sources, controller auto-detection, rename support, component architecture refactor (ThemeContext/SettingsContext), and extensive UI settings additions

---

## Support

LiftOff is free and open source. Join the community on [Discord](https://discord.gg/F5ncP75WtD) or consider buying me a coffee!

[![Discord](https://img.shields.io/badge/Discord-join%20the%20community-5865F2?style=flat&logo=discord&logoColor=white)](https://discord.gg/F5ncP75WtD)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support%20development-orange?style=flat&logo=buy-me-a-coffee)](https://buymeacoffee.com/liftoff_handheld_launcher)

---

## Stack

- [Tauri 2](https://tauri.app/) — Rust backend, WebView frontend
- [React](https://react.dev/) — UI
- [SteamGridDB](https://www.steamgriddb.com/) — game cover art
