# Library and Launching

## Purpose

Capture durable rules for scanning, categorization, launching, running-state tracking, and native window handoff.

## Read When

Read for scanner/source changes, library refresh, install state, launch routing, close/resume behavior, Windows foreground work, or fullscreen experience work.

## Durable Constraints

- Startup performs one authoritative all-apps scan; frontend hidden filtering must not trigger a second equivalent scan.
- A user-requested library refresh waits for the connected Steam owned-library cache write before starting its authoritative local rescan, so newly acquired uninstalled games are part of the same result. If the remote refresh fails, still complete the local rescan.
- Supported source families currently include Steam, Microsoft Store/Xbox/UWP, Desktop shortcuts, Battle.net, GOG, Epic, Cloud bookmarks, custom sources, and collections. Search current scanners before extending source logic.
- Categorization overrides may change `app_type` and `source`, but must not mutate identity or launch paths.
- Installed entries must be enriched with matching launcher-owned play metadata before owned-library duplicates are skipped. Keep complete local per-game launch history for Details, independently of bounded Home recents/carousels.
- Use Windows-native dispatch appropriate to the target: registered protocol handlers and `.lnk` files need `ShellExecuteW`; direct executables use `Command`; Steam games send one URI request through the existing Explorer dispatch path. Do not separately start Steam and infer readiness from process presence. Install/verify/uninstall retain their silent-client helper.
- Steam game launch success requires a matching window; dispatch alone and the 90-second confirmation timeout are not success. Timeout emits `launch-unconfirmed`, and the overlay withholds success sound/haptics if verification fails. Success/unconfirmed events carry the launch path; a new launch invalidates the previous confirmation watcher.
- Steam launch progress reads only log bytes appended after dispatch and filters cloud, content-update, and game-process lines by the target AppID. `launch-phase` carries both launch path and phase so stale or concurrent events cannot change another overlay. Keep fallback states honest when logs are absent: starting/contacting/waiting for Steam, never an inferred cloud sync or update.
- Start the Steam GPU-release watch only after matching the game window, and honor a preferred game HWND over an unrelated fullscreen foreground window. Preserve non-Steam initial acquisition and the existing confirmed-game exit recovery.
- Preserve `CREATE_NO_WINDOW` on child commands that would otherwise flash consoles.
- Indirect apps and browser Cloud launches cannot always expose a distinct child/window; keep their bounded fast-success behavior separate from direct game window detection.
- Running-state, Resume, Close, and return-to-LiftOff behavior depend on process/window/AUMID evidence, not title text alone.
- FSE and foreground changes require hands-on validation. Do not replace the live no-hide GPU suspend/resume path with legacy hide/show fallback code without device evidence.
- The no-hide game handoff pairs WebView2 inactivity with its Low memory-usage target and restores the Normal target before every visible resume. Keep the memory and visibility transitions ordered and preserve the best-effort fallback for WebView2 runtimes older than the v19 interface.

## FSE Presentation Recovery

- LiftOff window identity comes only from the managed Tauri main window. Never overwrite it from GetForegroundWindow during startup: cold FSE boot can have a shell HWND in foreground, which breaks both exit recovery and app-switcher resume. Recovery entry points validate the managed HWND and its owning PID; diagnostic lines include the LiftOff PID, startup managed/foreground handles, and foreground-return snapshots.
- Composition nudges use WebView2 controller SetBounds shrink/restore with an acknowledged first update and NotifyParentWindowPositionChanged; never briefly shrink the host HWND. Full-monitor host geometry correction is separate and runs around exit raising and each recovery stage.
- Controller IsVisible and frontend rAF are diagnostics, not proof of displayed pixels. The 6x6 screen-DC sample is a heuristic whose FSE behavior requires hardware validation. After set_gamepad_ready (which follows splash exit), retry calibration for up to 15 seconds while the managed main window owns foreground. Keep the first valid baseline; abandon a pending startup sample when a new game watch begins, so a dead post-game surface cannot become the baseline. Disable escalation for an unavailable or overly dark baseline, and require two valid near-black samples while LiftOff owns foreground. Missing pixels must not count as a dead screen.
- Preserve stage order: initial presentation reset/geometry/raise/controller nudge, controller visibility cycle, host visibility cycle, then hard page reload. Automatic reload honors persisted fse_hard_reload_recovery (default true; intentionally no UI). The frontend watchdog marshals all blocking recovery work to a worker thread.
- Recovery workers are serialized; new game watches invalidate old recovery generations. The 20-second post-exit XInput watch requests a manual reload after a 1.5-second configured shortcut hold, regardless of the automatic setting. Native shortcut availability under FSE remains an explicit gate.
- A best-effort sessionStorage flag skips recovery splash exit delay and startup sound/haptics while preserving the normal library load/error path and gamepad-ready signal. It cannot guarantee total boot latency or execution in a stalled renderer.
- %LOCALAPPDATA%/LiftOff/logs/fse.log records calibration, stage probes, window/monitor rects, iconic/visible/DWM-cloaked state, child/controller visibility, and foreground HWND. Writes are serialized and restart the log before it exceeds 512 KB; no window titles or credentials are logged.

## Current Source Anchors

- `src-tauri/src/lib.rs`: scanners, library assembly, launch routing, process/window tracking, install/uninstall commands.
- `src-tauri/src/fse_watcher.rs`: WebView2 visibility, FSE handoff, restore, and foreground coordination.
- `src/hooks/useLibraryData.ts`: frontend library state and refresh.
- `src/hooks/useLaunchApp.ts`, `useRunningApps.ts`, `useFseSession.ts`, `useAppFocusPause.ts`: launch and lifecycle ownership.
- `src/views/LibraryViewContent.tsx`, `GamesView.tsx`, `AppsView.tsx`: rendered filtering and ordering.
- `src/components/launch/`: splash and launch overlay behavior.

## Common Failure Modes

- Using `cmd /C start` for `.lnk` or arbitrary protocol URLs and losing arguments or misparsing the URI.
- Marking a partial Steam manifest as installed without checking state, size, and install directory evidence.
- Blocking the Tauri/WebView command path with filesystem, registry, network, or process enumeration work.
- Treating launcher windows as the launched game window.
- Claiming FSE recovery from compilation or desktop tests without visible foreground/controller validation.

## Validation

- Run `cargo check`, `npm run build`, targeted Rust tests, and `git diff --check` for launch/scanner changes.
- Test direct executable, shortcut, URI, already-running, failure, and close/force-close paths affected by the change.
- On Ally/FSE changes, verify visible foreground ownership, controller input ownership, launch return, and GPU suspend/resume behavior.
- Review [Known issues](known-issues.md) before defining an FSE acceptance path.
