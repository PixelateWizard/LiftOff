# LiftOff — Claude Code Handoff

## ⚡ Active Task
- Fix Dependabot/security dependency alerts with the smallest safe package updates.
- Preserve current launcher behavior and validate frontend/Rust dependency changes before updating release notes.

## 🐛 Active Bugs

- The indeterminate install bar at the bottom of a game card in the Games library restarts/glitches whenever gamepad focus moves to another card. Deferred; do not fix as part of Tasks D/E.

**Completed (this session - Dependabot dependency alerts):**
- Queried GitHub Dependabot alerts for `PixelateWizard/LiftOff`; all four open alerts were npm `package-lock.json` dev/build-tool advisories for Vite, Babel, and esbuild.
- Updated the npm lockfile to `vite@7.3.5`, `@babel/core@7.29.7`, and patched related Babel/browser metadata packages.
- Added a narrow npm `overrides.esbuild` pin to `0.28.1` because the current Vite 7 line still declares `esbuild ^0.27.0`; avoided a Vite 8 migration for this security-only pass.
- Updated `CHANGELOG.md`; validated with `npm.cmd audit --json`, `npm.cmd ls vite esbuild @babel/core`, `npm.cmd run build`, and `git diff --check`. Only the existing Vite chunk-size warning and CRLF notices remain. `cargo audit` is not installed locally, but GitHub reported no open Cargo Dependabot alerts.

**Completed (this session - toolbar reveal and search Details follow-up):**
- Right Stick toolbar entry now smoothly scrolls the Games scroll container to the top before focusing `viewbar`, so the toolbar is visibly revealed even when the grid was scrolled down.
- Search result activation now opens Game Details for game results from both controller/keyboard confirm and pointer double-click; app results keep launching directly.
- Updated `CHANGELOG.md`; validated with `npm run build` and `git diff --check`. Only the existing Vite chunk-size warning and CRLF notices remain.

**Completed (this session - smooth toolbar reveal polish):**
- Changed the Right Stick Games toolbar reveal from an instant top snap to a smooth top scroll so users can see the grid move up to the toolbar.
- Updated `CHANGELOG.md`; validated with `npm run build` and `git diff --check`. Only the existing Vite chunk-size warning and CRLF notices remain.

**Completed (this session - Home mode/default and controller focus updates):**
- Renamed the Home mode picker without changing stored values: `normal` now displays as Legacy, `semi` displays as Normal, and `immersive` remains Immersive. Fresh frontend and Rust defaults now use `home_mode: "semi"` so the new Normal/semi-immersive Home is the default.
- Scoped Home mode labels through `settings.homeModeValues` so shared values like repeat speed `normal` still display as Normal elsewhere.
- Extended Details-first Home game-card activation to Legacy, Normal/semi-immersive, and Immersive shelves/drawers for pointer and gamepad selection; app cards still launch directly, and the non-card hero CTA path still launches/resumes.
- Updated Games controller routing so Right Stick left/right immediately enters and moves within the toolbar, Right Stick down exits, RB/LB and LT/RT leave toolbar focus through their normal tab/source actions, and D-pad/left-stick navigation exits to pinned/grid instead of treating subtabs as a reachable row.
- Removed joystick entry into source subtabs from top-row pinned/grid navigation; source and collection subtabs remain available through LT/RT and pointer selection.
- Updated `CHANGELOG.md`; validated with `npm run build`, `cargo check`, and `git diff --check`. Only the existing Vite chunk-size warning, Rust path canonicalization / unused-helper warnings, and CRLF notices remain. Hands-on gamepad confirmation should verify RS-right toolbar entry/move, D-pad/left-stick toolbar exit, RB/LB tab switch from toolbar, and Home game cards opening Details in each Home mode.

**Completed (this session - Details source recovery and file sizes):**
- Fixed Details opening from Home/recent/history entries by resolving the lightweight entry back to the full live library record before storing `detailsApp`; this restores missing `source`, `install_dir`, `steam_appid`, and installed-state metadata for entries such as Cloud bookmarks, Steam games, and Xbox/Game Pass games.
- Updated `useGamepadNavigation` so the enriched Details entry remains in `detailsAppRef` instead of being overwritten by the raw recent entry after opening.
- Changed Details action gating so Verify files and Steam Uninstall are Steam-only actions, preventing Xbox/Game Pass and Cloud entries from showing Steam controls.
- Passed `steam_appid` into the lazy install-size Tauri command, and changed the backend lookup to use it directly before falling back to parsing `steam://rungameid/...` IDs/paths.
- Made install-size resolution try package `Content` folders as an additional candidate for Xbox/UWP-style install directories, so package roots that expose a content subfolder have another chance to report size before the metadata row is hidden.
- Updated `CHANGELOG.md`; validated with `npm.cmd run build` and `cargo check`. Only the existing Vite chunk-size warning plus the existing Rust path canonicalization / unused-helper warnings remain. Hands-on verification should reopen Details for AdventureQuest Worlds, Control PCGP, and at least one Cloud bookmark from the same path where the issue was observed.

**Completed (this session - Tasks D and E):**
- Semi-immersive Home game activation now routes gamepad A/Enter through the existing `openDetailsModal` wrapper for hero/recent-game, pinned, recents, and collection sections; app entries retain direct launch and other Home modes remain unchanged.
- Semi-immersive mouse game cards preserve hover/click focus and background-art sync, then open Details on click. App cards preserve the prior click-to-focus and double-click-to-launch interaction.
- `GameDetailsModal` now accepts live running state, labels its primary action Resume while running, and inserts a danger-styled Close action first in the revealed action grid.
- Details Close dismisses the modal before opening the established `closeRequest` confirmation, preserving the existing graceful `WM_CLOSE` attempt, delayed running check, and force-close escalation.
- Added the requested Active Bugs section and recorded the Games-card indeterminate-bar focus animation restart as deferred; no fix for that bug was attempted here.
- Updated `CHANGELOG.md`; validated twice with `npm.cmd run build` and with `git diff --check`. Only the existing Vite chunk-size warning and CRLF notices remain; hands-on gamepad confirmation is still required.

**Completed (this session - Steam install progress v2 Tasks A-C + hardware follow-up):**
- Confirmed from Steam's live log that Outlast 2 sustained roughly 244-263 Mbps while its appmanifest percentage remained at a stale checkpoint; active ACF byte counters cannot honestly be presented as live progress on this Steam client.
- Restored a bounded tail read of Steam's public `content_log.txt` for phase/activity only. Allocation, downloading, and staging now use an indeterminate active bar without a percentage; paused/stopped work shows the exact saved ACF checkpoint. No filesystem-size estimation, interpolation, private IPC, or new dependency was introduced.
- Kept one Playnite-modeled installed authority: Steam's FullyInstalled bit, nonzero `SizeOnDisk`, and an existing `common/{installdir}` directory must all agree across snapshots, watcher completion, and library scans.
- Fixed partial-install Cancel so its watcher waits for `downloading/{appid}` to disappear instead of immediately treating the not-yet-installed manifest as uninstall-complete while Steam's confirmation prompt is open.
- Confirmed Windows recorded the reported 22:32 LiftOff failure as `AppHangB1`, not a process crash; moved filesystem snapshot work off Tauri's command thread, reduced frontend polling from 250 ms to one second, and removed redundant watcher progress events while retaining completion events.
- Added English and TODO French paused strings plus nine focused Rust tests covering ACF math, installed authority, content-log transitions, paused checkpoints, stale counters, and the partial-cancel gate. Tasks D and E were untouched in that Steam pass and are now completed in the follow-up above.
- Validated with `cargo test steam_install_progress_tests` (9 passed), `cargo check`, `npm.cmd run build`, and `git diff --check`; only the existing Rust path/unused-helper warning, Vite chunk-size warning, and CRLF notices remain. `cargo fmt --check` still reports only the two unrelated pre-existing Cloud formatting differences.

**Completed (this session - Cloud removal controller selection):**
- Confirmed the delete confirmation updated rendered `apps` state and `allAppsRef`, but left `appsRef.current` holding the pre-delete array used by gamepad selection.
- Updated `appsRef.current` inside the same functional state update that removes the bookmark, keeping the visible grid and controller selection source atomic while preserving the current focus index so the shifted-in card remains selected.
- Updated `CHANGELOG.md` and validated with `npm run build` plus `git diff --check`; only the existing Vite chunk-size warning and CRLF notices remain. One hands-on gamepad removal/selection retry is the final runtime confirmation.

**Completed (this session - Cloud list auto-refresh):**
- Paginated the Cloudbase discovery pass through `/page/N/` until the first duplicate-only page and added a weekly/manual GitHub Actions workflow that rebuilds and commits `xcloudGames.json` only when it changes.
- Added a validated daily GitHub JSON cache under LiftOff app data, a bundled `include_str!` fallback, a non-blocking startup refresh, and a picker command that reports source, timestamp, and refresh failure without making the modal depend on the network.
- Added picker refresh controls for pointer, keyboard, and gamepad (`X`), plus loading/fallback and last-updated status while retaining the bundled list for immediate rendering.
- Made Cloud Details source-aware: cloud bookmarks can be removed locally with a clear label and no longer expose Steam Verify/Uninstall or Run as Administrator; all organizational actions remain available.
- Live seed validation loaded 11 Xbox sitemap shards and 63 Cloudbase pages, discovered 1,845 Cloudbase entries, and wrote 1,495 unique verified rows. Palworld was discovered but skipped because its Cloudbase slug has no exact Microsoft sitemap match; the builder continues to avoid guessed product IDs.
- Validated with the production frontend build, `cargo check`, `node --check scripts/build-xcloud-seed.mjs`, a live full seed refresh, JSON uniqueness checks, and `git diff --check`. Remaining hands-on checks are offline picker refresh behavior and enabling read/write GitHub Actions workflow permissions for direct pushes.

**Completed (this session - Cloud Games live follow-up):**
- Stopped directly spawned cloud kiosk browsers from inheriting LiftOff's stdin/stdout/stderr, so Opera/Chromium renderer, extension, task-manager, and USB diagnostics no longer spill into the Tauri dev terminal; LiftOff's own typed launch-result diagnostics remain visible.
- Fixed duplicate Cloud source tabs by treating `cloud` as a built-in source in `useCustomSources` and case-insensitively deduping both rendered and gamepad source lists as a stale-data backstop.
- Verified the updated seed builder against the live public sources: it loaded 11 Xbox PDP sitemap shards, indexed 36,621 unique slugs, resolved 20 of 30 recently-added Cloudbase titles, skipped 10 exact-slug misses without guessing, and wrote 44 verified bundled rows.
- Updated the Cloud Games picker handoff/changelog wording from the superseded per-game resolver to the Cloudbase index + Xbox PDP sitemap join.
- Validated with `npm.cmd run build`, `cargo check`, `node --check scripts/build-xcloud-seed.mjs`, a live `node scripts/build-xcloud-seed.mjs --new` run, and `git diff --check`; only the existing Vite chunk-size warning, Rust path canonicalization/unused-helper warning, and CRLF notices remain. A refreshed Tauri runtime and one Opera kiosk launch are still required to confirm the terminal stays quiet on the real browser path.

**Completed (this session - Steam cancellation reconciliation and latency):**
- Confirmed Steam logged MECCHA CHAMELEON as fully uninstalled but retained `appmanifest_4704690.acf` with `StateFlags 514`, `SizeOnDisk 0`, old byte counters, and an empty `common` folder; its `downloading/4704690` workspace was gone.
- Changed Steam library scanning to ignore zero-`SizeOnDisk` partial manifests, so canceled/never-completed installs fall back to the owned-but-uninstalled entry instead of being promoted to installed merely because an `.acf` exists.
- Changed uninstall completion to accept a missing manifest or zero `SizeOnDisk`, and changed the original install watcher to stop and emit uninstall completion when an observed download workspace disappears with no installed content, preventing stale install-progress events from reviving the canceled state.
- Direct progress snapshots now suppress inactive partial manifests by requiring either installed content or Steam's live `downloading/{appid}` workspace, and frontend/backend polling was reduced from 750 ms to 250 ms for the lowest latency available from Steam's on-disk manifest updates.
- Updated `CHANGELOG.md` and validated with `cargo test steam_install_progress_tests`, `npm.cmd run build`, and `git diff --check`; only the existing Rust unused-helper/path warning, Vite chunk-size warning, and CRLF notices remain. A refreshed Tauri runtime and one install/cancel retry are the final live confirmation.

**Completed (this session - Steam install progress delivery):**
- Inspected MECCHA CHAMELEON's live `appmanifest_4704690.acf` while LiftOff still showed 0%; Steam reported `869427056 / 2288461696` downloaded and `1028890276 / 2497874377` staged, confirming the parser had real nonzero data and event delivery was the remaining failure.
- Added a registered `steam_install_progress` snapshot command and made active frontend installs poll it every 750 ms while retaining the existing watcher events for immediate updates.
- Opening Details for an uninstalled Steam entry now queries the snapshot once and resumes the installing UI when Steam already has an active partial manifest, including after LiftOff is reopened mid-download.
- Centralized frontend progress normalization/completion handling so event and polling paths update the same Details/tile state and trigger the same final library reconciliation.
- Updated `CHANGELOG.md` and validated with `cargo test steam_install_progress_tests`, `npm.cmd run build`, and `git diff --check`; only the existing Rust unused-helper/path warning, Vite chunk-size warning, and CRLF notices remain. A refreshed Tauri runtime is required to load the new Rust command, then the active MECCHA install is the final live confirmation.

**Completed (this session - MECCHA CHAMELEON Details controller input):**
- Confirmed MECCHA CHAMELEON is an owned-but-uninstalled Steam entry (`appid 4704690`) with cached cover art but no hero result, unlike the installed Details entries that were still behaving normally.
- Stopped `GameDetailsModal` from rebuilding its RAF gamepad poll and restarting the 20-frame opening suppression window whenever lazy art or inline parent callbacks cause a re-render; the persistent loop now reads current controls state, actions, primary action, close callback, focus count, and haptic setting through refs.
- Recorded empty/failed grid and hero lookups as completed art checks and changed the Details lazy-fetch gate to use key presence, preventing missing hero art from retriggering a fetch on every parent render.
- Preserved the showcase-first reveal, down-from-Play / up-from-controls choreography, current action ordering, and background input isolation.
- Updated `CHANGELOG.md` and validated with `npm.cmd run build` plus `git diff --check`; only the existing Vite chunk-size warning and CRLF notices remain. A real gamepad retry on MECCHA CHAMELEON is still the final runtime confirmation.

**Completed (this session - Steam install progress updates):**
- Confirmed against local live Steam appmanifests that active installs expose both `BytesDownloaded` / `BytesToDownload` and `BytesStaged` / `BytesToStage`.
- Changed the watcher to combine download and staging work, retain tenth-percent precision, and report the effective byte totals so Details and Games tiles continue advancing through the full install.
- Added focused Rust coverage for staged installs and the download-only fallback, and updated `CHANGELOG.md`.
- Validated with `cargo test steam_install_progress_tests`, `npm run build`, and `git diff --check`; only the existing Vite chunk-size warning and CRLF notices remain. Repository-wide `cargo fmt --check` is still blocked by an unrelated pre-existing cloud-kiosk formatting diff.

**Completed (this session - Cloud Games kiosk profile isolation):**
- Added a dedicated persistent LiftOff cloud browser profile under app data and passed it with `--user-data-dir` for cloud-source kiosk launches, preventing already-running Chromium browser sessions from turning the request into a normal tab and ignoring kiosk flags.
- Kept the profile persistent per browser executable so Xbox/cloud sign-in may be required once in the kiosk profile but should remain available across future cloud launches.
- Changed `launch_app` to return a typed launch result with mode, child PID, backend detail, and fallback reason, and logged that result from the frontend alongside the incoming app name/source/path.
- Updated `CHANGELOG.md`.
- Validated with `cargo check`, `npm run build`, and `git diff --check`; only the existing Rust path canonicalization warning, unused `is_our_window_focused` warning, Vite chunk-size warning, and CRLF notices remain.

**Completed (this session - Cloud Games kiosk follow-up):**
- Changed cloud-source browser launch from the mixed `--app=...` plus `--kiosk` form to Chromium's direct `--kiosk <url>` form with fullscreen, display-sized window, origin placement, and Edge fullscreen kiosk hints.
- Stopped treating a generic `launcher.exe` as kiosk-capable by itself; Opera GX launcher registrations now resolve to a nearby `opera.exe` before kiosk flags are applied, otherwise LiftOff falls back to the normal URL launch path.
- Added a dev-terminal fallback message when kiosk setup cannot run, so the next Tauri/dev test can distinguish browser detection failures from a kiosk window that opened but behaved incorrectly.
- Updated `CHANGELOG.md`.
- Validated with `cargo check`, `npm run build`, and `git diff --check`; only the existing Rust path canonicalization warning, unused `is_our_window_focused` warning, Vite chunk-size warning, and CRLF notices remain. Real Opera GX/kiosk visual behavior still needs a hands-on retry.

**Completed (this session - Cloud Games kiosk launch):**
- Initially added a `source == "cloud"` launch path that tried to spawn the detected default Chromium browser directly before falling back to the existing ShellExecute URL path; the follow-up above supersedes the launch flags after live testing showed kiosk mode did not visibly engage.
- Implemented default browser detection with the existing `windows` crate registry APIs and no new crate, reading the https UserChoice ProgId plus command registrations, with an HKCR https command fallback for shells where the UserChoice key is unavailable.
- Scoped kiosk mode to cloud-source `http://` / `https://` entries only, so manually added non-cloud web bookmarks still use normal browser chrome.
- Confirmed the existing force-close path checks the tracked launched PID first, so kiosk-spawned cloud games can use the browser child PID without a new close-side special case.
- Updated `CHANGELOG.md`.
- Validated with `cargo check`, `npm run build`, and `git diff --check`; only the existing Rust path canonicalization warning, unused `is_our_window_focused` warning, Vite chunk-size warning, and CRLF notices remain. This shell did not expose the expected HKCU https UserChoice key or an Opera GX default-browser command, so real Opera GX/kiosk launch and force-close behavior still need hands-on validation on Taylor's browser setup.

**Completed (this session - PR3b Steam install actions):**
- Added `steam_install`, `steam_uninstall`, `steam_verify`, and `steam_watch_install` Tauri commands that validate Steam app IDs, require the desktop Steam client via `get_steam_install_path()`, and dispatch `steam://install`, `steam://uninstall`, and `steam://validate` through the same `explorer.exe` medium-integrity path used for `steam://rungameid` launches.
- Added bounded `appmanifest_{appid}.acf` polling for Steam install and uninstall state, emitting `steam-install-progress`, `steam-install-done`, `steam-uninstall-done`, and `steam-install-error` events with progress data derived from expected `StateFlags`, `BytesDownloaded`, and `BytesToDownload` fields pending real-hardware validation.
- Wired Details so uninstalled Steam games show Install, active installs show progress plus Cancel, installed Steam games expose Verify files and confirmed Uninstall, and no-Steam-client/watch failures show in-modal messages instead of failing silently.
- Wired Games tiles to show the same install/uninstall progress overlay as Details, then flip local installed state and refresh the library when the watcher reports completion.
- Updated English install strings, TODO French placeholders, Steam QR security copy, and `CHANGELOG.md`.
- Validated with `npm.cmd run build`, `cargo check`, and `git diff --check`; only the existing Vite chunk-size warning, Rust path canonicalization warning, unused `is_our_window_focused` warning, and CRLF notices remain. Real Ally/Steam-client testing is still required to confirm the three Steam URIs, ACF field semantics, and Cancel-as-uninstall behavior.

**Completed (this session - Cloud Games picker):**
- Broadened indirect launch overlay detection so `http://` and `https://` launches with `child_pid == 0` fast-dismiss like other browser/URI handoffs, while direct `.exe` games still use the 15s window watcher.
- Added bundled `xcloudGames.json` seed data plus a standalone `scripts/build-xcloud-seed.mjs` maintenance script; the later live follow-up replaced its original per-game resolver with a Cloudbase index + Xbox PDP sitemap join that writes exact verified matches only.
- Added a Games-only "Add Cloud Game" Library Actions entry and `CloudGamePickerModal` with search, gamepad navigation, `A` select, `B` cancel, and `Y` on-screen keyboard search.
- Cloud selections save through `add_custom_app` as deterministic `cloud:<slug>` game entries with `source: "cloud"`, `installed: true`, and `https://www.xbox.com/en-us/play/games/...` launch URLs.
- Added first-class Cloud source filtering for the rendered Games source row and gamepad LT/RT navigation, plus a monochrome cloud badge that avoids Xbox/Microsoft iconography.
- Updated `CHANGELOG.md`.
- Validated with `npm.cmd run build`, `cargo check`, `node --check scripts/build-xcloud-seed.mjs`, and `git diff --check`; only the existing Vite chunk-size warning, Rust path canonicalization warning, unused `is_our_window_focused` warning, and CRLF notices remain.

**Completed (this session - Games Not Installed toolbar top-scroll):**
- Fixed the Games grid first-row scroll predicate so it only preserves pinned-above-grid scroll positioning when a pinned section is actually visible under the current source/install filter.
- Returning to the top of the Not Installed filter with gamepad now clamps to the pane top and reveals the Games toolbar again, while the toolbar remains a separate Right-Stick-owned zone.
- Updated `CHANGELOG.md`.
- Validated with `npm.cmd run build` and `git diff --check`; only the existing Vite chunk-size warning and CRLF notices remain.

**Completed (this session - PR3a native Steam QR sign-in):**
- Added native Steam QR auth commands using HTTPS WebAPI protobuf requests for begin/poll/access-token refresh, with refresh tokens stored only in Windows Credential Manager and account/cache metadata stored in app data.
- Added `steam_owned.json` owned-library caching and merged cached owned-but-uninstalled Steam titles into Games as `installed:false` entries with Steam appid, playtime, and last-played metadata while installed Steam manifest entries still win.
- Added the Settings Steam account row, local QR modal via `qrcode.react`, Steam login/logout/status event plumbing, background owned-library refresh on startup, and library refresh after login/logout/cache updates.
- Updated art loading so startup hydrates cached art for all games but only performs network art fetches for installed games by default; uninstalled Steam titles fetch art lazily from Details, with Steam CDN attempted before SGDB for uncached Steam appids.
- Added English Steam strings and TODO French placeholders.
- Validated with `npm.cmd run build`, `cargo check`, and `git diff --check`; only the existing Vite chunk-size warning, Rust path canonicalization warning, unused `is_our_window_focused` warning, and CRLF notices remain. Real Steam account/mobile approval is still required for end-to-end QR acceptance testing.

**Completed (this session - Steam QR endpoint spike):**
- Read `spike-steam-qr-endpoints.md` as the project proposal and ran the safe no-account endpoint smoke test.
- Confirmed the transport question for PR 3a: `BeginAuthSessionViaQR/v1/` accepts POST form data with `input_protobuf_encoded` and returns raw protobuf bytes.
- Found local blockers for the account-backed tests: `protoc`, `base64`, `qrencode`, and the SteamDatabase protobuf files are not available in this shell/repo, and Tests 1-3 require Taylor to scan/approve the QR with a real Steam mobile app.
- Updated `CHANGELOG.md`.

**Completed (this session - native startup haptics):**
- Added a Windows/XInput `native_startup_rumble` Tauri command that pulses all XInput controller slots during splash startup and the stronger splash-finished cue.
- Wired `useStartupBootstrap` to call the native startup fallback alongside Web Gamepad rumble while still honoring the persisted `haptic_feedback` setting.
- Stopped pending splash retry pulses once the splash-finished cue starts so the stronger startup-sound rumble is not clipped by an older retry.
- Updated `CHANGELOG.md`.
- Validated with `npm run build` and `cargo check`; only the existing Vite chunk-size warning, Rust path canonicalization warning, and unused `is_our_window_focused` warning remain.

**Completed (this session - gamepad haptics tuning):**
- Reintroduced a dedicated short `tab` haptic for actual main-tab, source-tab, app-collection, and Settings-section switches.
- Kept card/list/picker/Details focus movement quiet so stick/D-pad browsing does not buzz on every step.
- Strengthened startup-specific haptic patterns and added splash-start retry pulses plus a `gamepadconnected` retry, with the stronger splash-finished pulse still fired next to `playAppLoadedSound`.
- Kept confirm, cancel, launch-start, and launch-success haptics gated by `haptic_feedback`.
- Updated `CHANGELOG.md`.
- Validated with `npm run build` and `git diff --check`; only the existing Vite chunk-size warning and CRLF notices remain.

**Completed (this session - gamepad haptics):**
- Added default-on persisted `haptic_feedback` settings across Rust, TypeScript, frontend defaults, Settings UI, and English/French locale strings.
- Added Web Gamepad API rumble helpers in the typed and runtime gamepad utilities, with unsupported controllers failing silently.
- Wired haptics into main gamepad navigation, Settings actions, Games/App source movement, Game Details navigation/actions, launch start, and launch-success overlay feedback.
- Updated `CHANGELOG.md`.
- Validated with `npm run build` and `cargo check`; only the existing Vite chunk-size warning, Rust path canonicalization warning, and unused `is_our_window_focused` warning remain.

**Completed (this session - Xbox/UWP running detection):**
- Added package-family AUMID matching for PID-less `shell:AppsFolder` launches in `get_running_launched` and `check_launch_focus`, so Xbox/Game Pass/GDK titles such as Control can confirm running state without title-matching their windows.
- Kept process-AUMID enumeration lazy, only running while a tracked shell target exists, and extended PID-less launch reap grace from 60s to 180s.
- Enabled the required `Win32_Storage_Packaging_Appx` Windows API feature for `GetApplicationUserModelId`.
- Updated `CHANGELOG.md`.
- Validated with `npm run build`, `cargo check`, and `git diff --check`; only the existing Vite chunk-size warning, Rust unused-helper warning, path canonicalization warning, and CRLF notices remain.

**Completed (this session - Details two-stage controls):**
- Reworked `GameDetailsModal` into a showcase-first state with hero, cover, metadata, Play, and a subtle animated down indicator.
- Pressing down from Play, or clicking the indicator, reveals controls by collapsing the hero band, shrinking the cover into the details row, and sliding/fading the action grid into focus.
- Pressing up from the first controls row collapses back to the showcase state; action focus and scroll behavior remain controller-owned inside the modal.
- Tightened Xbox duplicate cleanup so desktop/start-menu shortcut shadows with the same normalized title as a real Xbox entry are removed, fixing the Abiotic Factor desktop shortcut duplicate case found in `custom_categories.json`.
- Updated `CHANGELOG.md`.
- Validated with `npm run build`, `cargo check`, and `git diff --check`; only the existing Vite chunk-size warning, Rust unused-helper warning, path canonicalization warning, and CRLF notices remain.

**Completed (this session - Details layout polish):**
- Reworked `GameDetailsModal` so the action grid spans the full lower modal width instead of only the right content column.
- Reduced the hero band height and gave the action controls larger hit targets, spacing, and text sizing so they no longer feel pinned into the bottom edge.
- Added surface-aware radii for the modal shell, media, chips, and buttons across Win9X, Material, Clear, Neon, Obsidian, Aero, and standard glass surfaces.
- Updated `CHANGELOG.md`.
- Validated with `npm run build` and `git diff --check`; only the existing Vite chunk-size warning and CRLF notices remain.

**Completed (this session - PR2 Game Details modal):**
- Added `GameDetailsModal` as a controller-isolated full details surface for Games, with hero/cover art, store badge, metadata chips, a primary Play action, and reused secondary handlers for pin/hide/admin/art/collections/rename/category/delete.
- Changed Games gamepad behavior so `A` opens Details instead of launching directly, and Start/Menu is a no-op on Games while Apps keep the existing Start context menu.
- Routed game right-click to Details and extracted `StoreBadge` into a shared UI component so cards and Details use the same badge implementation.
- Fixed follow-up Details bugs: Details now blocks background gamepad navigation, scrolls its focused controls into view, removes the overlapping footer hints, and centers toggle knobs.
- Added lazy `get_install_size` Tauri command with shared Steam library discovery, Steam `SizeOnDisk` manifest fast-path, propagated install directories for launcher-backed games, Xbox/Game Pass install-size support, and narrow suppression for duplicate custom/XboxGames shadow cards.
- Added `details.*` locale keys in English and TODO French placeholders for moi952 follow-up.
- Updated `CHANGELOG.md`.
- Validated follow-up with `npm run build`, `cargo check`, and `git diff --check`. A plain Vite browser smoke was attempted, but the page cannot run outside Tauri because native `window.__TAURI__` APIs are absent.

**Completed (this session - clean space backgrounds integration):**
- Generated and copied clean (text/button-free) space background PNGs for all 12 accent colors into `public/assets/` as `liftoff_hero_<accent>.png` to serve as hero backgrounds.
- Reverted cover backgrounds to dynamic SVG placeholders so they remain clean and untouched.
- Copied the 12 original generated text-containing space backgrounds to `public/assets/` as `liftoff_hero_<accent>_original.png` for user reference/regeneration.
- Updated `GameDetailsModal` to use the accent space background PNGs as backup hero backgrounds when a game has no hero art, resolving the fallback cover dynamically using the new `accentName` prop.
- Updated `src/App.jsx` and `src/views/HomeView.tsx` to load only hero backgrounds as PNGs while keeping covers as SVGs.

**Completed (this session - semi-immersive theme rewrite):**
- Redesigned the Semi-immersive theme in [HomeView.tsx](file:///c:/Users/taylo/ally-launcher/src/views/HomeView.tsx) to feature a full-bleed background influenced by the currently focused game/app card.
- Placed the hero title text overlay in a top zone of height `semiHeroHeight` and hid dots, covers, and CTA buttons under `!semiHome` guards.
- Structured the card deck slots to start with a new `"Recent Games"` shelf, followed by `"Recents"` and `"Collections"`.
- Wired hovered cards (`onMouseEnter`) and clicked cards (`onClick`) to update active card focus indices to update background art dynamically.
- Implemented direct game/app launching on Enter (bypassing the Close/Resume modal) and unified the horizontal focus index sync when vertical focus enters the semi-immersive hero section in [useGamepadNavigation.ts](file:///c:/Users/taylo/ally-launcher/src/hooks/useGamepadNavigation.ts).
- Re-implemented horizontal/vertical scroll alignment and clearance for semi-immersive hero cards in [App.jsx](file:///c:/Users/taylo/ally-launcher/src/App.jsx).
- Cleaned up duplicate keys and syntax errors in [en.json](file:///c:/Users/taylo/ally-launcher/src/locales/en.json) and [fr.json](file:///c:/Users/taylo/ally-launcher/src/locales/fr.json).

**Completed (this session - immersive home scrolling drawer background removal):**
- Declared `panelOpen` in the content function scope of [HomeView.tsx](file:///c:/Users/taylo/ally-launcher/src/views/HomeView.tsx) to react to drawer open state.
- Updated the hero container (`{/* ── HERO ── */}`) in [HomeView.tsx](file:///c:/Users/taylo/ally-launcher/src/views/HomeView.tsx) to transition opacity to 0 and disable pointer events when `panelOpen` is true.
- Updated the fixed pinned shelf overlay in [HomeView.tsx](file:///c:/Users/taylo/ally-launcher/src/views/HomeView.tsx) to fade out and disable pointer events when the drawer is open.
- Removed solid/frosted styling (background, border, shadow, backdrop-filter) and Win9x titlebar from the slide-up drawer panel in [HomeView.tsx](file:///c:/Users/taylo/ally-launcher/src/views/HomeView.tsx) so scrolled lists float directly over the active theme background.
- Updated [CHANGELOG.md](file:///c:/Users/taylo/ally-launcher/CHANGELOG.md).
- Validated with `npm run build` and `git diff --check`.

**Completed (this session - post-repair sanity sweep):**
- Re-ran `npm run build`, `cargo check`, and `git diff --check` against the current dirty tree.
- Confirmed the Games toolbar bridge is connected from `App.jsx` through `useGamepadNavigation`, `LibraryViewContent`, and `AppBottomBar` for Right-Stick focus, visible count, sort state, and footer hint.
- Reviewed the non-toolbar dirty files at a diff level; no obvious disconnected state or compile-breaking regressions surfaced. Existing warnings remain: Vite large chunk, Rust path canonicalization, unused `is_our_window_focused`, and CRLF notices.

**Completed (this session - PR1 toolbar regression repair):**
- Restored the App-to-hook bridge for `utilityChromeRef`, install filter refs, viewbar focus/index state, sort open/index state, and persisted `games_sort`.
- Reconnected Games toolbar props so the filter buttons, visible game count, sort button/flyout, and focused toolbar styling receive live state again.
- Restored the Games bottom bar RS hint while preserving the existing LT/RT source switching, pinned-first toolbar exit, and external scroll-clearance changes.
- Validated with `npm run build` and `git diff --check`; only the existing large chunk and CRLF warnings remain.

**Completed (this session - PR1 library install filter and view toolbar):**
- Added `installed` data plumbing for app/game entries with serde defaults and scan-created entries defaulting installed, plus persisted `games_sort` settings across Rust, TypeScript, and frontend defaults.
- Added the Games-only view toolbar with All / Installed / Not installed filter segments, visible game count, Recent / A-Z / Store sorting, a sort flyout, empty Not installed copy, and dormant not-installed/installing card treatments.
- Added global Right-Stick utility chrome registration in `useGamepadNavigation`: RS-up docks focus into Games filter/sort chrome, RS-left/right operates toolbar items, A opens/picks sort, B/RS-down exits, source changes reset the transient filter, and overlays/search/art/context surfaces suppress RS input.
- Added the Games footer RS hint and English/French TODO locale keys; French strings need moi952 translation follow-up.
- Validated with `npm run build`, `cargo check`, and `git diff --check`; only the existing large chunk, unused Rust helper, path canonicalization, and CRLF warnings remain. Real Ally tuning should still confirm RS axes/threshold feel.

**Completed (this session - PR1 toolbar focus polish):**
- RS-down/B exit from the Games toolbar now returns to pinned on `All` when matching pinned games are available, instead of always skipping to the grid.
- The focused Games toolbar now has a stronger focused shell border/glow and brighter focused control ring.
- Validated with `npm run build` and `git diff --check`; only the existing large chunk and CRLF warnings remain.

**Completed (this session - PR1 toolbar source-switch return):**
- Games LT/RT source switching now works from the Games toolbar, resets the transient install filter, closes the sort flyout, preserves subtab motion direction, and returns focus to the card area.
- The `All` source keeps its previous pinned-first landing behavior when pinned games are available; other sources land on the first grid card.
- Left-stick/d-pad movement from the Games toolbar returns focus to the card area without needing RS-down.
- Validated with `npm run build` and `git diff --check`; only the existing large chunk and CRLF warnings remain.

**Completed (this session - non-repeat scroll animation restore):**
- Restored smooth focused-card scroll correction for normal Games/Apps gamepad moves.
- Kept immediate `auto` scroll correction only for held stick-repeat, so repeated down-scrolls do not stack eased scroll animations.
- Validated with `npm run build` and `git diff --check`; only the existing large chunk and CRLF warnings remain.

**Completed (this session - gamepad grid scroll rebound):**
- Reduced Games/Apps held-repeat rebound by keeping repeated focused-card scroll correction immediate instead of stacking browser easing.
- Added a calmer library-card focus motion path: Games cards use a smaller no-lift scale, and Apps square grid cards use a shorter transform transition with a smaller focused scale.
- Validated with `npm run build` and `git diff --check`; only the existing large chunk and CRLF warnings remain.

**Completed (this session - library grid smoothness Change 0):**
- Removed hidden backdrop blur/background work from real-art game cards and custom-art app grid cards while leaving fallback/no-art card surfaces on the existing glass path.
- Added `content-visibility: auto` plus intrinsic size hints to game cover cards and square Apps grid cards so off-screen library items can be skipped by Chromium/WebView2.
- Validated with `npm run build` and `git diff --check`; only the existing large chunk and CRLF warnings remain.

**Completed (this session - Epic launch dispatch fix):**
- Changed Epic protocol launches from `explorer.exe` dispatch to `ShellExecuteW("open")`, matching the registered `com.epicgames.launcher` URL handler instead of opening File Explorer.
- Added `epic` to the launcher-owned source matching rules so Epic Games Launcher windows are ignored when deciding whether a game window is actually running/focusable.
- Verified the local protocol registration points to `EpicGamesLauncher.exe`.
- Validated with `cargo check`; only the existing unused Rust helper warning remains.

**Completed (this session - GOG and Epic store integrations):**
- Added GOG registry scanning and Epic `.item` manifest scanning with DLC/stale-manifest/duplicate guards, default-on `scan_gog` and `scan_epic` settings, and GOG/Epic scan assembly in both `get_apps` and `get_all_apps`.
- Routed Epic protocol launches through the Epic Games Launcher registered URL handler; GOG games use direct executable launches and the existing direct-game window watcher.
- Added GOG/Epic source tabs, LT/RT gamepad navigation support, built-in source bookkeeping, Settings toggles, EN/FR locale labels, and monochrome store badges.
- Read-only local verification found one GOG registry game (`Aisle Survive Demo`) and one Epic manifest game (`The Ouroboros King`) with its executable present. Actual launch testing still needs a manual device check.
- Validated with `cargo check`, `npm run build`, and `git diff --check`; only the existing unused Rust helper, chunk-size, and CRLF warnings remain.

**Completed (this session - splash finished sound restore):**
- Restored `appLoadedSound.wav` to the supplied DriftSpeira `achievement-sparkle` file so LiftOff's splash-finished cue uses the original liked sound again.
- Added a separate `launchSuccessSound.wav` Feraly asset and routed `LaunchOverlay` launch-success playback through `playLaunchSuccessSound`, leaving `playAppLoadedSound` for startup completion.
- Kept `gameLaunchSound.wav` on the supplied `fantasy world UI sound` launch-attempt cue.
- Updated Settings credits with the DriftSpeira CC0 attribution while preserving the two new app/game launch sound attributions.
- Validated with `npm run build` and `git diff --check`; only the existing large chunk and CRLF warnings remain.

**Completed (this session - store source badges):**
- Added a `StoreBadge` overlay using monochrome `react-icons/fa6` glyphs for Steam, Xbox, and Battle.net, with unknown/app/custom sources rendering no badge.
- Rendered the badge on Games grid cards, Home recents, Home collection cards, and semi-immersive collection game cards while keeping it display-only and clipped inside existing card shells.
- Added the default-on `show_store_badges` setting across Rust serde/defaults, TypeScript settings/defaults, Settings UI, and EN/FR locale labels.
- Validated with `npm run build`, `cargo check`, and `git diff --check`; only the existing large chunk, unused Rust helper, and CRLF warnings remain.

**Completed (this session - launch audio swap):**
- Replaced `gameLaunchSound.wav` with the supplied `fantasy world UI sound` file so game/app launch attempts use the new cue.
- Replaced the loaded/success cue with the supplied Feraly pause/interface sound and wired `LaunchOverlay` to play it when the backend emits `launch-success`.
- Updated Settings credits with both CC0 Freesound attributions while keeping the remaining active splash/UI audio credits intact.
- Validated with `npm run build` and `git diff --check`; only the existing large chunk and CRLF warnings remain.

**Completed (this session - glass/tab and drill ghosting polish):**
- Changed tab/subtab slide keyframes to transform-only motion so glass/backdrop-filter cards no longer fade in transparent before their glass surface composites.
- Removed the outgoing Settings panel from drill transitions; Settings drill now animates only the incoming panel, avoiding the visible ghost of the previous menu.
- Kept the existing Settings transition guard and incoming push/pop direction behavior intact.
- Validated with `npm run build` and `git diff --check`; only the existing large chunk and CRLF warnings remain.

**Completed (this session - focus pulse surface fix):**
- Changed `.lo-anim-pulse` so it no longer animates `box-shadow` on the focused card/row element itself.
- The pulse now renders through a positioned `::after` overlay ring, keeping glass/aero/clear card backgrounds and focused shadows stable while the pulse plays.
- Updated UI Motion/reduced-motion/static-effects kill-switch selectors to target the new pulse overlay.
- Validated with `npm run build` and `git diff --check`; only the existing large chunk and CRLF warnings remain.

**Completed (this session - PR2 motion surfaces):**
- Finished the Settings drill transition as a two-panel push/pop: the outgoing settings panel stays mounted long enough to slide/dim out while the incoming panel slides in, with the existing transition input guard preserved.
- Added a central focus-pulse effect that targets the currently focused card, settings row, or section tab, skips Onyx, skips held-repeat movement, and respects the UI Motion kill switch/reduced-motion CSS.
- Extended modal motion coverage to standalone file/art picker overlays that bypass `ModalShell`.
- Added a `ModalShell` drill motion variant and applied it to the card context/actions surface so card-open actions use the scale-in primitive while ordinary dialogs keep modal rise.
- Validated with `npm run build` and `git diff --check`; only the existing large chunk and CRLF warnings remain.

**Completed (this session - subtab switch motion):**
- Added a dedicated subtab motion state/timer in `App.jsx` that reuses the same forward/back tab slide classes for source, collection, and Settings section changes.
- Wired header clicks, Games/Apps LT/RT cycling, Settings LT/RT section changes, and focused subtab row left/right movement through the same directional motion callback.
- Suppressed Appearance drill push/pop when a Settings section switch is what clears the drill-in state, so the section slide remains the only visible transition.
- Validated with `npm run build` and `git diff --check`; only the existing large chunk and CRLF warnings remain.

**Completed (this session - picker/drill motion follow-up):**
- Changed tab motion into a short active-entry state so Settings drill remounts do not fall back into a second tab animation after push/pop finishes.
- Added cleanup for the tab/drill motion timers in `App.jsx`.
- Added `.lo-anim-overlay` and `.lo-anim-modal` to Theme and Surface picker modals, with local `data-motion` and `data-ui-motion` attributes because those pickers render outside the scaled app root.
- Validated with `npm run build`; only the existing large chunk warning remains.

**Completed (this session - tab motion direction fix):**
- Moved tab direction selection into `useGamepadNavigation.switchTab()` so the incoming tab receives the correct forward/back class before first paint.
- Added explicit bumper direction overrides so LB wrap-around animates backward and RB wrap-around animates forward, while direct tab selection still follows the left-to-right `Home -> Games -> Apps -> Settings` order.
- Separated Settings tab-entry motion from Appearance drill motion so the push/pop class no longer overrides directional tab transitions when landing on Settings.
- Validated with `npm run build`; only the existing large chunk warning remains.

**Completed (this session - motion/audio language foundation):**
- Added `src/styles/motion.css` with duration/easing tokens, tab/modal/drill/push-pop/pulse primitives, root `data-motion` profiles, `data-ui-motion` kill switch handling, and reduced-motion fallbacks.
- Added persisted `ui_motion` settings support across Rust defaults/serde, TypeScript settings, frontend defaults, Appearance -> Style settings, and EN/FR locale labels.
- Wired root `data-motion`/`data-ui-motion`/`--accent-pulse`, modal fade/rise classes, token-driven LaunchOverlay timings, directional Games/Apps/Settings tab enter classes, and keyed Settings drill push/pop entry classes with a short gamepad input guard.
- Added theme-aware audio profiles in `src/audio/audioProfiles.ts` and routed `useAudioFeedback` through detune/filter/gain shaping without changing sound call sites.
- Validated with `npm run build`, `cargo check`, and `git diff --check`; only the existing large chunk and unused Rust helper warnings remain.

**Completed (this session - Cyberpunk Spotify hero chip):**
- Tuned only the Cyberpunk `heroChip` styling to use the resolved Cyberpunk theme gate, hard/corner-cut edges, squared artwork, neon accent border/glow, and a squared MENU badge.
- Left the chip placement and all non-Cyberpunk surface styling unchanged.
- Validated with `npm run build`; only the existing chunk-size warning remains.

**Completed (this session - Spotify Immersive Home chip):**
- Added a compact `heroChip` Spotify mini-player variant that reuses the existing display-only artwork, title, artist, progress, and MENU hold-progress affordance.
- Hidden-bottom-bar Immersive Home now suppresses the floating puck and renders the chip below the Launch/dots row inside the hero copy/action column; non-immersive Home, Games, Apps, and Settings keep the puck.
- The chip is inserted in the shared hero copy branch so Material, Cyberpunk/Neonblade, Win9X/Webcore, and the standard immersive surfaces all receive it.
- The Spotify overlay still hides all mini-player surfaces, and click/tap plus global hold-MENU opening behavior is unchanged.
- Validated with `npm run build`; only the existing chunk-size warning remains.

**Completed (this session - Spotify puck immersive spacing):**
- Removed the old hero-lift path from Immersive Home so the hero content and pinned shelf keep their normal bottom positions even while the hidden-bottom-bar Spotify puck is visible.
- Kept Spotify puck rendering, click/tap overlay open, and global hold-MENU behavior unchanged.
- Validated with `npm run build`; only the existing chunk-size warning remains.

**Completed (this session - Spotify overlay expand animation + immersive lane):**
- Spotify overlay opens with a FLIP expand animation from the mini-player: `useLayoutEffect` measures `[data-spotify-minibar]` and the `[data-modal]` panel, starts the panel translated/scaled at the mini-player's rect (translate deltas divided by the app-root UI scale), forces a reflow, then transitions to identity over 0.3s. Skips gracefully when no mini-player is mounted.
- Overlay gamepad focus scrolling now uses `scroller.scrollTo({ behavior: "smooth" })` to match Games/Apps grid scrolling.
- Mini-player shows a permanent MENU badge (third grid column: `46px / 1fr / 30px`) as the hold-gesture affordance; the accent progress ring and brighter icon appear only while charging.
- Immersive Home no longer docks the pill bottom-right: the pill keeps the standard alignment lane on all screens.
- Removed the Spotify header chip from Games/Apps (kept on Home/Settings); gamepad path everywhere is hold-MENU.
- Validated with `npm run build`; only the existing chunk-size warning remains.

**Completed (this session - Spotify hold-MENU gesture + floating pill):**
- Replaced the short-lived Spotify subtab item with a global hold-MENU gesture: in `useGamepadNavigation`'s RAF poll, Start is special-cased when `spotifyConnectedRef.current` — press starts a charge timer (850ms), full charge opens the overlay (`onOpenSpotifyOverlay` + `playSoundAlt` + Start suppressed until release), and releasing early dispatches the regular Start tap action via `handleNavRef` (so the Games/Apps card options menu now fires on release, not press). Charge level is exported as `spotifyHoldProgress` (0..1) from the hook.
- `SpotifyMiniBar` accepts `holdProgress` and renders a MENU-icon badge with a filling SVG progress ring on its right side while charging; `AppBottomBar` accepts `spotifyHoldProgress` and ramps an accent border + glow on the hidden-bar pill.
- The hidden-bar mini-player pill wrapper changed from `position: sticky` (which reserved a full-width layout row — the "band" behind the pill) to `position: fixed` with `pointerEvents: none` on the wrapper and `auto` on the pill, so it truly floats over content on all tabs; Immersive Home keeps the bottom-right docking.
- Header Spotify chip reverted to plain (non-focusable) styling on all tabs; Manage chip behavior unchanged.
- Validated with `npm run build`; only the existing chunk-size warning remains.

**Completed (this session - Spotify mini-bar/bottom-bar layout pass):**
- `SpotifyMiniBar` now has a fixed 360px width (`flex: 0 0 auto`) so it reads consistently across tabs, and the trailing expand icon was removed; the whole bar remains one click target.
- `AppBottomBar` wide mode is now gated by `wide_layout && wide_bottombar` (mirroring the header's `wide_layout && wide_topbar` rule) so stale `wide_bottombar` values cannot stretch the bar full-width while the header is inset.
- When `hide_bottom_bar` is on, `AppBottomBar` renders a compact floating pill containing just the mini-player (solid bar surface, follows `bottombar_alignment`) whenever Spotify is connected with a track; new `spotifyHasTrack` prop from `App.jsx` gates it.
- The header Spotify chip now renders on all tabs: `headerRightActions` composes `spotifyHeaderBtn` + the Games/Apps Manage button instead of being Home-only.
- Validated with `npm run build`; only the existing chunk-size warning remains.

**Completed (this session - Spotify overlay nav + mini-bar polish):**
- Spotify overlay gamepad navigation now uses the app-wide `repeat_speed` setting (600/200ms normal) instead of the helper's 350/100ms defaults, threaded via a new `repeatSpeed` prop from `App.jsx`; only one direction key is handled per poll frame so hard diagonal stick pushes cannot double-move.
- Reordered overlay focus indices to match the visual layout: transport 0-4, close = 5 (top row), scrubber = 6, devices from 7, playlists after. Down from the transport row lands on the scrubber, down again reaches devices/playlists; up from the scrubber returns to Play. Close is no longer the last focus index after all playlists.
- `SpotifyMiniBar` is now display-only: removed the unreachable prev/play/next transport buttons and made the whole bar a single button that opens the Spotify overlay (artwork, title/artist, progress, expand hint retained).
- Stabilized the overlay input effect: navigation logic moved to a render-scope `navigate` function read through `navigateRef`, so the keydown/RAF-poll effect depends only on `[open, repeatSpeed]`. Re-renders from progress ticks, device refreshes, and play-state flips no longer reset `last`/`pressTime`/`repeating`/release guards mid-press (the remaining source of skipped/phantom moves).
- Overlay hover focus switched from `onMouseEnter` to `onMouseMove` on all controls, so gamepad-driven modal scrolling cannot steal focus when content slides under the stationary mouse cursor.
- Validated with `npm run build`; only the existing chunk-size warning remains.

**Completed (this session - Spotify transport optimization):**
- Converted every Spotify Web API Tauri command (status, disconnect, access token, playback state, playlists, devices, all transport controls, context play, transfer) to `async` commands that run their blocking work through `run_spotify_blocking` / `spawn_blocking`, so Spotify HTTP no longer executes on the main thread and control presses stop serializing behind the 3s poll. Internal blocking callers use `spotify_access_token_blocking` / `spotify_devices_blocking`.
- Added a shared pooled `reqwest::blocking::Client` (`spotify_http()`, 6s connect / 12s request timeouts) reused by all Spotify auth and API calls, eliminating the per-request TLS handshake.
- Split frontend polling in `useSpotify`: the 3s tick and post-command bursts now call playback-state-only `refreshPlaybackState`; devices refresh every fifth tick (~15s) and after transfer/playlist starts; playlists+devices full `refreshPlayback` runs only on connect and overlay open. This drops per-button traffic from ~12 requests to ~4 and avoids Spotify 429s.
- Progress ticking now advances by elapsed wall time instead of a fixed 1000ms, removing scrubber drift between API refreshes.
- Validated with `cargo check`, `npm run build`, and `git diff --check`; only existing warnings/CRLF notices remain.

**Completed (this session - Spotify Connect latency polish):**
- Added short-lived local playback overrides so stale Spotify Connect snapshots cannot bounce pause/play state or scrubber progress backward immediately after controls.
- Made next/playlist starts suppress the previous track until Spotify reports a different active track, avoiding stale song details during Connect handoff.
- Reduced the overlay action lock now that the Web Playback SDK is no longer the active path, so controls feel less like they need repeated presses.
- Improved Spotify overlay scroll anchoring: transport focus snaps the modal body to the top, device focus reveals the device section, and the first playlist row reveals the playlist header.
- Validated with `cargo check`, `npm run build`, and `git diff --check`; only existing warnings/CRLF notices remain.

**Completed (this session - Spotify Connect overlay responsiveness):**
- Added focused-element refs in the Spotify overlay so gamepad focus keeps device chips, playlist cards, transport controls, and the scrubber inside the modal viewport without scrolling the scaled app root.
- Changed Spotify Connect control refreshes to use short post-command burst polling, so next/previous/playlist starts stop showing stale track details and scrubber state for as long.
- Made scrubber seeks optimistic and committed on pointer/keyboard release, with stale drag state cleared whenever the active track changes.
- Made Previous restart the current track after a few seconds, and fall back to `seek(0)` when Spotify returns the first-track `Restriction violated` 403.
- Validated with `cargo check`, `npm run build`, and `git diff --check`; only existing warnings/CRLF notices remain.

**Completed (this session - Spotify Connect playback pivot):**
- Stopped loading and targeting the embedded Web Playback SDK from the normal app path, avoiding the WebView2 DRM/license failures that caused 10-second stalls and skipped playlist tracks.
- Added a gamepad-reachable Spotify Connect device picker to the overlay and routes playlist/play starts to the selected or preferred Connect device.
- Updated backend playback startup to prefer `Computer` Spotify Connect devices before phones/tablets, so Spotify Desktop on the Ally wins when it is available.
- Restored smooth Connect progress interpolation between Web API refreshes and kept the duplicate scrubber removed.
- Validated with `cargo check`, `npm run build`, and `git diff --check`; only existing warnings/CRLF notices remain.

**Completed (this session - Spotify SDK state sync):**
- Replaced optimistic progress ticking with SDK `getCurrentState()` polling so the scrubber reflects real playback instead of drifting past a stopped player.
- Removed the duplicate custom progress bar below the native range scrubber.
- Debounced playlist/play actions so a single click/gamepad press cannot trigger multiple Spotify starts, and playlist starts now request offset 0 / position 0.
- Added an SDK autoplay-failed listener so LiftOff can show when WebView2 blocks local playback from continuing.
- Validated with `cargo check` and `npm run build`; only existing warnings remain.

**Completed (this session - Spotify playback polish):**
- Stopped parsing successful non-GET Spotify control responses so transport buttons no longer show `parse failed` when Spotify returns an empty success body.
- Added Web Playback SDK now-playing state plus local progress ticking so the mini-bar and overlay scrubber keep moving while audio plays through LiftOff.
- Fixed playlist grid gamepad navigation to measure the rendered playlist columns, so vertical movement changes rows instead of skipping sideways.
- Validated with `cargo check`, `npm run build`, and `git diff --check`; only existing warnings remain.

**Completed (this session - Spotify in-app playback target):**
- Added a frontend Web Playback SDK bridge that creates a "LiftOff on Ally" Spotify Connect device when Spotify is connected.
- Routed playlist/play requests to the LiftOff device when it is ready so audio can play through the Ally/app instead of falling back to another Spotify Connect device.
- Added the required Spotify `streaming` and `user-read-private` scopes for new auth sessions; existing Spotify connections may need disconnect/reconnect before the in-app player authorizes.
- Validated with `cargo check` and `npm run build`; only existing warnings remain.

**Completed (this session - Spotify device playback start fix):**
- Added explicit empty request bodies for no-payload Spotify playback control calls so Spotify does not reject them with HTTP 411 Length Required.
- Made playlist/play actions retry against an available Spotify device when Spotify reports no currently active device, allowing LiftOff to start playback on an open Spotify client.
- Validated with `cargo check` and `npm run build`; only existing warnings remain.

**Completed (this session - Spotify playlist playback error fix):**
- Fixed Spotify generic error rendering so localized messages receive `{ message }` interpolation data instead of showing the literal `{{message}}` token.
- Stopped the Spotify overlay and mini-bar from blocking playback actions based on stale or unknown product metadata; playlist/control clicks now call the intended Spotify command and let the API response decide.
- Refined backend Spotify API error mapping so 403 responses only become `PREMIUM_REQUIRED` when Spotify's error body actually mentions Premium, with other 403 messages surfaced as generic Spotify API errors.
- Validated with `cargo check` and `npm run build`; only existing warnings remain.

**Completed (this session - Spotify credential storage fix):**
- Fixed the Windows credential readback failure by enabling `keyring`'s native Windows backend instead of compiling it with the mock in-memory backend.
- Spotify refresh tokens now persist through Windows Credential Manager, so post-browser auth can confirm the saved token from a fresh credential entry.
- Validated with `cargo check`; only the existing unused Rust helper warnings remain.

**Completed (this session - Spotify auth status fix):**
- Fixed the false-success Spotify auth path where the browser approval could close the guide while LiftOff still showed Spotify disconnected.
- The backend now verifies that the refresh token can be read back from Windows Credential Manager before returning auth success.
- The frontend now keeps the guide open and shows a localized error if `spotify_status` does not report `connected: true` after browser approval.
- Validated with `cargo check`, `npm run build`, and `git diff --check`; only existing warnings remain.

**Completed (this session - Spotify auth crash fix):**
- Fixed the reported Tokio `blocking::shutdown` panic during Spotify authentication by moving the localhost callback wait, token exchange, keyring write, profile/product fetch, config save, and access-token cache into one blocking task.
- Kept the fix scoped to the Spotify auth command; the frontend connect flow and playback UI remain unchanged.
- Validated with `cargo check`; only the existing unused Rust helper warnings remain.

**Completed (this session - Spotify PR3 UI):**
- Added the user-facing Spotify connect flow in Settings with a guide modal, shared redirect URI constant, Client ID input, system-browser dashboard/auth launch, connected/disconnect state, and EN/FR locale keys.
- Added shared frontend Spotify state/actions, a now-playing mini-bar, and the Home overlay with playback controls, playlist cards, device info, Premium/no-device hints, and accent-based focus styling.
- Kept tokens out of logs/DOM, kept Spotify styling on the active app accent instead of Spotify green, and gated main gamepad navigation while the Spotify guide/overlay are open.
- Validated with `npm run build`; only the existing large chunk-size warning remains.

**Completed (this session - Spotify PR2 command surface):**
- Added thin Rust Spotify Web API proxies for playback state, playlists, devices, play/pause, next/previous, seek, shuffle/repeat, playlist context playback, and device transfer.
- Reused the PR1 access-token/keyring plumbing with one transparent refresh-and-retry on 401, plus friendly `PREMIUM_REQUIRED` and `NO_ACTIVE_DEVICE` errors for control failures.
- Deferred the Settings connect row, guide modal, mini-bar, Home overlay, and all visual/gamepad Spotify UI to PR3.
- Validated with `cargo check`; the only warnings are the existing unused Rust helpers.

**Completed (this session - Spotify PR1 auth foundation):**
- Added backend Spotify PKCE auth plumbing only: user-supplied Client ID config, loopback browser callback, keyring-backed refresh-token storage, access-token refresh/cache, status/access/disconnect commands, and Tauri command registration.
- Deferred playback API wrappers, the Settings connect guide, mini-bar, Home overlay, playlists, and all frontend Spotify UI to later PRs.
- Validated with `cargo check`; the only warnings are the existing unused Rust helpers.

**Completed (this session - picker modal surface parity):**
- Threaded `materialTokens` through `ThemeContext` so unscaled overlay modals can resolve Material CSS variables outside the transformed app root.
- Updated the shared picker modal style helper to spread the real `glass` surface tokens plus local Material variables, restoring frosted Glass/Aero/Neon/Win9X/etc. panel styling and Material paper-grain modal backgrounds.
- Validated the frontend with `npm.cmd run build`.

**Completed (this session - Appearance drill-in focus tune):**
- Changed both mouse and gamepad category entry so Appearance drill-in pages initially focus the first real setting row (for example Style -> Theme) instead of the inline back chip; the chip remains reachable with Up and still supports A/click/B back.

**Completed (this session - Appearance rework v2.1):**
- Restyled Theme and Surface picker modals through a shared modal style helper modeled on the clear-cache modal: explicit Segoe font, theme text colors, solid scrim, real panel background, `data-modal`, and `data-theme` for Cyberpunk modal CSS.
- Reduced picker navigation cost by using instant focused-card scrolling, revealing the title for top-row focus, removing the full-viewport backdrop blur, and adding paint containment/compositing to preview panes.
- Replaced the category page Back bar with a synthetic focusable inline `appearance_back` chip that suppresses the first category divider, supports A/click back, and preserves B/back focus restoration.
- Added `settings.backHint`, recorded the shipped change in `CHANGELOG.md`, and validated with `npm.cmd run build`.

**Completed (this session - Appearance rework v2):**
- Replaced the Appearance pill strip with drill-in category rows for Style, Home Screen, Layout, and Navigation, including mouse entry and gamepad B/back restoration to the originating category.
- Moved Theme and Surface picker modals outside the scaled app root, added data-modal panels, explicit focused-card scrolling, static-on-focus Theme previews, light/dark-aware Surface previews, and removed the Surface Style row chip.
- Added the new category description locale keys and recorded the shipped change in `CHANGELOG.md`; `npm.cmd run build` and `git diff --check` pass.

**Completed (this session — visual consistency PR1 foundation):**
- Added a shared `focusGlow` token in `useSurfaceTheme()` and threaded it through `ThemeProvider` so later PRs can migrate focus states onto one accent ring + bloom token without changing current visuals yet.
- Logged the invisible groundwork in `CHANGELOG.md`. No card, row, tab, or modal rendering was intentionally changed in this PR.

**Completed (this session — visual consistency PR2 revised):**
- Reverted the earlier header-level active-tab treatment experiment so top-nav active visuals stay owned by their existing per-surface styling until the later material rework PR.
- Generalized the non-active pill-tab hover/focus highlight in `SectionTabBar` so every surface style now shows the same subtle focused-state feedback instead of limiting that behavior to Aero and Material.
- Left text-tab mode and the existing `FocusRing` behavior intact, and did not change the active pill fill/border/glow rules in this PR.

**Completed (this session — visual consistency PR2.5 tab helper extraction):**
- Added `src/theme/tabStyle.ts` as the single edit point for active tab-pill visual styling and wired both `AppHeader` and `SectionTabBar` through it while leaving layout, dots, focus rings, and inactive surface styling local.
- Aligned the subtab active glow strength to the main nav's canonical glow and moved Neon active tabs onto the shared wirey accent-label treatment.
- Reviewed `App.jsx`; its local `activeTextColor` usage is shared with broader content and CTA styling rather than a third tab renderer, so it remains intentionally untouched.

**Completed (this session — visual consistency PR3.5 surface material rework):**
- Reworked only the default Glass fall-through surfaces: cards/modals and bars now use a softer luminous inner rim with heavier `blur(30px)` frost, while dense Settings rows move from `blur(8px)` to `blur(20px)` with a restrained rim.
- Updated the shared tab-pill helper so Glass active tabs use a translucent frosted accent fill, Clear active tabs use a flat translucent accent fill with border and no blur, and Obsidian active tabs use a soft dark slab with an accent label.
- Protected-branch diff review confirmed Material, Onyx, Win9X, Clear surfaces, Cyberpunk, Neon surfaces, and all non-tab Obsidian surfaces were unchanged. Aero also remains unchanged.

**Completed (this session — Clear dark active tab contrast):**
- Fixed the shared Clear active-tab branch so dark-mode active/focused top tabs render white icons and labels, avoiding dark text on the translucent accent fill while leaving light-mode contrast behavior unchanged.

**Completed (this session — Glass active tab glow tune):**
- Raised the shared Glass active tab fill from `0.50` to `0.65` opacity and added a soft accent glow to the focused/active tab treatment while keeping the existing frosted blur and inner rim.

**Completed (this session — Home header width / frame gap bugfix):**
- Decoupled global Wide Layout updates and legacy migration from `wide_topbar`, and made the rendered nav header require both Wide Layout and the Top Bar subsetting so stale hidden `wide_topbar` values cannot stretch Home. Win9X remains intentionally full-bleed.
- Constrained the Home nav boundary itself, then let the inner top bar fill that boundary, so Home-only header styling cannot draw the Cyberpunk/Lofi bar out to the full viewport.

**Completed (this session — framed content removal):**
- Removed the experimental framed-content setting, Appearance toggle, locale strings, wrappers, and `ContentFrame` helper so Games, Apps, and Settings return to their original full content surfaces.

**Prior task — Cyberpunk Settings rows (completed this session — picker re-enable):**
- Re-added `"cyberpunk"` to `THEME_OPTIONS` in `constants.ts` (it had been dropped from the picker list while all downstream wiring still referenced it). Logged in CHANGELOG Added.

**Completed (round 2 — design feedback pass):**
- New `src/components/neonblade-ui/ascii-rain/index.tsx` (canvas matrix-rain, props match neonblade's documented API: textColor/bgColor/fontSize/speed/characters/opacity). `CyberpunkBg.tsx` rewritten to use it as the backdrop (dropped GlyphCity skyline + CyberCircuit; kept grid/scanline/HUD brackets + a readability vignette). `npx neonblade add ascii-rain` produced nothing here (no neonblade registry config), so the component is hand-written to spec.
- `src/components/ui/CyberpunkCard.tsx` rewritten: two-layer corner-cut (outer border frame clipped to the cut + inner opaque content layer), so the neon border follows the diagonal (clip no longer eats it); bigger corner (18px); idle = static neon edge, focused = dual spinning beam; **content layout is preserved** by splitting the caller's `style` into positioning→outer vs layout(display/flex/padding/gap)→inner (fixes the smooshed focused card). drop-shadow filter gives an outer glow that follows the clip.
- `AppHeader.tsx`: cyberpunk active nav = glowing icon/label (drop-shadow + textShadow) + the dot, NO pill bg/border/box-glow and FocusRing suppressed for cyberpunk.
- `HomeView.tsx` immersive hero card: replaced clipped border (ate the diagonal) with a drop-shadow outline that follows the cut + larger corner (24px).
- Settings (`surfaces.ts` settings-row branch, `settings.tsx`, `CollapsibleGroup.tsx`): removed the neon left rail, squared all rows/sub-containers/focus-rings for cyberpunk (`isCyber` gate), and made nested sub-section containers opaque navy so the per-collection toggles are readable.
- `npm.cmd run build` passes (only the pre-existing >500 kB chunk-size warning); module count dropped 167→162 as the skyline/circuit are no longer imported.

**Completed (nav alignment follow-up):**
- `AppHeader.tsx`: removed the Cyberpunk-only tab padding and forced minimum width so the Cyberpunk top tabs use the same geometry as the other themes. Preserved the Cyberpunk fonts, outline icons, glow, active dot, square corners, and FocusRing suppression.
- `npm run build` passes (only the pre-existing >500 kB chunk-size warning); `git diff --check` reports no whitespace errors.

**Completed (hologram polish follow-up):**
- `CyberpunkCard.tsx`: absolute inner layers now inset by the frame width instead of covering the outer clipped frame; Games and Apps cards show the complete bottom-right diagonal stroke.
- `App.jsx`: legacy direct-child cyberpunk card CSS now skips the new clipped frame wrapper, the extra rectangular focused-game overlay is suppressed for Cyberpunk, and the Cyberpunk top bar alpha is lowered slightly for a hologram feel.
- `HomeView.tsx`: immersive Cyberpunk hero frame reduced from 2px solid accent to a 1px softer glow edge with a lighter shadow; its inner HUD fill is subtly translucent with backdrop blur.
- `npm run build` passes (only the pre-existing >500 kB chunk-size warning); `git diff --check` reports no whitespace errors.

**Completed (immersive/nav reconciliation):**
- `HomeView.tsx`: replaced the immersive Cyberpunk card's warm accent-heavy fill with the nav's translucent navy-black HUD base. Removed the accent bloom and saturation boost after runtime validation showed they pulled warm hero-art colors back into the panel.
- `HomeView.tsx`: runtime-calibrated the larger immersive panel slightly darker (`rgba(0,6,14,0.88)`) with less blur so its perceived darkness matches the nav over bright hero artwork.
- `npm run build` passes (only the pre-existing >500 kB chunk-size warning); `git diff --check` reports no whitespace errors.

**Completed (Settings focus follow-up):**
- `App.jsx`: replaced the Cyberpunk focused Settings row's translucent cyan wash and left rail with an opaque accent-tinted HUD gradient, full accent border, restrained glow, and an explicit no-blur CSS backstop.
- `settings.tsx` / `surfaces.ts`: disabled backdrop filtering for Cyberpunk Settings rows, including both focused-row constructors and the base row surface, so Settings panels no longer composite as glass.
- `npm run build` passes (only the pre-existing >500 kB chunk-size warning); `git diff --check` reports no whitespace errors.

**Completed (this session - Appearance settings rework):**
- Split Settings -> Appearance into Style, Home Screen, Layout, and Navigation groups, with a focused pill strip at the top of the Appearance section.
- Replaced the Theme and Surface Style cycle rows with visual picker modals that support mouse, keyboard, and gamepad navigation; locked theme-forced surface rows remain disabled.
- Added English/French locale keys, recorded the shipped change in `CHANGELOG.md`, and validated with `npm run build` plus `git diff --check`.

---

## 🚫 Non-Negotiable Rules
> Violating these breaks things silently or causes legal/community issues.

1. **English-only code comments.** All code comments must be in English, always, regardless of what language you're responding to the user in.
2. **Serde defaults are required.** Every field added to any Rust `struct` that maps to `Settings` (or any persisted struct) MUST have `#[serde(default)]` or `#[serde(default = "fn_name")]`. Missing this causes silent reversion to defaults on app load.
3. **No Xbox branding in binary.** Xbox color palette and aesthetic are fine for themes. The Xbox logo and the word "Xbox" must not appear in shipped UI without Microsoft trademark approval. Use custom SVG gamepad icons.
4. **SGDB API key stays user-supplied.** Do not hardcode SteamGridDB API keys into the binary. This is a known deferred tradeoff; do not "fix" it without Taylor's direction.
5. **Spotify Client ID stays user-supplied.** Do not bundle a Spotify Client ID. Refresh tokens live in Windows Credential Manager via `keyring`, never on disk or in logs.
6. **`#[serde(default)]` applies to ALL new Rust settings fields.** No exceptions.

## Code Style Rules

- **All code comments must be in English.** This is a community project with contributors from different countries. Never write comments in French or any other language.
- Respond to the user in whatever language they write in — but code comments are always English.

---

## Project Overview

**LiftOff** is a Windows desktop game/app launcher built with Tauri 2 (Rust backend + React frontend). It's designed primarily for gamepad/controller navigation and targets a Steam Deck / HTPC-style use case.

- **Stack:** Tauri 2, Rust (`src-tauri/src/lib.rs`), React (`src/App.jsx`)
- **Identifier:** `com.taylo.liftoff`
- **Version:** `2.0.0-alpha.4.1` (APP_VERSION in constants.ts) / `2.0.0-alpha.4.1` (tauri.conf.json — update both together on release; also update Cargo.toml, Cargo.lock, package.json, package-lock.json, docs/index.html, CHANGELOG.md)
- **Installer:** NSIS bundle at `src-tauri/target/release/bundle/nsis/`
- **Dev command:** `npm run dev` (frontend) + `cargo tauri dev`
- **Build:** `cargo tauri build` → use NSIS installer for testing, not raw `.exe`

---

## Current Refactor Handoff

`src/App.jsx` is being incrementally refactored per `liftoff-appjsx-refactor-architecture.md`. The app should remain behavior-compatible after every phase; do not rename `App.jsx` yet.

### Completed App.jsx Refactor Phases

- Phase 1: launch UI extracted.
  - `src/components/launch/SplashScreen.tsx`
  - `src/components/launch/LaunchOverlay.tsx`
  - `src/hooks/useLaunchApp.ts`
  - `src/utils/gamepad.ts`
- Phase 2: art UI extracted.
  - `src/components/art/ArtPickerModal.tsx`
  - `src/components/art/ThumbnailCard.tsx`
  - `src/components/art/SteamGridArtPickerModal.tsx`
- Phase 3: app shell pieces extracted.
  - `src/components/app/AppBackground.tsx`
  - `src/components/app/AppMainContent.tsx`
  - `src/components/app/AppOverlays.tsx`
- Phase 4: view shells extracted.
  - `src/views/HomeView.tsx`
  - `src/views/GamesView.tsx`
  - `src/views/AppsView.tsx`
- Phase 5: conservative hooks extracted.
  - `src/hooks/useAudioFeedback.ts`
  - `src/hooks/useCustomArt.ts`
  - `src/hooks/usePersistentJson.ts`
  - `src/vite-env.d.ts` added for Vite asset typings.
- Phase 6: App.jsx state hooks extracted.
  - `src/hooks/useSystemStatus.ts`
  - `src/hooks/useSearchState.ts`
  - `src/hooks/useModalState.ts`
  - `src/hooks/useCollections.ts`
  - `src/hooks/useCustomSources.ts`
  - `src/hooks/useLibraryData.ts`
  - `src/hooks/useUpdateCheck.ts`
  - `src/hooks/useAppSettings.ts`
- Phase 7: startup bootstrap extracted.
  - `src/hooks/useStartupBootstrap.ts`
- Phase 8: gamepad navigation extracted.
  - `src/hooks/useGamepadNavigation.ts`

### Current Frontend Shape

- `App.jsx` is now a thin orchestration layer: hook calls, derived display values, and a JSX return. It owns no navigation logic directly.
- `useGamepadNavigation` owns: RAF poll loop, hold-repeat, button suppression (`suppressUntilRelease`), tab/focus state machine (all `useState` + mirrored `useRef` pairs for `tab`, `focusSection`, `focusIndex`, `heroIndex`, `settingsSection`, `gameSourceTab`, etc.), `launchingApp`/`launchingAppRef`, `windowFocused`, `heroVideoRefs`, `triggerLaunch`, `switchTab`, all suppression-wrapped close/open helpers (`closeLaunchOverlay`, `closeHideModal`, `closeLibraryActionsModal`, `closeArtPicker`, `openHideModal`, `openLibraryActionsModal`), `handleNav`, the window blur/focus/poll effect, and the hero video pause/resume effect.
- `App.jsx` passes `handleClearRecents`, `handleClearCache`, and `toggleHomeCollection` into the hook via stable ref callbacks so the hook can trigger them from within `handleNav` without circular dependencies.
- `AppBackground` owns theme background orchestration and imports all background components from `src/components/backgrounds/index.ts`.
- `AppBackground` owns Lofi music playback and passes `appPaused` to `LofiBg`. `LofiBg` owns the mounted video element and video retry/playback effect. Lo-fi Effects off pauses music/video playback. The Lofi poster was removed; do not use `cozy_moonlit_study_night_scene-old.png` for the theme background.
- `LaunchOverlay` owns its internal launch status state; `launchingAppRef` in `useGamepadNavigation` gates main gamepad input while a launch overlay is active.
- `useCustomArt` owns custom art maps/refs, custom art loading, cached art hydration, SGDB fetch batching, and clear-art reset.
- `useAudioFeedback` owns WebAudio preload/playback for UI, alt UI, game launch, app-loaded/startup-finished, and launch-success sounds. It accepts a profile ref and routes playback through per-theme detune/filter/gain shaping from `src/audio/audioProfiles.ts`; call sites still use `playSound`, `playSoundAlt`, `playSoundGameStart`, `playAppLoadedSound`, and `playLaunchSuccessSound`.
- `usePersistentJson` owns localStorage JSON state; currently used for `liftoff_heroCustomType`.
- `useAppSettings` owns settings state/ref bootstrap, auto UI scale resolution, save/update helpers, language sync, default tab loading, and scan-toggle refresh keys.
- `useStartupBootstrap` owns splash loading state, splash exit timing, `isReadyRef`, the app-loaded sound trigger, `set_gamepad_ready`, and the load-error splash fallback.
- `useModalState` owns only modal state and mirrored refs.
- `App.jsx` owns `appPaused`, which is `!!launchingApp || !windowFocused`. It pauses launch-time app chrome animations, animated hero media, and passes the pause state to `AppBackground`.

## Background Component Map

All animated theme backgrounds live in `src/components/backgrounds/` and are barrel-exported from `src/components/backgrounds/index.ts`.

| Theme | Component | File |
|-------|-----------|------|
| `aurora` | `AuroraBg` | `AuroraBg.tsx` |
| `synthwave` | `SynthwaveBg` | `SynthwaveBg.tsx` |
| `cyberpunk` | `CyberpunkBg` | `CyberpunkBg.tsx` |
| `forest` | `ForestBg` | `ForestBg.tsx` |
| `webcore` | `WebcoreBg` | `WebcoreBg.tsx` |
| `space` | `SpaceBg` | `SpaceBg.tsx` |
| `sky` | `SkyBg` | `SkyBg.tsx` |
| `wash` | `WashBg` | `WashBg.tsx` |
| `cinder` | `CinderBg` | `CinderBg.tsx` |
| `plasma` | `PlasmaBg` | `PlasmaBg.tsx` |
| `lofi` | `LofiBg` | `LofiBg.tsx` |

**Barrel export** (`src/components/backgrounds/index.ts`) must export every component. `AppBackground.tsx` imports only from this barrel.

**Future themes** follow the same pattern: one file per theme, one named export, props typed from `../../types` when needed.

### Recent Behavioral Fixes To Preserve

- Clear Art Cache loading modal:
  - Renders in the primary overlay stack.
  - Uses explicit backdrop/panel layers and real modal background, not `theme.card`.
  - Uses the app UI font.
- Clear Recently Played:
  - Backend `clear_recents` clears both `recents.json` and `recent_games.json`.
  - Frontend shows the loading modal, clears `recent` and `recentGames`, and resets hero index.
- Game grid scroll jitter:
  - Vertical scroll helper measures focused cards by layout box instead of transformed visual box.
  - This avoids one/two-pixel vertical nudges while moving horizontally through scaled focused covers.
- Games/Apps keep-mounted tab panes:
  - Games and Apps can stay mounted to reduce Home tab switch delay, but only the active pane may receive `tabScrollRef` and `focusedCardRef`.
  - Inactive library panes must use private scroll/card refs and `LibraryViewContent` memoization so hidden grids do not steal gamepad focus ownership or rebuild while inactive.
  - Keep Games and Apps filtered data split from Home's all-apps list; passing the Home list into hidden library panes recreates the Home-switch lag.
- Home hero gamepad scroll:
  - Returning focus to Home hero also resets the outer scroller so the hero top margin is visible.
- Semi-immersive Home snap slot:
  - `semiHome` uses a fixed `.semi-home-slot` for recents and collection rows; the outer Home scroller stays `overflowY: hidden`.
  - Slot height is calculated from `home_cover_scale`, `ui_scale`, card aspect ratio, collection label height, focus bleed, shadow bleed, and bottom-bar clearance. Hero height must use the same `SEMI_SLOT_H` basis so scaling cards resize the hero instead of overlapping it.
  - Do not reintroduce the old `55vh` spacer or page-flow recents in semiHome.
  - Horizontal shelves inside the slot need internal vertical padding because `overflow-x: auto` clips vertical shadows.
- Launch overlay input isolation:
  - `launchingAppRef` blocks main gamepad navigation while `LaunchOverlay` is open.
  - `closeLaunchOverlay` suppresses currently held gamepad buttons until release, so pressing `A` on "Got it" cannot launch the focused grid item underneath.
- Launch focus handoff pause:
  - While launching or blurred, `appPaused` pauses animated hero media and pauses Lofi music/video through `AppBackground`. The `app-launch-paused` root class is only applied during an actual launch so startup/focus probes cannot freeze Home animations.
- Post-launch return cooldown:
  - Returning focus after LiftOff launched an app/game sets `launchReturnCooldownUntil` for 1.8 seconds.
  - Held gamepad buttons are snapshotted into `suppressUntilRelease`, preventing stale confirm inputs from immediately launching another item.
- Onyx focus rings:
  - `FocusRing` respects the Onyx effects toggle (`settings.stars_enabled`): effects off renders a static accent border instead of animated focus.
  - Regular app/tab-sized Onyx focus uses the shared conic spin ring. Wide Settings rows must pass `wide` so they use the SVG perimeter-stroke path; the conic ring stretches into horizontal bands on full-width rows.
  - Keep `AppListItem` row focus on the regular conic ring to match selected app/subtab behavior; only settings-style full-width rows should use the wide stroke path.
- Win9X app list rows:
  - In list mode, `AppListItem` rows must stay opaque for `surfaceStyle === "win9x"` and should not apply backdrop blur. Use the Win9X panel surface instead of translucent rgba fills.
- Apps list focus:
  - `AppListItem` row focus must remain visible on busy/dark surfaces such as Plasma, Glass, and Obsidian without using oversized borders or a left rail.
  - Current row focus uses a 1px accent border, subtle inset highlight, restrained glow/lift, and bold text. Keep focused row text as `theme.text` so Obsidian/Lo-fi titles do not turn dark.

### Verification Notes

- `npm.cmd run build` passes after the full hook refactor including `useGamepadNavigation` extraction.
- `npm run build` passes after the Games/Apps keep-mounted Home-switch optimization and gamepad scroll fix.
- `npm run build` passes after adding splash loading status text. Vite still warns that the main chunk is larger than 500 kB.
- `cargo check` passed after the `clear_recents` backend change, with only pre-existing unused-function warnings.
- `CHANGELOG.md` may already be modified by the user; do not overwrite or revert it unless explicitly asked.

### Known Bugs / Warnings

- `npx.cmd tsc --noEmit` currently fails with TS1261 because the filesystem has `src/components/ui/gamepad.tsx`, while several imports and the UI barrel reference uppercase `Gamepad` (`../components/ui/Gamepad`, `./ui/Gamepad`, `./Gamepad`). Windows resolves this at runtime, but TypeScript treats the case-only path mismatch as conflicting file identities. The fix is deferred; when ready, choose one casing and update the filename plus every import/export consistently.

---

## Architecture

### Backend (`src-tauri/src/lib.rs`)

**Key data structures:**
- `AppEntry` — `{ id, name, icon_base64, launch_path, app_type, source }`
  - `app_type`: `"game"` | `"app"`
  - `source`: `"steam"` | `"xbox"` | `"uwp"` | `"desktop"` | `"battlenet"` | `"gog"` | `"epic"` | `"cloud"`
- `RecentEntry` — `{ id, name, launch_path, app_type, launched_at }` (no icon — look up via `allAppsRef` in frontend)
- `BatteryInfo` — `{ percent: u32, charging: bool }`
- `Settings` — accent/theme/background fields; scan toggles; launch/default-tab/repeat behavior; `animated_heroes` (`"static"` | `"animated"` | `"custom"`); `ui_scale` (Option<f32> in Rust; frontend fills auto-detected value); localization/time/status display fields; granular layout fields (`wide_layout`, `wide_topbar`, `wide_games`, `wide_apps`, `wide_settings`, `wide_bottombar`); Home fields (`home_mode`, `show_home_recents`, `show_recent_games_only`, `home_section_title_size`, `home_pinned_pos`, hero/collection/cover toggles); card scale/list fields (`home_cover_scale`, `game_cover_scale`, `app_cover_scale`, `app_list_view`, `app_list_cols`); bar/tab fields (`topbar_background`, `bottombar_background`, `hide_bottom_bar`, `nav_bumpers_pos`, `tabbar_show_buttons`, `tabbar_text_tabs`, `tabbar_with_background`, `tabbar_background_compact`, `tabbar_font_weight`, `tabbar_icon_mode`, `tabbar_label_case`, `bottombar_alignment`, `bottombar_compact`); Onyx fields (`onyx_top_light`, `onyx_flat_settings`); gamepad icon fields; `surface_style`.
- **All Settings fields must be present in both the Rust `Settings` struct (`lib.rs`) and the TypeScript `Settings` interface (`types.ts`). Missing Rust fields cause serde to silently drop those values on save, resetting them to defaults on next load.**
- **When adding a new Settings field in Rust, also add it to the `impl Default for Settings` block (around line 207 in `lib.rs`). The compiler will error with E0063 "missing fields in initializer" if omitted — always fix this before committing.**

**Persistent storage** (all in `%LOCALAPPDATA%/LiftOff/`):
- `pins.json` — Vec<String> of pinned app IDs
- `hidden.json` — Vec<String> of hidden app IDs
- `recents.json` — Vec<RecentEntry> (all recent launches — drives the Home tab recents shelf)
- `recent_games.json` — Vec<RecentEntry> (games only — drives the hero on Home; capped at 20)
- `custom_names.json` — HashMap<String, String> of user-defined name overrides for any app/game ID. `rename_app` updates this file and `get_all_apps` applies overrides after scanning.
- `custom_categories.json` — HashMap<String, CategoryOverride> of user recategorization overrides keyed by app/game ID. `CategoryOverride { app_type: Option<String>, source: Option<String> }` (both `#[serde(default)]`). `set_app_category` writes it; `get_all_apps`/`get_apps` apply it after scanning + dedup + name overrides, mutating `app_type`/`source` in place only (never `id` or `launch_path`). Lets the user move titles between Games/Apps and/or force a source tag, persisted and reapplied on every scan (same pattern as `rename_app`).
- `art_cache.json` — HashMap<String, String> (game name → local disk path for grid art, or remote URL fallback)
- `hero_cache.json` — HashMap<String, String> (game name → local disk path for static hero, or remote URL fallback)
- `hero_animated_cache.json` — HashMap<String, String> (game name → local disk path for animated hero .webm, or remote URL fallback)
- `custom_art.json` — HashMap<String, String> (app ID → full data URL, e.g. `data:image/jpeg;base64,...`)
- `settings.json` — Settings struct
- `art/grid/` — downloaded grid cover images (e.g. `game_name.png`)
- `art/hero_static/` — downloaded static hero images
- `art/hero_animated/` — downloaded animated hero media (.webm, .mp4, .gif, .webp)

**Tauri commands:**
- `get_all_apps` — scans all sources, returns ALL apps including hidden ones. **This is the only scan called on startup** — hidden filtering is done client-side in JS using the `get_hidden` result.
- `get_apps` — same scan but filters hidden IDs before returning. Still registered but no longer called on startup.
- `launch_app(path, id, name, app_type)` — routes by path type (see launch path handling below). Always updates `recents.json`; also updates `recent_games.json` (dedup by id, cap 20) when `app_type == "game"`.
- `get_recents` / `clear_recents`
- `get_recent_games` — returns `Vec<RecentEntry>` from `recent_games.json`
- `rename_app(id, name)` — persists display-name overrides for all app/game types in `custom_names.json`; for `custom_` entries it also updates `custom_data.json`. Use this for current rename UI instead of only `rename_custom_app`.
- `get_custom_categories` — returns `HashMap<String, CategoryOverride>` of recategorization overrides.
- `set_app_category(id, app_type, source)` — upserts (or, when both `None`, removes) a recategorization override in `custom_categories.json`. `app_type` is validated to `"game"`/`"app"` (other values dropped); `source` must be non-empty. Reapplied after every scan; never touches `launch_path`.
- `get_pins` / `toggle_pin(app_id)`
- `get_hidden` / `toggle_hidden(app_id)`
- `fetch_game_art(game_name)` — returns `GameArtBundle { grid: Option<String>, hero_static: Option<String>, hero_animated: Option<String> }`. Makes one SGDB search call, then separately fetches `types=static` and `types=animated` heroes. Each image/video is **downloaded to disk** (`art/grid/`, `art/hero_static/`, `art/hero_animated/`) via `download_file()` and the local path is returned. Falls back to remote URL if download fails. Cache entries = local path; empty string = checked/none; absent = uncached.
- `get_settings` / `save_settings(settings)`
- `get_screen_resolution` — returns `ScreenResolution { width: i32, height: i32 }` via `GetSystemMetrics(SM_CXSCREEN/SM_CYSCREEN)`. Used by frontend to auto-detect a sensible UI scale on first launch.
- `clear_art_cache` — clears `art_cache.json`, `hero_cache.json`, `hero_animated_cache.json`, and deletes the entire `art/` directory.
- `get_custom_art` — returns full `HashMap<String, String>` (id → data URL)
- `set_custom_art(id, data)` — upserts one entry; `data` is the full data URL from `FileReader.readAsDataURL`
- `clear_custom_art(id)` — removes one entry (reset to SteamGridDB default)
- `get_battery` — returns `BatteryInfo { percent, charging }` via Win32 `GetSystemPowerStatus`. `ACLineStatus == 1` = charging. `BatteryLifePercent == 255` = unknown (fully charged on some devices) — handled by returning 100 when charging.
- `open_osk` — opens TabTip / on-screen keyboard
- `set_gamepad_ready` / `set_frontend_active(active)`

**Launch path handling (`launch_app`):**
Priority order of `else if` branches:
1. `bnet-exec:` prefix → `Command::new(exe).arg("--exec=launch CODE")` + `CREATE_NO_WINDOW`; `child_pid = 0`
2. `steam://` prefix → `explorer.exe steam://...` at medium integrity; `child_pid = 0`
3. `com.epicgames.launcher://` prefix → `ShellExecuteW("open", path)` through Epic's registered URL handler; `child_pid = 0`
4. `shell:` prefix → `cmd /C start "" "shell:..."` (UWP/Xbox); `child_pid = 0`
5. `.lnk` extension → `ShellExecuteW("open", path)` — lets Windows resolve the shortcut natively including embedded arguments (e.g. Discord's `Update.exe --processStart Discord.exe`). **Do NOT use `cmd /C start` for .lnk — it drops shortcut arguments.**; `child_pid = 0`
6. `://` anywhere → `ShellExecuteW("open", path)` for other URI schemes; `child_pid = 0`
7. Otherwise → direct `Command::new(&path)` + `CREATE_NO_WINDOW`; `child_pid = child.id()`

**Launch window detection (`launch_app`):**
- On every launch, `snapshot_visible_windows()` records existing top-level visible windows via `EnumWindows` before the spawn.
- For direct exe spawns, the child PID is captured. For all indirect launches, `child_pid = 0`.
- After spawning, a background thread handles the overlay dismiss:
  - **`app_type == "app"` with `child_pid == 0`** (i.e. `.lnk`, `shell:`, URI apps): waits 1.5 seconds then emits `"launch-success"` unconditionally. These apps are often already running in the tray, use indirect process spawning, or otherwise don't produce a detectable new window. Fast-dismiss avoids false "Failed" states.
  - **`http://` or `https://` launches with `child_pid == 0`**: waits 1.5 seconds then emits `"launch-success"` unconditionally, even when `app_type == "game"`, because browser-opened cloud bookmarks do not produce a reliable distinct game window to poll.
  - **All other cases** (direct exe apps with a PID, and non-browser games): polls `poll_for_window(pid, existing, our_hwnd)` every 250ms for up to 15 seconds. On success: `SetForegroundWindow` + `ShowWindow(SW_SHOW)`, then emits `"launch-success"`. On timeout: emits `"launch-failed"`.
- Frontend `LaunchOverlay` listens for both events and transitions between `"launching"` and `"failed"` states accordingly.

**Important implementation notes:**
- All `Command::new` spawns use `CREATE_NO_WINDOW` (`0x08000000`) flag — critical to prevent console flashes
- URI launches (anything containing `://`) use an explicit Steam branch or `ShellExecuteW` with the `"open"` verb for registered protocol handlers such as Epic — avoids `cmd /C start` mis-parsing `//` in protocol URLs
- `.lnk` shortcuts use `ShellExecuteW` (not `cmd /C start`) — shortcuts can embed arguments in their target (e.g. Discord), which `cmd /C start` drops
- UWP icons extracted from disk PNG assets (not `SHGetFileInfoW` which doesn't work for UWP)
- Xbox Game Pass games identified by `MicrosoftGame.config` presence or `app_id == "Game"`
- `scan_folder()` excludes paths containing `target\release` or `target/release` to hide dev build
- `get_apps()` respects all `scan_*` settings toggles and filters hidden IDs before returning
- Steam install path resolved via `get_steam_install_path()` — reads `HKLM\SOFTWARE\WOW6432Node\Valve\Steam` → `InstallPath`, falls back to `HKLM\SOFTWARE\Valve\Steam`, then two hardcoded paths. Works for non-default installs.
- UWP scan: `$app = if ($appNodes -is [array]) { $appNodes[0] } else { $appNodes }` — deduplicates multi-Application packages (otherwise multi-entry packages appear twice)
- UWP name resolution: `Get-StartApps` is called once at the top of the scan and stored in `$startApps` (AUMID → name). When a package's manifest `DisplayName` is an unresolved `ms-resource:` string (e.g. Windows Settings → `windows.immersivecontrolpanel`), the script looks up the AUMID in `$startApps` first before falling back to `$pkg.Name`. This ensures system apps like Settings appear with their human-readable names instead of being filtered by `is_valid_display_name`.
- PowerShell scan uses `-ExecutionPolicy Bypass` to avoid policy blocks on some systems

**Battle.net scanning (`scan_battlenet_games`):**
- Scans `HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall` for entries where `UninstallString` contains `Blizzard Uninstaller`
- Skips Battle.net launcher itself (`DisplayName == "Battle.net"`)
- `launch_path` = result of `find_main_exe_in_dir(install_location)`, falling back to `battlenet://{uid}` if no exe found
- `find_main_exe_in_dir` skips exes containing: `unins`, `crash`, `update`, `error`, `report`, `helper`, `agent`, `redist`, `setup`, `install`, `vcredist`; prefers exes with "launcher" in the name, then shortest name
- IDs formatted as `battlenet:{name_slug}`
- `source: "battlenet"` — shows in "Battle.net" subtab and "All" on Games tab; excluded from "Other"

**GOG scanning (`scan_gog_games`):**
- Scans `HKLM:\SOFTWARE\WOW6432Node\GOG.com\Games` and `HKLM:\SOFTWARE\GOG.com\Games` for installed game keys.
- Uses `gameName`, `path`, `exe`, and `dependsOn`; entries with `dependsOn` are treated as DLC/expansion records and skipped.
- Launches via the registry `exe` when it exists, falling back to `find_main_exe_in_dir(path)`. Duplicate entries resolving to the same executable are collapsed.
- `source: "gog"` — shows in the "GOG" subtab and "All" on Games tab; excluded from "Other".

**Epic scanning (`scan_epic_games`):**
- Reads `.item` JSON manifests from `%PROGRAMDATA%\Epic\EpicGamesLauncher\Data\Manifests`.
- Requires `DisplayName`, `InstallLocation`, `LaunchExecutable`, `AppName`, `bIsApplication != false`, base-game `MainGameAppName` when present, and an executable that still exists on disk.
- Launches through `com.epicgames.launcher://apps/{AppName}?action=launch&silent=true` via `ShellExecuteW("open")` so Epic handles auth, overlays, and anti-cheat setup.
- `source: "epic"` — shows in the "Epic" subtab and "All" on Games tab; excluded from "Other".

**Icon extraction (`extract_icon_base64`):**
- **Approach:** `SHGetFileInfoW` → `HICON` (try **`SHGFI_JUMBOICON`** first, then fall back to **`SHGFI_LARGEICON`**), then **`DrawIconEx`** onto a square DIB, then **`GetDIBits`** from that bitmap, BGRA→RGBA swap, **`lodepng::encode32`**.
- **Export size:** `ICON_EXPORT_PX` (currently **128**) — tunable in `lib.rs`.
- **UWP:** `extract_uwp_icon_base64` prefers **larger** `scale-*` variants (200 → 150 → 125 → 100).

**`search_sgdb_art` command (SGDB browser):**
- `SgdbArtItem` struct includes `mime: Option<String>` — used as primary signal for animated detection
- `SgdbArtResult` struct includes `is_animated: bool`
- Hero fetch order: animated endpoint (`?types=animated`) is fetched **first** and all its URLs are inserted into `forced_animated_urls: HashSet<String>`; static + alternate endpoints follow (deduped). This ensures extensionless SGDB CDN URLs are correctly flagged as animated.
- `is_animated` = `forced_animated_urls.contains(&item.url)` OR `mime` starts with `video/` or is `image/gif`/`image/webp` OR URL extension fallback (`.mp4`, `.webm`, `.gif`, `.webp`)
- Animated PNG items filtered out: `!(is_animated && url_base.ends_with(".png"))`
- Thumb sanitization: if raw thumb ends with `.webm` or `.mp4`, replace with `item.url` so the React side detects it correctly

**`animated_heroes` setting migration:**
- Changed from `bool` to `String` (`"static"` | `"animated"` | `"custom"`) with custom serde deserializer `deser_animated_heroes` for backward compat (JSON `true` → `"animated"`, `false` → `"static"`)
- Default: `"animated"`

**`tauri.conf.json` — autoplay policy:**
- `additionalBrowserArgs` was previously set to `--autoplay-policy=document-user-activation-required` but has been **removed** — it fought against the imperative `vid.play()` calls and was the root cause of hero video stutter. Playback is now managed entirely via refs and JS, so the WebView2 restriction is unnecessary.

**SGDB API key** is read at compile time via `env!("SGDB_API_KEY")` in `lib.rs`. The key lives in `src-tauri/.env` (gitignored). `build.rs` reads `.env` and passes each key as `cargo:rustc-env=`.

---

## Frontend (`src/App.jsx`)

### Constants (top of file)
- `APP_VERSION = "2.0.0-alpha.4.1"` — compared against GitHub Releases API for update checks
- `GITHUB_REPO = "PixelateWizard/LiftOff"` — used for update check and releases link

### State
- `tab` — "Home" | "Games" | "Apps" | "Settings"
- `apps` — visible AppEntry list (all apps minus hidden, filtered client-side from `allAppsRef`)
- `recent` — recently launched apps (all types — drives the Home tab recents shelf)
- `recentGames` — games-only recent list loaded from `recent_games.json`; drives the Home tab hero. Independent of `recent` so a user who mostly launches apps still sees games in the hero. Fallback on first install: `visible.filter(a => a.app_type === "game").slice(0, 6)`. Updated locally on game launch (prepend, dedup by id, cap 20).
- `pins` — pinned app IDs
- `hidden` — hidden app IDs
- `gameSourceTab` — "All" | "Steam" | "Xbox" | "Battle.net" | "GOG" | "Epic" | "Cloud" | "Other" | custom source / collection name (Games tab sub-filter)
- `showHideModal` — boolean (true while Manage modal is open)
- `settings` — Settings object
- `gameArt` — { [appId]: url } SGDB cover/grid art (600×900); url is a local asset:// path via `convertFileSrc`, or https:// fallback
- `heroStatic` — { [appId]: url } SGDB static hero banner art (landscape)
- `heroAnimated` — { [appId]: url } SGDB animated hero banner (.webm); used when `settings.animated_heroes` is true
- `customArt` — { [appId]: dataUrl } user-set cover art; persisted via `custom_art.json`
- `artPickerApp` — AppEntry | null; truthy when the art picker modal is open
- `contextMenu` — `{ x, y, app }` | null; truthy when right-click context menu is open
- `focusSection` — "hero" | "pinned" | "recent" | "grid" | "subtabs" | "home_collections"
- `focusIndex` — current position within section
- `homeColFocusRow` / `homeColFocusCol` — row/column within the home collections grid
- `updateStatus` — null | "checking" | "up_to_date" | "available" | "error"
- `updateInfo` — latest version string when an update is available
- `libraryRefreshStatus` — null | "scanning" | "done"
- `charging` — boolean, whether device is plugged in
- `iconColors` — `{ [appId]: { r, g, b } }` — dominant color sampled from each non-game app's icon; used to tint app card backgrounds

### Startup sequence
On mount, `Promise.all([invoke("get_screen_resolution"), invoke("get_settings")])` fires first to resolve `ui_scale` (auto-detected from screen if never saved), then `Promise.all([invoke("get_all_apps"), invoke("get_hidden")])` alongside parallel calls for `get_recents`, `get_recent_games`, `get_pins`, and `get_custom_art`. When the all-apps resolve:
1. `allAppsRef.current` is populated with all apps (including hidden)
2. Hidden IDs are stored; visible apps = `all.filter(a => !hidden.includes(a.id))`
3. If `recentGamesRef.current` is still empty (fresh install / no `recent_games.json` yet), it falls back to `visible.filter(a => a.app_type === "game").slice(0, 6)`
4. `fetchGameArt` fires for all visible games in **batches of 4** (BATCH=4) — each call returns `{ grid, hero_static, hero_animated }` bundle; urls are converted via `toUrl()` (local asset:// path or https:// passthrough); results are **accumulated per batch** then applied in a single `setState` call per type (max 3 re-renders per batch, not 12); populates `gameArt`, `heroStatic`, `heroAnimated`
5. Splash exits after 800ms

`toUrl(pathOrUrl)` — converts Rust-returned paths: if starts with "http" passes through as-is; otherwise calls `convertFileSrc(path)` to get a Tauri `asset://` URL loadable by the browser.

Battery polls every **10 seconds** (was 60s).

### Gamepad Input System
Two parallel input paths:
1. **RAF poll** (`useEffect` with `requestAnimationFrame`) — reads Gamepad API directly, handles hold-repeat, fires `handleNavRef.current(key)`
2. **Tauri listeners** — `gamepad-button` and `gamepad-axis` events from backend

**Button mapping:**
- A (btn 0) = Enter/launch
- B (btn 1) = Escape/back
- X (btn 2) = ButtonX (pin)
- Y (btn 3) = ButtonY (search)
- LB (btn 4) = BumperLeft (prev tab)
- RB (btn 5) = BumperRight (next tab)
- LT (btn 6) = TriggerLeft (prev source sub-tab on Games)
- RT (btn 7) = TriggerRight (next source sub-tab on Games)
- Select/Back (btn 8) = Select (open art picker on focused game card — Games tab grid/pinned); shown as "BACK · Art" in the bottom controls bar
- Menu/Start (btn 9) = Start (open Manage modal on Games/Apps)

### Context Menu
- Right-clicking any card (game or non-game) shows a floating context menu at cursor position
- Items: **Open** (launches the app), **Pin / Unpin** (toggles pin), **Change Art** (opens `ArtPickerModal` — all app types)
- **Recategorize:** the menu shows **Move to Games** (when the item is an app) or **Move to Apps** (when it's a game), plus **Reset to detected category** when an override already exists for that id. Moving a `uwp`-source title to Games defaults its source to `"xbox"` (the common Spiritfarer-type case); moving to Apps clears the source override. Handler is `applyCategoryOverride(id, appType, source)` in `App.jsx` → `invoke("set_app_category", { id, appType, source })` then reloads `get_custom_categories` and calls `refreshLibrary()`. `categoryOverrides` state (loaded on mount via `get_custom_categories`) gates the Reset item. Launch behavior is never changed — categorization only.
- Non-game app cards in the Apps tab have `onContextMenu` wired directly on their `<div>` (not via GameCard)
- `contextMenu` state: `{ x, y, app }` — clicking the backdrop or any item closes it
- Menu position is clamped to `window.innerWidth - 180` / `window.innerHeight - 100` to stay on-screen

### Navigation Sections (Games/Apps tab)
`subtabs` → `pinned` → `grid`
- Switching main tabs (LB/RB) lands on **first pinned item** if any pins exist, otherwise **first grid item**
- LT/RT source switches from Games, including while focus is in the toolbar, land on first pinned item for `All` when available; other source switches land on the first grid item. Apps collection switches land on the first grid item.
- Navigating up from `pinned` or first row of `grid` goes to `subtabs`
- `subtabs` row: source pills (Games only) + single "Manage" button
- Source pills auto-switch on focus (no Enter needed)

### Art Picker Modal (`ArtPickerModal`)
- Defined **outside** `App` — stable component reference, no remount risk
- Opened by pressing **Select (btn 8)** while any card is focused in `grid` or `pinned` section on Games or Apps tab, or via **"Change Art"** in the right-click context menu (available for all app types)
- **Layout:** side-by-side — 110px-wide preview on the left, action buttons stacked on the right. Everything visible without scrolling; no gamepad scroll needed.
- Props: `app`, `currentArt` (customArt || gameArt fallback), `hasCustomArt`, `cropMode` ("portrait" | "square"), accent/theme/glass, `onClose`, `onSet(id, dataUrl)`, `onReset(id)`
- `cropMode="portrait"` (default, games): canvas center-crops to **600×900** JPEG 88%. Preview `aspectRatio: "2/3"`.
- `cropMode="square"` (non-game apps): canvas center-crops to **500×500** JPEG 88%. Preview `aspectRatio: "1"`.
- Caller passes `cropMode={artPickerApp?.app_type === "game" ? "portrait" : "square"}` at the render site.
- "Reset to Default" button only renders when `hasCustomArt` is true and no new file is pending
- B (Escape) closes the picker; main handleNav intercepts all other keys while `artPickerAppRef.current` is set
- `closeArtPicker()` snapshots held buttons into `suppressUntilRelease` to prevent bleed back into main nav
- Art priority everywhere: `customArt[id]` → `gameArt[id]` — applies to GameCard, hero, pinned pills, recent row, and LaunchOverlay

### Modal System (`HideModal`)
- **Unified "Manage" modal** — shows all apps (visible + hidden) in one list. Checked = visible, unchecked = hidden.
- `HideModal` defined **outside** `App` function — stable component type prevents re-mount on clock re-renders
- `allAppsRef` — ref populated on startup via `get_all_apps()`; used by modal to look up full name/icon for hidden entries
- Modal has its own RAF gamepad poll with `startReleased` guard and `suppressUntilRelease` bleed prevention

### Library Refresh
- `refreshLibrary()` — re-runs `Promise.all([get_all_apps, get_hidden])`, updates all app state + triggers `fetchGameArt` for new games
- Triggered automatically when any scan toggle (`scan_steam`, `scan_xbox`, `scan_uwp`, `scan_desktop`) is changed
- Also available as a manual "Refresh Library" button in Settings → LIBRARY section
- While scanning, a **blocking overlay modal** renders (`zIndex: 5000`) with animated dots and "Refreshing library…" text — prevents interaction during scan

### Key Helpers
- `triggerLaunch(app, rec)` — plays launch sound, calls `launchApp`, updates `recent`/`recentRef`. Also updates `recentGames`/`recentGamesRef` when `app.app_type === "game"` (prepend, dedup by id, cap 20). Has 5-second double-launch guard.
- `togglePin(app)` — calls backend, updates state
- `toggleHidden(appId)` — calls backend, removes/restores from apps state (uses `allAppsRef`)
- `refreshLibrary()` — re-scans library, shows blocking overlay, sets status to "done" for 2.5s
- `checkForUpdates()` — fetches GitHub Releases API, compares to `APP_VERSION`; Stable checks `/releases/latest`, while Alpha / Beta checks the releases list so prereleases can surface
- `updateSetting(key, value)` — saves setting + triggers refresh if key is a scan toggle
- `closeArtPicker()` — clears `artPickerApp`, snapshots held buttons into `suppressUntilRelease`
- `toUrl(pathOrUrl)` — converts Rust path to browser-loadable URL: https:// passes through, otherwise `convertFileSrc(path)` returns `asset://` URL

### Settings Items
Types: `accent`, `cycle`, `toggle`, `divider`, `action`, `link`, `info`, `update`, `refresh`, `attribution`, `controller_test`, `slider`

- `refresh` type: "Refresh Library" — shows scanning status on right, triggers `refreshLibrary()`
- `update` type: "Check for Updates" — shows check status, opens releases page if update available
- `controller_test` type: renders `ControllerTestWidget` inline; excluded from `navigableSettings` (not focusable by controller)
- `slider` type: `{ key, label, min, max, step }` — renders a horizontal track with thumb; left/right d-pad adjusts by `step`; displays `Math.round(val * 100)%`
- `link` type keys: `coffee`, `github`, `discord`

**Settings order (Appearance section):** THEME | Accent -> Theme -> Effects -> UI Motion -> Surface Style | HOME | Immersive Home -> Show Cover on Home -> Show Pinned on Home -> Show Collections on Home (+ sub-toggles) | LAYOUT | Wide Layout -> UI Scale -> Reset Scale -> Home Cover Scale -> Game Cover Scale | NAVIGATION BAR | Hide Bottom Bar -> Transparent Bars (+ sub-toggles) -> Nav Bumpers Pos | SECTION TAB BAR | Tabbar Badges -> Tabbar Label Case -> Tabbar Text Tabs -> Tabbar Background -> Bottom Bar Alignment

**`animated_heroes` setting:**
- Type: `cycle`, options `["static", "animated", "custom"]`, label "Hero Art Mode"
- `"static"` — all heroes show static banner
- `"animated"` — all heroes show animated banner where available
- `"custom"` — per-game preference stored in `heroCustomType` localStorage key (`{ [appId]: "animated" | "static" }`)

**UI Scale (`ui_scale`):**
- Stored as `Option<f32>` in backend (None = not yet set). Frontend auto-detects from screen resolution: `Math.min(2.0, Math.max(0.75, Math.min(res.width/1920, res.height/1080)))` via `get_screen_resolution`.
- Applies as `transform: scale(ui_scale)` on root div with compensating `width/height: 100/ui_scale vw/vh` to avoid scroll bars.
- "Reset Scale to Auto" action sets `ui_scale` to the current `autoScaleRef.current` (computed at startup, not recalculated on demand).
- **`scrollIntoView` + CSS transform pitfall:** `Element.scrollIntoView()` scrolls all scrollable ancestors, including the scaled root div (`outerRef`). Under `transform: scale(N)`, Chromium can animate the wrong ancestor and slide content under sticky UI. Current main card/grid navigation avoids `scrollIntoView`: it measures the focused card against `homeScrollRef` / `tabScrollRef`, divides by `settings.ui_scale`, and scrolls only the active inner scroller with fixed top/bottom clearance. Remaining focused-row/pinned cases that still use `scrollIntoView` temporarily set `outerRef.current.style.overflowY = "hidden"`, then restore it and reset `outerRef.scrollTop = 0`.
- **Horizontal shelf focus:** Home shelves use explicit container refs for gamepad-driven horizontal scrolling. `pinnedShelfRef` handles regular/immersive pinned pills; `recentShelfRef` handles regular Home recents and immersive drawer recents. When focus lands on index 0, scroll the shelf to `left: 0` so the first item returns to its designed starting padding.

### Controller Test Widget (`ControllerTestWidget`)
- Defined **outside** `App` — avoids remount on every D-pad press (SettingsScreen re-creates itself on each nav keypress since it's defined inside App)
- Module-level `_cachedGpSnap` persists last-known gamepad snapshot across remounts — prevents blank flash
- Uses `getBestGamepad()` (≥4 buttons heuristic) to skip non-controller HID devices (e.g. Jabra headset adapters)
- Shows: device name, mapping type, all buttons (highlighted when pressed), all axes as bars
- Renders inside the CONTROLLER section of SETTINGS_ITEMS; excluded from `navigableSettings` (not controller-focusable)

### App Cards (non-game, Apps tab)
- Both the **pinned row** and **main grid** render non-game apps with dark frosted-glass cards
- `sampleIconColor(base64)` — module-level async function. Draws the icon onto an offscreen 16×16 `<canvas>`, averages non-transparent pixels (alpha > 30), resolves to `{ r, g, b }` or `null`. 3-second timeout fallback; catches canvas security errors. Called for all non-game apps after `setApps` (both initial load and library refresh); results streamed into `iconColors` via `setIconColors(prev => ({ ...prev, [id]: color }))`.
- **Custom art takes priority**: if `customArt[app.id]` is set, the card renders as a full `object-fit: cover` background image with a `linear-gradient(transparent, rgba(0,0,0,0.75))` overlay at the bottom and the app name over it — same visual pattern as GameCard. `overflow: hidden` on the card clips the image to `borderRadius`.
- When no custom art: dark frosted-glass style. Card style: `background: rgba(255,255,255,0.04)`, `backdropFilter: blur(16px)`, `border: 1px solid rgba(r,g,b,0.18)` when color available (fallback `rgba(255,255,255,0.08)`) (unfocused); focused state overrides with accent glow. No radial gradient overlay. Icon is centered in the full card height; label is positioned absolutely at `bottom: 0` so the icon is not pulled off-center.
- Falls back to plain `glass` style if `iconColors[app.id]` is undefined.
- `PinBadge` sits at `position: absolute, top: 6, right: 6, zIndex: 2` — not affected by `overflow: hidden` since it's within card bounds.
- Icon size: **64px**; label `fontSize: 11`.
- **Do not apply to GameCard** — tinted cards are only for non-game app cards in the Apps tab.
- The same tinting and custom-art support applies to non-game recent cards on the **Home tab** (`homeFilteredRecent` render) — when `customArt[app.id]` is set, the recent card switches to the same cover-image layout as game recent cards (portrait, `objectFit: cover`). Icon size 40px for the icon-only fallback. Card dimensions (`CARD_W`/`CARD_H`) stay fixed to stay flush with adjacent game cards. Recent render sites should look up the full `AppEntry` from `allAppsRef` before rendering `AppIcon`, because `RecentEntry` itself does not include `icon_base64`.

### Gamepad Helpers (module-level)
- `getBestGamepad()` — filters `navigator.getGamepads()` to the first device with ≥4 buttons; skips audio adapters and HID dongles
- `readGpState(gp)` — normalises button map for both standard (XInput) and non-standard (DirectInput/hat-switch) controllers:
  - D-pad: `btn(12-15)` OR `axes[6]/axes[7]` hat-switch (< -0.5 / > 0.5) OR left-stick axes[0]/axes[1]
  - Returns: ArrowUp/Down/Left/Right, Enter, Escape, ButtonX, ButtonY, BumperLeft/Right, TriggerLeft/Right, Select (btn 8), Start (btn 9)

### Theming
- `ACCENTS` — ember, ocean, neon, rose, midnight, nova, steel, lunar (defined in `constants.ts`)
- `THEME_OPTIONS` — `space`, `sky`, `plasma`, `cinder`, `wash`, `aurora`, `synthwave`, `cyberpunk`, `lofi`, `forest`, `webcore`, `onyx`. Themes are environments, not surface materials.
- `THEME_SURFACE_DEFAULTS` — selecting a theme applies a default surface without locking it: Space → Clear, Sky → Aero, Plasma → Glass, Cinder → Glass, Wash → Material. Manual Surface Style changes persist until the next theme selection.
- `normalizeThemeKey()` maps legacy `dark`/`system` → `space`, `light` → `sky`, and legacy theme `ember` → `cinder`.
- `isDarkThemeKey()` returns false for `sky`, `wash`, and `webcore`; all other themes use dark text/surface assumptions.
- Neon accent updated to Xbox-inspired vivid lime-green (`#44d62c`); `lightPrimary: "#1a8a09"` for WCAG AA in light mode
- Silver and white accents have `darkText: true` — when this flag is set, any UI element that uses `accent.primary` as a background fill must use `"#1a1a1a"` instead of `"white"` for text/icon color to maintain accessibility. Pattern: `accent.darkText ? "#1a1a1a" : "white"`. Applied in: active tab pills (`SectionTabBar.tsx`), Launch button, pinned pill focused text, and any other filled button with accent background.
- `ToggleKnob.tsx` has a special dark-mode treatment for light accents (`value && isDark && accent.darkText`): enabled toggles use a dark knob on a dimensional accent track. This is important for Lunar, where a normal white knob on a pale enabled track is hard to distinguish.
- `accent` is computed after `isDark` so `lightPrimary` can be applied: `(!isDark && _baseAccent.lightPrimary) ? { ..._baseAccent, primary: _baseAccent.lightPrimary } : _baseAccent`
- `AccentColors` type in `types.ts` includes `darkText?: boolean`

### Animated Environment Themes
- **Space** — dark, quiet star field; defaults to Clear.
- **Sky** — light cloud field; defaults to Aero.
- **Plasma** — dark, accent-driven electric ribbons plus low-density sparks; defaults to Glass.
- **Cinder** — dark smoldering heat field with layered red/orange glow pockets, drifting cinder particles, and subtle accent undertones; defaults to Glass. Accent affects glow pockets and bright particles at low intensity, but the theme stays warm and smoky rather than becoming a flat accent wash.
- **Wash** — light watercolor paper field. SVG-filtered compound radial gradients simulate warm and cool pigment masses with dried edges, internal density variation, a faint cool cohesion bridge, and a barely visible tertiary hue whisper. Defaults to Material. Wash uses accent-derived tints softly and Material gets gentler off-white card tokens plus low-contrast accent-tinted shadows.
- **Lo-fi** - animated MP4 room scene with optional background music; defaults to Obsidian.
- **Webcore** - Windows XP-inspired sky/cloud field with a LiftOff logo screensaver element; defaults to Win9X.
- `stars_enabled` is still the persisted master toggle for theme effects, but effects off means "static background", not "remove background". The root gets `data-effects="static"` so CSS animations freeze; JS-driven Webcore/Cyberpunk motion receives `effectsEnabled={false}`; Lo-fi keeps the video element and overlay mounted while pausing video playback and music.
- Settings labels change by theme. Space uses `Star Effects`, Sky uses `Cloud Effects`; the other environment themes use `* Effects`.
- Reduced motion is handled in global CSS by collapsing/freeze-targeting animated environment classes such as `.theme-plasma-*`, `.theme-cinder-*`, `.theme-wash-static`, `.theme-wash-float`, `.theme-aurora-*`, `.theme-synthwave-*`, `.theme-cyberpunk-*`, `.theme-forest-*`, `.theme-webcore-*`, `.bg-star`, and `.bg-cloud`.

### Motion Language
- Shared UI motion tokens live in `src/styles/motion.css`, imported once from `src/main.jsx`. Keep new motion primitives out of the injected `app-global-styles` block in `App.jsx`.
- Token names: `--dur-instant`, `--dur-fast`, `--dur-base`, `--dur-slow`, `--ease-standard`, `--ease-decel`, `--ease-accel`, `--ease-spring`, and `--accent-pulse`.
- Primitive classes: `.lo-anim-tab`, `.lo-anim-tab-rev`, `.lo-anim-drill`, `.lo-anim-modal`, `.lo-anim-overlay`, `.lo-anim-pulse`, `.lo-anim-push-in`, `.lo-anim-push-out`, `.lo-anim-pop-in`, and `.lo-anim-pop-out`. They animate only `transform` and `opacity`.
- Root `data-motion` profile mapping is resolved in `App.jsx`: Win9X/Webcore -> `instant`, Material -> `crisp`, Synthwave -> `playful`, everything else -> `standard`. These profiles override only duration/easing tokens; surface tokens stay unchanged.
- Root `data-ui-motion="off"` comes from `settings.ui_motion === false` and zeroes entrance/pulse motion. `prefers-reduced-motion: reduce` collapses motion to 1ms. `data-effects="static"` only kills focus pulse, preserving the distinction between static backgrounds and UI motion.
- Modal motion is centralized in `ModalShell` (`.lo-anim-overlay` backdrop plus `.lo-anim-modal` panel). `LaunchOverlay` keeps its bespoke keyframes but sources timing/easing from the shared motion tokens.
- Games/Apps/Settings tab entries use directional transform-only `.lo-anim-tab` / `.lo-anim-tab-rev` so glass/backdrop-filter card surfaces do not fade through transparent while compositing. Home remains warm-mounted for hero video decode and is not keyed/remounted for tab motion.
- Settings drill-in keys the visible settings panel and applies `.lo-anim-push-in` / `.lo-anim-pop-in` to the incoming panel with a short gamepad input guard. The outgoing panel is not kept visible during the transition because the real app made it read as a ghost menu.
- Focus pulse is applied centrally from `App.jsx` to focused cards, settings rows, and section tabs by temporarily adding `.lo-anim-pulse`. The class renders its animated ring through `::after` so it does not override the target element's own glass background or focus shadow. It skips Onyx and held-repeat movement so it does not compete with Onyx's ring animation or strobe during long scrolls.

### Surface Style System
Four surface options controlled by `settings.surface_style` (`"glass"` | `"aero"` | `"material"` | `"clear"`). Three CSS token objects as `useMemo`s in `App.jsx` adapt to the active style, with an additional `materialTokens` object for Material CSS custom properties:

| Token | Used by | Glass (dark) | Aero (dark) | Material |
|---|---|---|---|---|
| `glass` | game cards, modals, SGDB panels | gradient `16→6%` white, `blur(22px) saturate(180%)` | sharp-knee `36→16→8%` white (knee at 12%), `blur(14px) saturate(160%)`, tight 4px sub-specular | solid `--material-elevation-2`, no blur, subtle border, `--material-shadow-low` |
| `glassBar` | top nav, bottom dock | dark scrim + `blur(28px) saturate(115%) brightness(0.88)` | **hero surface**: sharp-knee `30→14→7%` (knee at 20%), top specular 52%, 7px sub-specular, accent ring 14%, `blur(12px)` | solid `--material-elevation-3`, no blur, `--material-shadow-high` |
| `settingsRowGlass` | settings rows | matte `4.5→2.2%` white + accent tint `2.5→1.0%`, `blur(8px)` | tight-knee `14→7→4%` (knee at 15%, no accent fill), `blur(8px)` | solid `--material-elevation-2`, no blur, `--material-shadow-low` |

**Material derivation:**
```js
const surfaceStyle = settings.surface_style ?? "glass";
const glassEnabled = surfaceStyle !== "clear"; // true for glass, aero, AND material
```
- `"glass"` — classic frosted glass. High blur, gradient fill, rim `rgba(255,255,255,0.22)`.
- `"aero"` — polished transparent acrylic. Lower blur, sharp-knee gradient for a light-from-above feel, **neutral panel fills** (no accent tint), hard 1 px top specular + feathered bloom + dark bottom rim, faint `accent.glow` outer ring at 10–12%.
- `"material"` — solid layered surfaces. No `backdrop-filter`, no glow as depth, near-opaque neutral fills, subtle borders, and 3 elevation levels driven by `--material-shadow-low|medium|high`. Light Material mixes the selected `accent.lightBg` into the page/background neutrals so accent themes remain respected; dark Material uses matte charcoal tones instead of pure black.
- `"clear"` — flat matte. All three tokens return `_flatGlass` (original pre-glass values: `rgba(255,255,255,0.06)`, `blur(24px)`, no inset shadow).

Both `glassEnabled` and `surfaceStyle` are threaded via `ThemeContext`; any component reads them via `useTheme()`.

- **Radius system:** Glass, Aero, and Clear share the rounded UI scale: 16px for nav/bottom bars, hero content cards, cinematic pinned shelf pills, game/app grid cards, and settings rows; 24px for modals/drawers; 8px for cover art inside the hero card; Launch CTA stays pill-shaped (`50%`/999px) outside Material; toggles, dots, and badges stay `50%`. Material uses the tighter paper-card scale: 8px for nav/bottom bars, hero content cards, pinned shelf pills, game/app cards, settings rows, nested tray lower corners (`0 0 8px 8px`), cover art, and Launch CTA; 16px for modals/drawers; toggles/dots/badges stay `50%`.

- `cardBackdropFilter` — derived: `blur(22px) saturate(180%)` (glass), `blur(14px) saturate(160%)` (aero), `undefined` (material), `blur(16px)` (clear).
- **Material tokens** — root style spreads `materialTokens` so components can use `--material-bg-primary`, `--material-bg-secondary`, `--material-elevation-1|2|3`, `--material-inset-bg`, `--material-inset-row`, `--material-inset-row-active`, `--material-inset-top-edge`, `--material-inset-bottom-edge`, and `--material-border-subtle`.
- **Wash Material tokens** — when `resolvedTheme === "wash"`, Material light tokens use softer off-white fills and low-contrast accent-tinted shadows so cards sit above the Wash watercolor field without becoming translucent or glossy.
- **Material nested settings** — `CollapsibleGroup.tsx` and the Home Collections nested settings use fully opaque inset group surfaces, not opacity reductions. Parent rows read as raised cards; nested containers use `--material-inset-bg` plus subtle top-edge inset shadow/highlight; nested rows use `--material-inset-row` / `--material-inset-row-active` with normal text contrast so nested does not look disabled.
- **Aero background depth gradient** — a fixed `zIndex: -1` div rendered between the base `appBg` layer and stars/clouds when `surfaceStyle === "aero"`. Light: `rgba(255,255,255,0.04) 0%` → `rgba(0,0,0,0.025) 100%` — neutral depth, no accent mixing. Dark: `rgba(255,255,255,0.012) 0%` → `rgba(0,0,0,0.018) 100%` — barely perceptible tonal shift, does not compete with the starfield.
- **Bottom bar shadow direction** — `AppBottomBar` computes a `barGlass` object that spreads `glassBar` then overrides `boxShadow` to cast the drop shadow upward (`0 -4px 16px` / `0 -6px 20px`) in Aero and Glass modes. Inset highlights stay identical to the top bar. `AppBottomBar` reads `surfaceStyle` and `accent` from `useTheme()` for this override.
- **Focused settings row** (dark): `rgba(255,255,255,0.07→0.032)` gradient (glass) / `rgba(255,255,255,0.14→0.08→0.05)` knee (aero, no accent fill), `accent 0.45–0.50` border, layered shadow `inset highlight + 1px accent ring + glow`.
- **glassBar dark** layers a `rgba(0,0,0,0.22→0.10)` scrim over the white tint to suppress colour bleed from bright wallpapers. Header text gets `textShadow: 0 1px 2px rgba(0,0,0,0.55)` when glass is on.
- **Active nav tab pills / section filter pills**: active tab visuals are centralized in `src/theme/tabStyle.ts`. Aero uses the triple-inset gloss (`inset 0 1px 0 rgba(255,255,255,0.80)` hard specular + `inset 0 2px 10px rgba(255,255,255,0.24)` bloom + `inset 0 -1px 0 rgba(0,0,0,0.28)` bottom rim + outer accent glow); Material uses flat accent with material shadows only; Glass/Clear use outer glow `0 4px 24px accent(0.5)`; Neon and Cyberpunk use a wirey accent-label treatment with no fill; Onyx stays transparent so `FocusRing` does the work. Each caller still computes accessible `activeTextColor` from `darkText` / `lightDarkText`. Focused pinned items and the Launch CTA remain bespoke `App.jsx` styling.
- **Inactive pills / unfocused pinned items / unfocused Launch CTA** (when `glassEnabled`): Aero — directional gradient fill, thin neutral border + `accent.glow` outer ring (10–12%), `inset 0 1px 0` top highlight + `inset 0 -1px 0` bottom rim. Glass — flat `rgba(255,255,255,0.08)` + `blur(12–14px) saturate(150%)`. Clear — flat translucent fallback.
- **Home pinned shelf label color:** focused labels use `activeTextColor`. Unfocused Material labels use warm paper text (`rgba(255,250,245,0.84)` dark / `rgba(31,22,15,0.82)` light). Other surfaces use `rgba(245,237,232,0.88)` only in dark mode and `theme.text` in light mode so Clear/Glass/Aero light shelves remain readable.
- **Immersive home drawer** follows the selected surface in both modes. Material: opaque `--material-elevation-3`, no blur, subtle inset top highlight; avoid heavy upward cast shadows because they create a visible band at the drawer top. Dark Aero: `blur(18px) saturate(130%) brightness(0.88)` + `rgba(255,255,255,0.16→0.08)` background. Dark Glass: `blur(32px) saturate(140%) brightness(0.85)` + `rgba(255,255,255,0.08→0.04)`. Light Aero: brighter acrylic `rgba(255,255,255,0.74→0.52)`, tighter blur, strong top highlight. Light Glass: more transparent `rgba(255,255,255,0.58→0.38)` with heavier blur. Clear: light mode uses a warm translucent sheet; dark mode uses `appBg`.
- `settingsRowGlass` Glass branch keeps accent tint (`accent.glow` at 2.5%/1.0%) layered behind the white gradient. Aero branch uses neutral fill only — accent is present solely via the `0 0 0 1px accent.glow` outer ring in `boxShadow`.

### App icons (UI)
- **`AppIcon`** wraps `data:image/png;base64` icons with `overflow: hidden`, `objectFit: contain`
- **Recent cards** on Home tab and immersive drawer look up the full `AppEntry` from `allAppsRef` to get `icon_base64`
- **Art priority:** `customArt[id]` (user data URL) → `gameArt[id]` (SGDB URL) → fallback `AppIcon`; applies at every render site (GameCard, hero, pinned pills, recents, LaunchOverlay)

### LaunchOverlay
- State: `"launching"` (default) | `"failed"`
- Listens to Tauri events: `"launch-success"` → calls `onDone()`; `"launch-failed"` → sets state to `"failed"` and shows error + Dismiss button
- Keyboard: Escape dismisses. Gamepad: B button (after 10-frame suppress to avoid immediate close)
- `suppressFrames = 10` prevents the button press that opened the overlay from immediately closing it

### Background Effects
- `CLOUD_SHAPES` — 4 SVG cloud silhouettes
- `CLOUD_CONFIGS` — 16 cloud instances with `{ shape, width, top, duration, delay, opacity }` for varied sizes and scroll speeds
- Individual `.bg-cloud` elements are `position: absolute` (scoped inside `#cloud-container`, NOT fixed — so they don't escape to the root stacking context)
- Animation: `cloudDrift` keyframe from `translateX(110vw)` to `translateX(-110vw)`
- Effects-off mode keeps backgrounds visible and static. `App.jsx` still creates the DOM particles/clouds, but assigns no animation and static positions; `AppBackground` still renders environment components; the root `data-effects="static"` selector freezes CSS keyframes.
- **Z-index layering (tab content area):**
  - z=0: Opaque `appBg` cover — visible when `tab !== "Home"`, hides always-mounted Home
  - z=1: `#cloud-container` — clouds visible on all tabs (light, `stars_enabled` only)
  - z=2: Home wrapper (`visibility: tab==="Home" ? visible : hidden`) + active non-Home tab wrapper (transparent bg)
  - Stars (dark mode) remain `position: fixed` and are appended to `document.body` as before
- Space creates `.bg-star` nodes in `#star-container`; Sky creates `.bg-cloud` nodes in `#cloud-container`. These containers render even when Effects is off.
- Plasma renders `.theme-plasma-layer` CSS gradients and `.theme-plasma-spark` nodes in `#plasma-particle-container`.
- Cinder renders `.theme-cinder-layer` heat gradients/glow pockets and `.theme-cinder-particle` nodes in `#cinder-particle-container`.
- Wash renders static SVG-filtered `.theme-wash-static` pigment layers plus unfiltered CSS-blur `.theme-wash-float` layers and an inline grain SVG. Do not animate SVG-filtered Wash layers with transforms; keep moving layers free of SVG filters.
- Lo-fi renders the MP4 background while active. The old PNG poster was removed because it flashed during theme switches. Effects off pauses the video and music but keeps the video element and overlay mounted.
- Toggled by `settings.stars_enabled`; Settings changes the label to match the active theme. This toggle controls motion/special effects, not whether the theme background exists.

### Splash screen (`SplashScreen`)
- CSS injected in `useEffect` — rocket wrapper, `splash-word`, and `splash-dots` all have inline `opacity: 0` to prevent flash before CSS loads
- Splash now shows a localized, indeterminate status line below the existing dots. It cycles through `splash.status.*` phrases every 2.2s, clamps at "Almost ready...", switches to a "Still working..." message after 8s, and fades out with the wordmark/dots on exit.
- Keep the status row's fixed `minHeight`/`lineHeight` so phrase changes do not move the dots or wordmark. English fallbacks remain in the component so the splash is readable even before locale files load.

### Battery / Charging
- `get_battery` returns `{ percent, charging }`
- Battery fill turns green when charging, red when ≤20%, accent color otherwise. Light mode uses a darker charging green than dark mode for contrast against white nav bars.
- Lightning bolt SVG overlays the battery icon center when charging. It uses a separate high-contrast fill/stroke rather than the green fill color so it remains visible when the battery is full or nearly full.
- Percentage text also turns green when charging, using the same light/dark contrast split as the fill.

### Hero (Home tab)
- `heroGame` = `recentGames[heroIndex]`; `heroArt` = `customArt[id] || gameArt[id]` (cover, 2:3)
- `recentGames` is a **dedicated state** (`useState` + `recentGamesRef`) loaded from `recent_games.json` — **not** a `useMemo` filter of `recent`. The two lists are fully independent: `recent` drives the recents shelf; `recentGames` drives the hero. Gamepad nav's `fRecentGames` reads `recentGamesRef.current` directly.
- `resolveHeroType(id)` — returns `"static"` | `"animated"` based on `settings.animated_heroes` (`"static"` → always static; `"animated"` → always animated; `"custom"` → reads `heroCustomType[id]` from localStorage, defaults to `"static"`)
- `heroCustomType` — `{ [appId]: "animated" | "static" }` stored in localStorage; updated when user sets hero art via SGDB browser while in `"custom"` mode
- **Background priority:** animated hero media (.webm/.mp4 video or .gif/.webp animated image) → static hero banner → blurred cover art → gradient fallback
- Hero banner: `objectFit: "cover"`, `objectPosition: "center top"`, no blur — gradient overlays maintain text legibility
- **Image rendering:** static `<img>` (base layer) is only rendered for `heroIndex ±1`; all other slots render a plain empty `<div>` to reduce GPU texture memory pressure. Navigation is instant because ±1 neighbors are pre-rendered.
- **Video DOM:** `<video>` elements stay in the DOM for video-backed animated heroes (WebM/MP4). All hero frames stay mounted at `opacity: 0.001`; active at `opacity: 1` with 0.35s ease. Keeping videos mounted prevents remount/re-decode stalls during navigation.
- `preload="auto"` unconditionally on hero videos — browser buffers freely; play/pause is managed entirely via JS refs so autoplay policy is not a concern.
- **Animated image handling:** GIF/WebP hero art can be cached or selected through the static-looking image path. Home keeps their `src` loaded at all times — removing it on pause forced a re-decode on return that briefly exposed the static banner. Off-tab animation cost is avoided by the hidden Home wrapper, not by unloading the image.
- **Playback ownership:** `HomeView` owns hero media playback against the `heroGames`/`heroIdx` list it actually renders. Only the active video hero calls `play()`; inactive videos explicitly `pause()`. Animated image heroes are displayed only while media is not paused.
- **Focus/blur handling:** Home listens to window blur/focus, Tauri focus changes, visibility changes, and Alt key transitions to set local hero pause state. `appPaused` also gates hero media. This prevents background decode when LiftOff loses focus or an app/game is launching.
- Video ref cleanup: `el => { if (el) heroVideoRefs.current[game.id] = el; else delete heroVideoRefs.current[game.id]; }` — stale refs removed on unmount.
- Video element style: explicit `top:0, left:0, width:"100%", height:"100%"` (not spread from coverStyle), `transform: translateZ(0)`, `willChange: "opacity"` — avoids layout recalc on every frame.
- The non-Webcore hero shell clips with `overflow: hidden` so artwork and overlays respect the rounded hero border on all corners. Webcore/Win9X uses `surfaceCardRadius = 0`, so it remains square.
- Directional gradient overlay heavier when hero banner is present
- Cover art card (2:3) shown bottom-left, unchanged
- **Light mode:** base background uses `appBg`; blurred art uses `brightness(0.92) saturate(0.9)`; vignette/fade use `appBg` with opacity; all text uses `theme.text` / `theme.textDim`
- **Material hero treatment:** uses no backdrop blur. In cinematic Material mode, hero info is contained in an opaque paper card with `PAPER_GRAIN_*`, Material elevation, compact cover art, CTA, and carousel dots; the left fog overlay is transparent so artwork remains unobstructed. Non-card Material hero treatments use accent-aware directional `color-mix()` overlays with a small localized title-anchor shade in light mode and a stronger left-side anchor in dark mode. Material CTA is a solid raised surface with shadow-based depth, not glow.

### Home Collections

Enabled via `settings.show_home_collections`. Renders game and app collections as horizontal card rows on the Home tab.

**Normal mode:** rendered inline below the recents shelf, scrolls with the page.

**Semi-immersive mode (`settings.home_mode === "semi"`):**
- Recents and collection rows render inside a fixed bottom `.semi-home-slot` with vertical scroll snap. The main Home wrapper should not vertically scroll in this mode.
- `SEMI_SLOT_H` is the single source of truth for the slot and hero relationship. It includes card height, label allowance, focus bleed, shadow bleed, top/bottom slot padding, and bottom-bar clearance.
- Focused row scrolling should use actual DOM `offsetTop` for the target slot page (`data-semi-slot-page`) instead of multiplying a page index by slot height. This keeps rows aligned when labels or card scale change.
- Keep extra bottom/shadow allowance inside each horizontal shelf because `overflow-x: auto` clips vertical shadows and focus rings.

**Cinematic/Immersive mode (`settings.cinematic_home`):**
- A **down chevron** sits fixed at `bottom: 16px`, bobs via `colChevronBob` keyframe animation, fades when panel is open. Clickable for mouse/keyboard users to open the drawer. The chevron/drawer only exists when `show_home_collections` is enabled.
- Pressing down from the pinned shelf opens a **slide-up drawer panel** that covers the screen from `top: 72px` (below the nav bar) to the bottom. The hero and pinned shelf are hidden behind it.
- When `hide_bottom_bar` is true and `show_home_collections` is false, the lower UI lane is free: the cinematic pinned shelf moves to the bottom with bottom-bar-like padding, and hero content stays close above it. If pinned is hidden or empty too, hero content drops to the bottom lane.
- The panel slides in via `translateY(100%) → translateY(0)` with `cubic-bezier(0.4,0,0.2,1)`.
- Panel has `borderTop` plus surface-specific background/elevation. Material uses an inset top highlight instead of a heavy upward cast shadow.
- An **up chevron** is fixed at the top of the panel (outside the scroll container) — always visible regardless of scroll. Clickable to close the drawer.
- Scrollable content inside: recents row first, then collection rows.
- Drawer collection content keeps generous bottom padding (currently `180px`) so the final row has visible breathing room when focused.
- `panelOpen = colsFocused || focusSec === "recent"` — panel is open whenever the user is in either section.
- Tab switching resets `focusSection` to `"hero"`, automatically closing the panel.

**Gamepad nav flow (cinematic):** pinned → (ArrowDown) → recent → (ArrowDown) → home_collections row 0 → row 1 etc. ArrowUp from row 0 → recent. ArrowUp from recent → pinned.

**Scroll handling:**
- `drawerScrollRef` — ref on the scrollable div inside the panel
- When `focusSection === "home_collections"`, uses `getBoundingClientRect()` diff between drawer and focused row plus `drawerTopClearance` to calculate exact scroll position: `drawerScrollRef.current.scrollTo({ top: scrollTarget, behavior: "smooth" })`
- `focusedRowRef` — attached to the currently focused collection row div; used for scroll targeting (scrolls to the row, not just the card, so the label is always visible)
- `recentShelfRef` — attached to the drawer recents horizontal row when cinematic mode is active, and to the regular Home recents row otherwise. The focus effect scrolls the active recent card horizontally with gamepad navigation.
- Drawer recents and collection rows use extra lane padding/margins so outlines, focus rings, and soft shadows are not clipped by the horizontal scroll container.
- In drawer mode, do not call `focusedCardRef.current.scrollIntoView({ block: "nearest" })` after row scrolling; it can re-scroll vertically and pin the card to the bottom. Use horizontal shelf scrolling only.
- When returning to `recent`, drawer scrolls to top and then horizontally scrolls the focused recent card into view.

**Card focus style:** uses `outline` + `boxShadow` instead of `transform: scale()` to avoid neighbor jitter.

---


- Opens from context menu "Change Hero Art" (games) or "Change Art" (all) — `artType` prop: `"hero"` | `"grid"`
- Hero filter tabs: All / Animated / Static — LT/RT on controller to switch
- `filteredResults` memo uses `r.is_animated` directly (not URL extension check)
- `repeatSpeed` prop threaded from settings through `SgdbBrowserModal` → `SgdbBrowser` → RAF poll
- `onSet` handler saves custom art and auto-switches `animated_heroes` to `"custom"` if not already set

### ThumbnailCard (`SgdbBrowser` thumbnail grid)
- Module-level `_activeThumbVideo = null` — at most one thumbnail video plays at a time across the entire grid
- `hasStaticThumb = result.thumb !== result.url` — SGDB provides a separate static preview only when thumb ≠ url; animated heroes typically have no separate thumb
- `isVideoFormat = /\.(webm|mp4)$/i.test(urlLower)` — uses `<video>` element with lazy `videoSrc` state
- `isGifOrWebp = /\.(gif|webp)$/i.test(urlLower)` — uses `<img src={active ? result.url : undefined}>` (no src when idle = no animation)
- `videoSrc` state — lazily set to `result.url` on first hover/select, never cleared (stays buffered for re-hover)
- Three useEffects: (1) set videoSrc on first activation, (2) play/pause with `_activeThumbVideo` tracking, (3) cleanup `_activeThumbVideo` on unmount
- Bottom layer: `<img src={result.thumb}>` when `hasStaticThumb`; warm gradient "Hover to preview" placeholder when idle and no static thumb
- Top layer: video/gif/webp content, fades in on active (`opacity: active ? 1 : 0`)
- ANIM badge only shown when `hasStaticThumb` is true (badge over visible static preview; suppressed over placeholder text)
- `transform: translateZ(0)` + `willChange: opacity` on container — GPU compositing layer per card, eliminates scroll jank

---

## Remaining Tasks Before v1

*(none)*

---

## Future Plans (Post-v1)

- **Game videos in hero** — autoplay trailer/clip in the hero spotlight
- **Rearrange pinned items** — drag or controller-based reordering of pinned apps
- **In-app browser** — lightweight browser overlay for game wikis, store pages, etc.
- **More customization options** — additional accent colors, layout options, font sizes
- **System settings controls** — display brightness, volume, Wi-Fi and Bluetooth toggles from within the app
- **Additional game libraries** — Ubisoft Connect and other launcher integrations

---

## Contributor PRs (merged from moi952)

Notable merged PRs from Moi that affect current architecture and settings:

**PR #3 — feat(i18n): internationalization**
- `i18next` + `react-i18next`; English + French; language selector in settings
- Auto-detects OS locale via `navigator.language` (Tauri WebView reflects OS locale); no localStorage caching — Tauri settings is the source of truth for explicit language preference
- `i18n.js` init; `locales/en.json` + `locales/fr.json`; `main.jsx` imports i18n before App

**PR #4 — feat(settings): clock/date/battery display options**
- `show_clock`, `show_date`, `show_battery` toggles; `time_format` cycle (auto/12h/24h)
- Uses `Intl.DateTimeFormat` for auto 12/24h detection; clock re-renders on language change

**PR #5 — feat(settings): cover scale sliders + layout options + component split (TypeScript)**
- `home_cover_scale` / `game_cover_scale` sliders (0.5–2.0x)
- `wide_layout` toggle — removes maxWidth constraint
- `transparent_bars` with independent `transparent_topbar` / `transparent_bottombar` sub-toggles via `SettingsSubGroup`
- `silver` and `white` accent colors added
- TypeScript migration started: `tsconfig.json` added; new components are `.tsx`; `App.jsx` stays `.jsx` (opt-in, `allowJs: true`)
- `react-icons` dependency added (`@types/react`, `@types/react-dom` devDeps)
- New Rust commands: `list_dir`, `get_drives`, `add_custom_app`, `remove_custom_app`, `add_custom_folder`, `remove_custom_folder`, `toggle_custom_folder`, full collection CRUD (`get_collections`, `create_collection`, `delete_collection`, `get_memberships`, `toggle_membership`)
- `custom_data.json` — new persistence file for custom apps, folders, collections, and memberships

**PR #14 — feat(settings): layout sub-options, app scale, rename all, recents filter**
- Wide Layout gained independent area toggles: `wide_topbar`, `wide_games`, `wide_apps`, `wide_settings`, and `wide_bottombar`.
- Home gained `home_mode`, `show_home_recents`, `show_recent_games_only`, `home_section_title_size`, `home_pinned_pos`, and `hero_content_pos` settings. Recents can now hide app entries while keeping game recents visible.
- Apps gained `app_cover_scale`, `app_list_view`, and `app_list_cols` so the Apps tab can use scaled cards or a compact list layout.
- Bar controls changed from the old transparent-bar model toward `topbar_background`, `bottombar_background`, `tabbar_background_compact`, and `bottombar_compact`; keep migration/back-compat in mind if older settings files surface.
- Tab bar gained `tabbar_icon_mode` (`text` / `icons` / `both`) using `react-icons` Io5 nav icons.
- Rename is now available for all apps/games through `rename_app`; overrides live in `custom_names.json`, are applied at scan time, and renamed IDs clear grid/hero art before refresh so SGDB searches use the new name.
- Rename modal now auto-focuses the physical text input; `Y` opens the gamepad keyboard on demand. The virtual keyboard RT hint cycles `abc` -> `ABC` -> `123`.
- Onyx gained theme-specific polish: `onyx_top_light`, `onyx_flat_settings`, locked theme settings display, dedicated background/bar handling, and shared `FocusRing` styling.
- Settings schema additions must be mirrored in Rust `Settings`, `impl Default for Settings`, TypeScript `Settings`, defaults, translations, and settings UI items.

---

## Known Good State

- App scanning: Steam (non-default paths via registry), Xbox/Game Pass, UWP Store apps (including system apps like Windows Settings), Desktop shortcuts, Battle.net games, GOG games, and Epic Games Store games
- Battle.net: scans Uninstall registry for Blizzard games; launches via game's own Launcher.exe (same as Start Menu); Battle.net subtab + scan_battlenet toggle
- GOG: scans GOG registry game keys, skips `dependsOn` DLC records, dedupes by resolved executable, launches the game executable directly, and uses the GOG source tab + `scan_gog` toggle
- Epic: scans Epic `.item` manifests, skips stale/non-application/add-on manifests, launches through the Epic launcher protocol, and uses the Epic source tab + `scan_epic` toggle
- `find_main_exe_in_dir` skips utility exes (error, report, helper, agent, etc.); prefers "launcher"-named exes
- `.lnk` shortcuts launch via `ShellExecuteW("open")` — correctly passes embedded shortcut arguments (e.g. Discord's `Update.exe --processStart Discord.exe`); `cmd /C start` was dropping these arguments
- URI launches (`://`) use `ShellExecuteW` — reliable for all protocol handlers
- `.lnk` and other indirect app launches (`child_pid == 0`, `app_type == "app"`) plus browser URL launches (`http://` / `https://`, `child_pid == 0`) use 1.5s fast-dismiss instead of the 15s window watcher — avoids false "Failed" overlays for tray apps, already-running processes, and cloud game bookmarks
- Direct `.exe` apps and non-browser games use full window-detection watcher with real success/fail feedback
- Single library scan on startup; auto-refresh when scan toggles change; manual Refresh Library button
- Games source sub-tabs hide built-in sources when their scan toggle is off or no installed games exist for that source; Cloud shows when a `source: "cloud"` bookmark exists; Other also hides when no visible games exist outside built-in/custom sources; All, custom sources, and collections remain available.
- Blocking overlay modal during library refresh
- UWP/desktop/Steam icon extraction via `DrawIconEx` at 128px with jumbo/large fallback
- No console window flash on launch (CREATE_NO_WINDOW everywhere)
- Game art: `fetch_game_art` returns `{ grid, hero_static, hero_animated }` — one SGDB search + two hero fetches; all three downloaded to disk (`art/grid/`, `art/hero_static/`, `art/hero_animated/`) and served via `asset://`; zero API calls when all cached
- Art fetched in batches of 4 with live progress shown in cache-clear status overlay
- Animated hero banners (.webm/.mp4/.webp/.gif) controlled by `animated_heroes` setting (`"static"` | `"animated"` | `"custom"`); per-game preference stored in `heroCustomType` localStorage
- Hero media handling: video heroes stay mounted with `preload="auto"` and only the active hero calls `play()`; inactive videos explicitly `pause()`. GIF/WebP heroes are treated as animated image media and have their `src` removed while paused. Home owns this playback against the actual rendered hero list, and focus/blur/launch pause state stops both video and animated-image hero paths.
- Hero data source: `recentGames` state (loaded from `recent_games.json`) is independent of `recent` — even if the user has launched mostly apps recently, the hero always shows games. Fresh install falls back to the first 6 visible games.
- Hero section: animated or static SGDB landscape banner as background (no blur), falls back to blurred cover art
- Cover art card (2:3) shown bottom-left in hero section, unchanged
- Custom cover art: Select (gamepad) or right-click → "Change Art" on any card (games and apps); games normalize to 600×900 JPEG (2:3), apps normalize to 500×500 JPEG (square); side-by-side modal with aspect-ratio-matched preview; reset to default
- Custom art on app cards renders as full object-fit cover with bottom gradient + name overlay; home recents also show custom art for non-game apps (portrait card, cover crop)
- Right-click context menu on all cards (game and non-game): Open, Pin/Unpin, Change Art
- Bottom controls bar shows BACK hint for art on Games tab
- Gamepad navigation with hold-repeat across all tabs/sections
- `getBestGamepad()` skips non-controller HID devices (headset adapters, audio dongles) with <4 buttons
- Non-standard controller D-pad via hat-switch axes[6]/axes[7] fallback in `readGpState`
- Tab switching lands on first pinned item or first grid item
- Source sub-tabs on Games tab (All/Steam/Xbox/Battle.net/GOG/Epic/Cloud/Other) via LT/RT or d-pad
- Unified Manage modal with full gamepad nav, input isolation, bleed prevention
- Settings: accent colors (WCAG-compliant in light mode for neon), theme, scan toggles (incl. Battle.net, GOG, and Epic), startup, repeat speed, controller test, Discord link, Hero Art Mode cycle (static/animated/custom), update channel cycle (Stable/Alpha-Beta), UI scale slider
- Themes: Space/Sky/Plasma/Cinder/Wash are animated environments separate from Surface Style. Theme selection applies a default surface, but users can manually override Surface Style afterward.
- Wash theme: liquid tie-dye / marble-ink background built from layered radial pigment pools. Main blobs use SVG `wash-edge` / `wash-flow` filters for organic displacement; soft perimeter fills intentionally avoid SVG filters for performance. Keep future Wash additions mindful of full-screen animated SVG filter cost in WebView2.
- UI Scale: auto-detected from screen resolution on first launch; `transform: scale()` on root; "Reset Scale to Auto" in Settings
- Controller Test widget in Settings (live button/axis display); stable across D-pad navigation via module-level cache
- Check for Updates (GitHub Releases API); Refresh Library (manual + auto on toggle change)
- Update checks respect `settings.update_channel`: Stable uses GitHub `/releases/latest`, while Alpha / Beta checks the releases list so prereleases can be detected and opens the full releases page when an update is available.
- Search overlay with virtual keyboard
- Battery icon shows percent + charging indicator (lightning bolt + green color); polls every 10s
- Hero section fully themed for light mode (no hardcoded dark colors, WCAG-compliant text)
- Background clouds (light theme): 16 cloud instances drifting across full-height, behind all UI on every tab; toggled by `stars_enabled` setting
- LaunchOverlay: shows "Launching…" then transitions to success (dismiss) or "Failed to launch" + Dismiss button based on `EnumWindows` window detection, with Xbox/UWP `shell:AppsFolder` targets also confirmed by `GetApplicationUserModelId` package-family match.
- Power modal: pressing B at the Home root opens controller-navigable Restart LiftOff / Exit LiftOff actions backed by Tauri `restart_app` and `exit_app` commands.
- Launch window watcher: detects game window via PID (direct exe) or snapshot diff (Steam/BNet/UWP); brings window to front on success
- Running-app lifecycle: launched apps/games are tracked for the current session via direct child PID when available and existing window/exe matching for launcher-mediated paths. Xbox/UWP `shell:AppsFolder` targets are confirmed via live process AUMID package-family match (`get_running_launched` / `check_launch_focus`) instead of window title only, and that process-AUMID snapshot is built lazily only while a shell target is tracked. Home/Games/Apps show Running badges, running hero games show Resume + Close, launching an already-running game focuses it via `try_focus_launched_app`, exited launched games can pull LiftOff back to the foreground via `focus_self`, and Close uses confirmed graceful `WM_CLOSE` before a second confirmed force-terminate path.
- Splash screen: no flash before CSS loads (inline opacity on all animated elements); localized status text below the dots reassures during longer startup scans without claiming real progress.
- Recent cards show correct icons (looked up from allAppsRef)
- Settings scroll margin accounts for sticky nav bar (80px top margin); last item not cut off (160px bottom padding)
- Settings rows: Clear mode uses the same row padding/height as other surface modes. Material focused rows are opaque, slightly accent-tinted solid surfaces with a single 2px accent border and higher elevation; avoid transparency, double borders, or left accent bars in Material focus states.
- i18n: English + French; auto-detects OS locale; language override in settings; all UI strings via `t()` keys
- Wide Layout: removes maxWidth constraints on content containers only by default. The nav header widens only when both Wide Layout and `wide_topbar` are enabled; Win9X remains intentionally full-bleed.
- Transparent bars: independent top/bottom toggles via SettingsSubGroup collapsible; bottom bar can also be completely hidden via `hide_bottom_bar` setting
- Cover scale: independent sliders for Home recents (`home_cover_scale`) and Games grid (`game_cover_scale`)
- Collections system: create/delete named collections per app type; assign apps via ColPickerModal; `custom_data.json` stores all collections + memberships
- Custom scan folders: add arbitrary folders via FileBrowser; toggle on/off; delete; managed via FolderManagerModal
- Manually add games/apps: browse to `.exe` or `.lnk` via FileBrowser + AddEntryModal; assign to source/collection
- `getBestGamepad` + `readGpState` extracted to `src/utils/gamepad.js` — shared across App.jsx and all modal components
- **Immersive Home mode** (`cinematic_home`): hero art covers full screen (`position: fixed, inset: 0`) behind all UI; topbar and bottom bar float over it at zIndex 100; hero content normally sits above the lower controls and pinned shelf normally sits at `bottom: 60px` as floating pills with no background; recents are hidden behind the collections drawer; down from hero navigates to pinned shelf, up from pinned returns to hero; bottom bar is transparent in this mode unless hidden. If `hide_bottom_bar` is true and `show_home_collections` is false, pinned moves into the bottom lane and hero content follows close above it; if pinned is also hidden or empty, hero content drops to the bottom lane.
- **Material Surface Style**: opaque/matte fourth surface style with accent-aware warm cream light backgrounds, warmer aged-paper dark backgrounds, stitched SVG data-URI paper grain on Material cards/bars/settings rows/app background, no blur, no glow-based depth, 3 elevation shadows, raised header/bottom bar, inset nested settings trays, grounded Immersive Home hero gradients, and clearly raised focused Settings rows.
- Material paper grain implementation: `PAPER_GRAIN_LIGHT` / `PAPER_GRAIN_DARK` live at module scope in `src/App.jsx`. They are SVG fractal-noise data URIs applied only inside `surfaceStyle === "material"` / `isMaterial` branches. Keep Glass, Aero, and Clear free of this texture; avoid runtime SVG filters for Material grain.
- NSIS installer builds correctly; package named `liftoff`, exe `LiftOff`
- Non-game app cards: dark frosted glass (`rgba(255,255,255,0.04)` background, `blur(16px)`); border subtly tinted by dominant icon color (`rgba(r,g,b,0.18)`); no radial gradient overlay; graceful fallback to plain glass when color not yet sampled
- Settings persist correctly — all fields present in both Rust `Settings` struct and TS `Settings` interface; missing Rust fields previously caused silent serde drops on save
- Home collections: gamepad-navigable horizontal card rows on Home tab; semi-immersive mode uses a fixed snap slot tied to hero height; cinematic mode uses slide-up drawer with recents + collections, chevron hints, row top clearance, horizontal-only card scrolling, bottom tail padding, and correct scroll targeting via `getBoundingClientRect`
- `show_home_pinned` setting (default true): hides the pinned shelf on the home screen (both regular and immersive modes) without unpinning any items; toggle in Settings → Appearance → HOME
- Home pinned shelf scroll handling: `pinnedShelfRef` is attached to Home pinned shelves. When `focusSection === "pinned"` and `focusIndex === 0`, scroll the shelf container to `left: 0` directly so the left-most pill returns to the shelf's starting padding instead of relying on `scrollIntoView`.
- Focused card scroll handling in `App.jsx` avoids `scrollIntoView` for main grid/card navigation. It picks `homeScrollRef` for Home or `tabScrollRef` for Games/Apps/Settings, computes focused card position with `getBoundingClientRect()`, divides by `settings.ui_scale`, and scrolls only enough to preserve ~100px top and ~80px bottom clearance. First-row grid focus snaps the active scroller to top. This prevents CSS-scaled root scroll jumps and keeps cards from sliding under sticky UI.
- White and silver accents use `darkText: true` — filled buttons use `#1a1a1a` text instead of white for accessibility
- Hero border radius removed in cinematic mode (fills edge-to-edge)
- Git repo: single `main` branch at github.com/PixelateWizard/LiftOff; Discord: discord.gg/F5ncP75WtD

## File Structure Notes
```
src/
  App.jsx                    — entire frontend (single file)
  main.jsx
  constants.ts               — ACCENTS, THEMES, DEFAULT_SETTINGS, etc.
  types.ts                   — TypeScript interfaces (Settings, AccentColors, App, etc.)
  i18n.js
  contexts/
    GamepadContext.tsx        — platform, colored, filled, themeColor, btnSize
    SettingsContext.tsx       — settings, settingsRef, updateSetting, updateSettingsBatch
    ThemeContext.tsx          — isDark, theme, accent, glass, glassBar, settingsRowGlass, glassEnabled, surfaceStyle, appBg, bgGlow1, bgGlow2
  views/
    settings.tsx             — SettingsScreen component
  components/
    layout/
      AppHeader.tsx
      AppBottomBar.tsx
    ui/
      gamepad.tsx            — all gamepad button SVG components
      GamepadBtn.tsx
      GamepadKeyboard.tsx
      ToggleKnob.tsx
      CollapsibleGroup.tsx
      SectionTabBar.tsx
      SectionTabHeader.tsx
      ControllerTestWidget.tsx
      index.ts               — barrel export
  modals/
    AddEntryModal.tsx
    CollectionManagerModal.tsx
    ColPickerModal.tsx
    ConfirmModal.tsx
    ContextMenuModal.tsx
    EditNameModal.tsx
    FolderManagerModal.tsx
    HideModal.tsx
    ModalShell.tsx
  hooks/
    useGamepadNavigation.ts  — RAF poll, hold-repeat, suppression, tab/focus state machine, triggerLaunch, switchTab, close helpers, window focus/blur effect
    useAppSettings.ts        — settings bootstrap, auto scale, save helpers, language sync, default tab, scan-toggle refresh
    useStartupBootstrap.ts   — splash timing, isReadyRef, gamepad-ready signal, load-error fallback
    useLibraryData.ts        — app/recent/pin/hidden state, togglePin/Hidden, refreshLibrary, icon color sampling
    useModalState.ts         — modal open/close state and mirrored refs
    useCollections.ts        — game/app collections and memberships state
    useCustomSources.ts      — custom scan sources and folders state
    useCustomArt.ts          — custom art maps, SGDB fetch batching, clear-art reset
    useAudioFeedback.ts      — WebAudio preload/playback for UI sounds
    useSearchState.ts        — search open/mode/query/keyboard state
    useSystemStatus.ts       — clock, date, battery polling
    useUpdateCheck.ts        — GitHub Releases update check
    usePersistentJson.ts     — localStorage JSON state helper
    useLaunchApp.ts          — Tauri launch_app invocation wrapper
  utils/
    gamepad.ts               — getBestGamepad, readGpState, detectPlatform (typed)
    gamepad.js               — JS version (legacy, still used by some components)
  assets/
    uiSound.mp3
    uiSoundAlt.mp3
    appLaunchSound.wav
    gameLaunchSound.wav
    launchSuccessSound.wav
    appLoadedSound.wav
  locales/
    en.json
    fr.json

src-tauri/
  src/
    lib.rs         — entire backend (single file)
    main.rs        — calls liftoff_lib::run()
  tauri.conf.json
  Cargo.toml
  .env             — SGDB_API_KEY (gitignored)
  target/release/bundle/nsis/  ← installer here
```
