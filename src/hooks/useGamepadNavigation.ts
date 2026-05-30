import { useEffect, useRef, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { TFunction } from "i18next";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { App, Settings } from "../types";
import { launchApp } from "./useLaunchApp";
import { getBestGamepad, getActiveGamepad, readGpState, detectPlatform } from "../utils/gamepad";
import { buildSettingsItems, getSectionNavigableItems, SETTINGS_SECTIONS } from "../views/settings";
import {
  ACCENTS as DEFAULT_ACCENTS,
  COLS as DEFAULT_COLS,
  GAME_COLS as DEFAULT_GAME_COLS,
  GITHUB_REPO as DEFAULT_GITHUB_REPO,
  KB_ALPHA,
  KB_NUMS,
  TABS as DEFAULT_TABS,
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

export interface UseGamepadNavigationOptions {
  isReadyRef: AnyRef<boolean>;
  initialTab?: string | null;

  settingsRef?: AnyRef<Settings>;
  updateSetting?: (key: keyof Settings, value: unknown) => void;
  resolvedTheme?: string;

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
  contextMenuRef?: AnyRef<unknown>;
  showPowerModalRef?: AnyRef<boolean>;

  setShowHideModal?: (value: boolean) => void;
  setShowLibraryActions?: (value: boolean) => void;
  setShowPowerModal?: (value: boolean) => void;
  setArtPickerApp?: (app: App | null) => void;

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
}

export interface GamepadNavigationResult {
  tab: string;
  tabRef: AnyRef<string>;
  focusSection: string;
  focusSectionRef: AnyRef<string>;
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

  switchTab: (newTab: string) => void;
  triggerLaunch: (app: App, rec: App[]) => void;
  closeLaunchOverlay: () => void;
  closeHideModal: () => void;
  closeLibraryActionsModal: () => void;
  closePowerModal: () => void;
  closeArtPicker: () => void;
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
  const [launchingApp, setLaunchingApp] = useState<App | null>(null);
  const [windowFocused, setWindowFocused] = useState(true);

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
  const launchingAppRef = useRef<App | null>(null);
  const heroVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const lastBtn = useRef<ButtonStateMap>({});
  const btnPressTime = useRef<ButtonTimeMap>({});
  const btnRepeating = useRef<ButtonStateMap>({});
  // True while a directional input is in hold-repeat mode (not a single press).
  // Read by the scroll-correction effect in App.jsx to choose instant vs smooth scroll.
  const navRepeatingRef = useRef(false);
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
    resolvedTheme = "space",
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
    contextMenuRef,
    showPowerModalRef = { current: false } as AnyRef<boolean>,
    setShowHideModal = noop as (value: boolean) => void,
    setShowLibraryActions = noop as (value: boolean) => void,
    setShowPowerModal = noop as (value: boolean) => void,
    setArtPickerApp = noop as (app: App | null) => void,
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

  const _triggerLaunchImpl = (app, rec) => {
    const now = Date.now();
    console.warn(`triggerLaunch @ ${new Date().toISOString()}`, app?.name, `(${now - lastLaunchTime.current}ms since last)`);
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


  const switchTab = (newTab: string) => {
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
    setGameSourceTab("All"); gameSourceTabRef.current = "All";
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
    }
  );

  // ── handleNav ─────────────────────────────────────────────────
  const handleNav = (key) => {
    // Modal intercepts all input via its own poll — main nav must not run
    if (launchingAppRef.current || showHideModalRef.current || showLibraryActionsRef.current || showFileBrowserRef.current || pendingFileRef.current || showFolderManagerRef.current || confirmDeleteRef.current || showColModalRef.current || colPickerAppRef.current || editNameAppRef.current || showPowerModalRef?.current) return;

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
    const isOtherGameSource = (app: App) =>
      app.app_type === "game"
      && app.source !== "steam"
      && app.source !== "xbox"
      && app.source !== "battlenet"
      && !customSourcesRef.current.includes(app.source);
    const getGameSourceTabs = () => {
      const hasSource = (source: string) => appsRef.current.some(a => a.app_type === "game" && a.source === source);
      return [
        "All",
        ...(currentSettings.scan_steam !== false && hasSource("steam") ? ["Steam"] : []),
        ...(currentSettings.scan_xbox !== false && hasSource("xbox") ? ["Xbox"] : []),
        ...(currentSettings.scan_battlenet !== false && hasSource("battlenet") ? ["Battle.net"] : []),
        ...(appsRef.current.some(isOtherGameSource) ? ["Other"] : []),
        ...customSourcesRef.current,
        ...gameCollectionsRef.current.map(c => c.name),
      ];
    };

    const fApps = allApps.filter(a => {
      if (currentTab === "Home" || currentTab === "All") return true;
      if (currentTab === "Games") {
        if (a.app_type !== "game") return false;
        const src = gameSourceTabRef.current;
        if (src === "Steam") return a.source === "steam";
        if (src === "Xbox")  return a.source === "xbox";
        if (src === "Battle.net")  return a.source === "battlenet";
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
    const fPinned = (currentTab === "Apps" && appCollectionTabRef.current !== "All") ? [] : currentPins
      .map(id => allApps.find(a => a.id === id))
      .filter(Boolean)
      .filter(a => currentTab === "Home" || currentTab === "All" ? true
        : currentTab === "Games" ? a.app_type === "game" : a.app_type === "app");
    const homePinnedVisible = currentTab === "Home" && (currentSettings.home_pinned_pos ?? "bottom") !== "none" && fPinned.length > 0;

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
          if (app) { closeSearch(); triggerLaunch(app, recentRef.current); }
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
    if (key === "BumperLeft")  { const _tabs = TABS as string[]; const i = _tabs.indexOf(currentTab); switchTab(_tabs[(i - 1 + _tabs.length) % _tabs.length]); return; }
    if (key === "BumperRight") { const _tabs = TABS as string[]; const i = _tabs.indexOf(currentTab); switchTab(_tabs[(i + 1) % _tabs.length]); return; }

    // BACK (Select) opens library actions menu; MENU (Start) opens context menu for focused card
    if (key === "Select" && (currentTab === "Games" || currentTab === "Apps")) {
      openLibraryActionsModal(); return;
    }
    if (key === "Start" && (currentTab === "Games" || currentTab === "Apps")) {
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
      if (key === "TriggerLeft") {
        const ni = Math.max(0, settingsSectionRef.current - 1);
        if (ni !== settingsSectionRef.current) {
          setSettingsSection(ni); settingsSectionRef.current = ni;
          setSettingsFocusIndex(0); settingsFocusIndexRef.current = 0;
          if (tabScrollRef.current) tabScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
          playSound();
        }
        return;
      }
      if (key === "TriggerRight") {
        const ni = Math.min(SETTINGS_SECTIONS.length - 1, settingsSectionRef.current + 1);
        if (ni !== settingsSectionRef.current) {
          setSettingsSection(ni); settingsSectionRef.current = ni;
          setSettingsFocusIndex(0); settingsFocusIndexRef.current = 0;
          if (tabScrollRef.current) tabScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
          playSound();
        }
        return;
      }
      const sfIndex = settingsFocusIndexRef.current;
      const item    = navigableSettings[sfIndex];
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
        if (item.type === "toggle")  updateSetting(item.key, !currentSettings[item.key]);
        else if (item.type === "cycle")  { const opts = item.options; const curVal = item.key === "theme" ? normalizeThemeKey(String(currentSettings[item.key])) : String(currentSettings[item.key]); const cur = opts.indexOf(curVal); updateSetting(item.key, opts[(cur + 1) % opts.length]); }
        else if (item.type === "accent") { const keys = Object.keys(ACCENTS); const cur = keys.indexOf(currentSettings.accent); updateSetting("accent", keys[(cur + 1) % keys.length]); }
        else if (item.type === "slider") {
          const cur = (currentSettings[item.key] as number | undefined) ?? 1.0;
          updateSetting(item.key, Math.min(item.max, Math.round((cur + item.step) * 100) / 100));
        }
        else if (item.type === "action") {
          if (item.key === "clear_recents") handleClearRecents();
          if (item.key === "clear_cache")   handleClearCache();
          if (item.key === "reset_scale")   updateSetting("ui_scale", autoScaleRef.current);
        }
        else if (item.type === "refresh") { refreshLibrary(); }
        else if (item.type === "update") {
          if (updateStatus === "available") {
            const releasesUrl = (currentSettings.update_channel ?? "stable") === "prerelease"
              ? `https://github.com/${GITHUB_REPO}/releases`
              : `https://github.com/${GITHUB_REPO}/releases/latest`;
            invoke("launch_app", { path: releasesUrl, id: "releases", name: "LiftOff Releases", appType: "app", runAsAdmin: false }).catch(() => {});
          }
          else checkForUpdates();
        }
        else if (item.type === "link") {
          if (item.key === "coffee")  invoke("launch_app", { path: "https://buymeacoffee.com/liftoff_handheld_launcher", id: "coffee", name: "Buy Me a Coffee", appType: "app", runAsAdmin: false }).catch(() => {});
          if (item.key === "github")  invoke("launch_app", { path: "https://github.com/PixelateWizard/LiftOff", id: "github", name: "GitHub", appType: "app", runAsAdmin: false }).catch(() => {});
          if (item.key === "discord") invoke("launch_app", { path: "https://discord.gg/F5ncP75WtD", id: "discord", name: "Discord", appType: "app", runAsAdmin: false }).catch(() => {});
        }
        else if (item.type === "attribution") {
          if (item.url) invoke("launch_app", { path: item.url, id: item.key, name: item.label, appType: "app", runAsAdmin: false }).catch(() => {});
        }
        else if (item.type === "custom_folders") {
          setShowFolderManager(true); showFolderManagerRef.current = true;
        }
        else if (item.type === "home_collection_toggle") {
          toggleHomeCollection(item.colName);
        }
      }
      if (key === "ArrowLeft") {
        if (!item) return;
        if (item.type === "toggle")  updateSetting(item.key, !currentSettings[item.key]);
        else if (item.type === "cycle")  { const opts = item.options; const curVal = item.key === "theme" ? normalizeThemeKey(String(currentSettings[item.key])) : String(currentSettings[item.key]); const cur = opts.indexOf(curVal); updateSetting(item.key, opts[(cur - 1 + opts.length) % opts.length]); }
        else if (item.type === "accent") { const keys = Object.keys(ACCENTS); const cur = keys.indexOf(currentSettings.accent); updateSetting("accent", keys[(cur - 1 + keys.length) % keys.length]); }
        else if (item.type === "slider") {
          const cur = (currentSettings[item.key] as number | undefined) ?? 1.0;
          updateSetting(item.key, Math.max(item.min, Math.round((cur - item.step) * 100) / 100));
        }
        else if (item.type === "home_collection_toggle") {
          toggleHomeCollection(item.colName);
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

      if (key === "Escape" && section === chain[0]) {
        openPowerModal();
        playSoundAlt();
        return;
      }

      const goTo = (sec: string) => {
        setFocusSection(sec); focusSectionRef.current = sec;
        setFocusIndex(0); focusIndexRef.current = 0;
        if (sec === "home_collections") {
          setHomeColFocusRow(0); homeColFocusRowRef.current = 0;
          setHomeColFocusCol(0); homeColFocusColRef.current = 0;
        }
      };

      // ─── HERO ───────────────────────────────────────────────────────────────
      if (section === "hero") {
        if (key === "ArrowLeft")  { const ni = Math.max(heroIndexRef.current - 1, 0); setHeroIndex(ni); heroIndexRef.current = ni; }
        if (key === "ArrowRight") { const ni = Math.min(heroIndexRef.current + 1, Math.min(fRecentGames.length, 6) - 1); setHeroIndex(ni); heroIndexRef.current = ni; }
        if (key === "ArrowUp"   && chainPrev) goTo(chainPrev);
        if (key === "ArrowDown" && chainNext) goTo(chainNext);
        if (key === "Enter" && fRecentGames[heroIndexRef.current]) triggerLaunch(fRecentGames[heroIndexRef.current], rec);
        return;
      }

      // ─── PINNED ─────────────────────────────────────────────────────────────
      if (section === "pinned") {
        if (key === "ArrowRight") { const ni = Math.min(index + 1, fPinned.length - 1); setFocusIndex(ni); focusIndexRef.current = ni; }
        if (key === "ArrowLeft")  { const ni = Math.max(index - 1, 0);                  setFocusIndex(ni); focusIndexRef.current = ni; }
        if (key === "ArrowUp"   && chainPrev) goTo(chainPrev);
        if (key === "ArrowDown" && chainNext) goTo(chainNext);
        if (key === "Enter" && fPinned[index]) triggerLaunch(fPinned[index], rec);
        return;
      }

      // ─── RECENT ─────────────────────────────────────────────────────────────
      if (section === "recent") {
        const maxIdx = Math.min(fRecent.length, 10) - 1;
        if (key === "ArrowRight") { const ni = Math.min(index + 1, maxIdx); setFocusIndex(ni); focusIndexRef.current = ni; }
        if (key === "ArrowLeft")  { const ni = Math.max(index - 1, 0);      setFocusIndex(ni); focusIndexRef.current = ni; }
        if (key === "ArrowUp"   && chainPrev) goTo(chainPrev);
        if (key === "ArrowDown" && chainNext) goTo(chainNext);
        if (key === "Enter" && fRecent[index]) triggerLaunch(fRecent[index], rec);
        return;
      }

      // ─── COLLECTIONS ────────────────────────────────────────────────────────
      if (section === "home_collections") {
        const row = homeColFocusRowRef.current;
        const col = homeColFocusColRef.current;
        const currentRow = homeCols[row];
        if (key === "ArrowRight") { if (currentRow && col < currentRow.items.length - 1) { const ni = col + 1; setHomeColFocusCol(ni); homeColFocusColRef.current = ni; } }
        if (key === "ArrowLeft")  { if (col > 0) { const ni = col - 1; setHomeColFocusCol(ni); homeColFocusColRef.current = ni; } }
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
        if (key === "Enter" && currentRow) { const app = currentRow.items[col]; if (app) triggerLaunch(app, rec); }
        return;
      }

      return;
    }

    // Games / Apps tabs
    // LT/RT cycle source sub-tabs on Games tab (from anywhere)
    if (currentTab === "Games") {
      const SOURCES = getGameSourceTabs();
      const currentSourceIndex = () => {
        const cur = SOURCES.indexOf(gameSourceTabRef.current);
        return cur >= 0 ? cur : 0;
      };
      if (key === "TriggerLeft") {
        const cur = currentSourceIndex();
        const next = SOURCES[(cur - 1 + SOURCES.length) % SOURCES.length];
        setGameSourceTab(next); gameSourceTabRef.current = next;
        const hasPinned = next === "All" && pinsRef.current.length > 0 && pinsRef.current.some(id => appsRef.current.find(a => a.id === id));
        setFocusSection(hasPinned ? "pinned" : "grid"); focusSectionRef.current = hasPinned ? "pinned" : "grid";
        setFocusIndex(0); focusIndexRef.current = 0;
        playSound(); return;
      }
      if (key === "TriggerRight") {
        const cur = currentSourceIndex();
        const next = SOURCES[(cur + 1) % SOURCES.length];
        setGameSourceTab(next); gameSourceTabRef.current = next;
        const hasPinned = next === "All" && pinsRef.current.length > 0 && pinsRef.current.some(id => appsRef.current.find(a => a.id === id));
        setFocusSection(hasPinned ? "pinned" : "grid"); focusSectionRef.current = hasPinned ? "pinned" : "grid";
        setFocusIndex(0); focusIndexRef.current = 0;
        playSound(); return;
      }
    }
    if (currentTab === "Apps") {
      const APP_COLS = ["All", ...appCollectionsRef.current.map(c => c.name)];
      if (key === "TriggerLeft") {
        const cur = APP_COLS.indexOf(appCollectionTabRef.current);
        const next = APP_COLS[(cur - 1 + APP_COLS.length) % APP_COLS.length];
        setAppCollectionTab(next); appCollectionTabRef.current = next;
        setFocusSection("grid"); focusSectionRef.current = "grid";
        setFocusIndex(0); focusIndexRef.current = 0;
        playSound(); return;
      }
      if (key === "TriggerRight") {
        const cur = APP_COLS.indexOf(appCollectionTabRef.current);
        const next = APP_COLS[(cur + 1) % APP_COLS.length];
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

    const switchSubtabItem = (item) => {
      if (item === "add_app" || item === "add_folder" || item === "manage" || item === "collections") return;
      if (currentTab === "Games") { setGameSourceTab(item); gameSourceTabRef.current = item; }
      else { setAppCollectionTab(item); appCollectionTabRef.current = item; }
      setFocusIndex(0); focusIndexRef.current = 0;
    };

    if (section === "subtabs") {
      const currentSubtabIndex = Math.min(
        Math.max(subtabFocusIndexRef.current, 0),
        subtabItems.length - 1
      );
      if (currentSubtabIndex !== subtabFocusIndexRef.current) {
        setSubtabFocusIndex(currentSubtabIndex);
        subtabFocusIndexRef.current = currentSubtabIndex;
      }
      if (key === "ArrowRight") {
        const ni = Math.min(currentSubtabIndex + 1, subtabItems.length - 1);
        setSubtabFocusIndex(ni); subtabFocusIndexRef.current = ni;
        switchSubtabItem(subtabItems[ni]);
        playSound();
      }
      else if (key === "ArrowLeft") {
        const ni = Math.max(currentSubtabIndex - 1, 0);
        setSubtabFocusIndex(ni); subtabFocusIndexRef.current = ni;
        switchSubtabItem(subtabItems[ni]);
        playSound();
      }
      else if (key === "ArrowDown") {
        if (fPinned.length > 0) { setFocusSection("pinned"); focusSectionRef.current = "pinned"; setFocusIndex(0); focusIndexRef.current = 0; }
        else { setFocusSection("grid"); focusSectionRef.current = "grid"; setFocusIndex(0); focusIndexRef.current = 0; }
        playSound();
      }
      else if (key === "Enter") {
        const item = subtabItems[subtabFocusIndexRef.current];
        if (item === "manage") { openLibraryActionsModal(); }
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
      if (key === "ArrowRight") { const ni = Math.min(index + 1, fPinned.length - 1); setFocusIndex(ni); focusIndexRef.current = ni; }
      if (key === "ArrowLeft")  { const ni = Math.max(index - 1, 0);                  setFocusIndex(ni); focusIndexRef.current = ni; }
      if (key === "ArrowUp") {
        if (index >= pinnedCols) {
          const ni = index - pinnedCols;
          setFocusIndex(ni); focusIndexRef.current = ni;
        } else {
          setFocusSection("subtabs"); focusSectionRef.current = "subtabs";
          setSubtabFocusIndex(0); subtabFocusIndexRef.current = 0;
          playSound();
        }
      }
      if (key === "ArrowDown") {
        const ni = index + pinnedCols;
        if (ni < fPinned.length) { setFocusIndex(ni); focusIndexRef.current = ni; }
        else { setFocusSection("grid"); focusSectionRef.current = "grid"; setFocusIndex(0); focusIndexRef.current = 0; }
      }
      if (key === "Enter" && fPinned[index]) triggerLaunch(fPinned[index], rec);
      return;
    }
    if (section === "grid") {
      const pinnedCols = currentTab === "Games"
        ? Math.max(2, Math.round(GAME_COLS / (settingsRef.current.game_cover_scale ?? 1.0)))
        : settingsRef.current.app_list_view
          ? Math.max(1, settingsRef.current.app_list_cols ?? 1)
          : Math.max(2, Math.round(COLS / (settingsRef.current.app_cover_scale ?? 1.0)));
      if (fApps.length === 0) return;
      if (key === "ArrowRight") { const ni = Math.min(index + 1, fApps.length - 1); setFocusIndex(ni); focusIndexRef.current = ni; }
      if (key === "ArrowLeft")  { const ni = Math.max(index - 1, 0);                setFocusIndex(ni); focusIndexRef.current = ni; }
      if (key === "ArrowDown")  { const ni = Math.min(index + cols, fApps.length - 1); setFocusIndex(ni); focusIndexRef.current = ni; }
      if (key === "ArrowUp") {
        if (index < cols) {
          if (fPinned.length > 0) {
            const lastPinnedRowStart = Math.floor((fPinned.length - 1) / pinnedCols) * pinnedCols;
            const pinnedTarget = Math.min(lastPinnedRowStart + (index % pinnedCols), fPinned.length - 1);
            setFocusSection("pinned"); focusSectionRef.current = "pinned"; setFocusIndex(pinnedTarget); focusIndexRef.current = pinnedTarget;
          } else {
            setFocusSection("subtabs"); focusSectionRef.current = "subtabs";
            setSubtabFocusIndex(0); subtabFocusIndexRef.current = 0;
          }
        } else { const ni = index - cols; setFocusIndex(ni); focusIndexRef.current = ni; }
      }
      if (key === "Enter" && fApps[index]) triggerLaunch(fApps[index], rec);
      return;
    }
  };

  useEffect(() => {
    settingsFocusIndexRef.current = settingsFocusIndex;
    heroIndexRef.current = heroIndex;
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
            && !showPowerModalRef?.current;

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
    let focusPoll: number | undefined;
    getCurrentWindow().onFocusChanged(({ payload }) => {
      handleNativeFocus(payload);
    }).then((unlisten) => {
      if (cancelled) unlisten();
      else unlistenFocus = unlisten;
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
    launchingApp,
    launchingAppRef,
    windowFocused,
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
    switchTab,
    triggerLaunch,
    closeLaunchOverlay,
    closeHideModal,
    closeLibraryActionsModal,
    closePowerModal,
    closeArtPicker,
    openHideModal,
    openLibraryActionsModal,
    handleNav,
  };
}

