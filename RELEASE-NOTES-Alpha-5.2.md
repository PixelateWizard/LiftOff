# LiftOff - Alpha 5.2 Release Notes

Alpha 5.2 focuses on Xbox/Game Pass library support, smoother Steam handoffs, and startup polish.

## New Features

### Xbox and Game Pass

- **Connect your Microsoft account.** LiftOff can import Xbox/Game Pass title history after browser sign-in, store the refresh token in Windows Credential Manager, and show connected account status in Library settings.
- **See Xbox and Game Pass titles in your library.** Imported titles can appear alongside your other Games entries, including not-installed entries that use the same dimmed treatment as owned Steam games.
- **Xbox store details.** Game Details can show Microsoft Store descriptions, screenshots, and trailers for supported Xbox/Game Pass titles.
- **Install Game Pass titles from LiftOff.** Not-installed Xbox/Game Pass entries with a Store product ID can start installs through Windows Store install services, show progress in the Details flow, support cancel, and refresh the library when complete.
- **Get in Store fallback.** Titles that cannot be installed silently still open their Microsoft Store or Xbox app page from Details.

### Startup and Library Scanning

- **More responsive first startup.** Library scans now run off the WebView path, so cold Start Menu/Desktop/icon scans are less likely to make the app feel frozen.
- **Icon caching.** LiftOff remembers scan-time icons by file path, modified time, and size, reducing repeated work after the first scan.
- **Better splash feedback.** The splash screen can now show which library phase is being checked, such as Desktop shortcuts, Steam, Game Pass, or other launchers.

## Improvements

- **Steam stays quiet.** Steam launches, installs, uninstalls, and verifies now start Steam in silent tray mode when needed before dispatching the Steam action, avoiding a full Steam window over LiftOff.
- **Steam internal-bridge research preserved.** The direct Steam client bridge experiments are documented for future work, while the production app keeps the stable URI-based Steam path.
- **Cleaner startup window reveal.** LiftOff now waits until the splash screen is mounted before showing the main window, so tapping or clicking immediately after launch should no longer trigger a temporary Windows "Not Responding" state.
- **Scroll endings feel tighter.** Mouse and touch scrolling on Games, Apps, and Settings now stops near the last content row instead of drifting into a large blank area.
- **Immersive Home works better with a mouse.** The mouse wheel now opens and scrolls the rows page in Immersive Home instead of moving the background layer.

## Bug Fixes

- **No surprise Steam Library window** when launching a Steam game or starting Steam maintenance actions from LiftOff.
- **No temporary startup "Not Responding" window** when the app is clicked or tapped before the splash is ready.
- **No oversized blank tail** at the bottom of Home, Games, Apps, and Settings when scrolling with mouse or touch.
- **Immersive Home rows stay reachable** when browsing with a mouse wheel.
