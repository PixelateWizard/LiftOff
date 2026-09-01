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
- Use Windows-native dispatch appropriate to the target: registered protocol handlers and `.lnk` files need `ShellExecuteW`; direct executables use `Command`; Steam uses its established silent-client plus URI path.
- Preserve `CREATE_NO_WINDOW` on child commands that would otherwise flash consoles.
- Indirect apps and browser Cloud launches cannot always expose a distinct child/window; keep their bounded fast-success behavior separate from direct game window detection.
- Running-state, Resume, Close, and return-to-LiftOff behavior depend on process/window/AUMID evidence, not title text alone.
- FSE and foreground changes require hands-on validation. Do not replace the live no-hide GPU suspend/resume path with legacy hide/show fallback code without device evidence.
- The no-hide game handoff pairs WebView2 inactivity with its Low memory-usage target and restores the Normal target before every visible resume. Keep the memory and visibility transitions ordered and preserve the best-effort fallback for WebView2 runtimes older than the v19 interface.

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
