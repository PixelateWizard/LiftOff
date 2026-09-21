# Controller and Navigation

## Purpose

Define LiftOff's controller-first focus model, modal isolation, scrolling rules, and hardware validation boundary.

## Read When

Read for gamepad mapping, focus movement, repeated input, modal behavior, scrolling, UI-scale bugs, haptics, or controller-visible affordances.

## Durable Constraints

- `useGamepadNavigation` owns the main RAF poll, repeat timing, focus state machine, tab/source movement, and mirrored refs used inside long-lived callbacks.
- Modal and overlay controllers must isolate main navigation while open and suppress held buttons until release when closing. A close-confirm press must never activate the surface underneath.
- Account connect dialogs (Steam QR, Microsoft, Spotify) render outside the scaled app root. A CSS `transform` on the app shell creates a stacking context that cannot paint above first-run setup, so in-shell z-index cannot lift those dialogs over onboarding. Close them back into the same onboarding accounts step; do not unmount setup while they are open. Those overlays must set `font-family: 'Segoe UI', sans-serif` (or inherit it from `html, body`); they do not sit inside the scaled app shell that owns the rest of the UI font.
- Settings widgets that gamepad users need to inspect must be opened from a focusable row. Controller Buttons and Controller Test are isolated modals; the tester leaves face buttons free for live checking and closes on BACK/Select.
- The helper tray and Controls modal own their keyboard/gamepad loops while visible and gate the app poll through mirrored refs. A single MENU press opens the helper tray in Smart, Full, and Hidden modes; suppress that edge until release so it cannot also activate the tray or the underlying tab. The tray opens on the first running entry, else the first download, else Settings. Its visual/focus rows are Running/Downloads (when present), shortcuts, system controls, pinned games/apps when present, then Spotify. When Lo-fi is the active theme, shortcuts include a Lo-fi music toggle after Controls. Running Resume focuses the session; Close uses the standard close confirm; Download Details opens Game Details. Pinned game and app activation both follow the Details-first contract. Spotify transport includes Stop after Next; Stop pauses Connect playback and dismisses the local now-playing session until playback starts again. The Spotify scrubber, Volume, and Brightness require A to enter adjustment mode so Left/Right can otherwise move between neighboring controls; A or B commits and exits adjustment. Reserve controller-hint space even while unfocused so focus changes never reflow the tray.
- Light-theme uncolored gamepad glyphs use a dark fill (white letter) so hints stay readable on Sky, Wash, and Webcore bars. Colored icons are unchanged.
- Keep one active scroll/focus owner. Warm-mounted inactive Games/Apps panes must use private refs and cannot own the shared active refs.
- Library entry focus must resolve against the destination view: use the first visible pinned card only in an All view that actually renders matching pins; otherwise use the first visible grid card. Source/collection switches must not leave focus in hidden header or toolbar sections.
- Avoid `scrollIntoView()` for scaled main card navigation. Measure the focused element against the intended inner scroller, compensate for `ui_scale`, and preserve header/footer clearance.
- Horizontal shelves need explicit container refs and should reset index zero to their designed left padding.
- Focusable cards in programmatically scrolling shelves and grids must require real pointer movement before hover changes focus. Element-entry events can fire when content moves beneath a stationary pointer and overwrite the controller-owned index.
- Modal grids must navigate their rendered geometry: Left/Right stay within the current row, while Up/Down preserve the current column and clamp only when the final row is incomplete.
- Onboarding Lo-fi scene focus is not selection. D-pad movement may focus another poster or the music switch without changing `lofi_scene`; A/click explicitly selects a poster, and only the footer Next action advances.
- In Game Details, treat the About/Media body as one vertically scrollable region and Media as one horizontal focus row. Vertical input must reveal clipped body edges before collapsing back to Play; it must not use the media-item count as a vertical grid stride.
- Games/Apps vertical navigation uses one short monotonic tween for discrete D-pad/stick taps. A later tap retargets that tween from its current position instead of stacking native smooth-scroll animations; held repeat cancels it and jumps immediately. Tiny no-op moves and duplicate destinations are skipped.
- Web Gamepad mocks do not establish controller feel, non-standard mapping behavior, haptics, or native foreground input ownership.

## Current Source Anchors

- `src/hooks/useGamepadNavigation.ts`: main navigation and input ownership.
- `src/utils/gamepad.ts`, `src/utils/gamepad.js`: device selection, mappings, hat-switch fallback, haptics.
- `src/contexts/GamepadContext.tsx`: platform/icon presentation context.
- `src/components/ui/gamepad.tsx`, `GamepadBtn.tsx`, `GamepadKeyboard.tsx`: controller visuals and keyboard.
- Individual modal components: local RAF/keyboard loops and focus ordering.
- `src/components/modals/AppDetailsModal.tsx`: app launch preview and gamepad-reachable manage actions.
- `src/components/layout/HelperTray.tsx` and `src/components/modals/ControlsModal.tsx`: helper-surface focus graphs, repeat, and opening-release isolation.
- `src/components/modals/ControllerToolsModal.tsx`: Controller Settings glyph preview and live tester, isolated from the app poll. The tester keeps face buttons free for checking and closes on BACK/Select.
- `src/App.jsx`, `HomeView.tsx`, `LibraryViewContent.tsx`, `settings.tsx`: active refs and scroll targets. `src/utils/scrollElement.ts` clamps library scrolls and skips no-ops.

## Common Failure Modes

- Recreating a modal poll effect whenever render-time callbacks or lazy data change, restarting its opening suppression window.
- Letting background navigation run beneath a modal or launch overlay.
- Using transformed visual rectangles without correcting scale/layout, causing jitter or wrong scroll ancestry.
- Moving focus without ensuring the focused control is visibly on-screen.
- Assuming a headset adapter or non-controller HID device is the intended gamepad.

## Validation

- Run `npm run test`, `npm run build`, and `git diff --check` for shared navigation changes.
- Use the mocked Playwright smoke test for deterministic focus flows, while labeling it browser-only.
- On real hardware, check taps, held repeat, diagonal input, modal open/close bleed, focus visibility, and haptic feel.
- For FSE return input, also follow [Library and launching](library-launching.md) and [Known issues](known-issues.md).
