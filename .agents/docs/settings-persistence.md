# Settings and Persistence

## Purpose

Define the compatibility contract for settings and user data stored by LiftOff.

## Read When

Read when adding or changing a setting, persisted struct, app-data file, migration, default, localization key, or credential-backed account state.

## Durable Constraints

- Every new field in a persisted Rust struct requires `#[serde(default)]` or `#[serde(default = "...")]`. Missing defaults can silently revert an existing user's file.
- Every Rust `Settings` field must also be initialized in `impl Default for Settings`.
- A user-facing setting must be mirrored in `src/types.ts`, `src/constants.ts`, the Settings UI, and locale files. A backend-only foundation may intentionally omit frontend support only when scope explicitly says so.
- Locale files under `src/locales/` must keep identical key trees. A new language needs a complete file, an `i18n` `supportedLngs` entry, and Settings plus onboarding cycle options. Missing copy may be auto-translated from English; preserve interpolation placeholders and product names (LiftOff, Steam, Spotify, and similar). Do not leave `TODO(xx)` locale placeholders unless the user asks for a native-speaker pass.
- Preserve stored-value compatibility. If display labels change, migrate or normalize old values without casually renaming the persisted wire value.
- Serialize full-settings writes in invocation order. Onboarding previews update live state without writing; committed steps queue saves, and closing setup waits for the final `onboarding_complete: true` write before removing the overlay.
- `hide_bottom_bar` is legacy wire ballast. `bottombar_mode` is `smart` | `full` | `hidden`; `minimal` and empty normalize to `smart`. `bottombar_smart_migrated` records the one-time 2.0 move of Full/Minimal users to Smart (Hidden kept); `DEFAULT_SETTINGS` must keep it `false` so spread-merge cannot skip the migration.
- `nav_bumpers_pos` `bottom` is only offered when the Full bar is showing. Smart and Hidden resolve a stored `bottom` value to `hidden` without renaming the wire value for Full users. Fresh defaults use `header` bumpers, `tabbar_text_tabs: true` with medium label weight, and `tabbar_with_background: true`.
- Write user data under `%LOCALAPPDATA%/LiftOff/`; never place refresh tokens or comparable secrets in JSON, logs, DOM state, or bundled configuration.
- Factory reset writes `factory-reset.pending`, disables autostart, and restarts. The next process start — before the window opens — clears Steam, Microsoft/Xbox, and Spotify Credential Manager tokens, then deletes `%LOCALAPPDATA%/LiftOff/` and WebView storage under `com.taylo.liftoff`. That WebView wipe also drops the HTTP cache, so first-run onboarding screenshot stills and Lo-fi scene posters are inlined data URLs rather than `/assets/...` fetches. Lo-fi video and mp3 are copied into `%LOCALAPPDATA%/LiftOff/media/lofi/` and loaded with `convertFileSrc`. Do not delete the data directory while the WebView still has art files mapped; that fails on Windows, leaves `settings.json`, and can break Home hero images. A missing `settings.json` is first-run (`onboarding_complete` false). Do not leave a settings file with only onboarding flipped; that would keep pins, recents, art, and account metadata.
- Spotify and Microsoft/Xbox refresh tokens use Windows Credential Manager. SGDB and Spotify client identifiers remain user-supplied where documented by the integration contract.
- Migration tests that touch a real user settings file must save the original bytes and restore them byte-for-byte afterward.

## Current Source Anchors

- `src-tauri/src/lib.rs`: Rust `Settings`, defaults, persistence helpers, and app-data paths.
- `src/types.ts`: TypeScript settings and data interfaces.
- `src/constants.ts`: `DEFAULT_SETTINGS`, version, accents, themes, and option constants.
- `src/hooks/useAppSettings.ts`: bootstrap, UI-scale resolution, save helpers, language sync, and scan-refresh triggers.
- `src/views/settings.tsx`: settings definitions and rendering.
- `src/locales/en.json`, `src/locales/fr.json`, `src/locales/es.json`: labels and messages.
- App-data files include settings, pins, hidden IDs, recents, custom names/categories/data/art, caches, and account metadata; confirm exact current filenames in backend code before changing them.

## Common Failure Modes

- Updating the TypeScript default but not Rust, causing save/load loss.
- Adding a Rust field without a serde default or `Settings::default()` value.
- Reusing a generic locale value where a context-specific label is required.
- Leaving `TODO(fr)` or similar placeholders in a locale file when auto-translation from English is allowed.
- Treating cache metadata as an authentication secret or logging token-bearing responses.
- Testing only a fresh file and missing compatibility with an existing settings file.

## Validation

- Run `npm run build`, `cargo check`, and `git diff --check` for cross-layer settings changes.
- Test fresh defaults and an existing settings file containing unrelated values.
- Persist an unrelated change, reload/restart, verify the new default remains, then restore any real test file exactly.
- Add focused unit coverage for normalization or migration logic when practical.
