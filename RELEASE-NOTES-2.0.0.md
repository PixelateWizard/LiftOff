# LiftOff 2.0.0 Release Notes

LiftOff 2.0 is the first official release since **v1.2.2** in April. If you have been on the stable channel, almost everything below is new. If you have been on the alphas, skip to the Discord post for testers — this document is written for people coming from 1.2.2.

LiftOff is still a free, open-source, controller-first launcher for Windows handhelds. 2.0 is the version that turns it into a full library: sign in, install, listen, and set the look from the couch.

---

## Highlights

- **Sign in to Steam** with a QR code and see every game you own, not just the ones already installed.
- **Install Game Pass titles from LiftOff**, with progress in Game Details and a free-space check before you commit.
- **Add cloud games** from a catalog and launch them full screen next to your installed library.
- **Game Details** — art, description, screenshots, trailers, last played, size, and Play / Install / Manage in one place.
- **Spotify** — playlists, transport, and a now-playing bar, driven with the controller.
- **Twelve themes, twelve accents, seven surface styles**, including Lo-fi scenes and a redesigned Cyberpunk HUD.
- **Controller-first setup** on a fresh install, plus English, French, and Spanish.
- **A helper tray** for Settings, power, volume, brightness, pins, and music, from any screen.

---

## Coming from 1.2.2? A few habits changed

These are the muscle-memory shifts most people notice first:

- **Selecting a game opens Game Details.** Play is the big button inside that screen. Apps now open an App Details screen first, then Open. On Home you can still turn on “Launch games directly” in Settings if you want the old one-press launch.
- **MENU opens the helper tray** (Settings, power, refresh, volume, brightness, pins, Spotify). Per-game actions — pin, hide, art, collections, rename — live in Details.
- **Pins no longer sit on Home.** They stay on Games and Apps, and in the helper tray, so Home can stay a hero and recents surface.
- **The default Home layout is Normal** — a full-bleed hero that follows whatever you are focused on, with recents and collections underneath. Immersive and the old 1.2-style layout (now called Legacy) are still there.
- **The default bottom bar is Smart**, a compact pill. Full and Hidden are still options.
- **Existing installs skip first-run setup.** Your library and settings come along. You can run setup again from Settings if you want the walkthrough.

---

## Library

**Steam.** Scan a QR code with the Steam mobile app to connect. Owned-but-not-installed games appear in Games (you can hide them). From Details you can install, watch progress, verify files, or uninstall — the Steam client still does the actual download. LiftOff estimates download size from Steam’s local cache when it can. New purchases show up after a library refresh without signing out.

**Game Pass / Microsoft Store.** Connect a Microsoft account in Settings to import title history. Not-installed games use the same dimmed treatment as uninstalled Steam games. Titles with a Store product ID can start installing from Details, with progress and cancel. LiftOff can warn when the target drive does not have enough space. Installed package games can be uninstalled from Details.

**GOG, Epic, and Battle.net.** Installed GOG and Epic games get their own source tabs. Battle.net scanning is the same as in 1.2. Steam, Game Pass, GOG, Epic, and Battle.net covers can show a small optional store badge.

**Cloud.** Add Cloud Game from the Games library actions, browse a cover-art catalog (grid or list), preview a description and media, then add it. Cloud titles launch in a fullscreen kiosk window when the browser allows it.

**Games tab tools.** Filter All / Installed / Not installed, see the count, and sort by Recent, A–Z, or Store. Right stick focuses that toolbar. The All tab is one A–Z list across every store, not separate blocks per source.

**Put titles in the right place.** Some Game Pass games still look like ordinary apps to Windows. Any card can be moved between Games and Apps; the choice is remembered on every rescan.

**Storage.** Settings → Data lists fixed and removable drives with used and free space, plus the default Windows install drive.

---

## Game Details (and apps)

Selecting a game opens a showcase: hero art, cover, last played, size on disk, and Play. Press down (or the indicator) for the full action grid — pin, hide, artwork, collections, rename, recategorize, and more.

When store info is available:

- Steam games can show the short description, screenshots, trailers, Steam Deck compatibility, and controller-support rating.
- Game Pass titles can show Microsoft Store descriptions, screenshots, and trailers.

Trailers and screenshots open fullscreen; B backs out one step to Details.

**Running games.** LiftOff tracks what you launched this session. Cards show Running, the Home button becomes Resume, picking an already-running game brings it forward instead of starting a second copy, and Details can Close or Force close.

**Apps** get a similar Details screen from Home, Apps, search, or a helper-tray pin: name, size, location, and the same manage actions as the old mouse menu, then Open / Resume.

The art picker can search SteamGridDB for the *right* game match before browsing covers or heroes, and it shows source image size (including a 4K marker). You can still upload and crop your own.

---

## Music, helper tray, and power

**Spotify.** Connect in Settings (you supply a Spotify Client ID). Home has a now-playing bar and a full overlay for playlists, transport, seek, shuffle/repeat, and picking a Spotify Connect device. Hold MENU on any tab, or open it from the helper tray. Stop pauses playback and clears the leftover mini-bar. Starting Spotify pauses Lo-fi music without changing the Lo-fi setting, so the looping track can come back when Spotify stops.

**Helper bar.** Choose Smart, Full, or Hidden. MENU (or the chevron) opens a controller-only tray: Settings, Power, library refresh, and Controls first; volume and brightness next; pinned games/apps; then Spotify. Volume, brightness, and seek need A before Left/Right change the value, so browsing the tray does not nudge them by accident. Hidden mode can still peek from the bottom edge with a mouse, and optionally when the track changes.

**Power.** From Home, B (or Power in the tray) opens Restart LiftOff and Exit LiftOff, plus confirmed Restart PC and Shut Down PC.

---

## Looks

**Themes.** Twelve animated environments: Space, Sky, Plasma, Cinder, Wash, Aurora, Synthwave, Cyberpunk, Lo-fi, Forest, Webcore, and Onyx. Synthwave now warps toward the sun with a perspective grid and star streaks. Lo-fi has six looping scenes (Cozy Study, Sleepy Pup, Late-Night Desk, Stargazing Cat, Rainy Street, Pixel Shop) and optional background music.

**Accents.** Twelve palettes, including Atomic, Aqua, Sage, and Copper alongside the original Ember / Ocean / Neon / Rose / Midnight set.

**Surfaces.** Glass, Aero, Material, Clear, Obsidian, Neon, and Win9X. Each theme picks a default surface; you can override it. Appearance is split into Style, Home Screen, Layout, and Navigation.

**Home.** Normal (default), Immersive, and Legacy. You can hide game hero banners on Normal and Immersive so the theme shows through; Legacy always keeps hero art. Collections, recents, cover scale, wide layout, tab icons, and bar backgrounds are all tunable. First-run setup walks through the same Home and bar choices with pictures.

**Motion, sound, haptics.** Tabs, modals, and menus share one motion language, with a UI Motion toggle if you want it instant. Navigation sounds are tuned per theme. A Sound Effects toggle mutes UI and launch cues without touching Lo-fi music or rumble. Controller vibration ticks on tab changes, confirms, and launches (off in Settings if you do not want it).

Background animations pause when LiftOff is not focused, so the GPU is not drawing a launcher nobody is looking at.

---

## Handheld launching

2.0 is built around Windows handhelds (tested on a ROG Ally X) and Full Screen Experience:

- Launching a game eases GPU pressure by suspending LiftOff’s own rendering while the game is in front, then bringing LiftOff back when you return. This is on by default.
- While a game is foreground, LiftOff asks WebView2 to use a lower memory target, then restores normal memory use on return.
- Steam launches stay in Steam’s tray when possible, instead of popping a full Steam window over LiftOff.
- The launch overlay names the wait — contacting Steam, cloud sync, updates, starting the process, waiting for the window — and only calls it a success when the game window actually appears. If it never does, you get an honest “could not confirm” instead of a fake win.
- Closing a game brings LiftOff back sooner.

Startup scans run in the background with splash text for each phase, and artwork keeps loading after you land on Home. The Smart bar reports leftover scan and art progress so that work is visible without a blocking overlay.

---

## Setup, language, and updates

**First-run setup.** A fresh install walks through language, theme, accent, surface, Home style, bar/tab look, library sources, optional Steam / Microsoft / Spotify connections, and a few launch/controller essentials. Choices preview live. You can skip, go back, or re-run setup from Settings. Factory reset (Settings → Data) wipes local data and signed-in accounts, then restarts into setup.

**Languages.** English, French, and Spanish, plus Auto from the OS language. French and Spanish copy is complete in the app; native-speaker polish is still welcome.

**Updates.** Settings can check Stable or Alpha / Beta. Automatic checks (on by default) wait until LiftOff is focused, idle, and not in a modal, then offer Download, Later, or Skip this version. Manual check is still there.

**Controller tools.** Settings → Controller has Controller Buttons (glyph preview) and Controller Test as focusable rows that open isolated screens, so you can reach both without a mouse. Glyphs follow Xbox-, PlayStation-, or Switch-style layouts, with auto-detect.

---

## Also improved since 1.2.2

- Games and Apps controller scrolling is smoother on single taps and stays snappy when you hold a direction.
- Large libraries scroll with less stutter.
- Failed covers fall back to accent placeholders instead of a broken-image icon.
- Duplicate Game Pass / shortcut cards are cleaned up when the real library entry exists.
- Focused cards and settings rows stay out from under the top bar.
- The splash screen shows before the window accepts clicks, so an early tap is less likely to freeze Windows on “Not Responding.”
- Rename works for every game and app, not only custom entries. You can add manual games/apps and custom scan folders.
- Clock, date, battery, time format, and a much deeper layout/navigation settings set are in Appearance.
- A Power menu, update channel, and sound-effects toggle sit alongside the 1.2 Settings you already knew.

---

## Notes

- Windows SmartScreen may warn because the installer is not code-signed. **More info → Run anyway** is expected.
- Steam installs, Game Pass installs, Spotify playback, cloud kiosk windows, and PC restart/shutdown depend on those apps and services being available on the device.

Thanks to everyone who tested the alphas, and to [moi952](https://github.com/moi952) for localization, layout, settings, the SteamGridDB browser, custom entries, and a large share of the controller-facing UI.
