# LiftOff App.jsx Hooks Extraction Proposal and Implementation Record

## Status

Implemented on May 17, 2026.

Created:

- `src/hooks/useSystemStatus.ts`
- `src/hooks/useSearchState.ts`
- `src/hooks/useModalState.ts`
- `src/hooks/useCollections.ts`
- `src/hooks/useCustomSources.ts`
- `src/hooks/useLibraryData.ts`
- `src/hooks/useUpdateCheck.ts`

Modified:

- `src/App.jsx`

Verification:

- `npm run build` passed after every hook extraction.
- Final `npm run build` passed.
- The only build note was Vite's existing chunk-size warning.

Important implementation note:

- `useModalState` owns only modal state, setters, mirrored refs, and ref-sync effects.
- `App.jsx` still owns `closeHideModal`, `closeLibraryActionsModal`, and `closeArtPicker` because those functions wrap modal state changes with gamepad suppression via `suppressUntilRelease`, `getBestGamepad`, and `readGpState`.
- `useLibraryData` owns the library load and exposes `onLoaded` / `onLoadError` callbacks so `App.jsx` still owns splash-exit timing and `set_gamepad_ready`.

## Goal

Extract the remaining stateful domains from `src/App.jsx` into small custom hooks while preserving behavior exactly.

`App.jsx` has already shed many view and shell components. The next pass should focus on side-effect and state clusters, not on JSX reshaping. The target is for `App.jsx` to keep orchestration, derived view data, gamepad navigation, and rendering, while domain hooks own their state, mirror refs, startup loading, and backend calls.

## Current Repo Reality

This proposal is based on the current `src/App.jsx`, not the older draft.

Important naming differences:

- There is no `games` state. Games are derived from `apps` with `app_type === "game"`.
- Recents are split into `recent` and `recentGames`.
- Collection tab state is named `appCollectionTab` and `gameSourceTab`, not `selectedAppCollection` / `selectedGameCollection`.
- `visibleGames` is not state and should remain derived.
- `iconColors`, `customSources`, and `customFolders` are part of the current library/custom-data load path and need explicit ownership.
- Startup loading is one large boot effect that mixes settings, custom art, recents, pins, custom data, collections, apps, icon colors, game art, splash exit, and gamepad readiness.

## Constraints

- Do not change behavior.
- Do not rename `src/App.jsx` to `App.tsx` in this pass.
- Do not extract `useGamepadNavigation` yet.
- Do not move component-local state into React context.
- Keep mirrored refs with their paired state.
- Prefer `.ts` hook files with types from `src/types.ts`.
- Run `npm run build` after each hook extraction.
- Keep edits small enough that any regression points to one hook.

## Implemented Extraction Order

### 1. `useSystemStatus`

Created `src/hooks/useSystemStatus.ts`.

Move:

- `time`, `setTime`
- `date`, `setDate`
- `battery`, `setBattery`
- `charging`, `setCharging`
- `hasBattery`, `setHasBattery`
- The clock polling effect
- The battery polling effect

Inputs:

```ts
interface UseSystemStatusOptions {
  timeFormat: string;
  language: string;
  settingsRef: React.MutableRefObject<any>;
}
```

Return:

```ts
interface SystemStatus {
  time: string;
  date: string;
  battery: number;
  charging: boolean;
  hasBattery: boolean;
}
```

In `App.jsx`:

```js
const { time, date, battery, charging, hasBattery } = useSystemStatus({
  timeFormat: settings.time_format,
  language: i18n.language,
  settingsRef,
});
```

Build passed after this hook.

### 2. `useSearchState`

Created `src/hooks/useSearchState.ts`.

Move:

- `searchOpen`, `searchQuery`, `searchMode`, `searchFocusIndex`
- `kbRow`, `kbCol`, `kbNumMode`
- `searchOpenRef`, `searchQueryRef`, `searchModeRef`, `searchFocusIndexRef`
- `kbRowRef`, `kbColRef`, `kbNumModeRef`
- `openSearch`, `closeSearch`, `switchSearchMode`
- `kbDelete`, `kbSpace`, `kbToggleNum`, `fireKey`

Do not move:

- `searchResults`, because it depends on `apps`
- `searchFocusedCardRef`, because it is a DOM ref used by rendering/scrolling
- The scroll-focused-search-result effect, unless it cleanly accepts `searchFocusedCardRef`

Return all state, setters, refs, and helper functions.

Build passed after this hook.

### 3. `useModalState`

Created `src/hooks/useModalState.ts`.

Move modal payload/open-state only:

- `showHideModal`
- `showLibraryActions`
- `showFileBrowser`
- `pendingFile`
- `showColModal`
- `colPickerApp`
- `confirmDelete`
- `showFolderManager`
- `artPickerApp`
- `artPickerMode`
- `contextMenu`
- `editNameApp`

Move refs:

- `showHideModalRef`
- `showLibraryActionsRef`
- `showFileBrowserRef`
- `pendingFileRef`
- `showColModalRef`
- `colPickerAppRef`
- `confirmDeleteRef`
- `showFolderManagerRef`
- `artPickerAppRef`
- `artPickerModeRef`
- `contextMenuRef`
- `editNameAppRef`

Move simple ref-sync effects for those values.

Keep in `App.jsx` for now:

- `closeHideModal`
- `closeLibraryActionsModal`
- `closeArtPicker`

Those close helpers snapshot gamepad button state through `suppressUntilRelease`, `getBestGamepad`, and `readGpState`, so moving them now would drag in gamepad concerns. The hook can expose setters and refs; the close helpers can follow later.

Build passed after this hook.

### 4. `useCollections`

Created `src/hooks/useCollections.ts`.

Move:

- `appCollections`, `setAppCollections`, `appCollectionsRef`
- `appMemberships`, `setAppMemberships`, `appMembershipsRef`
- `appCollectionTab`, `setAppCollectionTab`, `appCollectionTabRef`
- `gameCollections`, `setGameCollections`, `gameCollectionsRef`
- `gameMemberships`, `setGameMemberships`, `gameMembershipsRef`
- Initial load calls for:
  - `get_app_collections`
  - `get_app_memberships`
  - `get_game_collections`
  - `get_game_memberships`
- Ref-sync effects for collection and membership state

Return setters as well as state because existing modal handlers still mutate collections directly.

Do not move collection create/delete modal handlers yet. They live inside JSX callbacks and should remain until overlay extraction is revisited.

Build passed after this hook.

### 5. `useCustomSources`

Created `src/hooks/useCustomSources.ts`.

Move:

- `customSources`, `setCustomSources`, `customSourcesRef`
- `customFolders`, `setCustomFolders`
- Initial `get_custom_data` load
- The built-in-source filtering logic
- Ref-sync for `customSources`

Return:

```ts
interface CustomSourcesData {
  customSources: string[];
  setCustomSources: React.Dispatch<React.SetStateAction<string[]>>;
  customSourcesRef: React.MutableRefObject<string[]>;
  customFolders: CustomFolder[];
  setCustomFolders: React.Dispatch<React.SetStateAction<CustomFolder[]>>;
  reloadCustomSources: () => void;
}
```

Build passed after this hook.

### 6. `useLibraryData`

Created `src/hooks/useLibraryData.ts`.

Move:

- `apps`, `setApps`, `appsRef`
- `allAppsRef`
- `recent`, `setRecent`, `recentRef`
- `recentGames`, `setRecentGames`, `recentGamesRef`
- `pins`, `setPins`, `pinsRef`
- `hidden`, `setHidden`, `hiddenRef`
- `iconColors`, `setIconColors`
- `libraryRefreshStatus`, `setLibraryRefreshStatus`
- `togglePin`
- `toggleHidden`
- `refreshLibrary`
- Initial load calls for:
  - `get_recents`
  - `get_recent_games`
  - `get_pins`
  - `get_all_apps`
  - `get_hidden`
- `sampleIconColor`, either moved into this hook file or into `src/utils/iconColor.ts`

Inputs:

```ts
interface UseLibraryDataOptions {
  fetchGameArt: (apps: App[], onProgress?: (...args: any[]) => void) => Promise<void> | void;
  onLoaded?: (visibleApps: App[]) => void;
  onLoadError?: () => void;
}
```

Return all state, refs, setters, and helpers. Keep setters exposed because delete, rename, add-entry, and cache flows still need them.

Important: after this extraction, `App.jsx` still owns splash timing and `set_gamepad_ready`. The hook exposes `onLoaded(visibleApps)` and `onLoadError()` callbacks so the original success and failure paths remain distinct.

Build passed after this hook.

### 7. `useUpdateCheck`

Created `src/hooks/useUpdateCheck.ts`.

Move:

- `updateStatus`
- `updateInfo`
- `checkForUpdates`

Inputs:

```ts
interface UseUpdateCheckOptions {
  appVersion: string;
  githubRepo: string;
}
```

Return:

```ts
interface UpdateCheckData {
  updateStatus: "checking" | "up_to_date" | "available" | "error" | null;
  updateInfo: string | null;
  checkForUpdates: () => void;
}
```

Note: the current `App.jsx` defines `checkForUpdates` but does not show a mount effect in the scanned block. Preserve current call behavior exactly. Do not add an automatic check unless one already exists elsewhere.

Build passed after this hook.

## Defer To Later Passes

Do not extract these yet:

- `useGamepadNavigation`
- `useAppSettings`
- `useStartupBootstrap`
- App overlay callback handlers inside JSX
- `AppIcon`, `PinBadge`, `GameCard`, `VirtualKeyboard`
- Theme/background style injection or particle effects

These areas are intertwined with rendering, gamepad suppression, settings persistence, and refs. They should be extracted after the current hook extraction stabilizes.

## Expected `App.jsx` State After This Pass

Remaining local `useState` calls should mostly be:

- `tab`
- `gameSourceTab`
- `subtabFocusIndex`
- `addAppType`
- `loading`
- `splashExiting`
- `focusSection`
- `focusIndex`
- `adminPrefsVersion`
- `cacheClearLoading`
- `cacheClearStatus`
- `launchingApp`
- `settings`
- `settingsFocusIndex`
- `settingsSection`
- `heroIndex`
- `sliderDraft`
- `homeColFocusRow`
- `homeColFocusCol`
- `homeHiddenCollections`
- `heroCustomType`

It is okay if a few more remain where moving them would require dragging gamepad navigation or overlay handlers along with them.

## Completed Audit Checklist

- `npm run build` passes.
- `App.jsx` imports the new hooks and no longer owns the extracted state blocks.
- Mirrored refs are still updated where gamepad navigation expects current values.
- `recent` and `recentGames` fall back in `useLibraryData` as before.
- Hidden apps still disappear immediately and can reappear from the full `allAppsRef`.
- Pin toggling still updates `pinsRef`.
- Custom source and custom folder state is owned by `useCustomSources`.
- Collection picker and collection manager still receive setters and refs from `useCollections`.
- Search keyboard and results state is owned by `useSearchState`.
- Clock and battery polling is owned by `useSystemStatus`.
- Update check behavior is unchanged and still does not auto-run unless called by existing UI.

## Manual Smoke Test

Run the app and verify:

- Splash exits and app becomes gamepad-ready.
- Home, Games, Apps, and Settings tabs navigate.
- Search opens, types, switches to results, launches, and closes.
- Context menu opens and actions still work.
- Hide modal toggles visibility.
- Library actions modal can add a file/folder.
- Collection picker and manager work for games and apps.
- Folder manager toggles and deletes folders.
- Art picker opens for grid and hero art.
- Settings save and persist.
- Clock and battery render normally.
