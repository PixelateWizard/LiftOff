# LiftOff — Alpha 5 Release Notes

A big update focused on Steam, cloud gaming, Spotify, and a much richer game details experience.

## New Features

### Games & libraries

- **Sign in to Steam and see your whole library.** Connect your Steam account by scanning a QR code with the Steam mobile app. Games you own but haven't installed now show up in your library too, complete with playtime and last-played info.
- **Install, verify, and uninstall Steam games from LiftOff.** From a game's details, you can install something you own but haven't downloaded, watch its install progress, verify its files, or uninstall it. (The Steam client handles the actual download.)
- **Download size estimates.** For Steam games you haven't installed yet, LiftOff shows roughly how big the download will be before you start.
- **Cloud gaming.** Add cloud-streamed games from a searchable picker. They open in a clean fullscreen browser window and get their own "Cloud" tab. The available games list refreshes itself automatically.
- **GOG and Epic Games support.** Installed GOG and Epic games now appear in their own tabs, each with an on/off toggle in Library settings.
- **A Games filter and sort toolbar.** The Games tab now has a toolbar to filter by All / Installed / Not installed, show how many games are listed, and sort by Recent, A–Z, or Store. Flick the right stick to reach it.
- **Choose whether to show games you haven't installed.** A new setting controls whether owned-but-not-installed Steam games appear in the Games tab.
- **Background artwork for uninstalled games.** Cover and hero art now load quietly in the background for games you own but haven't installed yet.
- **Store badges on covers.** A small, optional Steam / Xbox / Battle.net / GOG / Epic badge can appear in the corner of each game cover. On by default; can be turned off in Appearance settings.
- **Move titles between Games and Apps.** Some games get detected as apps (and vice versa). Right-click any card to move it to the correct tab — the choice is remembered every time your library is rescanned, and you can reset it at any time.

### Game details

- **A full Game Details screen.** Selecting a game now opens a dedicated details view with large artwork, a store badge, last-played and size-on-disk info, a big Play button, and all the per-game actions (pin, hide, rename, change artwork, add to collections, and more). It opens as a clean showcase, and pressing down reveals the full set of controls.
- **Steam store info inside details.** When available, Game Details can show the game's store description plus a row of trailers and screenshots. A Details / Manage tab strip lets you switch between store info and actions, and any trailer or screenshot can be opened fullscreen.

### Music

- **Spotify integration.** Connect your Spotify account to control playback right from LiftOff: a now-playing bar, a full-screen player with your playlists, transport controls, and the ability to choose which device plays (your handheld, desktop, etc.). On a controller, just hold the MENU button on any tab to open it.

### Look, feel, and feedback

- **Controller vibration.** Gamepad rumble feedback for launches, menu navigation, startup, and confirmations. On by default, and can be turned off in settings. Controllers without rumble simply ignore it.
- **The Cyberpunk theme is back.** Fully redesigned as a neon "HUD" look, with a gentle falling ASCII rain background and angular, corner-cut panels.
- **Four new accent colors:** Atomic (a warm golden-yellow), Aqua, Sage, and Copper.
- **New space-themed hero backgrounds** for every accent color, used as a clean fallback when a game has no hero art of its own.
- **Smoother motion and theme-aware sounds.** Tabs, modals, and menus now animate more cohesively (with a UI Motion on/off toggle if you prefer it instant), and UI sounds are subtly tuned to match each theme.
- **Running-app controls.** LiftOff now keeps track of what you've launched this session: it shows "Running" badges, the home hero button changes to "Resume," selecting a game that's already running brings it to the front instead of launching a second copy, and you can Close or Force-close a game from LiftOff.
- **Lower GPU strain on handhelds.** To help prevent graphics-driver crashes on shared-GPU devices like the ROG Ally, LiftOff briefly hides its own window the moment you launch a game, freeing up graphics memory for the game. On by default.

## Improvements

- **Home layouts renamed, with a new default.** The old "Normal" home is now "Legacy," the semi-immersive layout is now "Normal" (and the default for new setups), and "Immersive" is unchanged.
- **Selecting a game opens its details first.** Across every home layout and the Games tab, choosing a game opens its Details screen instead of launching immediately. Apps still launch right away.
- **The Games "All" tab is now sorted A–Z across every store** in one combined list, instead of grouping Steam, Xbox, Battle.net, and others into separate blocks.
- **Background animations pause when LiftOff isn't focused,** so it isn't drawing effects no one is watching. Everything resumes the moment you return.
- **Redesigned "Normal" (semi-immersive) home** with a full-screen background that follows whatever game or app you're focused on.
- **The Immersive home drawer now floats over your background** instead of sitting behind a solid panel, and the hero fades out smoothly as you scroll down.
- **More readable nav bars over bright artwork.** Translucent top and bottom bars are a little denser so game art no longer washes them out.
- **Nav and bottom bars float over your content** when their backgrounds are enabled, letting content scroll smoothly behind them.
- **Reorganized Appearance settings** into clear categories: Style, Home Screen, Layout, and Navigation.
- **Surface-style polish,** including a softer frosted "Glass" look and more consistent, readable active-tab highlights across Glass, Clear, and Obsidian.
- **Updated launch and UI sound cues.**
- **Removed the experimental Framed Content setting,** returning Games, Apps, and Settings to their normal full-screen layout.

## Bug Fixes

- **Fixed a false "couldn't confirm launch" message for Steam games.** Launches now lock onto the actual game window instead of Steam's own startup popup, and games that jump straight to fullscreen now dismiss the launch screen cleanly instead of showing an error.
- **Fixed cards and settings rows overlapping the top bar** when navigating upward with a controller.
- **Smoother grid scrolling** on the Games and Apps tabs when holding the stick.
- **Large libraries scroll with less stutter.**
- **Removed duplicate Xbox / Game Pass shortcut cards** that could appear alongside the real library entry.
- **Settings now scrolls fully to the top** when you navigate up to the first row.
- **The top nav header no longer renders wider on Home** than on the other tabs.
