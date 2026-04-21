# LiftOff

A Windows game and app launcher built for gamepad-first navigation. Designed for HTPC / couch setups — pick up a controller and go.

[![Discord](https://img.shields.io/badge/Discord-join%20the%20community-5865F2?style=flat&logo=discord&logoColor=white)](https://discord.gg/F5ncP75WtD)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support%20development-orange?style=flat&logo=buy-me-a-coffee)](https://buymeacoffee.com/liftoff_handheld_launcher)

---

## Features

- **Gamepad-native** — full navigation with hold-repeat, no mouse required
- **Automatic library scanning** — Steam games, Xbox/Game Pass titles, UWP Store apps, and Desktop shortcuts
- **Live library refresh** — rescan without restarting; auto-refreshes when scan settings change
- **Game art** — cover art fetched automatically from SteamGridDB; replace per-game with your own image
- **Custom cover art** — press Select/Back on any game to set a custom cover image, with a reset-to-default option
- **Pinned apps** — pin your most-used games and apps to the top of any tab
- **Manage visibility** — hide apps from view and restore them anytime from the same menu
- **Search** — on-screen virtual keyboard for controller-only searching
- **Themes** — dark, light, and system-follow modes with 5 accent colors
- **Recent apps** — quick access to what you launched last
- **Battery indicator** — shows charge level and charging status
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
| **Select / Back** | Replace cover art (Games tab, focused game) |
| **LB / RB** | Switch tabs |
| **LT / RT** | Switch game source filter (All / Steam / Xbox / Other) |
| **D-pad / Left stick** | Navigate |
| **Menu (Start)** | Open Manage on Games or Apps tab |

---

## Tabs

**Home** — hero spotlight, recent apps, pinned apps

**Games** — all detected games with cover art, filterable by source (Steam / Xbox / Other)

**Apps** — all detected non-game apps and shortcuts

**Settings** — accent color, theme, library scan toggles, startup behavior, repeat speed, controller test, update check, Discord, and more

---

## Settings

| Setting | Description |
|---------|-------------|
| Accent Color | Ember, Ocean, Neon, Rose, Midnight |
| Theme | Dark / Light / System |
| Scan Steam | Include Steam games (supports custom install paths) |
| Scan Xbox | Include Xbox / Game Pass titles |
| Scan Store Apps | Include UWP / Microsoft Store apps |
| Scan Desktop Shortcuts | Include `.lnk` shortcuts from Desktop and Start Menu |
| Refresh Library | Rescan all sources immediately |
| Default Tab | Which tab opens on launch |
| Stick Repeat Speed | How fast held directions repeat (Slow / Normal / Fast) |
| Launch at Startup | Start LiftOff with Windows |
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
| `art_cache.json` | Cached SteamGridDB art URLs |
| `custom_art.json` | Per-game custom cover art (data URLs) |

---

## Planned Features

- Game videos in the hero spotlight
- Ability to rearrange pinned items
- In-app browser
- More customization options
- System settings controls (brightness, volume, Wi-Fi, Bluetooth)
- Additional game library support (GOG, Battle.net, Epic Games, etc.)

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
