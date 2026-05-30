# Changelog

## Unreleased

## [2.0.0-alpha.4.1] - Alpha 4.1

### Changed
- **Games source tabs** - the Other source tab now hides when there are no visible games outside the built-in and custom game sources, matching the existing empty-source behavior for Steam, Xbox, and Battle.net.

### Bug Fixes
- **SteamGrid art picker clipping** - the expanded art picker now accounts for UI scale when sizing itself, keeping the full-screen feel without cutting off the bottom or right controls.
- **Modal stick-repeat navigation** - held left-stick directions now repeat through controller-driven modals and launch/art overlay actions instead of only moving once per stick tilt.
- **Source tab gamepad navigation** - LT/RT navigation now recovers cleanly when the active source tab disappears, so hiding Other cannot cause the controller to skip adjacent source tabs.

## [2.0.0-alpha.4] - Alpha 4

### Added
- **Splash loading status text** - added a localized, rotating status line below the startup splash dots so long library scans show reassuring activity without claiming a fake progress percentage.
- **Update channel setting** - added a Settings option for Stable vs Alpha / Beta update checks, allowing prerelease users to discover alpha and beta GitHub releases from inside LiftOff.
- **Power modal** - added a controller-friendly Power modal from the Home root with Restart LiftOff and Exit LiftOff actions.

### Changed
- **Alpha versioning and installer target** - bumped the app to `2.0.0-alpha.4` and switched Tauri bundling to NSIS-only so prerelease SemVer can be used without MSI/WiX version errors.
- **Game source tabs** - Steam, Xbox, and Battle.net source tabs now appear only when their scan toggle is enabled and at least one installed game from that source exists; hidden/removed active filters fall back to All.
- **Home tab switch performance** - Home, Games, and Apps now stay mounted across tab switches; inactive Games/Apps panes use `content-visibility: hidden`, inactive Home stays mounted at near-transparent opacity so theme effects can keep showing behind translucent tabs, and animated hero media now pauses off Home to avoid decoder/compositor work during non-Home scrolling while still pausing for launch, blur, alt-tab, and hidden-window cases.
- **Home hero cycling performance** - hero carousel video playback now has a single pause owner, immediate-neighbor prebuffering, and one-shot playback recovery instead of repeated retry intervals during every carousel step.
- **Splash long-wait timing** - the "Still working" splash message now appears only after the final regular status label has been visible for 8 seconds, instead of 8 seconds after splash mount.

### Bug Fixes
- **Startup blank screen regression** - fixed a React hook-order crash after the splash screen by keeping the game-source tab fallback effect above the splash early return.
- **Games/Apps gamepad scrolling** - fixed down-navigation on Games and Apps tabs after the keep-mounted tab optimization by ensuring only the active library pane owns `tabScrollRef` and `focusedCardRef`; hidden panes keep separate private refs.
- **Broken game cover fallback** - failed custom or cached game cover URLs now fall back to the accent placeholder cover instead of showing a broken image icon.
- **Horizontal grid browse stability** - moving left/right within the same game grid row no longer applies vertical scroll correction, preventing the view from wiggling during lateral browsing.
- **Animated hero startup stability** - active hero videos now keep retrying playback while active, use a real static hero layer under animated media when available, and avoid a startup focus-poll false negative that could hide animated heroes behind a blurred fallback until the app was refocused.
- **Animated hero off-tab stutter** - animated Home hero video and GIF/WebP media now pause whenever Home is not the active tab, preventing hidden hero playback from competing with Games/Apps repeat scrolling.
- **Animated-image hero flash** - animated WebP/GIF heroes no longer have their `src` removed on pause. Removing the source forced a full re-decode on return, exposing the static banner underneath for the decode beat. The source is now kept loaded so the last frame is held; the off-tab Home wrapper being hidden already prevents off-tab compositing cost.
- **Video hero static flash** - video-backed heroes fade in via opacity only once the video element is actually playing, and hold their last frame across pauses so there is no transparent window on tab-switch return or post-launch return. The base layer is now gated on the resolved hero type (not the loaded URL) so the static banner is never in the layer stack for a video-intended hero in Custom mode.
- **Video hero load gap** - video-backed heroes now use the active theme background during tab transitions and first-frame gaps instead of briefly flashing a static banner or blurred cover.
- **Settings stick-repeat scrolling** - repeated stick navigation in Settings now uses the active tab scroller directly and avoids stacking smooth scroll requests at list edges.

## [2.0.0-alpha.3] - Alpha 3

### Added
- **Expanded layout and Home customization** - [moi952](https://github.com/moi952) added independent Wide Layout sub-toggles for top bar, Games, Apps, Settings, and bottom bar; Home mode controls for normal/semi/immersive layouts; Home pinned positioning; section title sizing; and a toggle to hide apps from the Home recents shelf.
- **Apps view scaling and list mode** - [moi952](https://github.com/moi952) added an Apps Cover Scale slider plus an optional Apps list view with configurable column count.
- **Tab and bar presentation controls** - [moi952](https://github.com/moi952) added tab icon display modes, compact tab-bar background, separate top/bottom bar background toggles, and bottom-bar compact behavior.
- **Onyx theme settings polish** - [moi952](https://github.com/moi952) added Onyx-specific top-light and flat-settings toggles, theme-locked settings display, Onyx background handling, and shared focus-ring styling for cards/settings rows.
- **Rename support for all entries** - [moi952](https://github.com/moi952) extended rename from custom entries to all apps and games, storing overrides in `custom_names.json` and applying them during library scans.
- **Expanded animated theme environments** - added Aurora, Synthwave, Lofi, Forest, and Webcore/Win9X theme support alongside the existing Space, Sky, Plasma, Cinder, and Wash environments.
- **Win9X surface style** - renamed the former Pixel surface to Win9X and added square-edged, desktop-shell-inspired chrome, app cards, modals, title bars, dark-mode coloring, and Webcore-specific window styling.
- **Webcore background refresh** - replaced the plain gray/Webcore window background with a Windows XP-inspired sky treatment using soft cloud puffs and a bouncing LiftOff logo screensaver element.
- **Immersive Home hero-art toggle** - added a setting that keeps the immersive Home carousel, selected title, and cover art visible while hiding the large hero background artwork so the active theme background can show through.
- **Shared surface token layer** - moved theme/surface styling decisions into `src/theme/surfaces.ts` via `useSurfaceTheme`, centralizing card, bar, settings-row, background, and surface tokens outside `App.jsx`.
- **Lofi background music** - added theme-scoped Lofi background music that loops only while the Lofi theme is active, pauses when switching away, and can be disabled from Settings.
- **Launch handoff pause and return cooldown** - added an `appPaused` path that pauses launcher animations, animated hero media, and Lofi media while an app/game is being launched or LiftOff is out of focus, plus a short post-return cooldown before another launch can start.
- **App settings hook** - moved settings bootstrap, refs, saving, update helpers, auto UI-scale setup, language sync, default-tab loading, and scan-toggle refresh tracking into `useAppSettings`.
- **Startup bootstrap hook** - moved splash loading state, splash exit timing, gamepad-ready signaling, and load-error fallback handling into `useStartupBootstrap`.

### Changed
- **Onyx focus-ring polish** - Onyx focused app/list items now use the same animated ring treatment as subtabs, while wide Settings rows use a perimeter-stroke focus ring to avoid stretched conic-gradient bands; disabling Onyx background effects now falls back to a static accent border.
- **Settings model expanded for Moi's latest UI work** - added new Rust/TypeScript settings fields and defaults for Onyx controls, granular wide-layout areas, Home display options, app list/scaling controls, tab icon mode, compact bars, and recents filtering.
- **Physical keyboard rename flow** - rename modals now focus the HTML input immediately and only open the gamepad keyboard on demand, so physical typing works naturally.
- **Gamepad keyboard mode cycle** - the RT keyboard control now cycles through `abc`, `ABC`, and `123` modes with matching key labels and hints.
- **Gamepad navigation hook extracted** - the entire input layer (RAF poll, hold-repeat, button suppression, tab/focus state machine, launch session tracking, window focus handling, and all suppression-wrapped close helpers) moved into `src/hooks/useGamepadNavigation.ts`. `App.jsx` now calls the hook and wires its returned state and actions into JSX; it no longer owns any navigation logic directly.
- **Theme surface defaults updated** - Plasma now defaults to Neon, Forest defaults to Glass, Webcore defaults to Win9X, and Lofi defaults to Obsidian while manual Surface Style selection remains independent after theme selection.
- **Synthwave background layering** - adjusted the synthwave ground/mountain layer so it no longer blocks app content.
- **Webcore/Win9X UI polish** - removed rounded corners from Webcore app cards, nav, pills, and modals; aligned modal title bars with the Win9X-style nav title bar; and removed translucent focused settings/card states from the surface.
- **Webcore immersive Home polish** - removed the cover-art gradient overlay in Webcore immersive Home and added a Win9X popup-style content shell behind the hero content.
- **Forest background polish** - replaced sharp triangular tree silhouettes with more organic pine shapes.
- **Settings nested tray borders** - reduced the odd border treatment around nested settings groups for non-Win9X surfaces while preserving Win9X bevel styling.
- **Obsidian app tiles** - app tiles now use the same darker, low-transparency Obsidian treatment as the nav instead of picking up bright colour bleed from the background artwork.
- **Lofi video background cleanup** - removed the old Lofi CSS-driven overlay animations now that the theme uses an animated MP4 background.
- **App.jsx hook extraction** - moved system status, search state, modal state/refs, collections, custom sources, library data, update checks, settings, and startup bootstrap into dedicated hooks while keeping gamepad-sensitive close helpers in `App.jsx`.
- **Home hero media handling** - Home now owns hero media playback against the actual rendered hero list, treats animated WebP/GIF hero art as pausable media, keeps video heroes preloaded, and clips the non-Webcore hero surface to a fully rounded border.
- **Semi-immersive Home slot sizing** - semi-immersive Home now uses a fixed bottom snap-scrolling slot for recents and collection rows. Hero height is derived from UI scale, Home cover scale, label height, focus bleed, and shadow allowance so larger cards resize the hero instead of overlapping it.
- **Immersive drawer polish** - drawer collection navigation now keeps row headers below the drawer chrome, preserves bottom padding on the final row, scrolls focused cards horizontally without re-pinning the row vertically, and uses a subtler Material top-edge highlight instead of a heavy upward shadow.
- **Win9X app list tiles** - Win9X list-mode app tiles now use opaque panel surfaces with backdrop blur disabled, preventing the page background from showing through the tiles.
- **Theme effects toggles** - theme Effects toggles now preserve the theme background in a static state instead of removing it. Space/Sky keep static stars/clouds, animated environment layers freeze, Lo-fi keeps the video frame visible while pausing playback/music, and Webcore/Cyberpunk stop their JS-driven motion.
- **Space/Sky effects labels** - renamed the Space and Sky settings labels from Background Stars/Background Clouds to Star Effects/Cloud Effects to match the new behavior.

### Bug Fixes
- **Stale renamed recents** - Home recents now look up the current app/game name from the full library instead of showing cached `RecentEntry.name` values.
- **Rename artwork refresh** - renaming an entry clears cached grid and hero art for that ID before refreshing the library, forcing SteamGridDB lookup under the new name.
- **Duplicate Settings hints** - LT/RT hints no longer duplicate in the bottom bar when they already appear in the tab bar.
- **Apps list focus readability** - focused Apps list rows now use a subtler accent outline, background lift, and restrained glow that remains visible on Plasma, Glass, and Obsidian without oversized borders or darkened titles.
- **Wash theme performance** - Wash now separates static SVG-filtered pigment layers from animated CSS-blur float layers, reducing per-frame SVG filter rasterization while keeping the watercolor look.
- **Obsidian focused settings row contrast** - the focused settings row in Obsidian surface style (Lo-fi theme default) now uses a near-opaque dark background (`rgba(6,4,14,0.92)`) instead of the previous near-transparent white overlay. This prevents the warm hero background from bleeding through and washing out the orange accent text on the focused row.
- **Accidental relaunch after closing apps/games** - returning to LiftOff after a launched app/game now snapshots held gamepad buttons and blocks launch attempts briefly, preventing stale confirm input from opening another item.
- **Lofi playback during launches** - Lofi music and the Lofi video background now pause while a launched app/game is active or LiftOff loses focus.
- **Animated hero media on focus loss** - animated WebP/GIF hero banners now pause correctly when LiftOff is launched, blurred, or alt-tabbed away instead of continuing through the static image path.
- **Semi-home card clipping** - fixed idle no-art app cards showing unintended borders and fixed focused card borders/shadows being clipped by the semi-home slot.
- **Immersive drawer scroll alignment** - fixed second-row collection headers being clipped after drawer scrolling and fixed bottom drawer padding being bypassed by vertical `scrollIntoView` calls.

## [2.0.0-alpha.2] - Alpha 2

### Added
- **Launch focus feedback** - launch overlay now distinguishes between launched-and-focused, launched-but-running-behind-LiftOff, failed-to-launch, and launched-but-unconfirmed states. Focus detection uses a one-shot Win32 foreground/window check, never treats missing focus as launch failure, and offers a controller-friendly **Try to focus again** action for unfocused/unconfirmed launches.
- **French translation and full i18n system** - [moi952](https://github.com/moi952) added localization infrastructure, language selection, and French language support, including user-facing translations across settings, navigation, library actions, and modal workflows.
- **SteamGridDB art browser** - [moi952](https://github.com/moi952) added an in-app SteamGridDB browsing flow for finding and applying artwork without leaving LiftOff.
- **Manual game/app entries and custom scan folders** - [moi952](https://github.com/moi952) added support for manually added entries, custom scan folders, and custom sources beyond the built-in Steam/Xbox/UWP/Desktop/Battle.net sources.
- **Rename support for custom entries** - [moi952](https://github.com/moi952) added the ability to rename custom apps/games from the UI.
- **Display preferences** - [moi952](https://github.com/moi952) added language, time format, clock, date, and battery visibility settings.
- **Independent cover scale sliders** - [moi952](https://github.com/moi952) added separate Home and Games cover scale controls so each view can be tuned independently.
- **Layout customization settings** - [moi952](https://github.com/moi952) added wide layout, cinematic Home, hide bottom bar, transparent bar controls, and separate transparent top/bottom bar toggles.
- **Navigation bar customization** - [moi952](https://github.com/moi952) added settings for bumper position, tab bar button display, text tabs, tab bar background, tab font weight, tab label casing, top-bar bumper hints, and bottom bar alignment.
- **Home collections controls** - [moi952](https://github.com/moi952) added Home collection display options, including showing collections on Home and toggling collection names.
- **Settings screen reorganization and subtabs** - [moi952](https://github.com/moi952) reorganized Settings into cleaner sections/subtabs with reusable grouped controls.
- **Gamepad glyph icon system** - [moi952](https://github.com/moi952) added platform-aware controller glyphs for Xbox, PlayStation, and Switch-style layouts.
- **Gamepad icon customization and auto-detection** - [moi952](https://github.com/moi952) added controller platform auto-detection plus gamepad icon style, color, theme-color, and size settings.
- **Controller test widget polish** - [moi952](https://github.com/moi952) added the current controller test widget implementation as part of the settings/UI cleanup work.
- **Component architecture refactor** - [moi952](https://github.com/moi952) split shared app state and chrome into reusable pieces such as `ThemeContext`, `SettingsContext`, `AppHeader`, and `AppBottomBar`, making the UI easier to evolve.
- **Immersive / cinematic Home mode** - added a fullscreen hero-first Home layout with large background artwork, controller-friendly Launch CTA, floating pinned shelf, and slide-up drawer access to recents and collections. The mode is available from Settings and works with the existing gamepad navigation model.
- **Wash theme** — new light animated environment that pairs with Material by default. Wash simulates a watercolor paper field using SVG-filtered compound radial gradients: warm accent pigment pools on the left, muted cool teal washes on the right, a central pigment-accumulation ring where the two wet masses meet, a faint cool cohesion bridge connecting the regions, and a barely visible tertiary hue whisper for depth. Paper grain SVG at overlay blend and `feComponentTransfer`-based dried-edge shaping give an organic, non-circular appearance. Restrained Material shadows keep cards as solid soft surfaces above the wash field.
- **Cinder theme** — renamed and upgraded the previous smoldering environment into a darker heat theme. Cinder uses layered heat-field gradients, asymmetrical glow pockets, drifting cinder particles with randomized speed/size/flicker, and subtle accent undertones without turning into a flat accent wash.
- **Theme default surface mapping** — selecting a theme now applies a default Surface Style without locking it: Space → Clear, Sky → Aero, Plasma → Glass, Cinder → Glass, Wash → Material. Manual Surface Style changes remain independent until the next theme selection.
- **Material surface style** — new Surface Style option alongside Glass, Aero, and Clear. Material uses opaque paper-textured fills, no backdrop blur, no glow-based depth, and a three-level elevation system (`--material-shadow-low`, `--material-shadow-medium`, `--material-shadow-high`) so panels feel like solid stacked cards instead of translucent glass.
- **Material design tokens** — added Material CSS custom properties for base/background surfaces, elevated panels, inset groups, subtle borders, and pressed/raised shadows. Light Material mixes in the selected accent background with warmer cream endpoints so accent themes remain respected; dark Material uses warmer aged-paper browns instead of pure black.
- **Material paper grain** — Material surfaces now layer a stitched SVG fractal-noise data URI over cards, bars, settings rows, and the app background. The grain is rasterized as a repeating tile, avoiding runtime SVG filter cost; dark mode uses a stronger paper tooth than light mode.
- **Material nested settings trays** — nested settings now render as opaque inset grouped surfaces with subtle top-edge definition, inner shadow/highlight, normal text contrast, and row micro-separation. Nested rows no longer rely on opacity or Clear-style transparency.
- **Aero surface style** — polished transparent acrylic material: brighter white-gradient fill with a sharp light-from-above knee falloff, lower backdrop blur (14 px cards / 12 px bars / 8 px rows vs. 22–28 px for Glass), hard 1 px top specular line, feathered sub-specular bloom, dark bottom rim, and a faint accent-colour outer ring on every surface. Panel fills stay neutral — no accent tinting of the panel background; the accent appears only on reflective edges and active/focus glows.
- **Glossy active elements in Aero mode** — active nav tab pill (AppHeader), focused pinned pills (regular and cinematic shelf), and Launch CTA all get a triple-inset glossy highlight in Aero mode: hard 1 px specular (`rgba(255,255,255,0.80)`), feathered bloom, and a dark bottom rim — giving a dimensional glossy-button appearance. Glass and Clear retain their original plain glow.
- **Surface Style setting** — replaces the previous Glass UI on/off toggle. Four options: Glass (frosted blur panels), Aero (polished acrylic), Material (solid matte surfaces), Clear (flat matte).
- **Three-tier glass hierarchy** — `glass` (cards), `glassBar` (nav/dock bars), `settingsRowGlass` (settings rows) have distinct weights for intentional visual depth. Each tier has separate Glass and Aero variants.
- **Immersive home drawer surfaces** — the cinematic home slide-up drawer now follows the selected surface style: dark Glass/Aero use layered blur treatments; light Glass stays transparent and blur-heavy, light Aero uses brighter acrylic highlights, Clear uses a subtly translucent warm sheet, and Material uses a solid raised slab with shadow-based depth.
- **Glass inactive treatment for interactive elements** — when Glass or Aero is active, unfocused section filter pills, home pinned items, and the Launch CTA render with the surface treatment: white-tint background, blur backdrop, brighter border, and a subtle `inset 0 1px 0` top highlight.
- **Show Pinned on Home** — new toggle in Settings → Appearance → Home to hide the pinned items shelf from both the regular and immersive home screen without unpinning any items.
- **Aero background depth gradient** — a subtle neutral linear gradient overlays the page background in Aero mode. Light theme: 4% white at the top fading to 2.5% dark at the bottom, adding vertical depth without re-tinting the accent-colored background. Dark theme: barely perceptible 1.2–1.8% tonal shift that does not compete with the star field. No accent color is mixed into the gradient.

### Changed
- **Wash theme** now reads as richer liquid tie-dye / marble ink: larger overlapping pigment blobs, peach-softened warm regions, blue and lavender cool regions, a stronger lavender meeting zone, subtle edge/corner color fills, denser dried-edge interiors, and a warmer paper base.
- **Wash theme performance** improved by keeping the organic SVG displacement filters on the main pigment blobs while converting the soft perimeter fill layers to cheaper unfiltered radial washes. This preserves the filled-edge look while reducing WebView2 paint/compositor load during navigation.
- **Material Settings focus** now uses an opaque, slightly accent-tinted raised surface with a single 2px accent border and stronger elevation. The earlier transparent tint, double-border/outline treatment, and left accent bar were removed to better match the Material surface model.
- **Clear Settings row height** now matches the other surface modes by using the same row padding in Settings.
- **Surface border radii** were standardized to the 8pt grid. Clear now matches Glass/Aero radii across primary surfaces: 16px for nav, bottom bar, hero cards, pinned pills, game/app cards, and settings rows; 24px for modals/drawers; 8px for cover art; pill controls remain 50%. Material keeps the tighter physical-paper set: 8px for cards/rows/pills/CTAs and 16px for modals/drawers.
- **Focused card scroll handling** now uses explicit, scale-aware scroll math against the active Home/tab scroll container instead of relying on `scrollIntoView`. This keeps focused cards out from under sticky chrome at non-100% UI scale and avoids root-container scroll jumps.
- **Home recents shelves** now support oversized card scales more gracefully. Regular Home recents scroll horizontally with gamepad focus and scroll vertically when large cards would fall below the viewport; immersive drawer recents use the same horizontal focus behavior.
- **Immersive drawer row spacing** now gives focused recents and collection cards enough lane padding for outlines and shadows, avoiding clipped glow/elevation at row edges.
- **Battery charging colors** now use a darker green in light mode and a separate high-contrast lightning bolt fill/stroke so the charging icon stays visible even near 100%.
- **Lunar/bright-accent toggles in dark mode** now use a dark enabled knob and dimensional accent track so switched-on toggles remain distinguishable from neutral off/white controls.
- **Home pinned shelf label contrast** now respects light mode for non-Material surfaces, using the theme text color instead of the dark-mode white label color.
- **Theme list** now uses animated environment names: Space, Sky, Plasma, Cinder, and Wash. Legacy theme values (`dark`, `light`, `system`, `ember`, and `bloom`) are normalized to the new names where possible.
- **Cinder accent behavior** now uses the selected accent only as a subtle undertone in heat pockets and brighter particles, preserving the warm smoldering identity while supporting cold-flame, arcane, or chemical-fire accents.
- **Wash + Material styling** adds a softer light Material token set with neutral off-white fills and low-contrast accent-tinted shadows when Wash is active.
- **Material Immersive Home hero** now uses directional, accent-aware gradients instead of a uniform fog layer. Light mode reduces the milky overlay and adds a localized title-anchor shade; dark mode strengthens the left-side text anchor while opening the right side so artwork keeps depth. The Launch CTA uses a solid raised Material surface with shadow-based contrast.
- **Material Immersive Home hero card** now uses a self-contained paper card in cinematic Material mode, removing the extra fog overlay and keeping the artwork unobstructed while preserving readable launch controls.
- **Immersive Home bottom-lane layout** now adapts when the bottom bar and collections drawer are hidden: the pinned shelf moves into the freed bottom-bar lane, and hero content stays close above it; if pinned is hidden too, hero content drops to the bottom lane.
- **Material elevation hierarchy** was refined across header, bottom bar, cards, settings rows, active elements, and modals. Raised surfaces use stronger soft shadows; pressed/active states reduce elevation; borders are kept extremely subtle.
- **Material accent usage** now stays focused on active tabs, toggles, focus states, selected rows, and CTAs. Panel backgrounds are no longer broadly accent-tinted or glow-driven.
- **Aero — directional highlight sharpened**: knee position moved from 18% to 12% on cards, 25% to 15% on rows. Sub-specular bloom tightened from 6 px to 4 px with slightly higher opacity. Effect: light appears to strike from a clear overhead point rather than diffusing evenly downward.
- **Aero — header/nav promoted to hero surface**: top specular increased from 42% to 52%, sub-specular widened to 7 px at 12% opacity, bottom rim darkened, and accent ring boosted to 14%. The nav bar now reads as the primary Aero surface in the hierarchy — glossier than cards or rows.
- **Aero — light mode depth improved**: panel fill opacity reduced by 6–10% at the bottom stop and the knee tightened to 12–15%, increasing transparency and making surface layering easier to read while keeping the airy feel.
- **Aero — interactive hover on section tab pills**: inactive Aero pills in `SectionTabBar` boost their top specular (42%→52%) and accent ring (12%→18%) on pointer hover. 150 ms ease transition, no animation on active/focused pills.
- **Bottom bar drop shadow direction corrected**: in Aero and Glass modes, the bottom dock bar now casts its drop shadow upward (toward content above) instead of downward, matching the physical light model. Inset highlights are unchanged.
- **Neon accent color** updated to match the new Xbox branding: vivid lime-green (`#44d62c`) replacing the previous mint-green (`#4ae88a`). Glow, light, and dark shades updated accordingly.
- **Settings rows (dark mode)** are now quieter: inactive rows use `blur(8px)`, lower white tint (`4.5–2.2%`), dimmer border (`rgba(255,255,255,0.07)`), and a subtler shadow. Focused rows gain elevation — `blur(12px) saturate(115%) brightness(1.02)`, stronger inset highlight (`rgba(255,255,255,0.14)`), and a precision outer shadow (`0 10px 28px rgba(0,0,0,0.28)`) — without increasing heaviness. Section divider lines reduced to `rgba(255,255,255,0.05)` in dark mode.
- **Collection cards (Home tab)** now correctly inherit the three-tier glass style when Glass UI is enabled; unfocused cards show the full `glass` surface instead of a suppressed flat override.
- **Top header glass** uses a dark scrim overlay + `saturate(115%) brightness(0.88)` to suppress colour bleed from bright wallpapers while keeping the premium look. Header text carries a `0 1px 2px rgba(0,0,0,0.55)` shadow for readability over busy art.
- **Active nav tab pill, focused pinned items (both shelves), Launch CTA button, and section filter pills** all use a solid `accent.primary` fill with a bold `0 4px 24px` glow box-shadow when active/focused. Style is independent of the Glass UI toggle.
- **Active/focused text color** is now WCAG-aware: each accent defines `darkText` (dark mode) and `lightDarkText` (light mode) flags in `constants.ts`. Active elements resolve to warm near-black (`rgba(20,14,10,0.90)`) when the flag is true and white otherwise — replacing a previously hardcoded dark color that produced low-contrast text in light mode on accents with dark `lightPrimary` values.

### Bug Fixes
- Fixed edit-name and related custom-entry workflow issues as part of [moi952](https://github.com/moi952)'s custom game rename and UI refinement work.
- Cleaned up settings/subtab UI regressions and controller-facing settings behavior as part of [moi952](https://github.com/moi952)'s settings reorganization and glyph-icon work.
- Fixed Material light mode hero/background theme updates when switching from dark to light. The hero no longer appends hex alpha suffixes to `color-mix()` background values, which produced invalid CSS for Material.
- Fixed Home pinned shelf horizontal navigation so returning to the left-most pinned pill restores the shelf's starting padding instead of parking the focused pill against the viewport edge.
- Fixed immersive drawer recent app cards showing letter placeholders when the lightweight recent record lacked `icon_base64`; drawer recents now look up the full `AppEntry` through `allAppsRef`.
- Fixed gamepad navigation on the Games tab causing game cards to slide behind the subtab row at UI scale above 100%. Root cause: `scrollIntoView` can scroll the scaled root ancestor under CSS `transform: scale()`. Main card navigation now uses explicit inner-scroller math; remaining `scrollIntoView` paths keep the root overflow guard.

---
