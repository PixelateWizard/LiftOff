# Known Issues and Validation Gates

## Purpose

Keep unresolved bugs, invalid test assumptions, deferred mechanisms, and measurement baselines out of the bootstrap and release history while making them routable.

## Read When

Read before bug triage, FSE/controller work, Microsoft Store uninstall changes, performance/memory investigation, TypeScript cleanup, or when defining acceptance criteria.

## Durable Constraints

- Do not mark a hardware-dependent path complete from code checks alone.
- Preserve exact error strings, affected paths, rejected mechanisms, and evidence thresholds for deferred work.
- Re-check source and current runtime state before assuming an older issue still reproduces.

## Current Source Anchors

- `src-tauri/src/fse_watcher.rs`, launch/window helpers in `lib.rs`, and `src/hooks/useFseSession.ts` for FSE behavior.
- Xbox package removal in `src-tauri/src/lib.rs`, uninstall state/event wiring in `src/App.jsx`, and actions in `GameDetailsModal.tsx`.
- Install-card animation in `src/App.jsx` and Details progress rendering in `GameDetailsModal.tsx`.
- Gamepad filename/import casing under `src/components/ui/` and its importers.

## Open Gates and Warnings

### Helper bar native controls and controller surfaces

Compilation, unit tests, and mocked-browser smoke coverage establish the command contracts, settings migration, tray composition, and app-poll gating, but Ally/WebView2 validation remains required. Confirm on the ROG Ally that Core Audio reads and changes the active render endpoint without flyout spam; raising volume unmutes; WMI brightness appears, changes the internal panel on AC and battery, and stays hidden on external-monitor-only systems; Full/Minimal/Hidden layouts paint correctly at 1280x800 across representative Glass/Material/win9x surfaces; the shortcut/system-control/Spotify priority order remains legible, sufficiently opaque over bright game art, and stable as focus moves; hidden hover and track-change peeks time out correctly; Spotify transport/seek and playlist entry points behave for Premium, Free, disconnected, and no-track states; single-press MENU tray access in every bar mode, A-gated scrubber/system-control adjustment, adjacent-control navigation, D-pad repeat, B close, Controls LB/RB, and tray-to-Power/modal transitions never leak an activation underneath.

### Power-menu device controls

Frontend and Rust compilation cover the command registration, modal contract, and locale wiring, but the device actions were intentionally not invoked while the development workstation was in use. Before calling the feature device-validated, confirm on an appropriate Windows handheld that Restart PC schedules a reboot, Shut Down PC powers off through the hybrid path or full-shutdown fallback, confirmation paints above the power panel, and canceling with B returns to the four-row menu without closing it or re-firing an action. Do not exercise these destructive commands on an in-use workstation.

### Steam Deck compatibility metadata

Live endpoint checks and automated parsing/UI tests cover Playable, Verified, Unsupported, Unknown, Full, Partial, and None values. The Valve compatibility endpoint is undocumented, ratings can change faster than LiftOff's current 14-day store-metadata cache, and the finished chips still need a Tauri/WebView visual pass across representative light/dark and Material/Glass/win9x surfaces. Team Fortress 2 currently reports Playable rather than the proposal's stale Verified example; use current endpoint data for runtime validation.

### SGDB art picker game browser

Code, browser build, Rust tests, and direct SGDB endpoint checks confirm the two-stage search/id contract, but Ally validation remains required at 1280x800 for Glass, Material, and win9x layout; search/game/grid focus visibility; held horizontal pill repeat and scrolling; GamepadKeyboard close-button bleed suppression; B-depth; hero LT/RT filtering; and saving art selected from a non-default game match. Do not claim those WebView2/controller paths are validated from compilation or direct API responses.

### Cloud game store browser

Seed generation and code checks confirm the bundled HTTPS art catalog, cached/remote art merge, grid/list logic, selected-product metadata request, HLS/native trailer source handling, spatial Add/Remove/Back/Media focus graph, and existing-entry removal routing. Ally validation remains required at 1280x800 for five-column density, unclipped focus, lazy art painting, preview layout and real Store trailer playback, light/dark and Material/Glass/win9x contrast, held D-pad visibility, LB/RB grid switching and media browsing, physical-keyboard search, GamepadKeyboard and preview/media B-depth, modal stacking above Library Actions, strong Add/Remove and Back focus visibility, and real add/remove library reconciliation. Do not claim those WebView2/controller paths are validated from compilation, mocked browser tests, or direct catalog responses.

### Device storage and install pre-check

Desktop/native checks confirm that Windows' default package-volume API resolves to `C:` in the current unpackaged process, the storage snapshot returns plausible drives with exactly one default target, and live catalog/cache checks return the expected Hades size. Ally hardware validation remains required for microSD enumeration and default-target selection, the Settings block across Glass/Material/win9x, and enough/insufficient/unknown confirmation flows with physical controller input. Do not claim those device-visible paths are validated from compilation, unit tests, or desktop runtime checks.

### Microsoft Store game uninstall

Desktop/code checks are complete, but Ally validation remains required before calling the feature device-validated:

1. Uninstall a normal current-user AppX-backed installed game and confirm package removal plus library rescan.
2. Uninstall a GDK/package-family title and confirm every intended current-user package full name is removed without touching unrelated packages.
3. Attempt uninstall while the game is running and confirm a clear Store-specific failure with stable UI recovery.
4. Keep Details open across completion and confirm stale installed/action state reconciles correctly.
5. Confirm one Uninstall activation opens the visible LiftOff confirmation, the opening A press cannot confirm until released, and a second deliberate A starts removal.

Steam uninstall and Steam-only Verify files must remain unchanged. Confirm one Steam Uninstall activation opens Steam's uninstall prompt directly without a LiftOff confirmation.

### FSE acceptance constraint

The native L3+R3 summon shortcut is non-functional under FSE. Do not use it as a recovery acceptance path, and treat older A8 criteria that require physical L3+R3 as void. Validate the live no-hide foreground/GPU suspend-resume path instead.

### FSE blank return regression

The user reported from Ally/FSE testing on 2026-08-21: "when i would exit a game and return to the launcher, a lot of times the launcher still wouldn't \"start\", the screen would show blank and I'd have to force close the app and start it again". The exit watcher now starts a verified WebView2 resume as soon as the game window dies; a failed early resume still receives the presentation reset and native recovery path, while the frontend render-liveness watchdog can force resume and the one-pixel repaint when no frames land. On 2026-08-22, three PEAK/Steam launches on a ROG Xbox Ally X at 1920×1080 returned visible, focused, and produced a live animation frame after the exact game process was terminated; the first two returns also accepted the next launch interaction. This is positive pre-latency-change evidence, so the open hardware gate still requires repeated normal in-game exits for representative Steam and Microsoft package games plus physical-controller input after return on the current build.

### Return latency and translucent-surface settle

Static Rust/frontend checks cover the early game-window-death resume, successor re-suspension contract, faster alive poll, render-liveness fallback, native-background command, modal structure, and Home visibility state. ROG Ally/WebView2 validation at 1280×800 remains required before claiming measured latency or first-frame visual success: compare fresh pre-change and patched builds for Steam, Microsoft package, direct-executable, and launcher-successor exits; verify Running/Resume/Close and physical-controller return; capture whether `force_webview_resume` fires in any blank case; inspect ModalShell, Game Details, FileBrowser, tab motion, and repeated Home/Games/Apps/Settings navigation across Glass, Aero, Material, Clear, Win9X, and Cyberpunk; and confirm inactive Home never paints through translucent non-Home surfaces. Do not restore a blanket compositing hint if motion regresses—scope any measured exception to the specific element.

### Games-card install animation

The indeterminate install bar at the bottom of a Games library card restarts or glitches when gamepad focus moves to another card. This remains deferred unless a task explicitly scopes it in.

### TypeScript path casing

`npx tsc --noEmit` currently encounters TS1261 because the file is `src/components/ui/gamepad.tsx` while several imports/barrel exports use `Gamepad`. Windows runtime resolution hides the mismatch. Fix only as a dedicated case-normalization change that renames the file and every import/export consistently.

### Memory floor and measurement discipline

The August 2026 spikes closed the known WebView2 memory-floor investigation:

- DOM unmount showed a 34 MB delta also reproduced with an empty `div`, consistent with compositor rebuild rather than retained content.
- Plasma blur changes stayed inside approximately ±25 MB run variance.
- Cover-art decode retention converged to the same roughly 257 MB renderer floor after settling.
- `--enable-low-end-device-mode` saved about 20 MB at 120 seconds but forced RGB565-style visible gradient dithering and was rejected.
- The observed application core floor was roughly 585 MB, with about 20 MB of plausible slack.
- The backend now uses `ICoreWebView2_19::SetMemoryUsageTargetLevel`: Low after the game handoff makes WebView2 inactive, and Normal before every visible resume.
- A 2026-08-22 fresh-process comparison on a 16 GB ROG Xbox Ally X at 1920×1080 used the same PEAK/Steam foreground game and WMI process-tree measurement after more than 120 seconds. Baseline commit `6fa1e10` measured 889.9 MB working set / 798.5 MB private; patched commit `76433d2` measured 285.6 MB / 517.9 MB, reductions of 604.3 MB (67.9%) and 280.6 MB (35.1%). Renderer working set fell 351.5→100.7 MB and GPU working set 178.8→14.9 MB, comfortably above the 40 MB acceptance signal.
- After each of three patched game-process exit cycles, WebView2 was visible and focused and delivered a live animation frame; the first two returns accepted the next card/Play interaction. The active process tree later grew back to 488.5 MB working set with renderer/GPU activity, confirming that visible return restored the Normal target. Input was driven through the real Tauri WebView debugging protocol, not a physical controller; normal in-game Exit and Microsoft package games were not covered.

The native memory-target gate is closed for this Ally/Steam scenario. Preserve fresh launches, per-process breakdowns, 120-second settling, and a 40 MB signal for future comparisons; do not reinvestigate rejected frontend candidates without a new mechanism. Replicate on other memory sizes or Microsoft package games before generalizing the exact savings beyond the tested device and game.

## Common Failure Modes

- Copying a void L3+R3 test into a new FSE checklist.
- Calling the Xbox uninstall path validated without all four Ally gates.
- Reopening memory tuning with cumulative/non-fresh readings or changes smaller than the noise band.
- Fixing the gamepad casing mismatch partially and creating two case identities.

## Validation

- Reproduce an issue before changing its status, then record the exact environment and evidence.
- Run the affected domain checks plus real hardware/runtime validation where required.
- When an issue is resolved, remove it here only after validation and record the shipped behavior in `CHANGELOG.md`.
