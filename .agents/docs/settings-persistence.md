# Settings and Persistence

## Purpose

Define the compatibility contract for settings and user data stored by LiftOff.

## Read When

Read when adding or changing a setting, persisted struct, app-data file, migration, default, localization key, or credential-backed account state.

## Durable Constraints

- Every new field in a persisted Rust struct requires `#[serde(default)]` or `#[serde(default = "...")]`. Missing defaults can silently revert an existing user's file.
- Every Rust `Settings` field must also be initialized in `impl Default for Settings`.
- A user-facing setting must be mirrored in `src/types.ts`, `src/constants.ts`, the Settings UI, and locale files. A backend-only foundation may intentionally omit frontend support only when scope explicitly says so.
- Preserve stored-value compatibility. If display labels change, migrate or normalize old values without casually renaming the persisted wire value.
- Write user data under `%LOCALAPPDATA%/LiftOff/`; never place refresh tokens or comparable secrets in JSON, logs, DOM state, or bundled configuration.
- Spotify and Microsoft/Xbox refresh tokens use Windows Credential Manager. SGDB and Spotify client identifiers remain user-supplied where documented by the integration contract.
- Migration tests that touch a real user settings file must save the original bytes and restore them byte-for-byte afterward.

## Current Source Anchors

- `src-tauri/src/lib.rs`: Rust `Settings`, defaults, persistence helpers, and app-data paths.
- `src/types.ts`: TypeScript settings and data interfaces.
- `src/constants.ts`: `DEFAULT_SETTINGS`, version, accents, themes, and option constants.
- `src/hooks/useAppSettings.ts`: bootstrap, UI-scale resolution, save helpers, language sync, and scan-refresh triggers.
- `src/views/settings.tsx`: settings definitions and rendering.
- `src/locales/en.json`, `src/locales/fr.json`: labels and messages.
- App-data files include settings, pins, hidden IDs, recents, custom names/categories/data/art, caches, and account metadata; confirm exact current filenames in backend code before changing them.

## Common Failure Modes

- Updating the TypeScript default but not Rust, causing save/load loss.
- Adding a Rust field without a serde default or `Settings::default()` value.
- Reusing a generic locale value where a context-specific label is required.
- Treating cache metadata as an authentication secret or logging token-bearing responses.
- Testing only a fresh file and missing compatibility with an existing settings file.

## Validation

- Run `npm run build`, `cargo check`, and `git diff --check` for cross-layer settings changes.
- Test fresh defaults and an existing settings file containing unrelated values.
- Persist an unrelated change, reload/restart, verify the new default remains, then restore any real test file exactly.
- Add focused unit coverage for normalization or migration logic when practical.
