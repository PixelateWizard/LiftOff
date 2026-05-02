# Changelog

## [Unreleased]

### Added
- **Glass UI toggle** — new toggle in Settings → Appearance to enable or disable the glass UI system. When off, all surfaces revert to the original flat-translucent style used before v2.0.
- **Three-tier glass hierarchy** — `glass` (cards), `glassBar` (nav/dock bars), `settingsRowGlass` (settings rows) now have distinct weights so surfaces have intentional visual depth.
- **Immersive home drawer glass** — the cinematic home slide-up drawer now uses the glass treatment when Glass UI is enabled: layered gradient background, high-blur backdrop, and a glowing top-edge border.
- **Glass inactive treatment for interactive elements** — when Glass UI is enabled, unfocused/inactive section filter pills (SectionTabBar), home pinned items (both regular and cinematic shelf), and the Launch CTA button render with the glass surface treatment: white-tint background, `blur(12–14px) saturate(150%)` backdrop filter, brighter border, and a subtle `inset 0 1px 0` top highlight. Active/focused states remain as solid `accent.primary` fill regardless of Glass UI setting.
- **Show Pinned on Home** — new toggle in Settings → Appearance → Home to hide the pinned items shelf from both the regular and immersive home screen without unpinning any items.

### Changed
- **Neon accent color** updated to match the new Xbox branding: vivid lime-green (`#44d62c`) replacing the previous mint-green (`#4ae88a`). Glow, light, and dark shades updated accordingly.
- **Settings rows (dark mode)** are now quieter: inactive rows use `blur(8px)`, lower white tint (`4.5–2.2%`), dimmer border (`rgba(255,255,255,0.07)`), and a subtler shadow. Focused rows gain elevation — `blur(12px) saturate(115%) brightness(1.02)`, stronger inset highlight (`rgba(255,255,255,0.14)`), and a precision outer shadow (`0 10px 28px rgba(0,0,0,0.28)`) — without increasing heaviness. Section divider lines reduced to `rgba(255,255,255,0.05)` in dark mode.
- **Collection cards (Home tab)** now correctly inherit the three-tier glass style when Glass UI is enabled; unfocused cards show the full `glass` surface instead of a suppressed flat override.
- **Top header glass** uses a dark scrim overlay + `saturate(115%) brightness(0.88)` to suppress colour bleed from bright wallpapers while keeping the premium look. Header text carries a `0 1px 2px rgba(0,0,0,0.55)` shadow for readability over busy art.
- **Active nav tab pill, focused pinned items (both shelves), Launch CTA button, and section filter pills** all use a solid `accent.primary` fill with a bold `0 4px 24px` glow box-shadow when active/focused. Style is independent of the Glass UI toggle.
- **Active/focused text color** is now WCAG-aware: each accent defines `darkText` (dark mode) and `lightDarkText` (light mode) flags in `constants.ts`. Active elements resolve to warm near-black (`rgba(20,14,10,0.90)`) when the flag is true and white otherwise — replacing a previously hardcoded dark color that produced low-contrast text in light mode on accents with dark `lightPrimary` values.

### Bug Fixes
- Fixed gamepad navigation on the Games tab causing game cards to slide behind the subtab row at UI scale above 100%. Root cause: `scrollIntoView` scrolls all scrollable ancestors including the root div under CSS `transform: scale()`. Fix temporarily marks the root div as non-scrollable before each `scrollIntoView` call so only the inner scroll container animates.

---

## [1.2.2]
