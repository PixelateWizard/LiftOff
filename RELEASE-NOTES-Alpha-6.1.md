# LiftOff - Alpha 6.1 Release Notes

Alpha 6.1 is a fix release focused on launching games and getting back to LiftOff afterward. If Steam launches felt like a guessing game, or the screen went black when you closed a title, this is the update for you. It also adds one small convenience to the helper tray and fills in the missing French translations.

## Launching Games

- **Steam launches tell you the truth.** LiftOff used to celebrate as soon as it handed your game to Steam, even if nothing actually started. Now it watches for your game's window for up to 90 seconds and only reports success once the game is really there. If it never shows up, you get a clear "couldn't confirm" message instead of a false success.
- **You can see what Steam is doing.** The launch overlay now tells you which stage you're waiting on - contacting Steam, syncing cloud saves, downloading an update, waiting on Steam itself, starting the process, or opening the game window - instead of showing one silent spinner.
- **Fullscreen handoff waits for the game.** LiftOff no longer hands the screen over the moment Steam pops up. It waits until it finds the actual game window, and prefers that window over an unrelated fullscreen Steam client window.
- **Cleaner launch requests.** Games are dispatched with a single request rather than starting Steam separately and guessing when it was ready, and starting a new game properly cancels the previous launch watch.

## Returning From a Game

- **Faster return when you close a game.** LiftOff now brings its display back the moment your game's window disappears, instead of holding a black screen through a waiting period. It also checks for game exit more often, and if rendering doesn't come back on its own, it now kicks it back to life.
- **Fewer black screens after exiting fullscreen.** Recovery now restores the full window size directly instead of briefly shrinking it, and only escalates to stronger fixes after actually sampling a black screen twice. If it still doesn't recover, hold your configured return shortcut for about 1.5 seconds within 20 seconds of closing a game to request a manual reload. Automatic reloads can be turned off in settings.
- **No more black flash while the window paints.** The app window now matches your theme colour, so any unpainted moment shows your app background instead of black.
- **Cold-boot fullscreen fixed.** On startup, LiftOff no longer mistakes another app's window for its own. Game exits and app switching now recover the correct window, and startup screen calibration retries if focus is briefly lost.

## Library and Details

- **New Steam games show up right away.** Refreshing your library now waits for your Steam account's owned-games list to finish updating before rescanning, so a game you just bought appears without signing out or restarting LiftOff. If the online refresh fails, the local scan still runs.
- **Long Details pages scroll properly on a controller.** Scrolling down a long About or Media tab now reaches the very bottom and back to the top before returning to Play, and keeps your place in the media row instead of jumping from the first item to the last screenshot.
- **Readable section labels.** About and Media headings now use a proper high-contrast colour, so they stay legible in both light and dark themes.

## Navigation and Appearance

- **Controller focus stays where you put it.** Scrolling Home with a controller no longer lets cards sliding under a resting mouse pointer steal your selection - which is what made the Home row jump backwards after returning from a game. Theme and surface pickers now keep Left/Right inside the visible row and move Up/Down by column, and they also ignore a stationary mouse pointer.
- **Glass and Aero look right immediately.** Translucent modals and tabs now render with their intended blur on the very first frame instead of visibly settling into place a moment after they appear.

## Also New

- **Pinned shortcuts in the helper tray.** The MENU helper tray now shows a controller-navigable row of your pinned games and apps with their cover art or icons. Games open Details as usual; apps launch directly.
- **French translations filled in.** The French UI copy that was still missing - helper bar, power controls, Steam Deck compatibility, SteamGridDB and Cloud browsers, account and install flows, storage, and library labels - has been drafted and is now in the app, pending a native-speaker proofread.

## Known Gaps

- The new Steam launch progress messages and the revised "couldn't confirm" message are still English-only.
- The French copy added in this release has not yet been proofread by a native speaker.
