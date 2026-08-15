# Architecture

## Purpose

Describe LiftOff's stable system shape and ownership boundaries without duplicating source inventories.

## Read When

Read for repository-wide changes, refactors, new modules, cross-layer data flow, or when deciding where behavior belongs.

## Durable Constraints

- LiftOff is a Windows-first Tauri 2 application: React owns presentation and interaction; Rust owns native scanning, persistence, process/window control, credentials, and external HTTP that must not expose secrets.
- `src/App.jsx` remains a large orchestration layer. Prefer extending an existing hook, view, component, theme helper, or backend module instead of adding another unrelated responsibility to it.
- `src-tauri/src/lib.rs` remains the backend command hub, with specialized native domains split into modules when the boundary is clear.
- Keep frontend and backend contracts typed. Persisted or IPC shapes must be changed on both sides when both sides consume them.
- Preserve behavior during extraction. Do not combine a structural refactor with unrelated visual or controller changes.
- The application is controller-first. Component ownership must preserve the single active focus/input owner.

## Current Source Anchors

- `src/App.jsx`: root composition, cross-hook wiring, derived display state, global surface tokens.
- `src/hooks/`: settings, startup, library, navigation, focus/FSE, running apps, integrations, art, and audio state.
- `src/views/`: Home, Games, Apps, shared library content, and Settings.
- `src/components/`: modals, layout, backgrounds, launch UI, integration UI, and reusable controls.
- `src/contexts/`, `src/theme/`, `src/styles/`: shared state and visual systems.
- `src-tauri/src/lib.rs`: Tauri commands and native orchestration.
- `src-tauri/src/fse_watcher.rs`, `steam_appinfo.rs`, `store_metadata.rs`: specialized backend domains.
- `src/types.ts` and Rust structs: cross-layer data contracts.

## Common Failure Modes

- Treating an old handoff inventory as current instead of searching the source tree.
- Reintroducing duplicate state in `App.jsx` when a domain hook already owns state plus mirrored refs.
- Extracting a component but leaving input ownership, effects, or callbacks split across old and new owners.
- Presenting a successful browser/mock test as proof of native Tauri, WebView2, or handheld behavior.

## Validation

- Run `npm run build` and `git diff --check` for all architecture changes.
- Add `cargo check` for `src-tauri` changes and the relevant targeted tests.
- For refactors, compare visible behavior, focus ownership, startup, and modal isolation before and after.
