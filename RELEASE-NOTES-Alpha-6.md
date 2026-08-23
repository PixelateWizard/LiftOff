# LiftOff - Alpha 6 Release Notes

Alpha 6 makes LiftOff easier to control from the couch, expands game discovery and library management, and improves the return to LiftOff after a game closes.

## Highlights

### A More Capable Helper Bar

- Choose a Full, Minimal, or Hidden bottom bar.
- Press MENU from any mode to open a controller-friendly helper tray with quick access to Settings, Power, library refresh, controls, volume, brightness, and Spotify.
- Volume, brightness, and seek controls now require A before Left/Right changes their value, so moving around the tray does not cause accidental adjustments.
- Hidden mode can still peek from the bottom edge with a mouse and, optionally, when the track changes.

### Browse and Add Cloud Games

- Browse the Cloud catalog in a wide cover-art grid or compact list.
- Search with a physical keyboard or the on-screen keyboard, switch views with LB/RB, and see useful offline artwork when catalog images are unavailable.
- Open a Store preview with descriptions, screenshots, and playable media before adding a game.
- Remove an existing Cloud entry from the same preview.

### Better Library and Store Tools

- Steam game Details can now show Steam Deck compatibility and controller-support ratings.
- The SteamGridDB art picker now lets you choose the correct game match before browsing its covers or heroes.
- Settings > Data now shows fixed and removable drive capacity, usage, and the default Windows app-install drive.
- Microsoft Store installs can warn about a confirmed space shortfall before starting, while still allowing the install when size information is unavailable.
- Installed Microsoft Store and Game Pass package games can now be uninstalled from Details with confirmation.
- Installed Steam and Microsoft package games retain more accurate last-played history.

### Power and Update Controls

- The Home power menu now includes confirmed Restart PC and Shut Down PC actions, separated from LiftOff's own power-menu actions.
- Optional automatic update checks can watch the Stable or Alpha / Beta channel and wait for an idle, modal-free moment before prompting.
- You can defer an update for the session or skip a specific version.
- A new Sound Effects setting mutes LiftOff's interface and launch sounds without muting lo-fi music or haptics.

## Improvements

- LiftOff now asks WebView2 to use a lower memory target while a game is in the foreground and restores its normal target on return.
- Games and Apps navigation now chooses the first card that is actually visible after switching tabs, sources, or collections.
- The default Home layout keeps pinned items at the top, gives the final pinned item proper right-edge clearance, and keeps the selected hero stable while you browse the pinned shelf.
- Uninstall actions respond on the first activation: Microsoft package games open LiftOff's confirmation, while Steam hands the request directly to Steam.
- Frontend controller-input tests and a mocked browser smoke test now cover key navigation behavior for contributors.

## Fixes

- Strengthened the return from games in fullscreen-exclusive scenarios, including recovery for a visible-but-blank WebView2 surface after a game exits.
- Fixed focus landing on hidden pinned sections instead of the visible game or app grid.
- Fixed Microsoft package uninstall confirmation appearing behind Details or requiring a second press.
- Fixed installed games losing playtime or last-played metadata during library merging.
- Fixed the default Home pinned shelf offering a Bottom placement that it could not display correctly.
- Fixed pinned-item focus unexpectedly changing the default Home hero artwork.

## Alpha Notes

- Alpha 6 includes English strings that still need French translations for several new features.
- Native WebView2 behavior, fullscreen-exclusive return, physical-controller feel, real accounts, Store operations, and device power actions depend on the Windows device and connected services.
