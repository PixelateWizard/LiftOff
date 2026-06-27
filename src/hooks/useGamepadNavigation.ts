import { useEffect, useRef, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { TFunction } from "i18next";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { App, Settings } from "../types";
import { launchApp } from "./useLaunchApp";
import { getBestGamepad, getActiveGamepad, readGpState, detectPlatform, rumble, type HapticPattern } from "../utils/gamepad";
import { buildSettingsItems, getSectionNavigableItems, SETTINGS_SECTIONS } from "../views/settings";
import {
  ACCENTS as DEFAULT_ACCENTS,
  COLS as DEFAULT_COLS,
  GAME_COLS as DEFAULT_GAME_COLS,
  GITHUB_REPO as DEFAULT_GITHUB_REPO,
  KB_ALPHA,
  KB_NUMS,
  SURFACE_STYLE_OPTIONS,
  TABS as DEFAULT_TABS,
  THEME_OPTIONS,
  normalizeThemeKey,
} from "../constants";

type Collection = {
  id: string;
  name: string;
  [key: string]: unknown;
};

type AnyRef<T> = MutableRefObject<T>;
type ButtonStateMap = Record<string, boolean>;
type ButtonTimeMap = Record<string, number>;

const LAUNCH_RETURN_COOLDOWN_MS = 1800;
const INSTALL_FILTERS = ["all", "installed", "notInstalled"];
const GAMES_SORTS = ["recent", "az", "store"];
const isInstalled = (app: App) => app?.installed !== false;

export interface UseGamepadNavigationOptions {
  isReadyRef: AnyRef<boolean>;
  initialTab?: string | null;

  settingsRef?: AnyRef<Settings>;
  updateSetting?: (key: keyof Settings, value: unknown) => void;
  utilityChromeRef?: AnyRef<null | {
    enter: () => void;
    move: (dir: -1 | 1) => void;
    activate: () => void;
    exit: () => void;
  }>;
  installFilterRef?: AnyRef<string>;
  setInstallFilter?: (value: string) => void;
  viewbarIndexRef?: AnyRef<number>;
  setViewbarIndex?: (value: number) => void;
  sortOpenRef?: AnyRef<boolean>;
  setSortOpen?: (value: boolean | ((open: boolean) => boolean)) => void;
  sortKbIndexRef?: AnyRef<number>;
  setSortKbIndex?: (value: number) => void;
  gamesSortRef?: AnyRef<string>;
  resolvedTheme?: string;
  appearanceGroupRef?: AnyRef<number | null>;
  setAppearanceGroup?: (value: number | null, options?: { animate?: boolean }) => void;
  settingsTransitioningRef?: AnyRef<boolean>;
  onTabMotionDirection?: (direction: "forward" | "back") => void;
  onSubtabMotionDirection?: (direction: "forward" | "back") => void;

  appsRef?: AnyRef<App[]>;
  allAppsRef?: AnyRef<App[]>;
  recentRef?: AnyRef<App[]>;
  recentGames?: App[];
  recentGamesRef?: AnyRef<App[]>;
  pinsRef?: AnyRef<string[]>;
  hiddenRef?: AnyRef<string[]>;
  setRecent?: Dispatch<SetStateAction<App[]>>;
  setRecentGames?: Dispatch<SetStateAction<App[]>>;
  togglePin?: (app: App) => void;
  toggleHidden?: (appId: string) => void;

  gameCollectionsRef?: AnyRef<Collection[]>;
  appCollectionsRef?: AnyRef<Collection[]>;
  gameMembershipsRef?: AnyRef<Record<string, string[]>>;
  appMembershipsRef?: AnyRef<Record<string, string[]>>;
  appCollectionTabRef?: AnyRef<string>;
  setAppCollectionTab?: (value: string) => void;

  showHideModalRef?: AnyRef<boolean>;
  showLibraryActionsRef?: AnyRef<boolean>;
  showFileBrowserRef?: AnyRef<unknown>;
  pendingFileRef?: AnyRef<unknown>;
  showFolderManagerRef?: AnyRef<boolean>;
  confirmDeleteRef?: AnyRef<unknown>;
  showColModalRef?: AnyRef<boolean>;
  colPickerAppRef?: AnyRef<App | null>;
  editNameAppRef?: AnyRef<App | null>;
  artPickerAppRef?: AnyRef<App | null>;
  artPickerModeRef?: AnyRef<string>;
  detailsAppRef?: AnyRef<App | null>;
  contextMenuRef?: AnyRef<unknown>;
  showPowerModalRef?: AnyRef<boolean>;
  showThemePickerRef?: AnyRef<boolean>;
  showSurfacePickerRef?: AnyRef<boolean>;
  showSpotifyGuideRef?: AnyRef<boolean>;
  showSpotifyOverlayRef?: AnyRef<boolean>;
  showSteamQrRef?: AnyRef<boolean>;
  showCloudPickerRef?: AnyRef<boolean>;
  themePickerFocusIndexRef?: AnyRef<number>;
  surfacePickerFocusIndexRef?: AnyRef<number>;

  setShowHideModal?: (value: boolean) => void;
  setShowLibraryActions?: (value: boolean) => void;
  setShowPowerModal?: (value: boolean) => void;
  setShowThemePicker?: (value: boolean) => void;
  setShowSurfacePicker?: (value: boolean) => void;
  onOpenSpotifyGuide?: () => void;
  onOpenSpotifyOverlay?: () => void;
  onSpotifyDisconnect?: () => void;
  spotifyConnectedRef?: AnyRef<boolean>;
  onOpenSteamQr?: () => void;
  onSteamDisconnect?: () => void;
  steamConnectedRef?: AnyRef<boolean>;
  setThemePickerFocusIndex?: (value: number) => void;
  setSurfacePickerFocusIndex?: (value: number) => void;
  setArtPickerApp?: (app: App | null) => void;
  setDetailsApp?: (app: App | null) => App | null | void;

  playSoundGameStart?: () => void;
  playSound?: () => void;

  outerRef?: AnyRef<HTMLElement | null>;
  homeScrollRef?: AnyRef<HTMLElement | null>;
  tabScrollRef?: AnyRef<HTMLElement | null>;
  pinnedShelfRef?: AnyRef<HTMLElement | null>;
  recentShelfRef?: AnyRef<HTMLElement | null>;
  drawerScrollRef?: AnyRef<HTMLElement | null>;
  focusedCardRef?: AnyRef<HTMLElement | null>;
  focusedRowRef?: AnyRef<HTMLElement | null>;
  settingsFocusedRef?: AnyRef<HTMLElement | null>;
  settingsBottomRef?: AnyRef<HTMLElement | null>;
  searchFocusedCardRef?: AnyRef<HTMLElement | null>;

  toggleHomeCollection?: (colName: string) => void;
  t?: TFunction;

  COLS?: number;
  GAME_COLS?: number;
  TABS?: string[];
  ACCENTS?: Record<string, unknown>;
  GITHUB_REPO?: string;
  customSourcesRef?: AnyRef<string[]>;

  searchOpenRef?: AnyRef<boolean>;
  searchModeRef?: AnyRef<string>;
  searchQueryRef?: AnyRef<string>;
  searchFocusIndexRef?: AnyRef<number>;
  kbNumModeRef?: AnyRef<boolean>;
  kbRowRef?: AnyRef<number>;
  kbColRef?: AnyRef<number>;
  setSearchFocusIndex?: (value: number) => void;
  setKbRow?: (value: number) => void;
  setKbCol?: (value: number) => void;
  openSearch?: () => void;
  closeSearch?: () => void;
  switchSearchMode?: (mode: string) => void;
  kbDelete?: () => void;
  kbSpace?: () => void;
  kbToggleNum?: () => void;
  fireKey?: (key: string) => void;
  playSoundAlt?: () => void;

  setContextMenu?: (value: unknown) => void;
  setShowFolderManager?: (value: boolean) => void;
  refreshLibrary?: () => void;
  updateStatus?: string | null;
  checkForUpdates?: () => void;
  handleClearRecents?: () => void;
  handleClearCache?: () => void;
  autoScaleRef?: AnyRef<number>;
  handleNavRef?: AnyRef<((key: string) => void) | null>;
  isRunning?: (id?: string | null) => boolean;
  requestClose?: (app: App) => void;
}

export interface GamepadNavigationResult {
  tab: string;
  tabRef: AnyRef<string>;
  focusSection: string;
  focusSectionRef: AnyRef<string>;
  navRepeatingRef: AnyRef<boolean>;
  focusIndex: number;
  focusIndexRef: AnyRef<number>;
  heroIndex: number;
  heroIndexRef: AnyRef<number>;
  settingsFocusIndex: number;
  settingsFocusIndexRef: AnyRef<number>;
  settingsSection: number;
  settingsSectionRef: AnyRef<number>;
  gameSourceTab: string;
  gameSourceTabRef: AnyRef<string>;
  subtabFocusIndex: number;
  subtabFocusIndexRef: AnyRef<number>;
  homeColFocusRow: number;
  homeColFocusRowRef: AnyRef<number>;
  homeColFocusCol: number;
  homeColFocusColRef: AnyRef<number>;
  heroActionIndex: number;
  heroActionIndexRef: AnyRef<number>;

  launchingApp: App | null;
  launchingAppRef: AnyRef<App | null>;
  windowFocused: boolean;

  heroVideoRefs: AnyRef<Record<string, HTMLVideoElement | null>>;

  setTab: Dispatch<SetStateAction<string>>;
  setFocusSection: Dispatch<SetStateAction<string>>;
  setFocusIndex: Dispatch<SetStateAction<number>>;
  setHeroIndex: Dispatch<SetStateAction<number>>;
  setSettingsFocusIndex: Dispatch<SetStateAction<number>>;
  setSettingsSection: Dispatch<SetStateAction<number>>;
  setGameSourceTab: Dispatch<SetStateAction<string>>;
  setSubtabFocusIndex: Dispatch<SetStateAction<number>>;
  setHomeColFocusRow: Dispatch<SetStateAction<number>>;
  setHomeColFocusCol: Dispatch<SetStateAction<number>>;
  setHeroActionIndex: Dispatch<SetStateAction<number>>;

  switchTab: (newTab: string, direction?: "forward" | "back") => void;
  triggerLaunch: (app: App, rec: App[]) => void;
  closeLaunchOverlay: () => void;
  closeHideModal: () => void;
  closeLibraryActionsModal: () => void;
  closePowerModal: () => void;
  closeArtPicker: () => void;
  openDetailsModal: (app: App) => void;
  closeDetailsModal: () => void;
  openHideModal: () => void;
  openLibraryActionsModal: () => void;
  handleNav: (key: string) => void;
}

const noop = () => {};

export function useGamepadNavigation(
  options: UseGamepadNavigationOptions
): GamepadNavigationResult {
  const [tab, setTab] = useState(() => options.initialTab ?? "Home");
  const [focusSection, setFocusSection] = useState("hero");
  const [focusIndex, setFocusIndex] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const [settingsFocusIndex, setSettingsFocusIndex] = useState(0);
  const [settingsSection, setSettingsSection] = useState(0);
  const [gameSourceTab, setGameSourceTab] = useState("All");
  const [subtabFocusIndex, setSubtabFocusIndex] = useState(0);
  const [homeColFocusRow, setHomeColFocusRow] = useState(0);
  const [homeColFocusCol, setHomeColFocusCol] = useState(0);
  const [heroActionIndex, setHeroActionIndex] = useState(0);
  const [launchingApp, setLaunchingApp] = useState<App | null>(null);
  const [windowFocused, setWindowFocused] = useState(true);
  // 0..1 charge level while MENU (Start) is held to open the Spotify overlay.
  // Drives the mini-player "gaining energy" micro-interaction.
  const [spotifyHoldProgress, setSpotifyHoldProgress] = useState(0);
  const spotifyHoldProgressRef = useRef(0);
  const startHoldRef = useRef<{ since: number; fired: boolean } | null>(null);

  const tabRef = useRef(options.initialTab ?? "Home");
  const focusSectionRef = useRef("hero");
  const focusIndexRef = useRef(0);
  const heroIndexRef = useRef(0);
  const settingsFocusIndexRef = useRef(0);
  const settingsSectionRef = useRef(0);
  const gameSourceTabRef = useRef("All");
  const subtabFocusIndexRef = useRef(0);
  const homeColFocusRowRef = useRef(0);
  const homeColFocusColRef = useRef(0);
  const heroActionIndexRef = useRef(0);
  const launchingAppRef = useRef<App | null>(null);
  const heroVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const lastBtn = useRef<ButtonStateMap>({});
  const btnPressTime = useRef<ButtonTimeMap>({});
  const btnRepeating = useRef<ButtonStateMap>({});
  // True while a directional input is in hold-repeat mode (not a single press).
  // Read by the scroll-correction effect in App.jsx to choose instant vs smooth scroll.
  const navRepeatingRef = useRef(false);
  const rsLatchRef = useRef({ up: false, down: false, left: false, right: false });
  const suppressUntilRelease = useRef<ButtonStateMap>({});
  const launchedAppSessionRef = useRef(false);
  const launchReturnCooldownUntil = useRef(0);
  const lastLaunchTime = useRef(0);
  const lastPolledGpIndex = useRef<number | null>(null);
  const initialTabAppliedRef = useRef(!!options.initialTab);

  const {
    initialTab,
    settingsRef,
    updateSetting = noop as (key: keyof Settings, value: unknown) => void,
    utilityChromeRef = { current: null } as AnyRef<null | {
      enter: () => void;
      move: (dir: -1 | 1) => void;
      activate: () => void;
      exit: () => void;
    }>,
    installFilterRef = { current: "all" } as AnyRef<string>,
    setInstallFilter = noop as (value: string) => void,
    viewbarIndexRef = { current: 0 } as AnyRef<number>,
    setViewbarIndex = noop as (value: number) => void,
    sortOpenRef = { current: false } as AnyRef<boolean>,
    setSortOpen = noop as (value: boolean | ((open: boolean) => boolean)) => void,
    sortKbIndexRef = { current: 0 } as AnyRef<number>,
    setSortKbIndex = noop as (value: number) => void,
    gamesSortRef = { current: "recent" } as AnyRef<string>,
    resolvedTheme = "space",
    appearanceGroupRef = { current: null } as AnyRef<number | null>,
    setAppearanceGroup = noop as (value: number | null, options?: { animate?: boolean }) => void,
    settingsTransitioningRef = { current: false } as AnyRef<boolean>,
    onTabMotionDirection = noop as (direction: "forward" | "back") => void,
    onSubtabMotionDirection = noop as (direction: "forward" | "back") => void,
    appsRef,
    allAppsRef,
    recentRef,
    recentGames = [],
    recentGamesRef,
    pinsRef,
    setRecent,
    setRecentGames,
    togglePin = noop as (app: App) => void,
    customSourcesRef,
    gameCollectionsRef,
    appCollectionsRef,
    gameMembershipsRef,
    appMembershipsRef,
    appCollectionTabRef,
    setAppCollectionTab = noop as (value: string) => void,
    showHideModalRef,
    showLibraryActionsRef,
    showFileBrowserRef,
    pendingFileRef,
    showFolderManagerRef,
    confirmDeleteRef,
    showColModalRef,
    colPickerAppRef,
    editNameAppRef,
    artPickerAppRef,
    artPickerModeRef,
    detailsAppRef = { current: null } as AnyRef<App | null>,
    contextMenuRef,
    showPowerModalRef = { current: false } as AnyRef<boolean>,
    showThemePickerRef = { current: false } as AnyRef<boolean>,
    showSurfacePickerRef = { current: false } as AnyRef<boolean>,
    showSpotifyGuideRef = { current: false } as AnyRef<boolean>,
    showSpotifyOverlayRef = { current: false } as AnyRef<boolean>,
    showSteamQrRef = { current: false } as AnyRef<boolean>,
    showCloudPickerRef = { current: false } as AnyRef<boolean>,
    themePickerFocusIndexRef = { current: 0 } as AnyRef<number>,
    surfacePickerFocusIndexRef = { current: 0 } as AnyRef<number>,
    setShowHideModal = noop as (value: boolean) => void,
    setShowLibraryActions = noop as (value: boolean) => void,
    setShowPowerModal = noop as (value: boolean) => void,
    setShowThemePicker = noop as (value: boolean) => void,
    setShowSurfacePicker = noop as (value: boolean) => void,
    onOpenSpotifyGuide = noop,
    onOpenSpotifyOverlay = noop,
    onSpotifyDisconnect = noop,
    spotifyConnectedRef = { current: false } as AnyRef<boolean>,
    onOpenSteamQr = noop,
    onSteamDisconnect = noop,
    steamConnectedRef = { current: false } as AnyRef<boolean>,
    setThemePickerFocusIndex = noop as (value: number) => void,
    setSurfacePickerFocusIndex = noop as (value: number) => void,
    setArtPickerApp = noop as (app: App | null) => void,
    setDetailsApp = noop as (app: App | null) => void,
    playSoundGameStart = noop,
    playSound = noop,
    playSoundAlt = noop,
    outerRef,
    homeScrollRef,
    tabScrollRef,
    searchOpenRef,
    searchModeRef,
    searchQueryRef,
    searchFocusIndexRef,
    kbNumModeRef,
    kbRowRef,
    kbColRef,
    setSearchFocusIndex = noop as (value: number) => void,
    setKbRow = noop as (value: number) => void,
    setKbCol = noop as (value: number) => void,
    openSearch = noop,
    closeSearch = noop,
    switchSearchMode = noop as (mode: string) => void,
    kbDelete = noop,
    kbSpace = noop,
    kbToggleNum = noop,
    fireKey = noop as (key: string) => void,
    setContextMenu = noop as (value: unknown) => void,
    setShowFolderManager = noop as (value: boolean) => void,
    refreshLibrary = noop,
    updateStatus = null,
    checkForUpdates = noop,
    handleClearRecents = noop,
    handleClearCache = noop,
    toggleHomeCollection = noop as (colName: string) => void,
    autoScaleRef,
    handleNavRef,
    isRunning = (() => false) as (id?: string | null) => boolean,
    requestClose = noop as (app: App) => void,
    t = ((key: string) => key) as unknown as TFunction,
    COLS = DEFAULT_COLS,
    GAME_COLS = DEFAULT_GAME_COLS,
    TABS = DEFAULT_TABS,
    ACCENTS = DEFAULT_ACCENTS,
    GITHUB_REPO = DEFAULT_GITHUB_REPO,
  } = options;

  useEffect(() => {
    if (initialTabAppliedRef.current || !initialTab) return;
    initialTabAppliedRef.current = true;
    setTab(initialTab);
    tabRef.current = initialTab;
  }, [initialTab]);

  const haptic = (pattern: HapticPattern) =>
    rumble(pattern, settingsRef?.current?.haptic_feedback ?? true);

  const _triggerLaunchImpl = (app, rec) => {
    if (app?.app_type === "game" && isRunning(app.id)) {
      invoke("try_focus_launched_app", {
        name: app.name,
        launchPath: app.launch_path,
        source: app.source ?? "",
        appType: app.app_type,
      }).catch(() => {});
      return;
    }

    const now = Date.now();
    console.warn(`triggerLaunch @ ${new Date().toISOString()}`, {
      name: app?.name,
      id: app?.id,
      source: app?.source ?? "",
      appType: app?.app_type,
      path: app?.launch_path,
      sinceLastMs: now - lastLaunchTime.current,
    });
    if (now < launchReturnCooldownUntil.current) {
      console.warn("triggerLaunch BLOCKED - waiting for return-to-LiftOff input cooldown");
      return;
    }
    if (now - lastLaunchTime.current < 5000) {
      console.warn("triggerLaunch BLOCKED — too soon after last launch");
      return;
    }
    lastLaunchTime.current = now;
    launchedAppSessionRef.current = true;
    playSoundGameStart();
    setLaunchingApp(app); launchingAppRef.current = app;
    haptic("confirm");
    launchApp(app).catch((err) => console.warn("launch_app failed", err));
    const updated = [app, ...rec.filter(r => r.id !== app.id)].slice(0, 10);
    setRecent(updated); recentRef.current = updated;
    if (app.app_type === "game") {
      const updatedGames = [app, ...recentGamesRef.current.filter(r => r.id !== app.id)].slice(0, 20);
      setRecentGames(updatedGames); recentGamesRef.current = updatedGames;
    }
  };
  const _triggerLaunchRef = useRef(_triggerLaunchImpl);
  _triggerLaunchRef.current = _triggerLaunchImpl;
  const triggerLaunch = useRef((app, rec) => _triggerLaunchRef.current(app, rec)).current;

  const closeLaunchOverlay = () => {
    const gp = getBestGamepad();
    if (gp) {
      const s = readGpState(gp);
      suppressUntilRelease.current = {
        Enter: s.Enter,
        Escape: s.Escape,
        Select: s.Select,
        ButtonX: s.ButtonX,
        ButtonY: s.ButtonY,
        BumperLeft: s.BumperLeft,
        BumperRight: s.BumperRight,
        Start: s.Start,
      };
    }
    setLaunchingApp(null);
    launchingAppRef.current = null;
  };

  // ── Pin helpers ───────────────────────────────────────────────
  // ── Library Actions modal ─────────────────────────────────────
  const openLibraryActionsModal = () => {
    if (document.activeElement) (document.activeElement as HTMLElement).blur?.();
    setShowLibraryActions(true); showLibraryActionsRef.current = true;
  };
  const closeLibraryActionsModal = () => {
    const gp = getBestGamepad();
    if (gp) {
      const s = readGpState(gp);
      suppressUntilRelease.current = {
        Enter: s.Enter, Escape: s.Escape, Select: s.Select,
        ButtonX: s.ButtonX, ButtonY: s.ButtonY,
      };
    }
    setShowLibraryActions(false); showLibraryActionsRef.current = false;
  };

  const closePowerModal = () => {
    const gp = getBestGamepad();
    if (gp) {
      const s = readGpState(gp);
      suppressUntilRelease.current = {
        Enter: s.Enter,
        Escape: s.Escape,
        Select: s.Select,
        ButtonX: s.ButtonX,
        ButtonY: s.ButtonY,
        BumperLeft: s.BumperLeft,
        BumperRight: s.BumperRight,
        Start: s.Start,
      };
    }
    setShowPowerModal(false); showPowerModalRef.current = false;
  };

  const openPowerModal = () => {
    const gp = getBestGamepad();
    if (gp) {
      const s = readGpState(gp);
      suppressUntilRelease.current = {
        Enter: s.Enter,
        Escape: s.Escape,
        Select: s.Select,
        ButtonX: s.ButtonX,
        ButtonY: s.ButtonY,
        BumperLeft: s.BumperLeft,
        BumperRight: s.BumperRight,
        Start: s.Start,
      };
    }
    setShowPowerModal(true); showPowerModalRef.current = true;
  };

  // ── Hide helpers ──────────────────────────────────────────────
  const openHideModal  = () => {
    // Blur whatever DOM element has focus so the browser doesn't send synthetic
    // keypresses to it while the modal is open
    if (document.activeElement) (document.activeElement as HTMLElement).blur?.();
    setShowHideModal(true); showHideModalRef.current = true;
  };
  const closeHideModal = ()     => {
    haptic("cancel");
    // Snapshot whichever buttons are currently held so main poll won't fire them on release
    const gps = navigator.getGamepads();
    const gp  = gps[0] || gps[1] || gps[2] || gps[3];
    if (gp) {
      const s = readGpState(gp);
      suppressUntilRelease.current = {
        Enter:       s.Enter,
        Escape:      s.Escape,
        ButtonX:     s.ButtonX,
        ButtonY:     s.ButtonY,
        BumperLeft:  s.BumperLeft,
        BumperRight: s.BumperRight,
        Start:       s.Start,
      };
    }
    setShowHideModal(false); showHideModalRef.current = false;
  };

  const closeArtPicker = () => {
    const gp = getBestGamepad();
    if (gp) {
      const s = readGpState(gp);
      suppressUntilRelease.current = {
        Enter: s.Enter, Escape: s.Escape, Select: s.Select, ButtonX: s.ButtonX, ButtonY: s.ButtonY,
      };
    }
    setArtPickerApp(null); artPickerAppRef.current = null;
  };

  const openDetailsModal = (app: App) => {
    if (document.activeElement) (document.activeElement as HTMLElement).blur?.();
    const next = setDetailsApp(app) || app;
    detailsAppRef.current = next;
  };

  const closeDetailsModal = (pattern: HapticPattern | false = "cancel") => {
    if (pattern) haptic(pattern);
    suppressHeldButtons();
    const next = setDetailsApp(null) || null;
    detailsAppRef.current = next;
  };


  const switchTab = (newTab: string, direction?: "forward" | "back") => {
    const currentTab = tabRef.current;
    if (newTab !== currentTab) {
      const currentIdx = TABS.indexOf(currentTab);
      const nextIdx = TABS.indexOf(newTab);
      onTabMotionDirection(direction ?? (nextIdx < currentIdx ? "back" : "forward"));
      haptic("tab");
    }
    setTab(newTab); tabRef.current = newTab;
    let defaultSection;
    if (newTab === "Home") defaultSection = "hero";
    else if (newTab === "Settings") defaultSection = "grid";
    else {
      const hasPinned = pinsRef.current.length > 0 && pinsRef.current.some(id => appsRef.current.find(a => a.id === id));
      defaultSection = hasPinned ? "pinned" : "grid";
    }
    setFocusSection(defaultSection); focusSectionRef.current = defaultSection;
    setFocusIndex(0); focusIndexRef.current = 0;
    setHeroIndex(0); heroIndexRef.current = 0;
    setSettingsFocusIndex(0); settingsFocusIndexRef.current = 0;
    setSettingsSection(0); settingsSectionRef.current = 0;
    if (newTab !== "Settings") {
      setAppearanceGroup(null, { animate: false });
      appearanceGroupRef.current = null;
    }
    setGameSourceTab("All"); gameSourceTabRef.current = "All";
    setInstallFilter("all");
    setViewbarIndex(0);
    setSortOpen(false);
    setSubtabFocusIndex(0); subtabFocusIndexRef.current = 0;
    if (outerRef.current) outerRef.current.scrollTop = 0;
    setTimeout(() => {
      const scroller = newTab === "Home" ? homeScrollRef.current : tabScrollRef.current;
      if (scroller) scroller.scrollTo({ top: 0, behavior: "instant" });
    }, 50);
  };

  const ALL_SETTINGS_ITEMS = buildSettingsItems(t, resolvedTheme);
  const navigableSettings = getSectionNavigableItems(
    settingsSection,
    ALL_SETTINGS_ITEMS,
    settingsRef?.current ?? ({} as Settings),
    {
      gameCollections: gameCollectionsRef?.current ?? [],
      appCollections: appCollectionsRef?.current ?? [],
    },
    appearanceGroupRef.current
  );

  const suppressHeldButtons = () => {
    const gp = getBestGamepad();
    if (!gp) return;
    const s = readGpState(gp);
    suppressUntilRelease.current = {
      Enter: s.Enter,
      Escape: s.Escape,
      Select: s.Select,
      ButtonX: s.ButtonX,
      ButtonY: s.ButtonY,
      BumperLeft: s.BumperLeft,
      BumperRight: s.BumperRight,
      Start: s.Start,
    };
  };

  const closeThemePicker = (pattern: HapticPattern = "cancel") => {
    haptic(pattern);
    suppressHeldButtons();
    setShowThemePicker(false);
    showThemePickerRef.current = false;
  };

  const closeSurfacePicker = (pattern: HapticPattern = "cancel") => {
    haptic(pattern);
    suppressHeldButtons();
    setShowSurfacePicker(false);
    showSurfacePickerRef.current = false;
  };

  const modalOwnsInput = () =>
    !!launchingAppRef.current
    || !!showHideModalRef?.current
    || !!showLibraryActionsRef?.current
    || !!showFileBrowserRef?.current
    || !!pendingFileRef?.current
    || !!showFolderManagerRef?.current
    || !!confirmDeleteRef?.current
    || !!showColModalRef?.current
    || !!colPickerAppRef?.current
    || !!editNameAppRef?.current
    || !!showPowerModalRef?.current
    || !!showThemePickerRef?.current
    || !!showSurfacePickerRef?.current
    || !!showSpotifyGuideRef.current
    || !!showSpotifyOverlayRef.current
    || !!showSteamQrRef.current
    || !!showCloudPickerRef.current
    || !!detailsAppRef.current
    || !!artPickerAppRef.current
    || !!contextMenuRef.current
    || !!searchOpenRef.current;

  const onRightStick = (dir: "up" | "down" | "left" | "right") => {
    const chrome = utilityChromeRef.current;
    if (!chrome) return;
    const inBar = focusSectionRef.current === "viewbar";
    if (sortOpenRef.current && inBar) {
      if (dir === "up" || dir === "down") {
        const next = Math.max(0, Math.min(2, sortKbIndexRef.current + (dir === "down" ? 1 : -1)));
        if (next !== sortKbIndexRef.current) {
          setSortKbIndex(next);
          playSound();
        }
      }
      return;
    }
    if (dir === "up") {
      if (!inBar) chrome.enter();
    } else if (dir === "down") {
      if (inBar) chrome.exit();
    } else {
      if (!inBar) chrome.enter();
      chrome.move(dir === "right" ? 1 : -1);
    }
  };

  // ── handleNav ─────────────────────────────────────────────────
  const handleNav = (key) => {
    if (showThemePickerRef.current) {
      const cur = themePickerFocusIndexRef.current;
      const cols = 3;
      const max = THEME_OPTIONS.length - 1;
      const moveTo = (idx: number) => {
        const ni = Math.max(0, Math.min(max, idx));
        if (ni === themePickerFocusIndexRef.current) return;
        setThemePickerFocusIndex(ni);
        themePickerFocusIndexRef.current = ni;

        playSound();
      };
      if (key === "ArrowRight") moveTo(cur + 1);
      else if (key === "ArrowLeft") moveTo(cur - 1);
      else if (key === "ArrowDown") moveTo(cur + cols);
      else if (key === "ArrowUp") moveTo(cur - cols);
      else if (key === "Escape") {
        closeThemePicker();
        playSoundAlt();
      } else if (key === "Enter") {
        updateSetting("theme", THEME_OPTIONS[cur]);
        closeThemePicker("confirm");
        playSoundAlt();
      }
      return;
    }

    if (showSurfacePickerRef.current) {
      const cur = surfacePickerFocusIndexRef.current;
      const cols = 3;
      const max = SURFACE_STYLE_OPTIONS.length - 1;
      const moveTo = (idx: number) => {
        const ni = Math.max(0, Math.min(max, idx));
        if (ni === surfacePickerFocusIndexRef.current) return;
        setSurfacePickerFocusIndex(ni);
        surfacePickerFocusIndexRef.current = ni;

        playSound();
      };
      if (key === "ArrowRight") moveTo(cur + 1);
      else if (key === "ArrowLeft") moveTo(cur - 1);
      else if (key === "ArrowDown") moveTo(cur + cols);
      else if (key === "ArrowUp") moveTo(cur - cols);
      else if (key === "Escape") {
        closeSurfacePicker();
        playSoundAlt();
      } else if (key === "Enter") {
        updateSetting("surface_style", SURFACE_STYLE_OPTIONS[cur]);
        closeSurfacePicker("confirm");
        playSoundAlt();
      }
      return;
    }
    // Modal intercepts all input via its own poll — main nav must not run
    if (launchingAppRef.current || showHideModalRef.current || showLibraryActionsRef.current || showFileBrowserRef.current || pendingFileRef.current || showFolderManagerRef.current || confirmDeleteRef.current || showColModalRef.current || colPickerAppRef.current || editNameAppRef.current || showPowerModalRef?.current || showSpotifyGuideRef.current || showSpotifyOverlayRef.current || showSteamQrRef.current || showCloudPickerRef.current || detailsAppRef.current) return;

    // Art picker open — only Escape closes it (user interacts via touch/mouse)
    if (artPickerAppRef.current) {
      if (key === "Escape") closeArtPicker();
      return;
    }

    // Context menu open — ContextMenuModal owns navigation; main loop just blocks other inputs
    if (contextMenuRef.current) {
      return;
    }

    const section         = focusSectionRef.current;
    const index           = focusIndexRef.current;
    const currentTab      = tabRef.current;
    const allApps         = appsRef.current;
    const rec             = recentRef.current;
    const currentPins     = pinsRef.current;
    const cols            = currentTab === "Games"
      ? Math.max(2, Math.round(GAME_COLS / (settingsRef.current.game_cover_scale ?? 1.0)))
      : settingsRef.current.app_list_view
        ? Math.max(1, settingsRef.current.app_list_cols ?? 1)
        : Math.max(2, Math.round(COLS / (settingsRef.current.app_cover_scale ?? 1.0)));
    const currentSettings = settingsRef.current;
    const showUninstalledGames = currentSettings.show_uninstalled_games === true;
    const viewbarSortIndex = showUninstalledGames ? INSTALL_FILTERS.length : 0;
    const viewbarItemCount = viewbarSortIndex + 1;
    const isOtherGameSource = (app: App) =>
      app.app_type === "game"
      && app.source !== "steam"
      && app.source !== "xbox"
      && app.source !== "battlenet"
      && app.source !== "gog"
      && app.source !== "epic"
      && app.source !== "cloud"
      && !customSourcesRef.current.includes(app.source);
    const isVisibleGameForLibrary = (app: App) =>
      app.app_type === "game" && (showUninstalledGames || isInstalled(app));
    const getGameSourceTabs = () => {
      const hasSource = (source: string) => appsRef.current.some(a => a.source === source && isVisibleGameForLibrary(a));
      return [...new Map([
        "All",
        ...(currentSettings.scan_steam !== false && hasSource("steam") ? ["Steam"] : []),
        ...(currentSettings.scan_xbox !== false && hasSource("xbox") ? ["Xbox"] : []),
        ...(currentSettings.scan_battlenet !== false && hasSource("battlenet") ? ["Battle.net"] : []),
        ...(currentSettings.scan_gog !== false && hasSource("gog") ? ["GOG"] : []),
        ...(currentSettings.scan_epic !== false && hasSource("epic") ? ["Epic"] : []),
        ...(hasSource("cloud") ? ["Cloud"] : []),
        ...(appsRef.current.some(a => isVisibleGameForLibrary(a) && isOtherGameSource(a)) ? ["Other"] : []),
        ...customSourcesRef.current,
        ...gameCollectionsRef.current.map(c => c.name),
      ].map(source => [source.toLocaleLowerCase(), source])).values()];
    };

    const filterByInstallState = (items: App[]) => items.filter((app) => {
      if (!showUninstalledGames) return isInstalled(app);
      if (installFilterRef.current === "installed") return isInstalled(app);
      if (installFilterRef.current === "notInstalled") return !isInstalled(app);
      return true;
    });
    const recentRank = new Map(rec.map((entry, recIndex) => [entry.id, rec.length - recIndex]));
    const sortGamesForView = (items: App[]) => items.sort((a, b) => {
      const sort = gamesSortRef.current;
      if (sort === "az") return (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
      if (sort === "store") {
        const byStore = (a.source || "").localeCompare(b.source || "", undefined, { sensitivity: "base" });
        return byStore || (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
      }
      return (recentRank.get(b.id) || 0) - (recentRank.get(a.id) || 0)
        || (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
    });
    let fApps = allApps.filter(a => {
      if (currentTab === "Home" || currentTab === "All") return true;
      if (currentTab === "Games") {
        if (!isVisibleGameForLibrary(a)) return false;
        const src = gameSourceTabRef.current;
        if (src === "Steam") return a.source === "steam";
        if (src === "Xbox")  return a.source === "xbox";
        if (src === "Battle.net")  return a.source === "battlenet";
        if (src === "GOG")  return a.source === "gog";
        if (src === "Epic") return a.source === "epic";
        if (src === "Cloud") return a.source === "cloud";
        if (src === "Other") return isOtherGameSource(a);
        if (customSourcesRef.current.includes(src)) return a.source === src;
        const gameCol = gameCollectionsRef.current.find(c => c.name === src);
        if (gameCol) return (gameMembershipsRef.current[a.id] || []).includes(gameCol.id);
        return true; // "All"
      }
      if (a.app_type !== "app") return false;
      const colTab = appCollectionTabRef.current;
      if (colTab === "All") return true;
      const col = appCollectionsRef.current.find(c => c.name === colTab);
      if (!col) return true;
      return (appMembershipsRef.current[a.id] || []).includes(col.id);
    });
    if (currentTab === "Games") {
      fApps = sortGamesForView(filterByInstallState(fApps));
    }
    const fRecent = rec.filter(a => {
      if (currentTab === "Home") {
        // Treat recents as absent when the section is hidden — prevents navigating into invisible UI
        if (currentSettings.show_home_recents === false) return false;
        // Match the same filter HomeView applies for this section
        return !currentSettings.show_recent_games_only || a.app_type === "game";
      }
      if (currentTab === "All") return true;
      return currentTab === "Games" ? a.app_type === "game" : a.app_type === "app";
    }).slice(0, 8);
    let fPinned = (currentTab === "Apps" && appCollectionTabRef.current !== "All") ? [] : currentPins
      .map(id => allApps.find(a => a.id === id))
      .filter(Boolean)
      .filter(a => currentTab === "Home" || currentTab === "All" ? true
        : currentTab === "Games" ? a.app_type === "game" : a.app_type === "app");
    if (currentTab === "Games") {
      fPinned = sortGamesForView(filterByInstallState(fPinned));
    }
    const homePinnedVisible = currentTab === "Home" && (currentSettings.home_pinned_pos ?? "bottom") !== "none" && fPinned.length > 0;
    const hasPinnedForGameSource = (source: string, installFilter = installFilterRef.current) =>
      currentTab === "Games"
      && source === "All"
      && currentPins.some(id => {
        const app = allApps.find(a => a.id === id);
        if (!app || app.app_type !== "game") return false;
        if (!showUninstalledGames && !isInstalled(app)) return false;
        if (installFilter === "installed") return isInstalled(app);
        if (installFilter === "notInstalled") return !isInstalled(app);
        return true;
      });
    const focusLibraryCards = (source = gameSourceTabRef.current, installFilter = installFilterRef.current) => {
      const nextSection = hasPinnedForGameSource(source, installFilter) ? "pinned" : "grid";
      setFocusSection(nextSection); focusSectionRef.current = nextSection;
      setFocusIndex(0); focusIndexRef.current = 0;
    };
    const cycleGameSource = (direction: -1 | 1) => {
      const sources = getGameSourceTabs();
      const cur = sources.indexOf(gameSourceTabRef.current);
      const currentIndex = cur >= 0 ? cur : 0;
      const next = sources[(currentIndex + direction + sources.length) % sources.length];
      if (next !== gameSourceTabRef.current) {
        onSubtabMotionDirection(direction > 0 ? "forward" : "back");
        haptic("tab");
      }
      setGameSourceTab(next); gameSourceTabRef.current = next;
      setInstallFilter("all");
      setViewbarIndex(showUninstalledGames ? 0 : viewbarSortIndex);
      setSortOpen(false);
      focusLibraryCards(next, "all");
      playSound();
    };

    // ══ SEARCH OVERLAY ════════════════════════════════════════════
    if (searchOpenRef.current) {
      const mode    = searchModeRef.current;
      const results = allApps.filter(a =>
        searchQueryRef.current.trim().length > 0 &&
        a.name.toLowerCase().includes(searchQueryRef.current.trim().toLowerCase())
      );
      const SCOLS = COLS;

      if (mode === "keyboard") {
        const layout  = kbNumModeRef.current ? KB_NUMS : KB_ALPHA;
        const rowKeys = layout[kbRowRef.current] || [];

        if      (key === "ArrowRight") { const ni = Math.min(kbColRef.current + 1, rowKeys.length - 1); setKbCol(ni); kbColRef.current = ni; playSound(); }
        else if (key === "ArrowLeft")  { const ni = Math.max(kbColRef.current - 1, 0);                  setKbCol(ni); kbColRef.current = ni; playSound(); }
        else if (key === "ArrowDown") {
          if (kbRowRef.current < layout.length - 1) {
            const nr = kbRowRef.current + 1;
            const nc = Math.min(kbColRef.current, layout[nr].length - 1);
            setKbRow(nr); kbRowRef.current = nr; setKbCol(nc); kbColRef.current = nc; playSound();
          }
        }
        else if (key === "ArrowUp") {
          if (kbRowRef.current > 0) {
            const nr = kbRowRef.current - 1;
            const nc = Math.min(kbColRef.current, layout[nr].length - 1);
            setKbRow(nr); kbRowRef.current = nr; setKbCol(nc); kbColRef.current = nc; playSound();
          }
        }
        else if (key === "Enter")        { const k = rowKeys[kbColRef.current]; if (k) { fireKey(k); playSound(); } }
        else if (key === "ButtonX")      { kbDelete(); playSound(); }
        else if (key === "ButtonY")      { kbSpace(); playSound(); }
        else if (key === "TriggerRight") { kbToggleNum(); playSound(); }
        else if (key === "Start")        { if (results.length > 0) { playSoundAlt(); switchSearchMode("results"); } }
        // FIX 1: B in keyboard mode — jump to results if any, else go idle
        else if (key === "Escape") {
          playSound();
          if (results.length > 0) { switchSearchMode("results"); }
          else { switchSearchMode("idle"); }
        }
        return;
      }

      if (mode === "results") {
        if      (key === "ArrowRight") { const ni = Math.min(searchFocusIndexRef.current + 1, results.length - 1); setSearchFocusIndex(ni); searchFocusIndexRef.current = ni; playSound(); }
        else if (key === "ArrowLeft")  { const ni = Math.max(searchFocusIndexRef.current - 1, 0);                   setSearchFocusIndex(ni); searchFocusIndexRef.current = ni; playSound(); }
        else if (key === "ArrowDown")  { const ni = Math.min(searchFocusIndexRef.current + SCOLS, results.length - 1); setSearchFocusIndex(ni); searchFocusIndexRef.current = ni; playSound(); }
        else if (key === "ArrowUp") {
          const ni = searchFocusIndexRef.current - SCOLS;
          if (ni >= 0) { setSearchFocusIndex(ni); searchFocusIndexRef.current = ni; playSound(); }
          else { playSound(); switchSearchMode("keyboard"); }
        }
        else if (key === "Enter" || key === "Start") {
          const app = results[searchFocusIndexRef.current];
          if (app) {
            closeSearch();
            if (app.app_type === "game") {
              haptic("confirm");
              openDetailsModal(app);
            } else {
              triggerLaunch(app, recentRef.current);
            }
          }
        }
        else if (key === "Escape")  { playSound(); closeSearch(); }
        else if (key === "ButtonY") { playSound(); switchSearchMode("keyboard"); }
        else if (key === "ButtonX") { kbDelete(); playSound(); }
        return;
      }

      if (mode === "idle") {
        if      (key === "ButtonY") { playSound(); switchSearchMode("keyboard"); }
        else if (key === "Escape")  { playSound(); closeSearch(); }
        else if (key === "Start") {
          if (results.length > 0) { playSoundAlt(); switchSearchMode("results"); }
          else { playSound(); closeSearch(); }
        }
        else if (key === "ButtonX") { kbDelete(); playSound(); }
        return;
      }

      return;
    }
    // ══ END SEARCH OVERLAY ════════════════════════════════════════

    if (section === "viewbar" && currentTab === "Games") {
      if (viewbarIndexRef.current >= viewbarItemCount) {
        setViewbarIndex(viewbarSortIndex);
        viewbarIndexRef.current = viewbarSortIndex;
      }
      if (key === "TriggerLeft") { cycleGameSource(-1); return; }
      if (key === "TriggerRight") { cycleGameSource(1); return; }
      if (key === "BumperLeft" || key === "BumperRight") {
        setSortOpen(false);
        focusLibraryCards();
        const _tabs = TABS as string[];
        const i = _tabs.indexOf(currentTab);
        switchTab(_tabs[(i + (key === "BumperRight" ? 1 : -1) + _tabs.length) % _tabs.length], key === "BumperRight" ? "forward" : "back");
        return;
      }
      if (sortOpenRef.current) {
        if (key === "Enter") {
          updateSetting("games_sort", GAMES_SORTS[sortKbIndexRef.current] ?? "recent");
          setSortOpen(false);
          haptic("confirm");
          playSoundAlt();
          return;
        }
        if (key === "Escape") {
          setSortOpen(false);
          haptic("cancel");
          playSoundAlt();
          return;
        }
        if (key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight") {
          setSortOpen(false);
          focusLibraryCards();
          playSound();
          return;
        }
        return;
      }
      if (key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight") {
        focusLibraryCards();
        playSound();
        return;
      }
      if (key === "Enter") {
        if (showUninstalledGames && viewbarIndexRef.current < viewbarSortIndex) {
          setInstallFilter(INSTALL_FILTERS[viewbarIndexRef.current] ?? "all");
          haptic("confirm");
        } else {
          const currentSortIndex = Math.max(0, GAMES_SORTS.indexOf(gamesSortRef.current));
          setSortKbIndex(currentSortIndex);
          utilityChromeRef.current?.activate();
          haptic("confirm");
        }
        return;
      }
      if (key === "Escape") { utilityChromeRef.current?.exit(); haptic("cancel"); return; }
      return;
    }

    // Y opens search from main UI
    if (key === "ButtonY") { playSound(); openSearch(); return; }

    // ── Main nav sections ──────────────────────────────────────
    // Compute filtered data using refs (same as render-time but from refs)
    const fRecentGames = (() => { const fg = recentGamesRef.current.filter(g => appsRef.current.some(a => a.id === g.id)); return fg.length > 0 ? fg : appsRef.current.filter(a => a.app_type === "game").slice(0, 6); })();

    // X pins/unpins focused app
    if (key === "ButtonX") {
      let focusedApp = null;
      if (section === "hero")   focusedApp = fRecentGames[heroIndexRef.current] ? allApps.find(a => a.id === fRecentGames[heroIndexRef.current].id) : null;
      if (section === "pinned" && fPinned[index]) focusedApp = fPinned[index];
      else if (section === "recent" && fRecent[index]) focusedApp = fRecent[index];
      else if (section === "grid"   && fApps[index])   focusedApp = fApps[index];
      if (focusedApp) { playSound(); togglePin(focusedApp); }
      return;
    }

    if (key === "BumperLeft" || key === "BumperRight") playSoundAlt(); else playSound();
    if (key === "BumperLeft")  { const _tabs = TABS as string[]; const i = _tabs.indexOf(currentTab);  switchTab(_tabs[(i - 1 + _tabs.length) % _tabs.length], "back"); return; }
    if (key === "BumperRight") { const _tabs = TABS as string[]; const i = _tabs.indexOf(currentTab);  switchTab(_tabs[(i + 1) % _tabs.length], "forward"); return; }

    // BACK (Select) opens library actions menu; MENU (Start) opens Apps context menu.
    // Start/Menu is intentionally reserved on Games for the future bottom-bar revamp.
    if (key === "Select" && (currentTab === "Games" || currentTab === "Apps")) {
      openLibraryActionsModal(); return;
    }
    if (key === "Select" && currentTab === "Home" && spotifyConnectedRef.current) {
      onOpenSpotifyOverlay();
      return;
    }
    if (key === "Start" && currentTab === "Games") {
      return;
    }
    if (key === "Start" && currentTab === "Apps") {
      const focusedApp = section === "pinned" ? fPinned[index] : section === "grid" ? fApps[index] : null;
      if (focusedApp) {
        const cx = Math.min(Math.floor(window.innerWidth / 2) - 90, window.innerWidth - 200);
        const cy = Math.min(Math.floor(window.innerHeight / 2) - 80, window.innerHeight - 180);
        const menu = { x: cx, y: cy, app: focusedApp, focusedIdx: 0 };
        setContextMenu(menu); contextMenuRef.current = menu;
      }
      return;
    }

    if (currentTab === "Settings") {
      if (settingsTransitioningRef.current) return;
      if (key === "TriggerLeft") {
        const ni = Math.max(0, settingsSectionRef.current - 1);
        if (ni !== settingsSectionRef.current) {
          onSubtabMotionDirection("back");
          haptic("tab");
          setSettingsSection(ni); settingsSectionRef.current = ni;
          if (ni !== 0) {
            setAppearanceGroup(null, { animate: false });
            appearanceGroupRef.current = null;
          }
          setSettingsFocusIndex(0); settingsFocusIndexRef.current = 0;
          if (tabScrollRef.current) tabScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });

          playSound();
        }
        return;
      }
      if (key === "TriggerRight") {
        const ni = Math.min(SETTINGS_SECTIONS.length - 1, settingsSectionRef.current + 1);
        if (ni !== settingsSectionRef.current) {
          onSubtabMotionDirection("forward");
          haptic("tab");
          setSettingsSection(ni); settingsSectionRef.current = ni;
          if (ni !== 0) {
            setAppearanceGroup(null, { animate: false });
            appearanceGroupRef.current = null;
          }
          setSettingsFocusIndex(0); settingsFocusIndexRef.current = 0;
          if (tabScrollRef.current) tabScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });

          playSound();
        }
        return;
      }
      const sfIndex = settingsFocusIndexRef.current;
      const item    = navigableSettings[sfIndex];
      if (key === "Escape" && settingsSectionRef.current === 0 && appearanceGroupRef.current !== null) {
        const cameFrom = appearanceGroupRef.current;
        setAppearanceGroup(null);
        appearanceGroupRef.current = null;
        setSettingsFocusIndex(cameFrom);
        settingsFocusIndexRef.current = cameFrom;
        if (tabScrollRef.current) tabScrollRef.current.scrollTo({ top: 0, behavior: "auto" });
        haptic("cancel");
        playSoundAlt();
        return;
      }
      if (key === "ArrowDown") {
        const ni = Math.min(sfIndex + 1, navigableSettings.length - 1);
        if (ni !== sfIndex) {
          setSettingsFocusIndex(ni); settingsFocusIndexRef.current = ni;

        }
      }
      if (key === "ArrowUp") {
        const ni = Math.max(sfIndex - 1, 0);
        if (ni !== sfIndex) {
          setSettingsFocusIndex(ni); settingsFocusIndexRef.current = ni;

        }
      }
      if (key === "ArrowRight" || key === "Enter") {
        if (!item) return;
        if (item.type === "appearance_back") {
          const cameFrom = item.categoryIndex;
          setAppearanceGroup(null);
          appearanceGroupRef.current = null;
          setSettingsFocusIndex(cameFrom);
          settingsFocusIndexRef.current = cameFrom;
          if (tabScrollRef.current) tabScrollRef.current.scrollTo({ top: 0, behavior: "auto" });
          haptic("cancel");
        }
        else if (item.type === "appearance_category") {
          setAppearanceGroup(item.categoryIndex);
          appearanceGroupRef.current = item.categoryIndex;
          setSettingsFocusIndex(1);
          settingsFocusIndexRef.current = 1;
          if (tabScrollRef.current) tabScrollRef.current.scrollTo({ top: 0, behavior: "auto" });
          haptic("confirm");
        }
        else if (item.type === "toggle")  { updateSetting(item.key, !currentSettings[item.key]); haptic("confirm"); }
        else if (item.type === "cycle")  { const opts = item.options; const curVal = item.key === "theme" ? normalizeThemeKey(String(currentSettings[item.key])) : String(currentSettings[item.key]); const cur = opts.indexOf(curVal); updateSetting(item.key, opts[(cur + 1) % opts.length]); haptic("confirm"); }
        else if (item.type === "theme_picker") {
          const idx = Math.max(0, THEME_OPTIONS.indexOf(normalizeThemeKey(String(currentSettings.theme))));
          setThemePickerFocusIndex(idx);
          themePickerFocusIndexRef.current = idx;
          setShowThemePicker(true);
          showThemePickerRef.current = true;
          haptic("confirm");
        }
        else if (item.type === "surface_picker") {
          const idx = Math.max(0, SURFACE_STYLE_OPTIONS.indexOf(String(currentSettings.surface_style ?? "glass") as any));
          setSurfacePickerFocusIndex(idx);
          surfacePickerFocusIndexRef.current = idx;
          setShowSurfacePicker(true);
          showSurfacePickerRef.current = true;
          haptic("confirm");
        }
        else if (item.type === "accent") { const keys = Object.keys(ACCENTS); const cur = keys.indexOf(currentSettings.accent); updateSetting("accent", keys[(cur + 1) % keys.length]); haptic("confirm"); }
        else if (item.type === "slider") {
          const cur = (currentSettings[item.key] as number | undefined) ?? 1.0;
          updateSetting(item.key, Math.min(item.max, Math.round((cur + item.step) * 100) / 100));
          haptic("confirm");
        }
        else if (item.type === "action") {
          if (item.key === "clear_recents") handleClearRecents();
          if (item.key === "clear_cache")   handleClearCache();
          if (item.key === "reset_scale")   updateSetting("ui_scale", autoScaleRef.current);
          haptic("confirm");
        }
        else if (item.type === "spotify") {
          if (spotifyConnectedRef.current) onSpotifyDisconnect();
          else onOpenSpotifyGuide();
          haptic("confirm");
        }
        else if (item.type === "steam") {
          if (steamConnectedRef.current) onSteamDisconnect();
          else onOpenSteamQr();
          haptic("confirm");
        }
        else if (item.type === "refresh") { refreshLibrary(); haptic("confirm"); }
        else if (item.type === "update") {
          if (updateStatus === "available") {
            const releasesUrl = (currentSettings.update_channel ?? "stable") === "prerelease"
              ? `https://github.com/${GITHUB_REPO}/releases`
              : `https://github.com/${GITHUB_REPO}/releases/latest`;
            invoke("launch_app", { path: releasesUrl, id: "releases", name: "LiftOff Releases", appType: "app", source: "", runAsAdmin: false }).catch(() => {});
          }
          else checkForUpdates();
          haptic("confirm");
        }
        else if (item.type === "link") {
          if (item.key === "coffee")  invoke("launch_app", { path: "https://buymeacoffee.com/liftoff_handheld_launcher", id: "coffee", name: "Buy Me a Coffee", appType: "app", source: "", runAsAdmin: false }).catch(() => {});
          if (item.key === "github")  invoke("launch_app", { path: "https://github.com/PixelateWizard/LiftOff", id: "github", name: "GitHub", appType: "app", source: "", runAsAdmin: false }).catch(() => {});
          if (item.key === "discord") invoke("launch_app", { path: "https://discord.gg/F5ncP75WtD", id: "discord", name: "Discord", appType: "app", source: "", runAsAdmin: false }).catch(() => {});
          haptic("confirm");
        }
        else if (item.type === "attribution") {
          if (item.url) invoke("launch_app", { path: item.url, id: item.key, name: item.label, appType: "app", source: "", runAsAdmin: false }).catch(() => {});
          haptic("confirm");
        }
        else if (item.type === "custom_folders") {
          setShowFolderManager(true); showFolderManagerRef.current = true;
          haptic("confirm");
        }
        else if (item.type === "home_collection_toggle") {
          toggleHomeCollection(item.colName);
          haptic("confirm");
        }
      }
      if (key === "ArrowLeft") {
        if (!item) return;
        if (item.type === "toggle")  { updateSetting(item.key, !currentSettings[item.key]); haptic("confirm"); }
        else if (item.type === "cycle")  { const opts = item.options; const curVal = item.key === "theme" ? normalizeThemeKey(String(currentSettings[item.key])) : String(currentSettings[item.key]); const cur = opts.indexOf(curVal); updateSetting(item.key, opts[(cur - 1 + opts.length) % opts.length]); haptic("confirm"); }
        else if (item.type === "accent") { const keys = Object.keys(ACCENTS); const cur = keys.indexOf(currentSettings.accent); updateSetting("accent", keys[(cur - 1 + keys.length) % keys.length]); haptic("confirm"); }
        else if (item.type === "slider") {
          const cur = (currentSettings[item.key] as number | undefined) ?? 1.0;
          updateSetting(item.key, Math.max(item.min, Math.round((cur - item.step) * 100) / 100));
          haptic("confirm");
        }
        else if (item.type === "home_collection_toggle") {
          toggleHomeCollection(item.colName);
          haptic("confirm");
        }
      }
      return;
    }

    if (currentTab === "Home") {
      // Defensive: pinned section became invisible (e.g. all pins removed) — reset to hero
      if (section === "pinned" && !homePinnedVisible) {
        setFocusSection("hero"); focusSectionRef.current = "hero";
        setFocusIndex(0); focusIndexRef.current = 0;
        return;
      }

      // Collections available for navigation (computed once, reused by all sections)
      const homeCols = currentSettings.show_home_collections ? [
        ...gameCollectionsRef.current.map(col => ({
          id: col.id,
          items: appsRef.current.filter(a => a.app_type === "game" && (gameMembershipsRef.current[a.id] || []).includes(col.id)).slice(0, 20),
        })),
        ...appCollectionsRef.current.map(col => ({
          id: col.id,
          items: appsRef.current.filter(a => a.app_type === "app" && (appMembershipsRef.current[a.id] || []).includes(col.id)).slice(0, 20),
        })),
      ].filter(c => c.items.length > 0) : [];

      const pinnedAtTop = (currentSettings.home_pinned_pos ?? "bottom") === "top";

      // Ordered chain of sections from top to bottom — same logic for all home modes
      const chain: string[] = [
        ...(homePinnedVisible && pinnedAtTop  ? ["pinned"] : []),
        "hero",
        ...(homePinnedVisible && !pinnedAtTop ? ["pinned"] : []),
        ...(fRecent.length > 0               ? ["recent"] : []),
        ...(homeCols.length > 0              ? ["home_collections"] : []),
      ];
      const chainIdx  = chain.indexOf(section);
      const chainPrev = chain[chainIdx - 1] as string | undefined;
      const chainNext = chain[chainIdx + 1] as string | undefined;
      const activateHomeEntry = (app: App, sourceSection = section) => {
        const heroLaunchCta = sourceSection === "hero" && currentSettings.home_mode !== "semi";
        if (!heroLaunchCta && app.app_type === "game") {
          haptic("confirm");
          openDetailsModal(app);
        } else {
          triggerLaunch(app, rec);
        }
      };

      if (key === "Escape" && section === chain[0]) {
        openPowerModal();
        playSoundAlt();
        return;
      }

      const goTo = (sec: string) => {
        setFocusSection(sec); focusSectionRef.current = sec;
        const isSemi = currentSettings.home_mode === "semi";
        const initialIdx = (sec === "hero" && isSemi) ? heroIndexRef.current : 0;
        setFocusIndex(initialIdx); focusIndexRef.current = initialIdx;

        if (sec === "home_collections") {
          setHomeColFocusRow(0); homeColFocusRowRef.current = 0;
          setHomeColFocusCol(0); homeColFocusColRef.current = 0;
        }
      };

      // ─── HERO ───────────────────────────────────────────────────────────────
      if (section === "hero") {
        const heroApp = fRecentGames[heroIndexRef.current];
        const isSemi = currentSettings.home_mode === "semi";
        const heroRunning = !isSemi && !!heroApp && isRunning(heroApp.id);
        const heroMax = isSemi ? fRecentGames.length - 1 : Math.min(fRecentGames.length, 6) - 1;
        const moveHero = (dir: number) => {
          const ni = Math.min(Math.max(heroIndexRef.current + dir, 0), heroMax);
          if (ni === heroIndexRef.current) return;
          setHeroIndex(ni); heroIndexRef.current = ni;
          setHeroActionIndex(0); heroActionIndexRef.current = 0;
          if (isSemi) {
            setFocusIndex(ni); focusIndexRef.current = ni;
          }

        };
        if (heroRunning) {
          // Running games show two actions: Resume (0) and Close (1). Pressing past
          // either edge scrolls the carousel so a running game can't trap hero nav.
          if (key === "ArrowLeft") {
            if (heroActionIndexRef.current === 1) { setHeroActionIndex(0); heroActionIndexRef.current = 0;  }
            else moveHero(-1);
          }
          if (key === "ArrowRight") {
            if (heroActionIndexRef.current === 0) { setHeroActionIndex(1); heroActionIndexRef.current = 1;  }
            else moveHero(1);
          }
        } else {
          if (key === "ArrowLeft")  moveHero(-1);
          if (key === "ArrowRight") moveHero(1);
        }
        if (key === "ArrowUp"   && chainPrev) goTo(chainPrev);
        if (key === "ArrowDown" && chainNext) goTo(chainNext);
        if (key === "Enter" && heroApp) {
          if (heroRunning && heroActionIndexRef.current === 1) requestClose(heroApp);
          else activateHomeEntry(heroApp, "hero");
        }
        return;
      }

      // ─── PINNED ─────────────────────────────────────────────────────────────
      if (section === "pinned") {
        if (key === "ArrowRight") { const ni = Math.min(index + 1, fPinned.length - 1); if (ni !== index) { setFocusIndex(ni); focusIndexRef.current = ni;  } }
        if (key === "ArrowLeft")  { const ni = Math.max(index - 1, 0);                  if (ni !== index) { setFocusIndex(ni); focusIndexRef.current = ni;  } }
        if (key === "ArrowUp"   && chainPrev) goTo(chainPrev);
        if (key === "ArrowDown" && chainNext) goTo(chainNext);
        if (key === "Enter" && fPinned[index]) activateHomeEntry(fPinned[index]);
        return;
      }

      // ─── RECENT ─────────────────────────────────────────────────────────────
      if (section === "recent") {
        const maxIdx = Math.min(fRecent.length, 10) - 1;
        if (key === "ArrowRight") { const ni = Math.min(index + 1, maxIdx); if (ni !== index) { setFocusIndex(ni); focusIndexRef.current = ni;  } }
        if (key === "ArrowLeft")  { const ni = Math.max(index - 1, 0);      if (ni !== index) { setFocusIndex(ni); focusIndexRef.current = ni;  } }
        if (key === "ArrowUp"   && chainPrev) goTo(chainPrev);
        if (key === "ArrowDown" && chainNext) goTo(chainNext);
        if (key === "Enter" && fRecent[index]) activateHomeEntry(fRecent[index]);
        return;
      }

      // ─── COLLECTIONS ────────────────────────────────────────────────────────
      if (section === "home_collections") {
        const row = homeColFocusRowRef.current;
        const col = homeColFocusColRef.current;
        const currentRow = homeCols[row];
        if (key === "ArrowRight") { if (currentRow && col < currentRow.items.length - 1) { const ni = col + 1; setHomeColFocusCol(ni); homeColFocusColRef.current = ni;  } }
        if (key === "ArrowLeft")  { if (col > 0) { const ni = col - 1; setHomeColFocusCol(ni); homeColFocusColRef.current = ni;  } }
        if (key === "ArrowDown") {
          if (row < homeCols.length - 1) {
            const nr = row + 1; const nc = Math.min(col, homeCols[nr].items.length - 1);
            setHomeColFocusRow(nr); homeColFocusRowRef.current = nr;
            setHomeColFocusCol(nc); homeColFocusColRef.current = nc;

          }
        }
        if (key === "ArrowUp") {
          if (row > 0) {
            const nr = row - 1; const nc = Math.min(col, homeCols[nr].items.length - 1);
            setHomeColFocusRow(nr); homeColFocusRowRef.current = nr;
            setHomeColFocusCol(nc); homeColFocusColRef.current = nc;

          } else if (chainPrev) {
            goTo(chainPrev);
          }
        }
        if (key === "Enter" && currentRow) { const app = currentRow.items[col]; if (app) activateHomeEntry(app); }
        return;
      }

      return;
    }

    // Games / Apps tabs
    // LT/RT cycle source sub-tabs on Games tab (from anywhere)
    if (currentTab === "Games") {
      if (key === "TriggerLeft") { cycleGameSource(-1); return; }
      if (key === "TriggerRight") { cycleGameSource(1); return; }
    }
    if (currentTab === "Apps") {
      const APP_COLS = ["All", ...appCollectionsRef.current.map(c => c.name)];
      if (key === "TriggerLeft") {
        const cur = APP_COLS.indexOf(appCollectionTabRef.current);
        const next = APP_COLS[(cur - 1 + APP_COLS.length) % APP_COLS.length];
        if (next !== appCollectionTabRef.current) {
          onSubtabMotionDirection("back");
          haptic("tab");
        }
        setAppCollectionTab(next); appCollectionTabRef.current = next;
        setFocusSection("grid"); focusSectionRef.current = "grid";
        setFocusIndex(0); focusIndexRef.current = 0;
        playSound(); return;
      }
      if (key === "TriggerRight") {
        const cur = APP_COLS.indexOf(appCollectionTabRef.current);
        const next = APP_COLS[(cur + 1) % APP_COLS.length];
        if (next !== appCollectionTabRef.current) {
          onSubtabMotionDirection("forward");
          haptic("tab");
        }
        setAppCollectionTab(next); appCollectionTabRef.current = next;
        setFocusSection("grid"); focusSectionRef.current = "grid";
        setFocusIndex(0); focusIndexRef.current = 0;
        playSound(); return;
      }
    }

    // subtabs row: source pills + manage button
    const SOURCES = getGameSourceTabs();
    const APP_COLS_NAV = ["All", ...appCollectionsRef.current.map(c => c.name)];
    const subtabItems = currentTab === "Games"
      ? [...SOURCES, "manage"]
      : [...APP_COLS_NAV, "manage"];

    if (section === "subtabs") {
      const currentSubtabIndex = Math.min(
        Math.max(subtabFocusIndexRef.current, 0),
        subtabItems.length - 1
      );
      if (currentSubtabIndex !== subtabFocusIndexRef.current) {
        setSubtabFocusIndex(currentSubtabIndex);
        subtabFocusIndexRef.current = currentSubtabIndex;
      }
      if (key === "ArrowRight" || key === "ArrowLeft" || key === "ArrowDown" || key === "ArrowUp") {
        if (fPinned.length > 0) { setFocusSection("pinned"); focusSectionRef.current = "pinned"; setFocusIndex(0); focusIndexRef.current = 0; }
        else { setFocusSection("grid"); focusSectionRef.current = "grid"; setFocusIndex(0); focusIndexRef.current = 0; }

        playSound();
      }
      else if (key === "Enter") {
        const item = subtabItems[subtabFocusIndexRef.current];
        if (item === "manage") { haptic("confirm"); openLibraryActionsModal(); }
        // Pills already auto-switched on focus movement — Enter is a no-op for them
      }
      return; // always return — never fall through to grid/pinned launch
    }

    if (section === "pinned") {
      const pinnedCols = currentTab === "Games"
        ? Math.max(2, Math.round(GAME_COLS / (settingsRef.current.game_cover_scale ?? 1.0)))
        : settingsRef.current.app_list_view
          ? Math.max(1, settingsRef.current.app_list_cols ?? 1)
          : Math.max(2, Math.round(COLS / (settingsRef.current.app_cover_scale ?? 1.0)));
      if (fPinned.length === 0) { setFocusSection("grid"); focusSectionRef.current = "grid"; setFocusIndex(0); focusIndexRef.current = 0; return; }
      if (key === "ArrowRight") { const ni = Math.min(index + 1, fPinned.length - 1); if (ni !== index) { setFocusIndex(ni); focusIndexRef.current = ni;  } }
      if (key === "ArrowLeft")  { const ni = Math.max(index - 1, 0);                  if (ni !== index) { setFocusIndex(ni); focusIndexRef.current = ni;  } }
      if (key === "ArrowUp") {
        if (index >= pinnedCols) {
          const ni = index - pinnedCols;
          setFocusIndex(ni); focusIndexRef.current = ni;
        } else {
          setFocusIndex(index); focusIndexRef.current = index;
        }
      }
      if (key === "ArrowDown") {
        const ni = index + pinnedCols;
        if (ni < fPinned.length) { setFocusIndex(ni); focusIndexRef.current = ni;  }
        else { setFocusSection("grid"); focusSectionRef.current = "grid"; setFocusIndex(0); focusIndexRef.current = 0;  }
      }
      if (key === "Enter" && fPinned[index]) {
        if (currentTab === "Games") { haptic("confirm"); openDetailsModal(fPinned[index]); }
        else triggerLaunch(fPinned[index], rec);
      }
      return;
    }
    if (section === "grid") {
      const pinnedCols = currentTab === "Games"
        ? Math.max(2, Math.round(GAME_COLS / (settingsRef.current.game_cover_scale ?? 1.0)))
        : settingsRef.current.app_list_view
          ? Math.max(1, settingsRef.current.app_list_cols ?? 1)
          : Math.max(2, Math.round(COLS / (settingsRef.current.app_cover_scale ?? 1.0)));
      if (fApps.length === 0) return;
      if (key === "ArrowRight") { const ni = Math.min(index + 1, fApps.length - 1); if (ni !== index) { setFocusIndex(ni); focusIndexRef.current = ni;  } }
      if (key === "ArrowLeft")  { const ni = Math.max(index - 1, 0);                if (ni !== index) { setFocusIndex(ni); focusIndexRef.current = ni;  } }
      if (key === "ArrowDown")  { const ni = Math.min(index + cols, fApps.length - 1); if (ni !== index) { setFocusIndex(ni); focusIndexRef.current = ni;  } }
      if (key === "ArrowUp") {
        if (index < cols) {
          if (fPinned.length > 0) {
            const lastPinnedRowStart = Math.floor((fPinned.length - 1) / pinnedCols) * pinnedCols;
            const pinnedTarget = Math.min(lastPinnedRowStart + (index % pinnedCols), fPinned.length - 1);
            setFocusSection("pinned"); focusSectionRef.current = "pinned"; setFocusIndex(pinnedTarget); focusIndexRef.current = pinnedTarget;
          } else {
            setFocusIndex(index); focusIndexRef.current = index;
          }
        } else { const ni = index - cols; setFocusIndex(ni); focusIndexRef.current = ni;  }
      }
      if (key === "Enter" && fApps[index]) {
        if (currentTab === "Games") { haptic("confirm"); openDetailsModal(fApps[index]); }
        else triggerLaunch(fApps[index], rec);
      }
      return;
    }
  };

  useEffect(() => {
    settingsFocusIndexRef.current = settingsFocusIndex;
    heroIndexRef.current = heroIndex;
    if (heroActionIndexRef.current !== heroActionIndex) {
      heroActionIndexRef.current = heroActionIndex;
    }
  });

  useEffect(() => {
    if (handleNavRef) handleNavRef.current = handleNav;
  });

  useEffect(() => {
    invoke("set_frontend_active", { active: true });
    let rAF: number;
    const REPEATABLE = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

    const poll = (now: number) => {
      // Skip all input processing when the window doesn't have focus.
      // navigator.getGamepads() is not focus-aware and would fire through games/overlays.
      if (!document.hasFocus()) {
        rAF = requestAnimationFrame(poll);
        return;
      }

      const gp = getActiveGamepad();
      if (gp && options.isReadyRef.current) {
        // When the active controller changes, re-run platform auto-detection
        if (gp.index !== lastPolledGpIndex.current) {
          lastPolledGpIndex.current = gp.index;
          if (settingsRef?.current?.gamepad_auto_detect) {
            const platform = detectPlatform(gp.id);
            if (platform) updateSetting("gamepad_platform", platform);
          }
        }
        const speed = settingsRef?.current?.repeat_speed;
        const initialDelay = speed === "slow" ? 500 : speed === "fast" ? 250 : 400;
        const repeatDelay = speed === "slow" ? 150 : speed === "fast" ? 60 : 100;
        const state = readGpState(gp);

        if (!modalOwnsInput()) {
          const RS_ON = 0.6;
          const RS_OFF = 0.3;
          const rx = gp.axes?.[2] ?? 0;
          const ry = gp.axes?.[3] ?? 0;
          const latch = rsLatchRef.current;
          if (ry < -RS_ON && !latch.up) { latch.up = true; onRightStick("up"); }
          if (ry > -RS_OFF) latch.up = false;
          if (ry > RS_ON && !latch.down) { latch.down = true; onRightStick("down"); }
          if (ry < RS_OFF) latch.down = false;
          if (rx < -RS_ON && !latch.left) { latch.left = true; onRightStick("left"); }
          if (rx > -RS_OFF) latch.left = false;
          if (rx > RS_ON && !latch.right) { latch.right = true; onRightStick("right"); }
          if (rx < RS_OFF) latch.right = false;
        } else {
          rsLatchRef.current = { up: false, down: false, left: false, right: false };
        }

        Object.keys(state).forEach(key => {
          const pressed = state[key];
          const wasPressed = lastBtn.current[key];

          if (suppressUntilRelease.current[key]) {
            if (!pressed) suppressUntilRelease.current[key] = false;
            lastBtn.current[key] = pressed;
            return;
          }

          const canNavigate = !launchingAppRef.current
            && !showHideModalRef?.current
            && !showLibraryActionsRef?.current
            && !showFileBrowserRef?.current
            && !pendingFileRef?.current
            && !showFolderManagerRef?.current
            && !confirmDeleteRef?.current
            && !showColModalRef?.current
            && !colPickerAppRef?.current
            && !editNameAppRef?.current
            && !showPowerModalRef?.current
            && !showSpotifyGuideRef.current
            && !showSpotifyOverlayRef.current
            && !showSteamQrRef.current
            && !showCloudPickerRef.current
            && !detailsAppRef.current;

          // MENU (Start) gains a hold gesture when Spotify is connected:
          // hold to charge up and open the Spotify overlay (any tab); a tap
          // still performs the regular Start action, dispatched on release.
          if (key === "Start" && spotifyConnectedRef.current) {
            const SPOTIFY_HOLD_MS = 850;
            const setHoldProgress = (value: number) => {
              if (spotifyHoldProgressRef.current === value) return;
              spotifyHoldProgressRef.current = value;
              setSpotifyHoldProgress(value);
            };
            if (pressed && !wasPressed) {
              startHoldRef.current = canNavigate ? { since: now, fired: false } : null;
            } else if (pressed && wasPressed && startHoldRef.current && !startHoldRef.current.fired) {
              if (!canNavigate) {
                // A modal opened mid-hold; abandon the gesture.
                startHoldRef.current = null;
                setHoldProgress(0);
              } else {
                const progress = Math.min(1, (now - startHoldRef.current.since) / SPOTIFY_HOLD_MS);
                setHoldProgress(progress);
                if (progress >= 1) {
                  startHoldRef.current.fired = true;
                  setHoldProgress(0);
                  suppressUntilRelease.current[key] = true;
                  playSoundAlt();
                  onOpenSpotifyOverlay();
                }
              }
            } else if (!pressed && wasPressed) {
              const hold = startHoldRef.current;
              startHoldRef.current = null;
              setHoldProgress(0);
              // Released before the charge completed: run the normal tap action.
              if (hold && !hold.fired && canNavigate) handleNavRef?.current?.(key);
            }
            lastBtn.current[key] = pressed;
            return;
          }

          if (pressed && !wasPressed) {
            if (canNavigate) handleNavRef?.current?.(key);
            btnPressTime.current[key] = now;
            btnRepeating.current[key] = false;
          } else if (pressed && wasPressed && REPEATABLE.has(key)) {
            const heldMs = now - (btnPressTime.current[key] || now);
            if (!btnRepeating.current[key] && heldMs >= initialDelay) {
              btnRepeating.current[key] = true;
              btnPressTime.current[key] = now;
              navRepeatingRef.current = true;
              if (canNavigate) handleNavRef?.current?.(key);
            } else if (btnRepeating.current[key] && heldMs >= repeatDelay) {
              btnPressTime.current[key] = now;
              navRepeatingRef.current = true;
              if (canNavigate) handleNavRef?.current?.(key);
            }
          } else if (!pressed && wasPressed) {
            btnPressTime.current[key] = 0;
            btnRepeating.current[key] = false;
            navRepeatingRef.current = false;
          }

          lastBtn.current[key] = pressed;
        });
      }
      rAF = requestAnimationFrame(poll);
    };

    rAF = requestAnimationFrame(poll);
    return () => {
      cancelAnimationFrame(rAF);
      invoke("set_frontend_active", { active: false });
    };
  }, []);

  useEffect(() => {
    let lastKnownFocused = true;
    let pauseCheckTimer: number | undefined;

    const applyBackgroundPause = () => {
      lastKnownFocused = false;
      setWindowFocused(false);
      Object.values(heroVideoRefs.current).forEach(vid => {
        if (vid) vid.pause();
      });
    };

    const pauseForBackground = () => {
      if (pauseCheckTimer !== undefined) window.clearTimeout(pauseCheckTimer);
      pauseCheckTimer = window.setTimeout(() => {
        if (document.hidden) {
          applyBackgroundPause();
          return;
        }
        if (document.hasFocus()) {
          lastKnownFocused = true;
          setWindowFocused(true);
          return;
        }
        getCurrentWindow().isFocused().then((tauriFocused) => {
          if (!tauriFocused || document.hidden) applyBackgroundPause();
        }).catch(() => {
          applyBackgroundPause();
        });
      }, 80);
    };

    const resumeFromBackground = () => {
      if (pauseCheckTimer !== undefined) {
        window.clearTimeout(pauseCheckTimer);
        pauseCheckTimer = undefined;
      }
      lastKnownFocused = true;
      setWindowFocused(true);
      if (launchedAppSessionRef.current) {
        launchedAppSessionRef.current = false;
        launchReturnCooldownUntil.current = Date.now() + LAUNCH_RETURN_COOLDOWN_MS;
        const gp = getActiveGamepad();
        if (gp) {
          const s = readGpState(gp);
          suppressUntilRelease.current = {
            Enter: s.Enter,
            Escape: s.Escape,
            Select: s.Select,
            ButtonX: s.ButtonX,
            ButtonY: s.ButtonY,
            BumperLeft: s.BumperLeft,
            BumperRight: s.BumperRight,
            Start: s.Start,
          };
        }
      }
      if (launchingAppRef.current) return;
      if (tab !== "Home") return;
      const activeGame = recentGames[heroIndex];
      if (!activeGame) return;
      const vid = heroVideoRefs.current[activeGame.id];
      if (vid) vid.play().catch(() => {});
    };

    const onVisibilityChange = () => {
      if (document.hidden) pauseForBackground();
      else resumeFromBackground();
    };

    const handleNativeFocus = (focused: boolean) => {
      if (focused) resumeFromBackground();
      else pauseForBackground();
    };

    window.addEventListener("blur", pauseForBackground);
    window.addEventListener("focus", resumeFromBackground);
    document.addEventListener("visibilitychange", onVisibilityChange);
    let cancelled = false;
    let unlistenFocus: (() => void) | undefined;
    let fseRestoredUnlisten: (() => void) | undefined;
    let focusPoll: number | undefined;
    getCurrentWindow().onFocusChanged(({ payload }) => {
      handleNativeFocus(payload);
    }).then((unlisten) => {
      if (cancelled) unlisten();
      else unlistenFocus = unlisten;
    }).catch(() => {});
    // Defensive: WebView2 can occasionally drop its focus event when the FSE
    // backend forces LiftOff foreground, but fse:restored is the reliable
    // signal that LiftOff is visually back and should resume controller input.
    listen("fse:restored", () => {
      resumeFromBackground();
    }).then((unlisten) => {
      if (cancelled) unlisten();
      else fseRestoredUnlisten = unlisten;
    }).catch(() => {});

    const startFocusPoll = window.setTimeout(() => {
      focusPoll = window.setInterval(() => {
        if (!options.isReadyRef.current) return;
        getCurrentWindow().isFocused().then((tauriFocused) => {
          const focused = tauriFocused && !document.hidden;
          if (focused !== lastKnownFocused) handleNativeFocus(focused);
        }).catch(() => {});
      }, 300);
    }, 1500);

    return () => {
      cancelled = true;
      unlistenFocus?.();
      fseRestoredUnlisten?.();
      if (pauseCheckTimer !== undefined) window.clearTimeout(pauseCheckTimer);
      window.clearTimeout(startFocusPoll);
      if (focusPoll !== undefined) window.clearInterval(focusPoll);
      window.removeEventListener("blur", pauseForBackground);
      window.removeEventListener("focus", resumeFromBackground);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [tab, heroIndex, recentGames]);


  return {
    tab,
    tabRef,
    focusSection,
    focusSectionRef,
    navRepeatingRef,
    focusIndex,
    focusIndexRef,
    heroIndex,
    heroIndexRef,
    settingsFocusIndex,
    settingsFocusIndexRef,
    settingsSection,
    settingsSectionRef,
    gameSourceTab,
    gameSourceTabRef,
    subtabFocusIndex,
    subtabFocusIndexRef,
    homeColFocusRow,
    homeColFocusRowRef,
    homeColFocusCol,
    homeColFocusColRef,
    heroActionIndex,
    heroActionIndexRef,
    launchingApp,
    launchingAppRef,
    windowFocused,
    spotifyHoldProgress,
    heroVideoRefs,
    setTab,
    setFocusSection,
    setFocusIndex,
    setHeroIndex,
    setSettingsFocusIndex,
    setSettingsSection,
    setGameSourceTab,
    setSubtabFocusIndex,
    setHomeColFocusRow,
    setHomeColFocusCol,
    setHeroActionIndex,
    switchTab,
    triggerLaunch,
    closeLaunchOverlay,
    closeHideModal,
    closeLibraryActionsModal,
    closePowerModal,
    closeArtPicker,
    openDetailsModal,
    closeDetailsModal,
    openHideModal,
    openLibraryActionsModal,
    handleNav,
  };
}

