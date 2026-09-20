# Themes, Surfaces, and Motion

## Purpose

Define the separation between environments, material systems, shared focus language, motion, and visual performance.

## Read When

Read for themes, accents, light/dark behavior, surfaces, backgrounds, focus styling, animation, audio profiles, or visual GPU work.

## Durable Constraints

- Themes are environments; surface styles are materials. Selecting a theme may apply its default surface, but manual surface choice remains a separate setting unless a theme explicitly locks it.
- Keep Glass, Aero, Material, Clear, Onyx, Win9X, Neon/Cyberpunk, and Obsidian branches scoped. A change requested for one surface/theme must not leak through shared fall-through styling.
- Shared active-tab styling belongs in `src/theme/tabStyle.ts`; broader surface tokens belong in `src/theme/surfaces.ts` and the root theme composition.
- Material uses opaque layered surfaces and shadow elevation, not glass blur or glow-based depth. Paper grain stays Material-only.
- Aero uses directional acrylic/specular treatment; Glass uses heavier frost; Clear remains flat; Onyx focus respects its effects/static mode.
- The dense Helper Tray keeps translucent surfaces readable over Home/Settings: while it is open, Glass, Aero, Clear, and Obsidian still use denser fills and a tray-local frost layer because the scaled WebView2 root prevents reliable backdrop sampling inside the tray. The underlying app layer is blurred for every surface, including opaque Material and Win9X.
- Light accents with `darkText` require dark foregrounds on filled controls for contrast.
- UI motion primitives live in `src/styles/motion.css`; new shared motion should not be added to the large injected global block in `App.jsx`. `.lo-smartbar-event` belongs in all three suppression lists (`data-ui-motion="off"`, `.app-launch-paused`, and `prefers-reduced-motion`). `.lo-smartbar-hints` and `.lo-smartbar-tint` transitions are disabled under `data-ui-motion="off"` and reduced motion.
- Do not put persistent `will-change: transform`, `will-change: opacity`, `transform: translateZ(0)`, or opacity below 1 on an ancestor of a `backdrop-filter` surface. Each makes that ancestor a backdrop root, and creating or destroying one forces the translucent surfaces inside it to re-rasterize, which reads as Glass/Aero panels settling into place after they appear.
- A modal scrim that carries `backdrop-filter` belongs beside the panel, not around it.
- Modal shells should inherit `modalSurfaceStyle`/`modalPanelStyle` from `components/modals/modalStyles.ts`; preserve the generated fill, filter, border, shadow, and Material variables together. Do not spread glass and then replace it with an opaque generic background or accent shadow. Progress indicators must not depend on styles owned by the splash component.
- Effects-off keeps the environment visible but static. Reduced motion and UI-motion settings have distinct responsibilities.
- Lo-fi background video is selected by persisted `lofi_scene` (`cozy`, `dog`, `desk`, `cat`, `rainy_street`, `pixel_shop`; default `cozy`; unknown values and the legacy `study` alias fall back to cozy). Settings opens a picture picker modal; onboarding shows the same pictures only after Lo-fi is selected. Changing the scene must reload the `<video>` element so playback swaps live; lo-fi music stays a separate looping mp3. The helper tray exposes the persisted `lofi_music_enabled` toggle only while Lo-fi is the active theme. Spotify playback ducks that mp3 without writing the setting, so Lo-fi music resumes when Spotify is no longer playing.
- Avoid animating full-screen SVG-filtered layers. On shared-GPU handhelds, visual changes need runtime GPU/feel validation, not CSS inspection alone.

## Current Source Anchors

- `src/constants.ts`: theme/accent options, defaults, and normalization.
- `src/theme/lofiScenes.ts`: Lo-fi scene catalog, posters, and video resolution.
- `src/theme/surfaces.ts`, `src/theme/tabStyle.ts`: shared material and tab styling.
- `src/contexts/ThemeContext.tsx`: distributed theme/surface state.
- `src/components/app/AppBackground.tsx` and `src/components/backgrounds/`: environment ownership.
- `src/styles/motion.css`: motion tokens and primitives.
- `src/audio/audioProfiles.ts`: theme-aware UI audio shaping.
- `src/App.jsx`, layout components, Settings, Home, and modal helpers: surface consumers.

## Common Failure Modes

- Applying a shared style change without protected-branch review.
- Using translucent or blurred rows for Material/Cyberpunk paths that require opaque surfaces.
- Animating `box-shadow` directly on a glass surface and destabilizing its compositing.
- Adding a compositing hint to a motion primitive class that uses `animation-fill-mode: both`, so the promotion outlives the animation.
- Treating the effects toggle as “remove background” instead of “freeze effects.”
- Measuring a WebView2 memory/GPU result without fresh launches and a signal larger than run variance.

## Validation

- Run `npm run build` and `git diff --check`.
- Review every protected surface branch affected by a shared token/helper change.
- Visually inspect light/dark contrast, focused/unfocused states, modal/bar/card hierarchy, reduced motion, and effects-off behavior.
- For performance work, follow the measurement rules in [Known issues](known-issues.md) and report real device numbers separately from code checks.
