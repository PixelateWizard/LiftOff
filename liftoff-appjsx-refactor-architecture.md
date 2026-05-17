# LiftOff App.jsx Refactor Architecture Plan

## Goal

Refactor `src/App.jsx` into smaller, typed `.tsx` components without changing behavior.

The north star: `App.jsx` should become the orchestration layer, not the entire spaceship cockpit. It should coordinate providers, app-wide state, active views, overlays, and launch flow, while feature-specific UI and side-effect-heavy logic move into components and hooks.

## Current repo notes

- The repository is `PixelateWizard/LiftOff`.
- `src/App.jsx` exists and currently contains a lot of mixed responsibilities.
- The repo already has useful structure:
  - `src/components`
  - `src/contexts`
  - `src/views`
  - `src/types.ts`
  - `src/constants`
- `src/contexts/ThemeContext.tsx` already exposes typed theme values.
- `src/contexts/SettingsContext.tsx` already exposes typed settings values.
- `src/theme/surfaces.ts` now centralizes theme/surface visual tokens through `useSurfaceTheme`, including `glass`, `glassBar`, `settingsRowGlass`, `surface`, `appBg`, and background glow values. Future theme and surface work should extend this layer instead of adding more inline styling branches to `App.jsx`.
- The hooks extraction pass is now implemented. `App.jsx` delegates system status, search state, modal state, collections, custom sources, library data, and update checking to dedicated hooks under `src/hooks/`.
- `useModalState` intentionally owns only modal state, setters, mirrored refs, and ref-sync effects. `App.jsx` still owns `closeHideModal`, `closeLibraryActionsModal`, and `closeArtPicker` because those functions include gamepad button-suppression behavior.
- `useLibraryData` owns apps, recents, pins, hidden state, icon color sampling, library refresh, and initial library load. `App.jsx` still owns splash-exit timing and `set_gamepad_ready` through `onLoaded` / `onLoadError` callbacks.
- `src/types.ts` already defines useful shared types such as:
  - `App`
  - `Settings`
  - `ThemeColors`
  - `AccentColors`
  - settings item unions
- `src/views/settings.tsx` is a good model for the other tab-level views.
- `CLAUDE.md` was not found in the repo root or via search, so proceed unless a local-only copy exists.

## Strong recommendation

Do **not** do a giant “convert everything to TSX” refactor in one swing.

Split by runtime responsibility first, then type gradually. This keeps regressions small and avoids turning the refactor into a haunted mansion with source maps.

## Target file structure

```txt
src/
  App.jsx                       // temporary shell/orchestrator
  App.tsx                       // eventual rename target

  components/
    app/
      AppRoot.tsx
      AppProviders.tsx
      AppBackground.tsx
      AppMainContent.tsx
      AppOverlays.tsx

    launch/
      SplashScreen.tsx
      LaunchOverlay.tsx

    art/
      ArtPickerModal.tsx
      SteamGridArtPickerModal.tsx
      ThumbnailCard.tsx

    library/
      LibraryGrid.tsx
      LibrarySection.tsx
      AppCard.tsx
      GameCard.tsx
      EmptyState.tsx

    home/
      HomeView.tsx
      HeroSpotlight.tsx
      RecentAppsSection.tsx
      PinnedAppsSection.tsx
      HomeCollectionsSection.tsx

    navigation/
      TabContent.tsx

  hooks/
    useAppSettings.ts
    useLibraryData.ts
    useGamepadNavigation.ts
    useLaunchApp.ts
    useAudioFeedback.ts
    usePersistentJson.ts
    useCustomArt.ts
    useCollections.ts
    useCustomSources.ts
    useModalState.ts
    useSearchState.ts
    useSystemStatus.ts
    useUpdateCheck.ts

  utils/
    gamepad.ts
    appFilters.ts
    art.ts
    themeSurface.ts
```

## Extraction plan

### Phase 1: extract launch components

This is the safest first move because these components are visually and behaviorally self-contained.

Move from `App.jsx`:

```txt
SplashScreen
ss
LaunchOverlay
launchApp helper, or move launchApp into useLaunchApp.ts
```

Create:

```txt
src/components/launch/SplashScreen.tsx
src/components/launch/LaunchOverlay.tsx
src/hooks/useLaunchApp.ts
```

Suggested `SplashScreen` props:

```ts
interface SplashScreenProps {
  exiting: boolean;
}
```

Suggested `LaunchOverlay` props:

```ts
import type { App, AccentColors } from "../../types";

interface LaunchOverlayProps {
  app: App | null;
  gameArt: Record<string, string>;
  customArt: Record<string, string>;
  accent: AccentColors;
  onDone: () => void;
}
```

If `LaunchOverlay` depends on `getBestGamepad` or `readGpState`, either import them from wherever they currently live or move those helpers into:

```txt
src/utils/gamepad.ts
```

### Phase 2: extract custom art components

Move art-specific UI and logic out of `App.jsx`.

Create:

```txt
src/components/art/ArtPickerModal.tsx
src/components/art/ThumbnailCard.tsx
src/components/art/SteamGridArtPickerModal.tsx
```

Move:

```txt
ArtPickerModal
ThumbnailCard
SteamGridDB picker logic, if currently inside App.jsx
```

Keep all existing Tauri `invoke` calls functionally identical.

Do not bury these under generic `components/modals`. They are modals, yes, but their real domain is art management. Domain folders are cleaner than a drawer of random components.

### Phase 3: extract app shell pieces

Create:

```txt
src/components/app/AppBackground.tsx
src/components/app/AppOverlays.tsx
src/components/app/AppMainContent.tsx
```

Responsibilities:

#### `AppBackground.tsx`

Owns theme background rendering:

```txt
stars
clouds
wash
cinder
plasma
future ozone background
future pixel background
```

This is especially important for future theme work. Ozone should eventually have its own deterministic bubble background layer behind cards, hero content, and navigation.

#### `AppOverlays.tsx`

Owns overlay rendering:

```txt
SplashScreen
LaunchOverlay
GamepadKeyboard
modal switchboard
confirm modal
context menu modal
hide modal
library actions modal
folder manager modal
collection manager modal
edit name modal
custom art modal
```

This should mostly receive state and callbacks from `App`.

#### `AppMainContent.tsx`

Chooses which tab/view to render:

```txt
Home
Games
Apps
Settings
```

It should not own heavy app logic. It is a routing/rendering component, not a brain.

### Phase 4: extract views

Create:

```txt
src/views/HomeView.tsx
src/views/GamesView.tsx
src/views/AppsView.tsx
```

Use `src/views/settings.tsx` as the model for view-level files.

Each view should receive typed props and render its own tab content.

Suggested boundaries:

#### `HomeView.tsx`

Owns:

```txt
home hero
recent apps/games
pinned section
home collections
cinematic home layout
home cover scale
hero cover visibility
```

#### `GamesView.tsx`

Owns:

```txt
games grid
game-focused library sections
game collections
game cover scale
game-specific empty states
```

#### `AppsView.tsx`

Owns:

```txt
apps grid
app-focused library sections
app collections
app-specific empty states
```

### Phase 5: hooks extraction

Status: implemented.

Implemented hooks:

```txt
src/hooks/useLibraryData.ts
src/hooks/useCustomArt.ts
src/hooks/useCollections.ts
src/hooks/useCustomSources.ts
src/hooks/useAudioFeedback.ts
src/hooks/useModalState.ts
src/hooks/useSearchState.ts
src/hooks/useSystemStatus.ts
src/hooks/useUpdateCheck.ts
```

Deferred:

```txt
src/hooks/useGamepadNavigation.ts
src/hooks/useAppSettings.ts
src/hooks/useStartupBootstrap.ts
```

Do not prematurely abstract the remaining gamepad and settings paths. The current hook pass moved state domains first and kept gamepad-sensitive wrappers in `App.jsx`.

## State ownership

### Keep in `App` for now

These are orchestration state and can remain in `App` during the first pass:

```ts
activeTab
focusedIndex
settingsFocusIndex
settingsSection
activeModal
selectedApp
launchingApp
isSplashVisible
```

### Moved to hooks

These are domains with side effects or reusable behavior:

```txt
useLibraryData
  apps
  recents
  recent games
  refreshLibrary
  libraryRefreshStatus
  hidden apps
  pins
  icon colors

useCustomArt
  customArt
  setCustomArt
  resetCustomArt
  gameArt
  heroArt

useCollections
  gameCollections
  appCollections
  memberships
  selected collection tab

useCustomSources
  custom sources
  custom folders

useAudioFeedback
  UI sounds
  launch sounds
  loaded sounds

useModalState
  modal open state
  selected app payloads
  modal mirrored refs

useSearchState
  keyboard state
  search mode/focus state
  search mirrored refs

useSystemStatus
  clock polling
  battery polling

useUpdateCheck
  latest-release request state
  update status/info
```

### Still in `App` for now

```txt
useGamepadNavigation candidate
  global poll loop
  tab navigation
  grid navigation
  modal suppression
  repeat-speed behavior

useAppSettings candidate
  settings load/save
  scan-triggered library refresh
  language changes

modal close helpers
  closeHideModal
  closeLibraryActionsModal
  closeArtPicker
```

The biggest long-term win is `useGamepadNavigation`, but do not start there. It is too entangled and too easy to break. Extract dumb visual islands first, then tackle behavior once the file is less cursed.

## Suggested final `App` shape

```tsx
function App() {
  // Top-level orchestration only:
  // settings
  // theme derivation
  // active tab
  // focus state
  // modal state
  // launch state

  return (
    <GamepadProvider>
      <SettingsProvider value={settingsValue}>
        <ThemeProvider value={themeValue}>
          <AppBackground />
          <AppHeader {...headerProps} />
          <AppMainContent {...contentProps} />
          <AppBottomBar {...bottomBarProps} />
          <AppOverlays {...overlayProps} />
        </ThemeProvider>
      </SettingsProvider>
    </GamepadProvider>
  );
}
```

## Instructions for Claude Code / Codex

```md
Goal: refactor `src/App.jsx` into smaller TSX components without changing behavior.

Before editing:
1. Inspect `src/App.jsx`, `src/types.ts`, `src/contexts/ThemeContext.tsx`, `src/contexts/SettingsContext.tsx`, `src/views/settings.tsx`, `src/components/layout/AppHeader`, and `src/components/layout/AppBottomBar`.
2. Check whether `CLAUDE.md` exists anywhere in the repo. If it does not, proceed and mention that in the summary.
3. Do not do a full rewrite. This should be an incremental extraction refactor.

Constraints:
- Preserve current behavior exactly.
- Avoid changing CSS class names unless required.
- Avoid moving logic into contexts unless the state is truly global.
- Prefer typed props using existing `src/types.ts`.
- Reuse existing `ThemeProvider`, `SettingsProvider`, and existing type definitions.
- Keep `App.jsx` working during the first pass. Do not rename to `App.tsx` yet unless the project already supports it cleanly.
- After each extraction, run the normal build/typecheck/lint commands available in `package.json`.

Phase 1: extract launch components
Create:
- `src/components/launch/SplashScreen.tsx`
- `src/components/launch/LaunchOverlay.tsx`

Move:
- `SplashScreen`
- `ss`
- `LaunchOverlay`

Use props:
```ts
interface SplashScreenProps {
  exiting: boolean;
}
```

```ts
import type { App, AccentColors } from "../../types";

interface LaunchOverlayProps {
  app: App | null;
  gameArt: Record<string, string>;
  customArt: Record<string, string>;
  accent: AccentColors;
  onDone: () => void;
}
```

If `LaunchOverlay` depends on `getBestGamepad` or `readGpState`, either:
- import them from wherever they currently live, or
- move those helpers into `src/utils/gamepad.ts` and update imports.

Phase 2: extract custom art components
Create:
- `src/components/art/ArtPickerModal.tsx`
- `src/components/art/ThumbnailCard.tsx`
- `src/components/art/SteamGridArtPickerModal.tsx` if SGDB picker logic is currently inside App.jsx.

Move art-specific code out of App.jsx. Keep all Tauri `invoke` calls functionally identical.

Phase 3: extract app shell pieces
Create:
- `src/components/app/AppBackground.tsx`
- `src/components/app/AppOverlays.tsx`
- `src/components/app/AppMainContent.tsx`

Responsibilities:
- `AppBackground`: theme background layers, stars/clouds/wash/cinder/plasma effects, future Ozone/Pixel theme backgrounds.
- `AppOverlays`: splash, launch overlay, keyboard, modal switchboard.
- `AppMainContent`: chooses Home/Games/Apps/Settings tab content.

Phase 4: extract views
Create:
- `src/views/HomeView.tsx`
- `src/views/GamesView.tsx`
- `src/views/AppsView.tsx`

Keep `src/views/settings.tsx` as the model for view-level files.

Phase 5: hooks extraction
Status: implemented for the low-risk state domains.

Implemented:
- `src/hooks/useLibraryData.ts`
- `src/hooks/useCustomArt.ts`
- `src/hooks/useCollections.ts`
- `src/hooks/useCustomSources.ts`
- `src/hooks/useAudioFeedback.ts`
- `src/hooks/useModalState.ts`
- `src/hooks/useSearchState.ts`
- `src/hooks/useSystemStatus.ts`
- `src/hooks/useUpdateCheck.ts`

Deferred:
- `src/hooks/useGamepadNavigation.ts`
- `src/hooks/useAppSettings.ts`
- `src/hooks/useStartupBootstrap.ts`

Do not prematurely abstract. First move code, then simplify.

Suggested final App shape:
```tsx
function App() {
  // top-level orchestration only:
  // settings, theme derivation, active tab, focus state, modal state, launch state

  return (
    <GamepadProvider>
      <SettingsProvider value={settingsValue}>
        <ThemeProvider value={themeValue}>
          <AppBackground />
          <AppHeader {...headerProps} />
          <AppMainContent {...contentProps} />
          <AppBottomBar {...bottomBarProps} />
          <AppOverlays {...overlayProps} />
        </ThemeProvider>
      </SettingsProvider>
    </GamepadProvider>
  );
}
```

Acceptance criteria:
- App launches exactly as before.
- Gamepad navigation still works across Home, Games, Apps, Settings, modals, keyboard, and launch overlay.
- Existing settings persist correctly.
- Theme/accent/surface behavior is unchanged.
- Custom art and SGDB art picker still work.
- No visual regressions in dark/light/cinder/wash/plasma/sky/space themes.
- `App.jsx` is substantially smaller and mostly orchestration.
```

## Recommended implementation order

1. `SplashScreen.tsx`
2. `LaunchOverlay.tsx`
3. `ArtPickerModal.tsx`
4. `ThumbnailCard.tsx`
5. `AppOverlays.tsx`
6. `AppBackground.tsx`
7. `HomeView.tsx`
8. `GamesView.tsx`
9. `AppsView.tsx`
10. hooks pass

## Acceptance criteria for the full refactor

- App launches exactly as before.
- Gamepad navigation still works across:
  - Home
  - Games
  - Apps
  - Settings
  - modals
  - keyboard
  - launch overlay
- Existing settings persist correctly.
- Theme, accent, and surface behavior is unchanged.
- Custom art and SteamGridDB art picker still work.
- No visual regressions in existing themes:
  - dark
  - light
  - cinder
  - wash
  - plasma
  - sky
  - space
- `App.jsx` is substantially smaller and mostly orchestration.

## Notes for future theme work

This refactor sets up cleaner future implementation for:

```txt
Ozone theme
Pixel / Save Point theme
theme-specific background components
theme effects toggle cleanup
surface-style defaults per theme
```

For Ozone specifically, the later implementation should prefer:

```txt
src/components/backgrounds/OzoneBackground.tsx
```

or:

```txt
src/components/app/AppBackground.tsx
```

with theme-specific child components such as:

```txt
SpaceBackground
SkyBackground
PlasmaBackground
CinderBackground
WashBackground
OzoneBackground
PixelBackground
```

The key rule: background effects stay behind cards, hero content, navigation, and modals.
