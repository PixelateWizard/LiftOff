# Integrations

## Purpose

Centralize durable security, API, caching, and product-boundary rules for external services.

## Read When

Read for Steam, Microsoft Store/Xbox, Spotify, Cloud gaming, SteamGridDB, GitHub update checks, credentials, or third-party metadata.

## Durable Constraints

- Steam production install/launch uses the established desktop client and URI flow. The direct `steamclient64.dll` bridge was rejected after live `IClientAppManager` calls returned `result=1`; do not restore it without new runtime-trace evidence.
- Steam owned-library/auth state uses native backend plumbing and Credential Manager for refresh tokens. Manifest bytes are not reliable live progress; use the current phase/checkpoint model.
- Microsoft/Xbox account refresh tokens use Credential Manager. Store product IDs must be validated; title-history numeric IDs are not automatically Store product IDs.
- The word “Xbox” and Xbox logo must not appear in shipped UI without trademark approval. Generic account/gamepad visuals are required; internal source identifiers may remain technical values.
- Microsoft Store uninstall is limited to current-user packages in the resolved package family and must preserve Steam-only Verify behavior.
- Spotify Client ID remains user-supplied. Tokens never enter logs, DOM, JSON, or bundled configuration. Spotify Connect is the reliable playback target; do not revive the embedded Web Playback SDK path without resolving WebView2 DRM/license failures.
- SGDB API keys remain user-supplied and unbundled. Preserve cache-first art behavior and provider rate limits.
- Cloud seed generation uses exact verified joins and skips unmatched titles rather than guessing product IDs. Runtime uses cached/bundled fallback so the picker is not network-dependent.
- Update checks respect Stable versus Alpha/Beta channels and should surface prompts only when the app is focused and interaction-safe.

## Current Source Anchors

- Steam/Microsoft/Spotify commands and credential helpers: `src-tauri/src/lib.rs`.
- Store metadata providers: `src-tauri/src/store_metadata.rs`.
- Steam local metadata parsing: `src-tauri/src/steam_appinfo.rs`.
- Frontend integration hooks/components: `useSpotify.ts`, `useStoreMetadata.ts`, `components/spotify/`, `components/steam/`, `components/xbox/`.
- Cloud catalog and builder: `src/data/xcloudGames.json`, `scripts/build-xcloud-seed.mjs`, `CloudGamePickerModal.tsx`.
- Update behavior: `src/hooks/useUpdateCheck.ts`, `UpdateAvailableModal.tsx`, settings/constants.

## Common Failure Modes

- Treating research/spike findings as authorization to ship an unsupported private client interface.
- Confusing account/title-history IDs with validated Store catalog identifiers.
- Putting secrets in `.env` examples, logs, local JSON, frontend props, or test fixtures.
- Bulk-fetching store metadata or art and hitting provider rate limits.
- Guessing Cloud product mappings or making the picker depend on live sources.
- Claiming auth, playback, install, or uninstall success without the relevant real account/client/device path.

## Validation

- Run `cargo check`, `npm run build`, targeted tests, and `git diff --check` for integration changes.
- Validate error, offline/cache, expired-auth, disconnected-client, and rate-limit paths.
- Keep live account/device tests distinct from mock or endpoint-only tests.
- For Microsoft Store uninstall, complete the pending gates in [Known issues](known-issues.md).
