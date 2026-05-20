//Copyright (C) 2025 Taylor Denby

import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import i18n from "./i18n";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import FileBrowser from "./components/FileBrowser";
import GamepadKeyboard from "./components/GamepadKeyboard";
import { GamepadBtn } from "./components/GamepadBtn";
import AddEntryModal from "./components/modals/AddEntryModal";
import ConfirmModal from "./components/modals/ConfirmModal";
import FolderManagerModal from "./components/modals/FolderManagerModal";
import ColPickerModal from "./components/modals/ColPickerModal";
import CollectionManagerModal from "./components/modals/CollectionManagerModal";
import ModalShell from "./components/modals/ModalShell";
import ContextMenuModal from "./components/modals/ContextMenuModal";
import HideModal from "./components/modals/HideModal";
import LibraryActionsModal from "./components/modals/LibraryActionsModal";
import EditNameModal from "./components/modals/EditNameModal";
import { SettingsScreen, buildSettingsItems, getSectionNavigableItems, SETTINGS_SECTIONS } from "./views/settings";
import { HomeView } from "./views/HomeView";
import { GamesView } from "./views/GamesView";
import { AppsView } from "./views/AppsView";
import { GamepadProvider } from "./contexts/GamepadContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { AppHeader } from "./components/layout/AppHeader";
import { AppBottomBar } from "./components/layout/AppBottomBar";
import { AppBackground } from "./components/app/AppBackground";
import { AppMainContent } from "./components/app/AppMainContent";
import { AppOverlays } from "./components/app/AppOverlays";
import { SplashScreen } from "./components/launch/SplashScreen";
import { LaunchOverlay } from "./components/launch/LaunchOverlay";
import { SteamGridArtPickerModal } from "./components/art/SteamGridArtPickerModal";
import { useSurfaceTheme } from "./theme/surfaces";
import { useAppSettings } from "./hooks/useAppSettings";
import { useAudioFeedback } from "./hooks/useAudioFeedback";
import { useCollections } from "./hooks/useCollections";
import { useCustomArt } from "./hooks/useCustomArt";
import { useCustomSources } from "./hooks/useCustomSources";
import { useLibraryData } from "./hooks/useLibraryData";
import { useModalState } from "./hooks/useModalState";
import { usePersistentJson } from "./hooks/usePersistentJson";
import { useSearchState } from "./hooks/useSearchState";
import { useGamepadNavigation } from "./hooks/useGamepadNavigation";
import { useStartupBootstrap } from "./hooks/useStartupBootstrap";
import { useSystemStatus } from "./hooks/useSystemStatus";
import { useUpdateCheck } from "./hooks/useUpdateCheck";
import { detectPlatform } from "./utils/gamepad";
import {
  COLS, GAME_COLS, TABS, APP_VERSION, GITHUB_REPO,
  ACCENTS, THEMES, CLOUD_SHAPES, CLOUD_CONFIGS, KB_ALPHA, KB_NUMS,
  normalizeThemeKey, isDarkThemeKey,
  getRunAsAdmin, setRunAsAdmin,
} from "./constants";

export default function App() {
  const { t } = useTranslation();
  const [addAppType, setAddAppType]                 = useState("game"); // "game" | "app"
  const [adminPrefsVersion, setAdminPrefsVersion]   = useState(0);
  const [heroCustomType, setHeroCustomType]         = usePersistentJson("liftoff_heroCustomType", {});
  const [cacheClearLoading, setCacheClearLoading]   = useState(false);
  const [cacheClearStatus, setCacheClearStatus]     = useState({ line1: "", line2: "" });
  const [sliderDraft, setSliderDraft] = useState({ key: null, value: null });
  const sliderDraftRef = useRef({ key: null, value: null });
  const [homeHiddenCollections, setHomeHiddenCollections] = useState(() => {
    try { return JSON.parse(localStorage.getItem("homeHiddenCollections") || "[]"); } catch { return []; }
  });

  // ── Search state ──────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────

  const focusedCardRef        = useRef(null);
  const focusedRowRef         = useRef(null);
  const searchFocusedCardRef  = useRef(null);   // FIX 3: focused search result card ref
  const settingsFocusedRef    = useRef(null);
  const settingsBottomRef     = useRef(null);
  const outerRef              = useRef(null);
  const homeScrollRef         = useRef(null);
  const tabScrollRef          = useRef(null);
  const pinnedShelfRef        = useRef(null);
  const recentShelfRef        = useRef(null);
  const drawerScrollRef       = useRef(null);
  const handleNavRef          = useRef(null);
  const autoScaleRef          = useRef(1.0);
  const handleClearCacheRef   = useRef(null);
  const handleClearRecentsRef = useRef(null);
  const toggleHomeCollectionRef = useRef(null);

  const {
    searchOpen, searchQuery, searchMode, searchFocusIndex,
    kbRow, kbCol, kbNumMode,
    setSearchOpen, setSearchQuery, setSearchMode, setSearchFocusIndex,
    setKbRow, setKbCol, setKbNumMode,
    searchOpenRef, searchQueryRef, searchModeRef, searchFocusIndexRef,
    kbRowRef, kbColRef, kbNumModeRef,
    openSearch, closeSearch, switchSearchMode,
    kbDelete, kbSpace, kbToggleNum, fireKey,
  } = useSearchState();
  const {
    showHideModal, showLibraryActions, showFileBrowser, pendingFile,
    showColModal, colPickerApp, confirmDelete, showFolderManager,
    artPickerApp, artPickerMode, contextMenu, editNameApp,
    setShowHideModal, setShowLibraryActions, setShowFileBrowser, setPendingFile,
    setShowColModal, setColPickerApp, setConfirmDelete, setShowFolderManager,
    setArtPickerApp, setArtPickerMode, setContextMenu, setEditNameApp,
    showHideModalRef, showLibraryActionsRef, showFileBrowserRef, pendingFileRef,
    showColModalRef, colPickerAppRef, confirmDeleteRef, showFolderManagerRef,
    artPickerAppRef, artPickerModeRef, contextMenuRef, editNameAppRef,
  } = useModalState();
  const {
    appCollections, setAppCollections, appCollectionsRef,
    appMemberships, setAppMemberships, appMembershipsRef,
    appCollectionTab, setAppCollectionTab, appCollectionTabRef,
    gameCollections, setGameCollections, gameCollectionsRef,
    gameMemberships, setGameMemberships, gameMembershipsRef,
  } = useCollections();
  const {
    customSources,
    setCustomSources,
    customSourcesRef,
    customFolders,
    setCustomFolders,
  } = useCustomSources();
  const { updateStatus, updateInfo, checkForUpdates } = useUpdateCheck({
    appVersion: APP_VERSION,
    githubRepo: GITHUB_REPO,
  });

  const { playSound, playSoundAlt, playSoundGameStart, playAppLoadedSound } = useAudioFeedback();
  const {
    gameArt,
    setGameArt,
    heroStatic,
    setHeroStatic,
    heroAnimated,
    setHeroAnimated,
    customArt,
    setCustomArt,
    customHeroArt,
    setCustomHeroArt,
    customArtRef,
    customHeroArtRef,
    loadCustomArt,
    fetchGameArt,
    clearGameArt,
  } = useCustomArt();
  const { loading, splashExiting, isReadyRef, onLoaded, onLoadError } = useStartupBootstrap({
    onAppLoaded: playAppLoadedSound,
  });
  const {
    apps, setApps, appsRef, allAppsRef,
    recent, setRecent, recentRef,
    recentGames, setRecentGames, recentGamesRef,
    pins, setPins, pinsRef,
    hidden, setHidden, hiddenRef,
    iconColors,
    libraryRefreshStatus,
    togglePin,
    toggleHidden,
    refreshLibrary,
  } = useLibraryData({
    fetchGameArt,
    onLoaded,
    onLoadError,
  });
  const {
    settings,
    settingsRef,
    updateSetting,
    updateSettingsBatch,
    defaultTab,
  } = useAppSettings({
    onScanKeyChange: refreshLibrary,
    autoScaleRef,
  });
  const { time, date, battery, charging, hasBattery } = useSystemStatus({
    timeFormat: settings.time_format,
    language: i18n.language,
    settingsRef,
  });

  const resolvedTheme = normalizeThemeKey(settings.theme);
  const isDark = isDarkThemeKey(resolvedTheme);

  // Memoized so theme-dependent view props stay stable across unrelated re-renders
  // (clock ticks every 10s, battery polls every 10s would otherwise bust the memo constantly)
  const theme = useMemo(() => THEMES[resolvedTheme] || THEMES.space, [resolvedTheme]);
  const accent = useMemo(() => {
    const base = ACCENTS[settings.accent] || ACCENTS.ember;
    const resolved = (!isDark && base.lightPrimary) ? { ...base, primary: base.lightPrimary } : base;
    const darkText = isDark
      ? !!resolved.darkText
      : (resolved.lightDarkText !== undefined ? resolved.lightDarkText : !!resolved.darkText);
    const glow = (!isDark && base.lightGlow) ? base.lightGlow : resolved.glow;
    return { ...resolved, darkText, glow };
  }, [settings.accent, isDark]);
  const {
    tab,
    tabRef,
    focusSection,
    focusSectionRef,
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
    closeArtPicker,
    openHideModal,
    openLibraryActionsModal,
    handleNav,
  } = useGamepadNavigation({
    isReadyRef,
    initialTab: defaultTab,
    settingsRef,
    updateSetting,
    resolvedTheme,
    appsRef,
    allAppsRef,
    recentRef,
    recentGames,
    recentGamesRef,
    pinsRef,
    setRecent,
    setRecentGames,
    togglePin,
    customSourcesRef,
    gameCollectionsRef,
    appCollectionsRef,
    gameMembershipsRef,
    appMembershipsRef,
    appCollectionTabRef,
    setAppCollectionTab,
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
    setShowHideModal,
    setShowLibraryActions,
    setArtPickerApp,
    playSoundGameStart,
    playSound,
    playSoundAlt,
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
    setSearchFocusIndex,
    setKbRow,
    setKbCol,
    openSearch,
    closeSearch,
    switchSearchMode,
    kbDelete,
    kbSpace,
    kbToggleNum,
    fireKey,
    setContextMenu,
    setShowFolderManager,
    refreshLibrary,
    updateStatus,
    checkForUpdates,
    handleClearRecents: () => handleClearRecentsRef.current?.(),
    handleClearCache: () => handleClearCacheRef.current?.(),
    toggleHomeCollection: (colName) => toggleHomeCollectionRef.current?.(colName),
    autoScaleRef,
    handleNavRef,
    t,
    COLS,
    GAME_COLS,
    TABS,
    ACCENTS,
    GITHUB_REPO,
  });
  const surfaceStyle = settings.surface_style ?? "glass";
  const glassEnabled = surfaceStyle !== "clear";
  const isMaterial = surfaceStyle === "material";
  const appPaused = !!launchingApp || !windowFocused;
  const cinematicLight = settings.cinematic_home && !isDark;
  const isWash = resolvedTheme === "wash";
  const {
    materialTokens,
    surface,
    glass,
    glassBar,
    settingsRowGlass,
    appBg,
    bgGlow1,
    bgGlow2,
    cardBackdropFilter,
    materialFocusShadow,
    materialRaisedShadow,
  } = useSurfaceTheme({
    resolvedTheme,
    surfaceStyle,
    glassEnabled,
    isDark,
    isWash,
    cinematicLight,
    accent,
  });
  const activeTextColor = isDark
    ? (accent.darkText ? "rgba(20, 14, 10, 0.90)" : "white")
    : (accent.lightDarkText ? "rgba(20, 14, 10, 0.90)" : "white");
  const toggleHomeCollection = (colName) => {
    setHomeHiddenCollections(prev => {
      const next = prev.includes(colName) ? prev.filter(n => n !== colName) : [...prev, colName];
      localStorage.setItem("homeHiddenCollections", JSON.stringify(next));
      return next;
    });
  };
  toggleHomeCollectionRef.current = toggleHomeCollection;

  // ── Search helpers ────────────────────────────────────────────
  const searchResults = searchQuery.trim().length === 0
    ? []
    : apps.filter(a => a.name.toLowerCase().includes(searchQuery.trim().toLowerCase()));

  // FIX 3: scroll focused search result into view when index or mode changes
  useEffect(() => {
    if (searchMode === "results" && searchFocusedCardRef.current) {
      searchFocusedCardRef.current.style.scrollMarginTop    = "12px";
      searchFocusedCardRef.current.style.scrollMarginBottom = "80px";
      searchFocusedCardRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [searchFocusIndex, searchMode]);
  // ─────────────────────────────────────────────────────────────


  useEffect(() => {
    if (tab !== "Settings") return;
    if (settingsFocusedRef.current) {
      settingsFocusedRef.current.style.scrollMarginTop    = "80px";
      settingsFocusedRef.current.style.scrollMarginBottom = "80px";
      settingsFocusedRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [settingsFocusIndex, tab]);

  // Global styles
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "app-global-styles";
    style.textContent = [
      "@keyframes appFadeIn     { from { opacity: 0; } to { opacity: 1; } }",
      "@keyframes heroArtFade   { from { opacity: 0; transform: scale(1.03); } to { opacity: 1; transform: scale(1); } }",
      "@keyframes spin          { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }",
      "@keyframes bgStarTwinkle { 0%, 100% { opacity: 0.08; transform: scale(1); } 50% { opacity: 0.35; transform: scale(1.2); } }",
      "@keyframes cloudDrift    { from { transform: translateX(110vw); } to { transform: translateX(-110vw); } }",
      "@keyframes plasmaFlow    { 0% { transform: translate3d(-4%, -2%, 0) rotate(-8deg) scale(1.04); } 50% { transform: translate3d(4%, 2%, 0) rotate(7deg) scale(1.10); } 100% { transform: translate3d(-4%, -2%, 0) rotate(-8deg) scale(1.04); } }",
      "@keyframes plasmaPulse   { 0%, 100% { opacity: 0.48; filter: saturate(1.15); } 50% { opacity: 0.68; filter: saturate(1.35); } }",
      "@keyframes plasmaSpark   { 0%, 100% { opacity: 0.12; transform: translate3d(0, 0, 0) scale(0.9); } 50% { opacity: 0.42; transform: translate3d(8px, -14px, 0) scale(1.12); } }",
      "@keyframes cinderDrift   { 0% { transform: translate3d(0, 8vh, 0) scale(0.8); opacity: 0; } 18% { opacity: 0.28; } 42% { opacity: 0.62; } 76% { opacity: 0.30; } 100% { transform: translate3d(var(--cinder-drift-x, 10px), -106vh, 0) scale(0.92); opacity: 0; } }",
      "@keyframes cinderFlicker { 0%, 100% { filter: brightness(0.8); } 35% { filter: brightness(1.35); } 58% { filter: brightness(0.95); } 78% { filter: brightness(1.65); } }",
      "@keyframes cinderBreathe { 0%, 100% { opacity: 0.54; transform: scale(1); } 50% { opacity: 0.74; transform: scale(1.035); } }",
      "@keyframes washW1 { 0%,100% { transform: translate3d(-4%,-2%,0) scale(1.0) rotate(-2deg); } 50% { transform: translate3d(3%,2%,0) scale(1.06) rotate(2deg); } }",
      "@keyframes washW2 { 0%,100% { transform: translate3d(3%,-3%,0) scale(0.98) rotate(2deg); } 50% { transform: translate3d(-3%,2%,0) scale(1.05) rotate(-2deg); } }",
      "@keyframes washW3 { 0%,100% { transform: translate3d(-3%,3%,0) scale(0.97) rotate(-3deg); } 50% { transform: translate3d(4%,-2%,0) scale(1.04) rotate(2deg); } }",
      "@keyframes washC1 { 0%,100% { transform: translate3d(3%,2%,0) scale(1.0); } 50% { transform: translate3d(-2%,-3%,0) scale(1.05); } }",
      "@keyframes washC2 { 0%,100% { transform: translate3d(-2%,-3%,0) scale(0.98); } 50% { transform: translate3d(3%,2%,0) scale(1.05); } }",
      "@keyframes washMix  { 0%,100% { transform: translate3d(-3%,2%,0) scale(0.98); } 50% { transform: translate3d(3%,-2%,0) scale(1.06); } }",
      "@keyframes washB1   { 0%,100% { transform: translate3d(3%,-2%,0) scale(0.99); } 50% { transform: translate3d(-3%,3%,0) scale(1.04); } }",
      "@keyframes washB2   { 0%,100% { transform: translate3d(-2%,3%,0) scale(1.0); } 50% { transform: translate3d(3%,-2%,0) scale(1.05); } }",
      "@keyframes washPink { 0%,100% { transform: translate3d(-2%,-3%,0) scale(1.0); } 50% { transform: translate3d(3%,2%,0) scale(1.06); } }",
      "@keyframes washOpacity { 0%,100% { opacity: 0.95; } 28% { opacity: 1.0; } 62% { opacity: 0.90; } }",
      "@keyframes colChevronBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(4px); } }",
      ".bg-star  { position: fixed; border-radius: 50%; pointer-events: none; z-index: 0; animation: bgStarTwinkle ease-in-out infinite; }",
      ".bg-cloud { position: fixed; top: 0; pointer-events: none; z-index: -1; animation: cloudDrift linear infinite; }",
      ".theme-plasma-layer { animation: plasmaFlow 28s ease-in-out infinite, plasmaPulse 9s ease-in-out infinite; will-change: transform, opacity; }",
      ".theme-plasma-spark { animation: plasmaSpark ease-in-out infinite; will-change: transform, opacity; }",
      ".theme-cinder-layer { animation: cinderBreathe 16s ease-in-out infinite; will-change: transform, opacity; }",
      ".theme-cinder-particle { position: fixed; border-radius: 999px; pointer-events: none; animation-name: cinderDrift, cinderFlicker; animation-timing-function: linear, ease-in-out; animation-iteration-count: infinite, infinite; will-change: transform, opacity, filter; }",
      ".theme-wash-layer { will-change: transform, opacity; contain: paint; backface-visibility: hidden; transform: translateZ(0); }",
      ".theme-wash-w1 { animation: washW1 22s ease-in-out infinite, washOpacity 24s ease-in-out infinite; }",
      ".theme-wash-w2 { animation: washW2 20s ease-in-out infinite, washOpacity 26s ease-in-out infinite; animation-delay: -8s, -4s; }",
      ".theme-wash-w3 { animation: washW3 28s ease-in-out infinite, washOpacity 22s ease-in-out infinite; animation-delay: -14s, -10s; }",
      ".theme-wash-c1 { animation: washC1 24s ease-in-out infinite, washOpacity 28s ease-in-out infinite; animation-delay: -6s, -18s; }",
      ".theme-wash-c2     { animation: washC2  21s ease-in-out infinite, washOpacity 25s ease-in-out infinite; animation-delay: -12s, -7s; }",
      ".theme-wash-mix    { animation: washMix 28s ease-in-out infinite, washOpacity 26s ease-in-out infinite; animation-delay: -18s, -16s; }",
      ".theme-wash-bleed1 { animation: washB1  26s ease-in-out infinite, washOpacity 24s ease-in-out infinite; animation-delay: -8s, -14s; }",
      ".theme-wash-bleed2 { animation: washB2  23s ease-in-out infinite, washOpacity 27s ease-in-out infinite; animation-delay: -16s, -7s; }",
      ".theme-wash-pink { animation: washPink 22s ease-in-out infinite, washOpacity 26s ease-in-out infinite; animation-delay: -9s, -3s; }",
      "@keyframes auroraB1 { 0%,100%{transform:translate(0,0) scaleX(1)} 40%{transform:translate(6%,-4%) scaleX(1.08)} 70%{transform:translate(-4%,3%) scaleX(0.94)} }",
      "@keyframes auroraB2 { 0%,100%{transform:translate(0,0) scaleX(1)} 35%{transform:translate(-8%,5%) scaleX(0.92)} 68%{transform:translate(5%,-3%) scaleX(1.07)} }",
      "@keyframes auroraB3 { 0%,100%{transform:translate(0,0) scaleX(1)} 30%{transform:translate(4%,6%) scaleX(1.1)} 65%{transform:translate(-6%,-2%) scaleX(0.96)} }",
      "@keyframes auroraB4 { 0%,100%{transform:translate(0,0) scaleX(1)} 45%{transform:translate(7%,-5%) scaleX(0.9)} 75%{transform:translate(-3%,4%) scaleX(1.06)} }",
      "@keyframes auroraFade { 0%,100%{opacity:0.55} 50%{opacity:0.82} }",
      "@keyframes auroraShimmer { 0%,100%{opacity:0.07} 50%{opacity:0.16} }",
      ".theme-aurora-band { will-change:transform,opacity; contain:paint; backface-visibility:hidden; transform:translateZ(0); }",
      ".theme-aurora-b1 { animation:auroraB1 18s ease-in-out infinite, auroraFade 20s ease-in-out infinite; }",
      ".theme-aurora-b2 { animation:auroraB2 22s ease-in-out infinite, auroraFade 24s ease-in-out infinite; animation-delay:-7s,-5s; }",
      ".theme-aurora-b3 { animation:auroraB3 26s ease-in-out infinite, auroraFade 22s ease-in-out infinite; animation-delay:-13s,-9s; }",
      ".theme-aurora-b4 { animation:auroraB4 20s ease-in-out infinite, auroraFade 26s ease-in-out infinite; animation-delay:-4s,-16s; }",
      ".theme-aurora-shimmer { animation:auroraShimmer 8s ease-in-out infinite; animation-delay:-3s; }",
      "@keyframes synthSunGlow { 0%,100%{opacity:0.72} 50%{opacity:1} }",
      "@keyframes synthHorizonShim { 0%,100%{opacity:0.55} 50%{opacity:0.92} }",
      ".theme-synthwave-sun { animation:synthSunGlow 6s ease-in-out infinite; will-change:opacity; }",
      ".theme-synthwave-horizon { animation:synthHorizonShim 7s ease-in-out infinite; }",
      "@keyframes cyberNeonPulse { 0%,100%{opacity:0.52} 50%{opacity:0.82} }",
      "@keyframes cyberNeonFlicker { 0%,84%,100%{opacity:1} 85%,87%{opacity:0.2} 91%,93%{opacity:0.65} }",
      "@keyframes cyberScanSweep { 0% { top: -2px; opacity:0.9; } 85% { opacity:0.7; } 100% { top: 100vh; opacity:0; } }",
      "@keyframes cyberGlitchSpark { 0%,100%{opacity:0;transform:scaleX(0)} 6%{opacity:0.9;transform:scaleX(1)} 11%{opacity:0.4;transform:scaleX(0.5)} 15%{opacity:0.8;transform:scaleX(0.8)} 22%,100%{opacity:0;transform:scaleX(0)} }",
      "@keyframes cyberHexPulse { 0%,100%{opacity:0.08} 50%{opacity:0.26} }",
      "@keyframes cyberHudFade  { 0%,100%{opacity:0.20} 50%{opacity:0.55} }",
      ".theme-cyberpunk-glow { animation:cyberNeonPulse 7s ease-in-out infinite; }",
      ".theme-cyberpunk-glow-2 { animation:cyberNeonPulse 9s ease-in-out infinite; animation-delay:-4s; }",
      ".theme-cyberpunk-horizon { animation:cyberNeonPulse 5s ease-in-out infinite; }",
      ".theme-cyberpunk-flicker-1 { animation:cyberNeonFlicker 4s ease-in-out infinite; }",
      ".theme-cyberpunk-flicker-2 { animation:cyberNeonFlicker 5.5s ease-in-out infinite; animation-delay:-2s; }",
      ".theme-cyberpunk-scan { animation:cyberScanSweep 9s linear infinite; }",
      ".theme-cyberpunk-hex-0 { animation:cyberHexPulse 14s ease-in-out infinite; }",
      ".theme-cyberpunk-hex-1 { animation:cyberHexPulse 19s ease-in-out infinite; animation-delay:-5s; }",
      ".theme-cyberpunk-hex-2 { animation:cyberHexPulse 23s ease-in-out infinite; animation-delay:-9s; }",
      ".theme-cyberpunk-hex-3 { animation:cyberHexPulse 17s ease-in-out infinite; animation-delay:-13s; }",
      ".theme-cyberpunk-hud-0 { animation:cyberHudFade 13s ease-in-out infinite; }",
      ".theme-cyberpunk-hud-1 { animation:cyberHudFade 13s ease-in-out infinite; animation-delay:-2.5s; }",
      ".theme-cyberpunk-hud-2 { animation:cyberHudFade 13s ease-in-out infinite; animation-delay:-5s; }",
      ".theme-cyberpunk-hud-3 { animation:cyberHudFade 13s ease-in-out infinite; animation-delay:-7.5s; }",
      ".theme-cyberpunk-hud-4 { animation:cyberHudFade 13s ease-in-out infinite; animation-delay:-10s; }",
      ".theme-cyberpunk-rain { position:fixed; z-index:2; pointer-events:none; transform-origin:left center; animation-name:cyberGlitchSpark; animation-timing-function:ease-in-out; animation-iteration-count:infinite; }",
      "@keyframes forestMoonBeam { 0%,100%{opacity:0.55} 50%{opacity:0.72} }",
      "@keyframes forestFogDrift { 0%,100%{transform:translateX(0)} 50%{transform:translateX(2%)} }",
      "@keyframes forestFireflyDrift { 0%{transform:translate(0,0)} 25%{transform:translate(14px,-10px)} 50%{transform:translate(6px,-22px)} 75%{transform:translate(-8px,-14px)} 100%{transform:translate(0,0)} }",
      "@keyframes forestFireflyGlow { 0%,100%{opacity:0.12;transform:scale(1)} 50%{opacity:1;transform:scale(1.7)} }",
      ".theme-forest-moonbeam { animation:forestMoonBeam 12s ease-in-out infinite; }",
      ".theme-forest-fog { animation:forestFogDrift 20s ease-in-out infinite; }",
      ".theme-forest-fog-2 { animation:forestFogDrift 28s ease-in-out infinite; animation-delay:-10s; }",
      ".theme-forest-firefly { position:fixed; border-radius:50%; pointer-events:none; animation-name:forestFireflyDrift,forestFireflyGlow; animation-timing-function:ease-in-out,ease-in-out; animation-iteration-count:infinite,infinite; will-change:transform,opacity; }",
      "@keyframes webGhostFloat0 { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-6px)} }",
      "@keyframes webGhostFloat1 { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-5px)} }",
      "@keyframes webGhostFloat2 { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-7px)} }",
      "@keyframes webGhostFloat3 { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-4px)} }",
      "@keyframes webWinFlicker0 { 0%,88%,100%{opacity:0.55} 89%,91%{opacity:0.16} }",
      "@keyframes webWinFlicker1 { 0%,93%,100%{opacity:0.42} 94%,96%{opacity:0.11} }",
      "@keyframes webWinFlicker2 { 0%,95%,100%{opacity:0.48} 96%,98%{opacity:0.14} }",
      "@keyframes webWinFlicker3 { 0%,82%,100%{opacity:0.38} 83%,85%{opacity:0.09} }",
      "@keyframes webCursorBlink { 0%,49%{opacity:1} 50%,100%{opacity:0} }",
      ".theme-webcore-ghost-0 { animation:webGhostFloat0 16s ease-in-out infinite, webWinFlicker0 22s ease-in-out infinite; }",
      ".theme-webcore-ghost-1 { animation:webGhostFloat1 19s ease-in-out infinite, webWinFlicker1 28s ease-in-out infinite; animation-delay:-4s; }",
      ".theme-webcore-ghost-2 { animation:webGhostFloat2 22s ease-in-out infinite, webWinFlicker2 24s ease-in-out infinite; animation-delay:-8s; }",
      ".theme-webcore-ghost-3 { animation:webGhostFloat3 25s ease-in-out infinite, webWinFlicker3 30s ease-in-out infinite; animation-delay:-12s; }",
      ".theme-webcore-cursor { animation:webCursorBlink 1.1s step-end infinite; }",
      ".app-launch-paused *:not(.launch-overlay):not(.launch-overlay *) { animation-play-state: paused !important; transition-property: none !important; }",
      "@media (prefers-reduced-motion: reduce) { .theme-plasma-layer, .theme-plasma-spark, .theme-cinder-layer, .theme-cinder-particle, .theme-wash-w1, .theme-wash-w2, .theme-wash-w3, .theme-wash-c1, .theme-wash-c2, .theme-wash-mix, .theme-wash-bleed1, .theme-wash-bleed2, .theme-wash-pink, .theme-aurora-b1, .theme-aurora-b2, .theme-aurora-b3, .theme-aurora-b4, .theme-aurora-shimmer, .theme-synthwave-sun, .theme-synthwave-horizon, .theme-cyberpunk-glow, .theme-cyberpunk-glow-2, .theme-cyberpunk-horizon, .theme-cyberpunk-flicker-1, .theme-cyberpunk-flicker-2, .theme-cyberpunk-scan, .theme-cyberpunk-rain, .theme-forest-moonbeam, .theme-forest-fog, .theme-forest-fog-2, .theme-forest-firefly, .theme-webcore-ghost-0, .theme-webcore-ghost-1, .theme-webcore-ghost-2, .theme-webcore-ghost-3, .theme-webcore-cursor, .bg-star, .bg-cloud { animation-duration: 1ms !important; animation-iteration-count: 1 !important; } }",
      "html, body { overflow-x: hidden; }",
      "* { scrollbar-width: none !important; -ms-overflow-style: none !important; }",
      "*::-webkit-scrollbar { display: none !important; }",
    ].join("\n");
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  // Auto-detect controller platform on gamepad connect
  useEffect(() => {
    const handleConnected = (e) => {
      if (!(settingsRef.current?.gamepad_auto_detect ?? true)) return;
      const platform = detectPlatform(e.gamepad.id);
      if (platform) {
        updateSetting("gamepad_platform", platform);
      }
    };
    window.addEventListener("gamepadconnected", handleConnected);
    return () => window.removeEventListener("gamepadconnected", handleConnected);
  }, []);

  useEffect(() => {
    const activeTheme = normalizeThemeKey(settings.theme);
    const particleSelector = ".bg-star, .bg-cloud, .theme-plasma-spark, .theme-cinder-particle, .theme-cyberpunk-rain, .theme-forest-firefly, .theme-forest-firefly-wrapper";
    document.querySelectorAll(particleSelector).forEach(s => s.remove());
    if (!settings.stars_enabled) return;
    if (activeTheme === "space") {
      for (let i = 0; i < 60; i++) {
        const star = document.createElement("div");
        star.className = "bg-star";
        const size = (Math.random() * 2 + 0.5) + "px";
        star.style.width = star.style.height = size;
        star.style.left  = Math.random() * 100 + "vw";
        star.style.top   = Math.random() * 100 + "vh";
        star.style.animationDuration = (Math.random() * 4 + 2) + "s";
        star.style.animationDelay    = (Math.random() * 4) + "s";
        star.style.background = "rgba(245,237,232,0.9)";
        const sc = document.getElementById("star-container"); if (sc) sc.appendChild(star);
      }
    } else if (activeTheme === "sky") {
      CLOUD_CONFIGS.forEach((cfg) => {
        const div = document.createElement("div");
        div.className = "bg-cloud";
        div.style.top             = cfg.top;
        div.style.width           = cfg.width + "px";
        div.style.opacity         = cfg.opacity;
        div.style.animationDuration = cfg.duration + "s";
        div.style.animationDelay    = cfg.delay + "s";
        div.innerHTML = CLOUD_SHAPES[cfg.shape];
        div.querySelector("svg").style.fill = "rgba(255,255,255,0.9)";
        const cc = document.getElementById("cloud-container"); if (cc) cc.appendChild(div);
      });
    } else if (activeTheme === "plasma") {
      for (let i = 0; i < 22; i++) {
        const spark = document.createElement("div");
        spark.className = "theme-plasma-spark";
        const size = (Math.random() * 3 + 1.2) + "px";
        spark.style.position = "fixed";
        spark.style.borderRadius = "999px";
        spark.style.pointerEvents = "none";
        spark.style.width = spark.style.height = size;
        spark.style.left = Math.random() * 100 + "vw";
        spark.style.top = Math.random() * 100 + "vh";
        spark.style.background = accent.primary;
        spark.style.boxShadow = `0 0 ${Math.random() * 10 + 8}px ${accent.light}`;
        spark.style.animationDuration = (Math.random() * 7 + 6) + "s";
        spark.style.animationDelay = -(Math.random() * 8) + "s";
        const pc = document.getElementById("plasma-particle-container"); if (pc) pc.appendChild(spark);
      }
    } else if (activeTheme === "cinder") {
      for (let i = 0; i < 42; i++) {
        const cinder = document.createElement("div");
        cinder.className = "theme-cinder-particle";
        const bright = Math.random() > 0.82;
        const size = bright ? Math.random() * 3.2 + 2.2 : Math.random() * 2.4 + 1.1;
        const drift = (Math.random() * 24 - 12).toFixed(1);
        const duration = Math.random() * 6 + 4;
        const flickerDuration = Math.random() * 1.8 + 1.2;
        cinder.style.setProperty("--cinder-drift-x", `${drift}px`);
        cinder.style.width = `${size}px`;
        cinder.style.height = `${size * (Math.random() * 1.15 + 0.85)}px`;
        cinder.style.left = Math.random() * 100 + "vw";
        cinder.style.bottom = "-8vh";
        cinder.style.background = bright
          ? `color-mix(in srgb, ${accent.primary} 18%, #ffd6a3 82%)`
          : `color-mix(in srgb, ${accent.primary} 12%, #ff6a2b 88%)`;
        cinder.style.boxShadow = bright
          ? `0 0 ${Math.random() * 14 + 12}px color-mix(in srgb, ${accent.primary} 20%, #ffd6a3 80%)`
          : `0 0 ${Math.random() * 9 + 7}px color-mix(in srgb, ${accent.primary} 14%, #ff6a2b 86%)`;
        cinder.style.animationDuration = `${duration}s, ${flickerDuration}s`;
        cinder.style.animationDelay = `-${Math.random() * duration}s, -${Math.random() * flickerDuration}s`;
        const cc = document.getElementById("cinder-particle-container"); if (cc) cc.appendChild(cinder);
      }
    } else if (activeTheme === "aurora") {
      const container = document.getElementById("aurora-star-container");
      if (container) {
        for (let i = 0; i < 25; i++) {
          const star = document.createElement("div");
          star.className = "bg-star";
          const size = (Math.random() * 1.4 + 0.5) + "px";
          star.style.width = star.style.height = size;
          star.style.left = Math.random() * 100 + "vw";
          star.style.top = Math.random() * 62 + "vh";
          star.style.background = `rgba(${200 + Math.floor(Math.random() * 55)},${220 + Math.floor(Math.random() * 35)},255,${(0.5 + Math.random() * 0.45).toFixed(2)})`;
          star.style.animationDuration = (Math.random() * 4 + 3) + "s";
          star.style.animationDelay = -(Math.random() * 5) + "s";
          container.appendChild(star);
        }
      }
    } else if (activeTheme === "synthwave") {
      const container = document.getElementById("synthwave-star-container");
      if (container) {
        for (let i = 0; i < 30; i++) {
          const star = document.createElement("div");
          star.className = "bg-star";
          const pink = Math.random() > 0.5;
          const size = (Math.random() * 1.6 + 0.4) + "px";
          star.style.width = star.style.height = size;
          star.style.left = Math.random() * 100 + "vw";
          star.style.top = Math.random() * 48 + "vh";
          star.style.background = pink
            ? `rgba(255,${100 + Math.floor(Math.random() * 80)},${180 + Math.floor(Math.random() * 75)},${(0.55 + Math.random() * 0.38).toFixed(2)})`
            : `rgba(${80 + Math.floor(Math.random() * 60)},${200 + Math.floor(Math.random() * 55)},255,${(0.50 + Math.random() * 0.40).toFixed(2)})`;
          star.style.animationDuration = (Math.random() * 3 + 2) + "s";
          star.style.animationDelay = -(Math.random() * 5) + "s";
          container.appendChild(star);
        }
      }
    } else if (activeTheme === "cyberpunk") {
      const container = document.getElementById("cyberpunk-rain-container");
      if (container) {
        for (let i = 0; i < 20; i++) {
          const spark = document.createElement("div");
          spark.className = "theme-cyberpunk-rain";
          spark.style.width = `${20 + Math.random() * 90}px`;
          spark.style.height = "1px";
          spark.style.left = `${Math.random() * 94}vw`;
          spark.style.top = `${Math.random() * 90}vh`;
          const usePrimary = Math.random() > 0.45;
          spark.style.background = usePrimary
            ? `color-mix(in srgb, ${accent.primary} 70%, rgba(0,229,255,1) 30%)`
            : "rgba(0,229,255,0.9)";
          spark.style.boxShadow = usePrimary
            ? `0 0 6px ${accent.primary}`
            : "0 0 6px rgba(0,229,255,0.7)";
          spark.style.animationDuration = `${4 + Math.random() * 9}s`;
          spark.style.animationDelay = `-${Math.random() * 12}s`;
          container.appendChild(spark);
        }
      }
    } else if (activeTheme === "forest") {
      const container = document.getElementById("forest-particle-container");
      if (container) {
        const ffColor = `color-mix(in srgb, ${accent.primary} 55%, #d4ff80 45%)`;
        for (let i = 0; i < 14; i++) {
          const wrapper = document.createElement("div");
          wrapper.className = "theme-forest-firefly-wrapper";
          wrapper.style.cssText = `position:fixed;pointer-events:none;left:${(8 + Math.random() * 82).toFixed(1)}vw;top:${(30 + Math.random() * 50).toFixed(1)}vh;animation:forestFireflyDrift ${(6 + Math.random() * 8).toFixed(1)}s ease-in-out infinite;animation-delay:-${(Math.random() * 10).toFixed(1)}s;`;
          const glow = document.createElement("div");
          const size = (2 + Math.random() * 2).toFixed(1);
          glow.className = "theme-forest-firefly";
          glow.style.width = size + "px";
          glow.style.height = size + "px";
          glow.style.background = ffColor;
          glow.style.boxShadow = `0 0 ${(4 + Math.random() * 8).toFixed(0)}px 2px ${ffColor}`;
          glow.style.animationDuration = `${(1.5 + Math.random() * 2.4).toFixed(1)}s, ${(1.5 + Math.random() * 2.4).toFixed(1)}s`;
          glow.style.animationDelay = `-${(Math.random() * 3).toFixed(1)}s, -${(Math.random() * 3).toFixed(1)}s`;
          wrapper.appendChild(glow);
          container.appendChild(wrapper);
        }
        for (let i = 0; i < 18; i++) {
          const star = document.createElement("div");
          star.className = "bg-star";
          const size = (0.6 + Math.random() * 1.0) + "px";
          star.style.width = star.style.height = size;
          star.style.left = Math.random() * 100 + "vw";
          star.style.top = Math.random() * 45 + "vh";
          star.style.background = `rgba(200,240,215,${(0.4 + Math.random() * 0.5).toFixed(2)})`;
          star.style.animationDuration = (3 + Math.random() * 4) + "s";
          star.style.animationDelay = -(Math.random() * 5) + "s";
          container.appendChild(star);
        }
      }
    }
    return () => document.querySelectorAll(particleSelector).forEach(s => s.remove());
  }, [settings.stars_enabled, settings.theme, settings.accent, loading, accent.primary, accent.light]);

  // Prevent the root scroller from accumulating scroll offset. At scale > 1 Chromium's
  // scrollIntoView (called by gamepad focus) can climb past the inner tabScrollRef and
  // scroll the root instead, shifting the tab content area up behind the sticky header.
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const reset = () => { if (el.scrollTop !== 0) el.scrollTop = 0; };
    el.addEventListener("scroll", reset, { passive: true });
    return () => el.removeEventListener("scroll", reset);
  }, []);

  useEffect(() => {
    loadCustomArt();
  }, []);
  const handleClearCache = async () => {
    setCacheClearLoading(true);
    setCacheClearStatus({ line1: t('cache.clearing'), line2: t('cache.removingFiles') });
    await invoke("clear_art_cache");
    clearGameArt();
    const games = appsRef.current.filter(a => a.app_type === "game");
    setCacheClearStatus({ line1: t('cache.downloadingArtwork'), line2: t('cache.startingDownload', { count: games.length }) });
    await fetchGameArt(games, (done, total, lastName) => {
      setCacheClearStatus({ line1: t('cache.downloadingArtwork'), line2: t('cache.progress', { name: lastName ? `${lastName} — ` : "", done, total }) });
    });
    setCacheClearLoading(false);
  };
  handleClearCacheRef.current = handleClearCache;

  const handleClearRecents = async () => {
    setCacheClearLoading(true);
    setCacheClearStatus({ line1: t('cache.clearingRecents'), line2: t('cache.removingRecents') });
    try {
      await Promise.all([
        invoke("clear_recents"),
        new Promise(resolve => window.setTimeout(resolve, 450)),
      ]);
      setRecent([]);
      recentRef.current = [];
      setRecentGames([]);
      recentGamesRef.current = [];
      setHeroIndex(0);
      heroIndexRef.current = 0;
    } finally {
      setCacheClearLoading(false);
    }
  };
  handleClearRecentsRef.current = handleClearRecents;

  const filteredApps = apps.filter((a) => {
    if (tab === "Games") {
      if (a.app_type !== "game") return false;
      if (gameSourceTab === "Steam") return a.source === "steam";
      if (gameSourceTab === "Xbox")  return a.source === "xbox";
      if (gameSourceTab === "Battle.net")  return a.source === "battlenet";
      if (gameSourceTab === "Other") return a.source !== "steam" && a.source !== "xbox" && a.source !== "battlenet" && !customSources.includes(a.source);
      if (customSources.includes(gameSourceTab)) return a.source === gameSourceTab;
      const gameCol = gameCollections.find(c => c.name === gameSourceTab);
      if (gameCol) return (gameMemberships[a.id] || []).includes(gameCol.id);
      return true; // "All"
    }
    if (tab === "Apps") {
      if (a.app_type !== "app") return false;
      if (appCollectionTab === "All") return true;
      const col = appCollections.find(c => c.name === appCollectionTab);
      if (!col) return true;
      return (appMemberships[a.id] || []).includes(col.id);
    }
    return true;
  });
  const filteredRecent = recent.filter(a =>
    tab === "Home" ? true : tab === "Games" ? a.app_type === "game" : a.app_type === "app"
  ).slice(0, 8);

  // Pinned apps reactive (for render)
  const pinnedAppsReactive = (tab === "Apps" && appCollectionTab !== "All") ? [] : pins
    .map(id => apps.find(a => a.id === id))
    .filter(Boolean)
    .filter(a => tab === "Home" ? true : tab === "Games" ? a.app_type === "game" : a.app_type === "app");

  const effectiveGameCols = Math.max(2, Math.round(GAME_COLS / (settings.game_cover_scale ?? 1.0)));
  const effectiveAppCols  = Math.max(2, Math.round(COLS / (settings.app_cover_scale ?? 1.0)));
  const currentCols = tab === "Games" ? effectiveGameCols : effectiveAppCols;

  useEffect(() => {
    if (tab === "Settings") return;
    const visiblePinnedAboveGrid = tab !== "Home"
      && !(tab === "Games" && gameSourceTabRef.current !== "All")
      && !(tab === "Apps" && appCollectionTabRef.current !== "All")
      && pinsRef.current
        .map(id => appsRef.current.find(a => a.id === id))
        .filter(Boolean)
        .some(a => tab === "Games" ? a.app_type === "game" : a.app_type === "app");
    const scrollToTop = (behavior = "smooth") => {
      const scroller = tab === "Home" ? homeScrollRef.current : tabScrollRef.current;
      if (scroller) scroller.scrollTo({ top: 0, behavior });
      if (tab === "Home" && outerRef.current) outerRef.current.scrollTo({ top: 0, behavior });
    };
    const scrollFocusedCardIntoView = () => {
      const scroller = tab === "Home" ? homeScrollRef.current : tabScrollRef.current;
      const card = focusedCardRef.current;
      if (!scroller || !card) return;
      const scale = settings.ui_scale ?? 1;
      const sr = scroller.getBoundingClientRect();
      const cr = card.getBoundingClientRect();
      const topClearance = 100;
      const bottomClearance = 80;
      let cardTop = (cr.top - sr.top) / scale;
      let cardBottom = (cr.bottom - sr.top) / scale;
      let layoutTop = 0;
      let node = card;
      while (node && node !== scroller && node instanceof HTMLElement) {
        layoutTop += node.offsetTop;
        node = node.offsetParent;
      }
      if (node === scroller) {
        cardTop = layoutTop - scroller.scrollTop;
        cardBottom = cardTop + card.offsetHeight;
      }
      const visH = scroller.clientHeight;
      let newTop = scroller.scrollTop;
      if (cardTop < topClearance) {
        newTop = scroller.scrollTop + cardTop - topClearance;
      } else if (cardBottom > visH - bottomClearance) {
        newTop = scroller.scrollTop + cardBottom - (visH - bottomClearance);
      }
      scroller.scrollTo({ top: Math.max(0, newTop), behavior: "smooth" });
    };
    const scrollFocusedCardHorizontally = (container, resetWhenFirst = false) => {
      const card = focusedCardRef.current;
      if (!container || !card) return;
      if (resetWhenFirst && focusIndex === 0) {
        container.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }
      const scale = settings.ui_scale ?? 1;
      const sr = container.getBoundingClientRect();
      const cr = card.getBoundingClientRect();
      const edgePad = 18;
      const cardLeft = (cr.left - sr.left) / scale;
      const cardRight = (cr.right - sr.left) / scale;
      let newLeft = container.scrollLeft;
      if (cardLeft < edgePad) {
        newLeft = container.scrollLeft + cardLeft - edgePad;
      } else if (cardRight > container.clientWidth - edgePad) {
        newLeft = container.scrollLeft + cardRight - (container.clientWidth - edgePad);
      }
      container.scrollTo({ left: Math.max(0, newLeft), behavior: "smooth" });
    };
    if (focusSection === "hero") {
      setTimeout(scrollToTop, 50);
    } else if (focusSection === "recent") {
      if (settingsRef.current?.cinematic_home) {
        setTimeout(() => {
          if (drawerScrollRef.current) drawerScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
          scrollFocusedCardHorizontally(recentShelfRef.current, true);
        }, 50);
      } else {
        setTimeout(() => {
          scrollFocusedCardIntoView();
          scrollFocusedCardHorizontally(recentShelfRef.current, true);
        }, 50);
      }
    } else if (focusSection === "home_collections") {
      if (focusedRowRef.current) {
        if (drawerScrollRef.current) {
          const drawerRect = drawerScrollRef.current.getBoundingClientRect();
          const rowRect = focusedRowRef.current.getBoundingClientRect();
          const scrollTarget = drawerScrollRef.current.scrollTop + rowRect.top - drawerRect.top - 16;
          drawerScrollRef.current.scrollTo({ top: scrollTarget, behavior: "smooth" });
          if (focusedCardRef.current) {
            focusedCardRef.current.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
          }
        } else {
          focusedRowRef.current.style.scrollMarginTop    = "120px";
          focusedRowRef.current.style.scrollMarginBottom = "80px";
          focusedRowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }
    } else if (focusSection === "pinned") {
      setTimeout(scrollToTop, 50);
      // On Home tab, pinned is a horizontal pill shelf — scroll focused pill into view horizontally
      if (tab === "Home") {
        setTimeout(() => {
          if (focusIndex === 0 && pinnedShelfRef.current) {
            pinnedShelfRef.current.scrollTo({ left: 0, behavior: "smooth" });
          } else if (focusedCardRef.current) {
            if (outerRef.current) outerRef.current.style.overflowY = "hidden";
            focusedCardRef.current.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
            if (outerRef.current) { outerRef.current.style.overflowY = ""; outerRef.current.scrollTop = 0; }
          }
        }, 80);
      }
    } else if (focusSection === "grid" && focusIndex < currentCols) {
      if (visiblePinnedAboveGrid && focusedCardRef.current) {
        scrollFocusedCardIntoView();
      } else {
        const scroller = tab === "Home" ? homeScrollRef.current : tabScrollRef.current;
        if (scroller) scroller.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else if (focusedCardRef.current) {
      scrollFocusedCardIntoView();
    }
  }, [focusSection, focusIndex, homeColFocusRow, tab, gameSourceTab, appCollectionTab, pins, apps, settings.ui_scale]);


  // Block ALL click/mousedown events while modal is open — gamepad A button fires
  // synthetic browser clicks on focused elements, which bypasses our gamepad guards
  useEffect(() => {
    const block = (e) => {
      if (!showHideModalRef.current) return;
      // Allow clicks that originate inside the modal overlay
      if (e.target?.closest?.("[data-modal-overlay]")) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };
    window.addEventListener("click",       block, true);
    window.addEventListener("dblclick",    block, true);
    window.addEventListener("mousedown",   block, true);
    window.addEventListener("mouseup",     block, true);
    window.addEventListener("pointerdown", block, true);
    window.addEventListener("pointerup",   block, true);
    return () => {
      window.removeEventListener("click",       block, true);
      window.removeEventListener("dblclick",    block, true);
      window.removeEventListener("mousedown",   block, true);
      window.removeEventListener("mouseup",     block, true);
      window.removeEventListener("pointerdown", block, true);
      window.removeEventListener("pointerup",   block, true);
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      // Modal has its own capture-phase keyboard handler — don't double-fire
      if (showHideModalRef.current || showLibraryActionsRef.current || showFileBrowserRef.current || pendingFileRef.current) return;
      if (e.key === "Escape") {
        e.preventDefault();
        if (searchOpenRef.current) {
          const mode = searchModeRef.current;
          if (mode === "keyboard") {
            const results = appsRef.current.filter(a =>
              searchQueryRef.current.trim().length > 0 &&
              a.name.toLowerCase().includes(searchQueryRef.current.trim().toLowerCase())
            );
            if (results.length > 0) { switchSearchMode("results"); }
            else { switchSearchMode("idle"); }
          } else { closeSearch(); }
          return;
        }
        handleNavRef.current?.("Escape");
        return;
      }
      if (searchOpenRef.current && searchModeRef.current === "keyboard") {
        if (e.key.length === 1 && e.key !== " ") { fireKey(e.key); return; }
        if (e.key === " ")         { e.preventDefault(); kbSpace(); return; }
        if (e.key === "Backspace") { kbDelete(); return; }
      }
      if (["ArrowRight","ArrowLeft","ArrowDown","ArrowUp","Enter"].includes(e.key)) {
        if (searchOpenRef.current) return;
        e.preventDefault();
        handleNavRef.current?.(e.key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let unlisten;
    listen("gamepad-button", (e) => {
      if (!isReadyRef.current || showHideModalRef.current || showLibraryActionsRef.current) return;
      handleNavRef.current?.(e.payload);
    }).then((fn) => { unlisten = fn; });
    return () => { if (unlisten) unlisten(); };
  }, []);

  useEffect(() => {
    let repeatInterval = null, initialTimeout = null, currentDir = null, unlisten;
    listen("gamepad-axis", (e) => {
      const dir = e.payload;
      if (!isReadyRef.current || showHideModalRef.current || showLibraryActionsRef.current) return;
      const speed = settingsRef.current.repeat_speed;
      const initialDelay = speed === "slow" ? 800 : speed === "fast" ? 400 : 600;
      const repeatDelay  = speed === "slow" ? 300 : speed === "fast" ? 100 : 200;
      if (dir === "none") {
        clearTimeout(initialTimeout); clearInterval(repeatInterval);
        initialTimeout = null; repeatInterval = null; currentDir = null;
      } else if (dir !== currentDir) {
        clearTimeout(initialTimeout); clearInterval(repeatInterval);
        currentDir = dir; handleNavRef.current?.(dir);
        initialTimeout = setTimeout(() => {
          repeatInterval = setInterval(() => { handleNavRef.current?.(dir); }, repeatDelay);
        }, initialDelay);
      }
    }).then((fn) => { unlisten = fn; });
    return () => { if (unlisten) unlisten(); clearTimeout(initialTimeout); clearInterval(repeatInterval); };
  }, []);

  const isFocused = (section, index) => focusSection === section && focusIndex === index;

  const AppIcon = ({ app, size = 36 }) => {
    if (app.icon_base64) {
      return (
        <div style={{ width: size, height: size, borderRadius: surfaceStyle === "win9x" ? 0 : 8, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <img
            src={`data:image/png;base64,${app.icon_base64}`}
            alt={app.name}
            style={{ width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%", objectFit: "contain", objectPosition: "center", display: "block" }}
          />
        </div>
      );
    }
    return <div style={{ width: size, height: size, borderRadius: surfaceStyle === "win9x" ? 0 : 10, background: surfaceStyle === "material" ? "var(--material-elevation-1)" : `${accent.glow}0.25)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.45, fontWeight: 700, color: accent.primary }}>{app.name.charAt(0).toUpperCase()}</div>;
  };

  // Pin badge shown on cards
  const PinBadge = ({ isPinned, small = false }) => {
    if (!isPinned) return null;
    return (
      <div className="pin-pop" style={{
        position: "absolute", top: small ? 6 : 8, right: small ? 6 : 8,
        width: small ? 18 : 22, height: small ? 18 : 22,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: small ? 9 : 11,
        boxShadow: surfaceStyle === "material" ? "0 3px 10px rgba(0,0,0,0.22)" : `0 2px 8px ${accent.glow}0.5)`,
        zIndex: 2,
      }}>📌</div>
    );
  };

  const GameCard = ({ app, focused, onClick, onDoubleClick, cardRef, isPinned, onRightClick }) => {
    const art = customArt[app.id] || gameArt[app.id];
    const cardRadius = surfaceStyle === "win9x" ? 0 : surfaceStyle === "material" ? 8 : 16;
    return (
      <div ref={cardRef} onClick={onClick} onDoubleClick={onDoubleClick}
        onContextMenu={onRightClick ? (e) => { e.preventDefault(); onRightClick(e, app); } : undefined}
        style={focused
          ? { ...glass, border: `1px solid ${surfaceStyle === "material" ? accent.primary : accent.glow + "0.6)"}`, borderRadius: cardRadius, cursor: "pointer", overflow: "hidden", position: "relative", aspectRatio: "2/3", transition: "box-shadow 0.15s ease, transform 0.15s ease, border-color 0.15s ease", boxShadow: surfaceStyle === "material" ? materialRaisedShadow : `0 0 0 1px ${accent.glow}0.3), 0 0 40px ${accent.glow}0.2)`, transform: "scale(1.04) translateY(-1px)" }
          : { ...glass, border: surfaceStyle === "material" ? "1px solid var(--material-border-subtle)" : "1px solid rgba(255,255,255,0.06)", borderRadius: cardRadius, cursor: "pointer", overflow: "hidden", position: "relative", aspectRatio: "2/3", transition: "box-shadow 0.15s ease, transform 0.15s ease, border-color 0.15s ease" }
        }
      >
        {art
          ? <img src={art} alt={app.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          : <img src={`/assets/liftoff_cover_${settings.accent}.svg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        }
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 12px 12px", background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "white", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.name}</span>
        </div>
        <PinBadge isPinned={isPinned} />
        {focused && <div style={{ position: "absolute", inset: 0, border: `2px solid ${surfaceStyle === "material" ? accent.primary : accent.glow + "0.6)"}`, borderRadius: cardRadius, pointerEvents: "none" }} />}
      </div>
    );
  };

  // ── Virtual Keyboard ──────────────────────────────────────────
  const VirtualKeyboard = () => {
    const layout     = kbNumMode ? KB_NUMS : KB_ALPHA;
    const rowOffsets = kbNumMode ? [0, 0, 0] : [0, 0.5, 1];
    return (
      <div style={{ ...glass, borderRadius: "20px 20px 0 0", padding: "12px 24px 16px", borderBottom: "none", borderColor: surfaceStyle === "material" ? "var(--material-border-subtle)" : `${accent.glow}0.25)` }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
            color: accent.primary, background: surfaceStyle === "material" ? "var(--material-elevation-1)" : `${accent.glow}0.12)`, borderRadius: 20,
            padding: "3px 14px", border: `1px solid ${surfaceStyle === "material" ? "var(--material-border-subtle)" : accent.glow + "0.25)"}` }}>
            {kbNumMode ? t('keyboard.numbersAndSymbols') : t('keyboard.letters')}
          </div>
        </div>
        {layout.map((row, rIdx) => (
          <div key={rIdx} style={{ display: "flex", gap: 5, justifyContent: "center", marginBottom: 5, paddingLeft: `${rowOffsets[rIdx] * 26}px` }}>
            {row.map((key, cIdx) => {
              const isActive = kbRow === rIdx && kbCol === cIdx;
              return (
                <div key={key + cIdx} onClick={() => { fireKey(key); playSound(); }}
                  style={{
                    width: 46, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
                    borderRadius: 8, cursor: "pointer", transition: "all 0.1s ease",
                    fontFamily: "'Segoe UI', sans-serif", fontWeight: isActive ? 700 : 500,
                    fontSize: 14, userSelect: "none", flexShrink: 0,
                    background: isActive
                      ? `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`
                      : isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.8)",
                    color: isActive ? (accent.darkText ? "#1a1a1a" : "white") : theme.text,
                    border: isActive
                      ? `1px solid ${surfaceStyle === "material" ? accent.primary : accent.glow + "0.7)"}`
                      : `1px solid ${isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)"}`,
                    boxShadow: isActive
                      ? (surfaceStyle === "material" ? "var(--material-shadow-pressed)" : `0 0 16px ${accent.glow}0.5), 0 4px 10px rgba(0,0,0,0.3)`)
                      : isDark ? "none" : "0 1px 3px rgba(0,0,0,0.06)",
                    transform: isActive ? "scale(1.16)" : "scale(1)",
                  }}>
                  {key}
                </div>
              );
            })}
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 8, paddingTop: 8,
          borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}` }}>
          {[
            { bg: "#4a9c4a", label: "A",  desc: t('keyboard.type'),    circle: true },
            { bg: "#3a5a8a", label: "X",  desc: t('keyboard.delete'),  circle: true },
            { bg: "#9a7020", label: "Y",  desc: t('keyboard.space'),   circle: true },
            { bg: "#b03030", label: "B",  desc: t('keyboard.results'), circle: true },
            { bg: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.18)", label: "RT", desc: kbNumMode ? "→ ABC" : "→ 123", circle: false },
            { bg: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.18)", label: "⊞",  desc: t('keyboard.results'), circle: false },
          ].map(({ bg, label, desc, circle }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: circle ? 18 : "auto", height: 18, minWidth: 18, borderRadius: circle ? "50%" : 4,
                background: bg, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 8, fontWeight: 700, color: "white", padding: circle ? 0 : "0 3px", flexShrink: 0 }}>
                {label}
              </div>
              <span style={{ fontSize: 10, color: theme.textDim }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  // ─────────────────────────────────────────────────────────────

  const batteryColor = charging ? (isDark ? "#4ae88a" : "#1fb463") : battery > 20 ? accent.primary : "#e84a4a";
  const batteryTextColor = charging ? (isDark ? "#4ae88a" : "#159653") : theme.textDim;
  const batteryBoltFill = isDark ? "rgba(8,24,15,0.96)" : "rgba(4,46,26,0.96)";
  const batteryBoltStroke = isDark ? "rgba(255,255,255,0.70)" : "rgba(255,255,255,0.82)";
  const batteryWidth = battery > 0 ? `${battery}%` : "72%";





    if (loading) return <SplashScreen exiting={splashExiting} />;

  const SettingsScreenWrapper = () => (
    <SettingsScreen
      settingsFocusIndex={settingsFocusIndex}
      settingsSection={settingsSection}
      settingsFocusedRef={settingsFocusedRef}
      settingsBottomRef={settingsBottomRef}
      customFolders={customFolders}
      onOpenFolderManager={() => { setShowFolderManager(true); showFolderManagerRef.current = true; }}
      libraryRefreshStatus={libraryRefreshStatus}
      refreshLibrary={refreshLibrary}
      updateStatus={updateStatus}
      updateInfo={updateInfo}
      checkForUpdates={checkForUpdates}
      onClearRecents={handleClearRecents}
      handleClearCache={handleClearCache}
      autoScale={autoScaleRef.current}
      sliderDraft={sliderDraft}
      sliderDraftRef={sliderDraftRef}
      setSliderDraft={setSliderDraft}
      gameCollections={gameCollections}
      appCollections={appCollections}
      homeHiddenCollections={homeHiddenCollections}
      onToggleHomeCollection={toggleHomeCollection}
    />
  );

  // ── Hide/Show Modal ───────────────────────────────────────────
  // NOTE: HideModal is defined outside App (above) to prevent re-mounting on every App re-render
  // ─────────────────────────────────────────────────────────────

  // label format: "A Launch", "B Back" — first char is button, rest is description
  const Btn = ({ label }) => (
    <GamepadBtn btn={label[0]} label={label.slice(2)} />
  );

  // ── Section tab bar data for the unified sticky header ────────
  const _hdrSources = ["All", "Steam", "Xbox", "Battle.net", "Other", ...customSources, ...gameCollections.map(c => c.name)];
  const _hdrAppCols = ["All", ...appCollections.map(c => c.name)];
  const headerTabItems =
    tab === "Games"    ? _hdrSources.map(src => ({ label: src === "All" ? t('sources.all') : src === "Other" ? t('sources.other') : src, isDashed: gameCollections.some(c => c.name === src) }))
    : tab === "Apps"    ? _hdrAppCols.map(col => ({ label: col === "All" ? t('sources.all') : col }))
    : tab === "Settings" ? SETTINGS_SECTIONS.map(s => ({ label: t(s.labelKey) }))
    : [];
  const headerActiveIndex =
    tab === "Games"    ? _hdrSources.indexOf(gameSourceTab)
    : tab === "Apps"    ? _hdrAppCols.indexOf(appCollectionTab)
    : tab === "Settings" ? settingsSection : 0;
  const headerOnSelect = (i) => {
    if (tab === "Games") { const src = _hdrSources[i]; setGameSourceTab(src); gameSourceTabRef.current = src; }
    else if (tab === "Apps") { const col = _hdrAppCols[i]; setAppCollectionTab(col); appCollectionTabRef.current = col; }
    else if (tab === "Settings") { setSettingsSection(i); settingsSectionRef.current = i; setSettingsFocusIndex(0); settingsFocusIndexRef.current = 0; if (tabScrollRef.current) tabScrollRef.current.scrollTo({ top: 0, behavior: "smooth" }); }
    if (tab !== "Settings") { setFocusSection("subtabs"); focusSectionRef.current = "subtabs"; setSubtabFocusIndex(i); subtabFocusIndexRef.current = i; setFocusIndex(0); focusIndexRef.current = 0; }
  };

  // ── Header right actions (Manage button inline with subtab pills) ─
  const _hdrManageIdx = tab === "Games" ? _hdrSources.length : _hdrAppCols.length;
  const headerRightActions = (tab === "Games" || tab === "Apps") ? (
    <div
      onClick={openLibraryActionsModal}
      style={{
        fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
        padding: "4px 12px", borderRadius: 20, cursor: "pointer",
        transition: "all 0.15s ease",
        background: (focusSection === "subtabs" && subtabFocusIndex === _hdrManageIdx)
          ? accent.primary
          : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"),
        color: (focusSection === "subtabs" && subtabFocusIndex === _hdrManageIdx)
          ? (accent.darkText ? "#1a1a1a" : "white")
          : theme.textDim,
        border: `1px solid ${(focusSection === "subtabs" && subtabFocusIndex === _hdrManageIdx)
          ? accent.primary
          : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)")}`,
        boxShadow: (focusSection === "subtabs" && subtabFocusIndex === _hdrManageIdx)
          ? (surfaceStyle === "material" ? "var(--material-shadow-medium)" : `0 2px 10px ${accent.glow}0.35)`) : (surfaceStyle === "material" ? "var(--material-shadow-low)" : "none"),
      }}
    >
      {t('grid.manage')}
    </div>
  ) : undefined;

  // ── Render ────────────────────────────────────────────────────
  const themeValue = { isDark, theme, accent, glass, glassBar, settingsRowGlass, glassEnabled, surfaceStyle, appBg, bgGlow1, bgGlow2, surface };
  const settingsValue = { settings, settingsRef, updateSetting, updateSettingsBatch };
  const libraryViewProps = {
    scrollRef: tabScrollRef,
    wideLayout: settings.wide_body,
    customSources,
    gameCollections,
    appCollections,
    accent,
    isDark,
    theme,
    surfaceStyle,
    t,
    gameSourceTab,
    appCollectionTab,
    setAddAppType,
    setShowFileBrowser,
    setFocusSection,
    focusSectionRef,
    setSubtabFocusIndex,
    subtabFocusIndexRef,
    focusSection,
    subtabFocusIndex,
    openHideModal,
    setShowColModal,
    showColModalRef,
    pinnedAppsReactive,
    GameCard,
    focusedCardRef,
    setFocusIndex,
    focusIndexRef,
    focusIndex,
    triggerLaunch,
    recent,
    setContextMenu,
    COLS: effectiveAppCols,
    iconColors,
    customArt,
    glass,
    cardBackdropFilter,
    materialRaisedShadow,
    AppIcon,
    PinBadge,
    filteredApps,
    effectiveGameCols,
    isFocused,
    pins,
  };

  return (
    <ThemeProvider value={themeValue}>
    <SettingsProvider value={settingsValue}>
    <GamepadProvider value={{ platform: settings.gamepad_platform ?? "xbox", colored: settings.gamepad_icons_colored ?? false, filled: settings.gamepad_icons_filled ?? true, themeColor: (settings.gamepad_icons_theme_color ?? false) ? accent.primary : undefined, darkText: (settings.gamepad_icons_theme_color ?? false) ? (accent.darkText ?? false) : false, btnSize: settings.gamepad_btn_size ?? "medium" }}>
    <div className={launchingApp ? "app-launch-paused" : undefined} style={{ ...materialTokens, position: "fixed", top: 0, left: 0, width: `${100 / (settings.ui_scale ?? 1)}vw`, height: `${100 / (settings.ui_scale ?? 1)}vh`, transform: `scale(${settings.ui_scale ?? 1})`, transformOrigin: "top left", overflowY: "auto", overflowX: "hidden", animation: "appFadeIn 0.5s ease forwards", zIndex: 1, fontFamily: "'Segoe UI', sans-serif" }} ref={outerRef}>

      <AppBackground settings={settings} resolvedTheme={resolvedTheme} accent={accent} appBg={appBg} bgGlow1={bgGlow1} bgGlow2={bgGlow2} isDark={isDark} isMaterial={isMaterial} surfaceStyle={surfaceStyle} appPaused={appPaused} />
      <AppOverlays>
      {launchingApp && <LaunchOverlay app={launchingApp} gameArt={gameArt} customArt={customArt} accent={accent} onDone={closeLaunchOverlay} />}
      {artPickerApp && (
        <SteamGridArtPickerModal
          app={artPickerApp}
          currentArt={artPickerMode === "hero"
            ? (customHeroArt[artPickerApp.id] || heroStatic[artPickerApp.id])
            : (customArt[artPickerApp.id] || gameArt[artPickerApp.id])}
          hasCustomArt={artPickerMode === "hero" ? !!customHeroArt[artPickerApp.id] : !!customArt[artPickerApp.id]}
          artType={artPickerMode}
          cropMode={artPickerMode === "hero" ? "hero" : artPickerApp?.app_type === "game" ? "portrait" : "square"}
          repeatSpeed={settings.repeat_speed}
          accent={accent} theme={theme} isDark={isDark} glass={glass} surfaceStyle={surfaceStyle}
          onClose={closeArtPicker}
          onSet={(id, result) => {
            if (typeof result === "string" && result.startsWith("data:")) {
              if (artPickerModeRef.current === "hero") {
                const next = { ...customHeroArtRef.current, [id]: result };
                setCustomHeroArt(next); customHeroArtRef.current = next;
                setHeroCustomType(prev => {
                  return { ...prev, [id]: "static" };
                });
                if (settings.animated_heroes !== "custom") updateSetting("animated_heroes", "custom");
              } else {
                const next = { ...customArtRef.current, [id]: result };
                setCustomArt(next); customArtRef.current = next;
              }
            } else {
              const url = convertFileSrc(result);
              if (artPickerModeRef.current === "hero") {
                const lower = result.toLowerCase();
                const isAnim = lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".gif") || lower.endsWith(".webp");
                if (isAnim) setHeroAnimated(prev => ({ ...prev, [id]: url }));
                else        setHeroStatic(prev => ({ ...prev, [id]: url }));
                const heroType = isAnim ? "animated" : "static";
                setHeroCustomType(prev => {
                  return { ...prev, [id]: heroType };
                });
                if (settings.animated_heroes !== "custom") updateSetting("animated_heroes", "custom");
              } else {
                setGameArt(prev => ({ ...prev, [id]: url }));
              }
            }
          }}
          onReset={(id) => {
            if (artPickerModeRef.current === "hero") {
              const next = { ...customHeroArtRef.current }; delete next[id];
              setCustomHeroArt(next); customHeroArtRef.current = next;
            } else {
              const next = { ...customArtRef.current }; delete next[id];
              setCustomArt(next); customArtRef.current = next;
            }
          }}
        />
      )}
      {showHideModal && <HideModal key="hide-modal" tab={tab} appsRef={appsRef} hiddenRef={hiddenRef} allAppsRef={allAppsRef} closeHideModal={closeHideModal} toggleHidden={toggleHidden} />}
      {showLibraryActions && (
        <LibraryActionsModal
          tab={tab}
          onAddFile={() => { setAddAppType(tab === "Games" ? "game" : "app"); setShowFileBrowser("file"); showFileBrowserRef.current = "file"; }}
          onAddFolder={() => { setAddAppType(tab === "Games" ? "game" : "app"); setShowFileBrowser("folder"); showFileBrowserRef.current = "folder"; }}
          onManage={openHideModal}
          onCollections={() => { setShowColModal(true); showColModalRef.current = true; }}
          onClose={closeLibraryActionsModal}
        />
      )}
      {showFileBrowser && (
        <FileBrowser
          mode={showFileBrowser}
          repeatSpeed={settings.repeat_speed}
          onSelect={(file) => { setPendingFile(file); setShowFileBrowser(null); }}
          onClose={() => setShowFileBrowser(null)}
        />
      )}
      {pendingFile && (
        <AddEntryModal
          entryFile={pendingFile}
          mode={pendingFile.is_dir ? "folder" : "app"}
          appType={addAppType}
          existingSources={addAppType === "game" ? customSources : []}
          collections={addAppType === "game" ? gameCollections : appCollections}
          repeatSpeed={settings.repeat_speed}
          onConfirm={(result, colSelection) => {
            const wasFolder  = pendingFile?.is_dir;
            const isGameType = addAppType === "game";
            setPendingFile(null);

            // Assign a list of app IDs to an existing collection
            const assignToCollection = (appIds, colId) => {
              const cmd     = isGameType ? "set_game_memberships" : "set_app_memberships";
              const setMems = isGameType ? setGameMemberships : setAppMemberships;
              const memsRef = isGameType ? gameMembershipsRef : appMembershipsRef;
              appIds.forEach(id => invoke(cmd, { appId: id, collectionIds: [colId] }));
              setMems(prev => {
                const updates = Object.fromEntries(appIds.map(id => [id, [colId]]));
                const n = { ...prev, ...updates };
                memsRef.current = n;
                return n;
              });
            };

            // Create a new collection (game or app), then assign
            const createAndAssign = (appIds, name) => {
              const createCmd = isGameType ? "create_game_collection" : "create_app_collection";
              const setCols   = isGameType ? setGameCollections : setAppCollections;
              const colsRef   = isGameType ? gameCollectionsRef : appCollectionsRef;
              invoke(createCmd, { name }).then(newCol => {
                setCols(prev => { const n = [...prev, newCol]; colsRef.current = n; return n; });
                assignToCollection(appIds, newCol.id);
              });
            };

            if (wasFolder) {
              setCustomFolders(prev => [...prev, result]);
              // get_all_apps rescans all folders; filter by the source tag we just set
              // on this folder to find which apps it contributed
              if (colSelection?.colId || colSelection?.newName) {
                invoke("get_all_apps").then(all => {
                  const appIds = all
                    .filter(a => a.source === result.source && a.app_type === result.app_type)
                    .map(a => a.id);
                  if (colSelection.colId) assignToCollection(appIds, colSelection.colId);
                  else                    createAndAssign(appIds, colSelection.newName);
                });
              }
              refreshLibrary();
              return;
            }

            // Single entry: track custom source name unless it's a collection name
            if (isGameType && result.source) {
              const BUILTIN = new Set(["Steam","Xbox","Battle.net","Other","steam","xbox","battlenet","desktop","uwp"]);
              const isColName = gameCollectionsRef.current.some(c => c.name === result.source);
              if (!BUILTIN.has(result.source) && !isColName) {
                setCustomSources(prev => prev.includes(result.source) ? prev : [...prev, result.source]);
              }
            }
            if (result.id) {
              if (colSelection?.colId)   assignToCollection([result.id], colSelection.colId);
              else if (colSelection?.newName) createAndAssign([result.id], colSelection.newName);
            }
            refreshLibrary();
          }}
          onClose={() => setPendingFile(null)}
        />
      )}
      {/* ── Collection assignment picker (right-click → collections) ── */}
      {colPickerApp && (() => {
        const isGame = colPickerApp.app_type === "game";
        const pickerCols = isGame ? gameCollections : appCollections;
        const pickerMembers = isGame ? gameMemberships : appMemberships;
        const setPickerMembers = isGame ? setGameMemberships : setAppMemberships;
        const pickerMembersRef = isGame ? gameMembershipsRef : appMembershipsRef;
        const memberCmd = isGame ? "set_game_memberships" : "set_app_memberships";
        return (
          <ColPickerModal
            app={colPickerApp}
            collections={pickerCols}
            memberships={pickerMembers}
            onToggle={(col) => {
              const current = pickerMembersRef.current[colPickerApp.id] || [];
              const inCol = current.includes(col.id);
              const newList = inCol ? current.filter(id => id !== col.id) : [...current, col.id];
              invoke(memberCmd, { appId: colPickerApp.id, collectionIds: newList }).then(() => {
                setPickerMembers(prev => { const n = { ...prev, [colPickerApp.id]: newList }; pickerMembersRef.current = n; return n; });
              });
            }}
            onCreateCollection={(name) => {
              const cmd = isGame ? "create_game_collection" : "create_app_collection";
              invoke(cmd, { name }).then(col => {
                if (isGame) { setGameCollections(prev => { const n = [...prev, col]; gameCollectionsRef.current = n; return n; }); }
                else        { setAppCollections(prev => { const n = [...prev, col]; appCollectionsRef.current = n; return n; }); }
              });
            }}
            onClose={() => { setColPickerApp(null); colPickerAppRef.current = null; }}
          />
        );
      })()}
      {/* ── Collection manager modal ── */}
      {showColModal && (() => {
        const isGameTab = tab === "Games";
        return (
          <CollectionManagerModal
            key={isGameTab ? "game-col-mgr" : "app-col-mgr"}
            title={t(isGameTab ? 'collections.manageGames' : 'collections.manageApps')}
            collections={isGameTab ? gameCollections : appCollections}
            onCreateCollection={(name) => {
              const cmd = isGameTab ? "create_game_collection" : "create_app_collection";
              invoke(cmd, { name }).then(col => {
                if (isGameTab) { setGameCollections(prev => { const n = [...prev, col]; gameCollectionsRef.current = n; return n; }); }
                else           { setAppCollections(prev => { const n = [...prev, col]; appCollectionsRef.current = n; return n; }); }
              });
            }}
            onDeleteCollection={(id) => {
              if (isGameTab) {
                invoke("delete_game_collection", { id }).then(() => {
                  setGameCollections(prev => { const n = prev.filter(c => c.id !== id); gameCollectionsRef.current = n; return n; });
                  setGameMemberships(prev => {
                    const n = { ...prev };
                    Object.keys(n).forEach(gId => { n[gId] = n[gId].filter(cid => cid !== id); });
                    gameMembershipsRef.current = n; return n;
                  });
                });
              } else {
                invoke("delete_app_collection", { id }).then(() => {
                  setAppCollections(prev => { const n = prev.filter(c => c.id !== id); appCollectionsRef.current = n; return n; });
                  setAppMemberships(prev => {
                    const n = { ...prev };
                    Object.keys(n).forEach(aId => { n[aId] = n[aId].filter(cid => cid !== id); });
                    appMembershipsRef.current = n; return n;
                  });
                  if (appCollectionTab !== "All" && !appCollections.filter(c => c.id !== id).find(c => c.name === appCollectionTab)) {
                    setAppCollectionTab("All"); appCollectionTabRef.current = "All";
                  }
                });
              }
            }}
            onClose={() => { setShowColModal(false); showColModalRef.current = false; }}
            customSources={isGameTab ? customSources : []}
            onDeleteCustomSource={(source) => {
              invoke("remove_custom_source", { source }).then(() => {
                setCustomSources(prev => prev.filter(s => s !== source));
                customSourcesRef.current = customSourcesRef.current.filter(s => s !== source);
                refreshLibrary();
              });
            }}
          />
        );
      })()}
      {/* ── Folder manager modal (settings → custom folders → A) ── */}
      {showFolderManager && (
        <FolderManagerModal
          customFolders={customFolders}
          onToggle={(id, enabled) => {
            invoke("toggle_custom_folder", { id, enabled }).then(() => {
              setCustomFolders(prev => prev.map(f => f.id === id ? { ...f, enabled } : f));
            });
          }}
          onDelete={(id) => {
            invoke("remove_custom_folder", { id }).then(() => {
              setCustomFolders(prev => prev.filter(f => f.id !== id));
            });
          }}
          onClose={() => { setShowFolderManager(false); showFolderManagerRef.current = false; }}
        />
      )}
      {/* ── Confirm delete app modal ── */}
      {confirmDelete && (
        <ConfirmModal
          message={t('confirm.deleteApp', { name: confirmDelete.name })}
          onConfirm={() => {
            invoke("remove_custom_app", { id: confirmDelete.id }).then(() => {
              setApps(prev => prev.filter(a => a.id !== confirmDelete.id));
              allAppsRef.current = allAppsRef.current.filter(a => a.id !== confirmDelete.id);
              setConfirmDelete(null); confirmDeleteRef.current = null;
            });
          }}
          onCancel={() => { setConfirmDelete(null); confirmDeleteRef.current = null; }}
        />
      )}
      {/* ── Rename custom app modal ── */}
      {editNameApp && (
        <EditNameModal
          app={editNameApp}
          onConfirm={(name) => {
            invoke("rename_app", { id: editNameApp.id, name }).then(() => refreshLibrary());
            setEditNameApp(null);
          }}
          onClose={() => setEditNameApp(null)}
        />
      )}
      {libraryRefreshStatus === "scanning" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center",
          background: surfaceStyle === "material" ? (isDark ? "rgba(23,21,19,0.96)" : "rgba(244,240,235,0.96)") : isDark ? "rgba(10,5,2,0.75)" : "rgba(240,230,220,0.75)", backdropFilter: surfaceStyle === "material" ? undefined : "blur(12px)", WebkitBackdropFilter: surfaceStyle === "material" ? undefined : "blur(12px)" }}>
          <div style={{ ...glass, borderRadius: surfaceStyle === "win9x" ? 0 : surfaceStyle === "material" ? 16 : 24, padding: "32px 48px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
            border: `1px solid ${accent.glow}0.25)`, boxShadow: `0 8px 40px rgba(0,0,0,0.3)` }}>
            <div className="splash-dots" style={{ opacity: 1 }}>
              <div className="splash-dot" /><div className="splash-dot" /><div className="splash-dot" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>{t('library.refreshing')}</span>
            <span style={{ fontSize: 12, color: theme.textDim }}>{t('library.scanning')}</span>
          </div>
        </div>
      )}
      {/* ══════════════ SEARCH OVERLAY ══════════════ */}
      {searchOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 7000,
          background: surfaceStyle === "material" ? (isDark ? "rgba(23,21,19,0.98)" : "rgba(244,240,235,0.98)") : isDark ? "rgba(10,5,2,0.95)" : "rgba(240,230,220,0.95)",
          backdropFilter: surfaceStyle === "material" ? undefined : "blur(28px)", WebkitBackdropFilter: surfaceStyle === "material" ? undefined : "blur(28px)",
          display: "flex", flexDirection: "column",
          fontFamily: "'Segoe UI', sans-serif",
          animation: "appFadeIn 0.18s ease forwards",
        }}>
          {/* Search bar */}
          <div style={{ padding: "18px 24px 10px", flexShrink: 0 }}>
            <div style={{ ...glass, borderRadius: surfaceStyle === "win9x" ? 0 : 16, padding: "12px 20px", display: "flex", alignItems: "center", gap: 14,
              ...(searchMode === "keyboard" ? { borderColor: surfaceStyle === "material" ? accent.primary : `${accent.glow}0.45)`, boxShadow: surfaceStyle === "material" ? materialFocusShadow : `0 0 0 1px ${accent.glow}0.2)` } : {}) }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
                <circle cx="8.5" cy="8.5" r="5.5" stroke={theme.text} strokeWidth="1.8"/>
                <path d="M13 13l3.5 3.5" stroke={theme.text} strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <div style={{ flex: 1, fontSize: 20, fontWeight: 500, minWidth: 0, overflow: "hidden",
                whiteSpace: "nowrap", textOverflow: "ellipsis",
                color: searchQuery ? theme.text : theme.textFaint }}>
                {searchQuery || t('search.placeholder')}
                {searchMode === "keyboard" && (
                  <span className="kb-cursor" style={{ display: "inline-block", width: 2, height: "0.9em",
                    background: accent.primary, marginLeft: 1, verticalAlign: "text-bottom", borderRadius: 1 }} />
                )}
              </div>
              {searchQuery && (
                <div onClick={() => { setSearchQuery(""); searchQueryRef.current = ""; setSearchFocusIndex(0); searchFocusIndexRef.current = 0; }}
                  style={{ fontSize: 12, color: theme.textDim, cursor: "pointer", padding: "3px 10px", borderRadius: 6, flexShrink: 0,
                    background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}>
                  {t('common.clear')}
                </div>
              )}
              <div style={{ fontSize: 11, fontWeight: 600, color: accent.primary, padding: "3px 10px",
                borderRadius: 20, flexShrink: 0, background: `${accent.glow}0.12)`,
                border: `1px solid ${accent.glow}0.25)` }}>
                {searchMode === "keyboard" ? t('search.mode.typing') : searchMode === "results" ? t('search.mode.browsing') : t('search.mode.idle')}
              </div>
              <div onClick={closeSearch}
                style={{ fontSize: 12, color: theme.textDim, cursor: "pointer", padding: "3px 10px", borderRadius: 6, flexShrink: 0,
                  background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}` }}>
                {t('common.close')}
              </div>
            </div>
          </div>

          {/* Results area */}
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "0 24px 12px" }}>
            {searchResults.length > 0 && (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase",
                  color: theme.textFaint, padding: "4px 4px 10px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span>{t('search.results', { count: searchResults.length })}</span>
                  {searchMode === "keyboard" && (
                    <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", fontSize: 11, color: theme.textFaint }}>
                      {t('search.startToBrowse')}
                    </span>
                  )}
                  {searchMode === "idle" && (
                    <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", fontSize: 11, color: theme.textFaint }}>
                      {t('search.idleHint')}
                    </span>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, gap: 10 }}>
                  {searchResults.map((app, i) => {
                    const focused = searchMode === "results" && searchFocusIndex === i;
                    const isPinned = pins.includes(app.id);
                    if (app.app_type === "game") {
                      return (
                        <GameCard key={app.id} app={app} focused={focused} isPinned={isPinned}
                          cardRef={focused ? searchFocusedCardRef : null}
                          onClick={() => { setSearchFocusIndex(i); searchFocusIndexRef.current = i; if (searchModeRef.current !== "results") switchSearchMode("results"); }}
                          onDoubleClick={() => { closeSearch(); triggerLaunch(app, recentRef.current); }}
                        />
                      );
                    }
                    return (
                      <div key={app.id} ref={focused ? searchFocusedCardRef : null}
                        onClick={() => { setSearchFocusIndex(i); searchFocusIndexRef.current = i; if (searchModeRef.current !== "results") switchSearchMode("results"); }}
                        onDoubleClick={() => { closeSearch(); triggerLaunch(app, recentRef.current); }}
                        style={{ ...glass, border: focused ? `1px solid ${surfaceStyle === "material" ? accent.primary : accent.glow + "0.6)"}` : "1px solid rgba(255,255,255,0.06)", borderRadius: 16, cursor: "pointer", transition: "all 0.15s ease", aspectRatio: "2/3", position: "relative", overflow: "hidden",
                          ...(focused ? { background: surfaceStyle === "material" ? "var(--material-elevation-3)" : isDark ? `${accent.glow}0.12)` : `${accent.glow}0.08)`,
                            boxShadow: surfaceStyle === "material" ? materialRaisedShadow : `0 0 0 1px ${accent.glow}0.3), 0 0 30px ${accent.glow}0.15)`,
                            transform: "scale(1.06)" } : {}) }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, height: "100%", padding: "12px 8px" }}>
                          <AppIcon app={app} size={40} />
                          <div style={{ fontSize: 10, fontWeight: 500, color: theme.textDim, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{app.name}</div>
                        </div>
                        <PinBadge isPinned={isPinned} small />
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {searchQuery.trim().length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, color: theme.textFaint }}>
                <svg width="36" height="36" viewBox="0 0 20 20" fill="none" style={{ opacity: 0.15 }}>
                  <circle cx="8.5" cy="8.5" r="5.5" stroke={theme.text} strokeWidth="1.3"/>
                  <path d="M13 13l3.5 3.5" stroke={theme.text} strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                <span style={{ fontSize: 13 }}>Start typing to search</span>
                {searchMode === "idle" && (
                  <span style={{ fontSize: 11, color: theme.textFaint }}>Press <strong style={{ color: theme.textDim }}>Y</strong> to bring the keyboard back</span>
                )}
              </div>
            )}
            {searchQuery.trim().length > 0 && searchResults.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, color: theme.textFaint }}>
                <span style={{ fontSize: 28 }}>¯\_(ツ)_/¯</span>
                <span style={{ fontSize: 13 }}>No results for "{searchQuery}"</span>
                {searchMode === "idle" && (
                  <span style={{ fontSize: 11, color: theme.textFaint }}>Press <strong style={{ color: theme.textDim }}>Y</strong> to keep typing</span>
                )}
              </div>
            )}

            {searchMode === "results" && (
              <div style={{ position: "sticky", bottom: 0, paddingTop: 8 }}>
                <div style={{ ...glass, borderRadius: surfaceStyle === "win9x" ? 0 : 12, padding: "9px 20px", display: "flex", gap: 16, alignItems: "center" }}>
                  <Btn label={t('gamepad.aLaunch')} />
                  <Btn label={t('gamepad.yKeyboard')} />
                  <Btn label={t('gamepad.bClose')} />
                  <span style={{ marginLeft: "auto", fontSize: 11, color: theme.textFaint }}>↑ from top → Keyboard</span>
                </div>
              </div>
            )}

            {searchMode === "idle" && (
              <div style={{ position: "sticky", bottom: 0, paddingTop: 8 }}>
                <div style={{ ...glass, borderRadius: surfaceStyle === "win9x" ? 0 : 12, padding: "9px 20px", display: "flex", gap: 16, alignItems: "center" }}>
                  <Btn label={t('gamepad.yKeyboard')} />
                  <Btn label={t('gamepad.bClose')} />
                  {searchResults.length > 0 && <span style={{ fontSize: 11, color: theme.textFaint }}>{t('search.startBrowse')}</span>}
                </div>
              </div>
            )}
          </div>

          {searchMode === "keyboard" && (
            <div style={{ flexShrink: 0 }}>
              <VirtualKeyboard />
            </div>
          )}
        </div>
      )}
      {/* ══════════════ END SEARCH OVERLAY ══════════════ */}
      {cacheClearLoading && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2147483000, display: "flex", alignItems: "center", justifyContent: "center", isolation: "isolate", fontFamily: "'Segoe UI', sans-serif" }}>
          <div style={{ position: "absolute", inset: 0, zIndex: 0, background: "rgba(0,0,0,0.65)" }} />
          <div style={{ position: "relative", zIndex: 1, background: surfaceStyle === "material" ? "var(--material-elevation-3)" : isDark ? "rgba(18,16,14,0.96)" : "rgba(252,248,244,0.96)", borderRadius: surfaceStyle === "win9x" ? 0 : 18, padding: "36px 52px", textAlign: "center", display: "flex", flexDirection: "column", gap: 14, alignItems: "center",
            backdropFilter: surfaceStyle === "material" ? undefined : "blur(18px) saturate(140%)", WebkitBackdropFilter: surfaceStyle === "material" ? undefined : "blur(18px) saturate(140%)",
            boxShadow: "0 20px 80px rgba(0,0,0,0.55)", border: `1px solid ${isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.14)"}` }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${accent.primary}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>{cacheClearStatus.line1}</div>
            <div style={{ fontSize: 13, color: theme.textDim }}>{cacheClearStatus.line2}</div>
          </div>
        </div>
      )}
      </AppOverlays>

      <div style={{ color: theme.text, fontFamily: "'Segoe UI', sans-serif", display: "flex", flexDirection: "column", minHeight: "100%", userSelect: "none", position: "relative", zIndex: 1, pointerEvents: (showHideModal || showLibraryActions) ? "none" : "auto" }}>

        {/* Topbar */}
        <AppHeader
          tab={tab}
          tabs={TABS}
          switchTab={switchTab}
          date={date}
          time={time}
          hasBattery={hasBattery}
          battery={battery}
          batteryWidth={batteryWidth}
          batteryColor={batteryColor}
          batteryTextColor={batteryTextColor}
          batteryBoltFill={batteryBoltFill}
          batteryBoltStroke={batteryBoltStroke}
          charging={charging}
          headerTabItems={headerTabItems}
          headerActiveIndex={headerActiveIndex}
          headerOnSelect={headerOnSelect}
          headerRightActions={headerRightActions}
        />
        {/* Tab content area — Home always mounted; cover layer hides it when elsewhere;
             clouds sit above cover, below all tab UI. */}
        <AppMainContent>
        <div style={{ position: "relative", flex: 1, overflow: (settings.transparent_topbar && tab === "Home") || (settings.cinematic_home && tab === "Home") ? "auto" : "hidden" }}>

          {tab === "Settings" && (
            <div ref={tabScrollRef} style={{ position: "absolute", inset: 0, overflowY: "auto", zIndex: 2 }}>
              <SettingsScreenWrapper />
            </div>
          )}
          <HomeView
            scrollRef={homeScrollRef}
            active={tab === "Home"}
            cinematicHome={settings.cinematic_home}
            recent={recent}
            pins={pins}
            apps={apps}
            recentGames={recentGames}
            heroIndex={heroIndex}
            focusSection={focusSection}
            focusIndex={focusIndex}
            customArt={customArt}
            gameArt={gameArt}
            settings={settings}
            heroCustomType={heroCustomType}
            heroAnimated={heroAnimated}
            heroStatic={heroStatic}
            customHeroArt={customHeroArt}
            surfaceStyle={surfaceStyle}
            isDark={isDark}
            theme={theme}
            accent={accent}
            appBg={appBg}
            materialRaisedShadow={materialRaisedShadow}
            activeTextColor={activeTextColor}
            pinnedShelfRef={pinnedShelfRef}
            focusedCardRef={focusedCardRef}
            setFocusSection={setFocusSection}
            focusSectionRef={focusSectionRef}
            setFocusIndex={setFocusIndex}
            focusIndexRef={focusIndexRef}
            triggerLaunch={triggerLaunch}
            recentRef={recentRef}
            t={t}
            AppIcon={AppIcon}
            materialFocusShadow={materialFocusShadow}
            allAppsRef={allAppsRef}
            PinBadge={PinBadge}
            glass={glass}
            cardBackdropFilter={cardBackdropFilter}
            gameCollections={gameCollections}
            gameMemberships={gameMemberships}
            appCollections={appCollections}
            appMemberships={appMemberships}
            homeHiddenCollections={homeHiddenCollections}
            homeColFocusRow={homeColFocusRow}
            focusedRowRef={focusedRowRef}
            homeColFocusCol={homeColFocusCol}
            setHomeColFocusRow={setHomeColFocusRow}
            homeColFocusRowRef={homeColFocusRowRef}
            setHomeColFocusCol={setHomeColFocusCol}
            homeColFocusColRef={homeColFocusColRef}
            glassEnabled={glassEnabled}
            drawerScrollRef={drawerScrollRef}
            recentShelfRef={recentShelfRef}
            heroVideoRefs={heroVideoRefs}
            appPaused={appPaused}
            setHeroIndex={setHeroIndex}
            heroIndexRef={heroIndexRef}
            iconColors={iconColors}
          />
          {tab === "Games" && <GamesView {...libraryViewProps} />}
          {tab === "Apps" && <AppsView {...libraryViewProps} />}
        </div>
        </AppMainContent>

        {/* Bottom bar */}
        <AppBottomBar
          tab={tab}
          appCollectionsCount={appCollections.length}
        />
      </div>

      <AppOverlays>
      {contextMenu && (() => {
        const adminEnabled = getRunAsAdmin(contextMenu.app.id);
        const ctxItems = [
          { label: t('contextMenu.open'),      action: () => { triggerLaunch(contextMenu.app, recentRef.current); setContextMenu(null); contextMenuRef.current = null; } },
          { label: t(hidden.includes(contextMenu.app.id) ? 'contextMenu.show' : 'contextMenu.hide'), action: () => { toggleHidden(contextMenu.app.id); setContextMenu(null); contextMenuRef.current = null; } },
          { label: t(pins.includes(contextMenu.app.id) ? 'contextMenu.unpin' : 'contextMenu.pin'), action: () => { togglePin(contextMenu.app); setContextMenu(null); contextMenuRef.current = null; } },
          ...(contextMenu.app.app_type === "game"
            ? [{
                label: "Run as Administrator",
                sublabel: "Game will request elevated privileges via UAC on launch",
                checked: adminEnabled,
                action: () => {
                  setRunAsAdmin(contextMenu.app.id, !adminEnabled);
                  setAdminPrefsVersion(v => v + 1);
                },
              }]
            : []),
          { label: t('contextMenu.changeArt'), action: () => { setArtPickerMode("grid"); artPickerModeRef.current = "grid"; setArtPickerApp(contextMenu.app); artPickerAppRef.current = contextMenu.app; setContextMenu(null); contextMenuRef.current = null; } },
          ...(contextMenu.app.app_type === "game"
            ? [{ label: t('contextMenu.changeHeroArt'), action: () => { setArtPickerMode("hero"); artPickerModeRef.current = "hero"; setArtPickerApp(contextMenu.app); artPickerAppRef.current = contextMenu.app; setContextMenu(null); contextMenuRef.current = null; } }]
            : []),
          { label: t('contextMenu.collections'), action: () => { setColPickerApp(contextMenu.app); setContextMenu(null); contextMenuRef.current = null; } },
          { label: t('contextMenu.rename'), action: () => { setEditNameApp(contextMenu.app); setContextMenu(null); contextMenuRef.current = null; } },
          ...(contextMenu.app.id.startsWith("custom_")
            ? [{ label: t('contextMenu.delete'), danger: true, action: () => { setConfirmDelete(contextMenu.app); confirmDeleteRef.current = contextMenu.app; setContextMenu(null); contextMenuRef.current = null; } }]
            : []),
        ];
        return (
          <ContextMenuModal
            key={`${contextMenu.app.id}-${adminPrefsVersion}`}
            app={contextMenu.app}
            items={ctxItems}
            onClose={() => { setContextMenu(null); contextMenuRef.current = null; }}
          />
        );
      })()}

      </AppOverlays>
    </div>
    </GamepadProvider>
    </SettingsProvider>
    </ThemeProvider>
  );
}





