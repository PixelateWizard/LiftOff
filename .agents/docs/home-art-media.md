# Home, Art, and Media

## Purpose

Document durable behavior for Home modes, Details, art resolution, collections, and store media.

## Read When

Read for Home layout/focus, hero media, pinned/recents/collections, Game Details, SGDB art, store descriptions, screenshots, or trailers.

## Durable Constraints

- Persisted Home mode values are `normal` for the displayed Legacy mode, `semi` for the displayed Normal mode, and `immersive` for Immersive. Fresh defaults use `semi`; do not infer display labels from generic stored values.
- `recentGames` independently drives the Home hero; general `recent` drives the recents shelf. Do not recombine them.
- The persisted `show_immersive_hero_art` wire field is the user-facing “Show game hero banner” preference: it controls Normal and Immersive Home banners, while Legacy always renders hero art and shows the Settings row disabled. When Normal hides its banner, the hero area stays transparent so the active theme background remains visible; app focus must not inject placeholder art into that empty banner.
- Onboarding exposes Home mode and the hero-banner preference using the same stored values and Legacy lock behavior as Settings. Home mode is a three-card screenshot picker (Normal/`semi`, Immersive/`immersive`, Legacy/`normal`); the shared preference renderer still shows a switch for the banner row. Legacy must show an explicit forced-on lock label while controller focus skips that disabled banner row. A following visual step picks top-tab icon mode from screenshots and uses switches for top/tab-bar backgrounds, top bumper badges, and tab-bar trigger badges. Those preview stills are Vite `?inline` data URLs from `src/assets/onboarding/` so first-run setup does not depend on the asset HTTP path after a WebView cache wipe. Do not load them as `/assets/...` URLs or CSS backgrounds.
- Hero resolution chips belong only in the art picker. Home, including Immersive with a transparent top bar, must not overlay source dimensions on hero artwork.
- Home hero media has to be rasterized at its on-screen size. `ui_scale` above 1 lays the app out smaller and bitmap-scales the root, which softens a 4K hero. `nativeHeroFrameStyle` enlarges that media and counter-scales it so the root transform lands on native pixels; scale at or below 1 stays on the normal box. Uploaded heroes keep the 1920:620 center crop, save up to 3840×1240, and do not upscale a smaller source. A hero already saved at 1920×620 stays that size until the user saves it again.
- Home game selection, including controller selection of Legacy and Immersive heroes, follows the persisted `home_launch_games_directly` preference; the Games tab remains Details-first. App cards open an App Details modal before launch (name, size, location, and the same manage actions as the mouse context menu) so gamepad users can reach pin/hide/art/collections without MENU. The explicit on-screen hero CTA remains a launch/resume action.
- Semi/Normal Home uses a fixed snap slot tied to card scale and hero height. The slot's bottom padding includes Smart-bar clearance so cover rows sit above the floating pill; Full still uses the 48px dock height and Hidden stays flush. Do not restore page-flow spacers or allow the outer Home shell to expose blank scroll space. Normal Home keeps the left-to-right hero text fade and does not apply a bottom vignette or a light-theme copy card behind the hero title; Legacy and Immersive still use their bottom overlays. The full-bleed Normal Home hero must not keep Legacy card corner radius.
- Home does not render a pinned-pills row. Pins stay available from the helper tray and from Games/Apps; `HOME_PINNED_SHELF_ENABLED` is the single switch if that Home shelf is restored. Immersive still owns a slide-up collections/recents drawer and must preserve hero visibility, bottom-lane, and drawer-scroll relationships. Boxed Immersive hero copy (Material, Win9X, Cyberpunk) sits above Smart-bar clearance with a gap and shares the Smart pill's 18px left inset while Smart is on. Unboxed Immersive copy uses the same Smart clearance instead of `bottom: 0`, so title/cover/dots do not sit under the pill.
- Art priority is user custom art, then fetched/cached art, then icon/fallback. Missing-result sentinels and forced retries must not create request loops. Startup backfill includes installed games whose art was never attempted, not only uninstalled rows. The Smart bar keeps artwork setup visible while visible library covers or Home heroes are still unattempted; an empty-string sentinel means attempted. Only a reporting art fetch owns the live Smart-bar progress job. Silent fetches, including backfill and a one-game Details refresh, must not advance that job or the pill can freeze on the last game name. Home and Game Details share `resolveHeroType`: a per-game static hero must replace the animated banner in Details, even when an animated file is still cached. Animated hero mode must still show static/cached banners when no video URL exists; do not treat a missing animated URL as a video layer that hides the static art.
- The SGDB art picker browse tab resolves an explicit game match before loading art. Its modal-local controller order is search, horizontally scrolling game matches, then the art grid; the active section and focused item use distinct focus treatments, and fluid art columns consume the available modal width. Selecting a match changes only the picker request and does not persist a library-wide SGDB remap.
- Hero media playback belongs to the rendered Home view; only active media plays, and app blur/launch pause must suspend expensive media/background work.
- Store metadata is on-demand and cache-first. Do not bulk prefetch an entire library from rate-limited provider endpoints.
- Fullscreen Details media is one modal level deeper: B closes media back to Details, not all the way to the grid.

## Current Source Anchors

- `src/views/HomeView.tsx`: Home modes, hero, pinned shelves, recents, collections, and drawer.
- `src/components/onboarding/OnboardingFlow.tsx`, `previews.ts`, and `steps.ts`: first-run Home layout cards, inlined screenshot stills, banner lock, and the visual bar/tab-icon step.
- `src/components/GameDetailsModal.tsx`: showcase, Details/Manage tabs, actions, and media overlay.
- `src/hooks/useCustomArt.ts`, `useArtBackfill.ts`, `useStoreMetadata.ts`: art and store-data loading.
- `src/components/art/`: art picker, SGDB browser, thumbnails.
- `src-tauri/src/store_metadata.rs` and art/cache commands in `lib.rs`: providers and disk cache.
- `src/locales/`: Home, Details, media, and install labels.

## Common Failure Modes

- Letting pinned focus unexpectedly replace the Normal Home hero selection.
- Calling vertical `scrollIntoView()` after drawer row targeting and undoing the intended drawer position.
- Remounting video elements or clearing animated-image sources in a way that causes decode stalls/flashes.
- Treating an empty cached art result as either permanently authoritative or always uncached.
- Gating the static hero layer on Animated mode alone. A missing video URL must still show cached static art; otherwise first-launch Home stays empty until a custom-hero save flips the mode to Custom.
- Pinning unboxed Immersive copy to `bottom: 0` while Smart is on, which puts the title and cover under the pill.
- Passing raw DASH manifests to a plain video element or assuming WebView2 natively handles every HLS playlist.

## Validation

- Run `npm run build`, relevant unit/browser tests, and `git diff --check`; add `cargo check` for provider/cache changes.
- Exercise Legacy, Normal, and Immersive Home with mouse and gamepad when shared behavior changes.
- Verify hero/pinned focus, row scrolling, Details reveal/tabs, B-depth, media playback/audio, and art fallback/retry behavior.
- Validate WebView2/Tauri media paths in the app; a plain browser is not sufficient.
