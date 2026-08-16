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

### SGDB art picker game browser

Code, browser build, Rust tests, and direct SGDB endpoint checks confirm the two-stage search/id contract, but Ally validation remains required at 1280x800 for Glass, Material, and win9x layout; search/game/grid focus visibility; held horizontal pill repeat and scrolling; GamepadKeyboard close-button bleed suppression; B-depth; hero LT/RT filtering; and saving art selected from a non-default game match. Do not claim those WebView2/controller paths are validated from compilation or direct API responses.

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

Do not reinvestigate without a new mechanism. Any future claim needs a fresh launch per reading, per-process breakdown, 120-second settling, and at least a 40 MB signal above the approximately 25 MB noise band. `ICoreWebView2_19::SetMemoryUsageTargetLevel` remains a possible new mechanism but requires a direct version-synchronized `webview2-com` dependency decision.

## Common Failure Modes

- Copying a void L3+R3 test into a new FSE checklist.
- Calling the Xbox uninstall path validated without all four Ally gates.
- Reopening memory tuning with cumulative/non-fresh readings or changes smaller than the noise band.
- Fixing the gamepad casing mismatch partially and creating two case identities.

## Validation

- Reproduce an issue before changing its status, then record the exact environment and evidence.
- Run the affected domain checks plus real hardware/runtime validation where required.
- When an issue is resolved, remove it here only after validation and record the shipped behavior in `CHANGELOG.md`.
