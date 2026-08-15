# Home, Art, and Media

## Purpose

Document durable behavior for Home modes, Details, art resolution, collections, and store media.

## Read When

Read for Home layout/focus, hero media, pinned/recents/collections, Game Details, SGDB art, store descriptions, screenshots, or trailers.

## Durable Constraints

- Persisted Home mode values are `normal` for the displayed Legacy mode, `semi` for the displayed Normal mode, and `immersive` for Immersive. Fresh defaults use `semi`; do not infer display labels from generic stored values.
- `recentGames` independently drives the Home hero; general `recent` drives the recents shelf. Do not recombine them.
- Game cards open Details first across Home/library surfaces; app cards retain their established direct-launch behavior. The hero CTA remains a launch/resume action.
- Semi/Normal Home uses a fixed snap slot tied to card scale and hero height. Do not restore page-flow spacers or allow the outer Home shell to expose blank scroll space.
- Immersive Home owns a slide-up collections/recents drawer and must preserve hero/pinned visibility, bottom-lane, and drawer-scroll relationships.
- Art priority is user custom art, then fetched/cached art, then icon/fallback. Missing-result sentinels and forced retries must not create request loops.
- Hero media playback belongs to the rendered Home view; only active media plays, and app blur/launch pause must suspend expensive media/background work.
- Store metadata is on-demand and cache-first. Do not bulk prefetch an entire library from rate-limited provider endpoints.
- Fullscreen Details media is one modal level deeper: B closes media back to Details, not all the way to the grid.

## Current Source Anchors

- `src/views/HomeView.tsx`: Home modes, hero, pinned shelves, recents, collections, and drawer.
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
- Passing raw DASH manifests to a plain video element or assuming WebView2 natively handles every HLS playlist.

## Validation

- Run `npm run build`, relevant unit/browser tests, and `git diff --check`; add `cargo check` for provider/cache changes.
- Exercise Legacy, Normal, and Immersive Home with mouse and gamepad when shared behavior changes.
- Verify hero/pinned focus, row scrolling, Details reveal/tabs, B-depth, media playback/audio, and art fallback/retry behavior.
- Validate WebView2/Tauri media paths in the app; a plain browser is not sufficient.
