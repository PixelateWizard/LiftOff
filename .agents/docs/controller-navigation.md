# Controller and Navigation

## Purpose

Define LiftOff's controller-first focus model, modal isolation, scrolling rules, and hardware validation boundary.

## Read When

Read for gamepad mapping, focus movement, repeated input, modal behavior, scrolling, UI-scale bugs, haptics, or controller-visible affordances.

## Durable Constraints

- `useGamepadNavigation` owns the main RAF poll, repeat timing, focus state machine, tab/source movement, and mirrored refs used inside long-lived callbacks.
- Modal and overlay controllers must isolate main navigation while open and suppress held buttons until release when closing. A close-confirm press must never activate the surface underneath.
- The helper tray and Controls modal own their keyboard/gamepad loops while visible and gate the app poll through mirrored refs. A single MENU press opens the helper tray in Full, Minimal, and Hidden modes; suppress that edge until release so it cannot also activate the tray or the underlying tab. The tray opens on Settings and its visual/focus rows are shortcuts, system controls, pinned games/apps when present, then Spotify. Pinned game activation follows the normal Details-first contract, while pinned apps launch directly. The Spotify scrubber, Volume, and Brightness require A to enter adjustment mode so Left/Right can otherwise move between neighboring controls; A or B commits and exits adjustment. Reserve controller-hint space even while unfocused so focus changes never reflow the tray.
- Keep one active scroll/focus owner. Warm-mounted inactive Games/Apps panes must use private refs and cannot own the shared active refs.
- Library entry focus must resolve against the destination view: use the first visible pinned card only in an All view that actually renders matching pins; otherwise use the first visible grid card. Source/collection switches must not leave focus in hidden header or toolbar sections.
- Avoid `scrollIntoView()` for scaled main card navigation. Measure the focused element against the intended inner scroller, compensate for `ui_scale`, and preserve header/footer clearance.
- Horizontal shelves need explicit container refs and should reset index zero to their designed left padding.
- In Game Details, treat the About/Media body as one vertically scrollable region and Media as one horizontal focus row. Vertical input must reveal clipped body edges before collapsing back to Play; it must not use the media-item count as a vertical grid stride.
- Repeated navigation should avoid stacking smooth-scroll animations; use immediate correction during held repeat and smoother correction for discrete movement.
- Web Gamepad mocks do not establish controller feel, non-standard mapping behavior, haptics, or native foreground input ownership.

## Current Source Anchors

- `src/hooks/useGamepadNavigation.ts`: main navigation and input ownership.
- `src/utils/gamepad.ts`, `src/utils/gamepad.js`: device selection, mappings, hat-switch fallback, haptics.
- `src/contexts/GamepadContext.tsx`: platform/icon presentation context.
- `src/components/ui/gamepad.tsx`, `GamepadBtn.tsx`, `GamepadKeyboard.tsx`: controller visuals and keyboard.
- Individual modal components: local RAF/keyboard loops and focus ordering.
- `src/components/layout/HelperTray.tsx` and `src/components/modals/ControlsModal.tsx`: helper-surface focus graphs, repeat, and opening-release isolation.
- `src/App.jsx`, `HomeView.tsx`, `LibraryViewContent.tsx`, `settings.tsx`: active refs and scroll targets.

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
