import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { CollapsibleGroup, ToggleKnob, GamepadIconPreview } from "../components/ui";
import { ControllerTestWidget } from "../components/ControllerTestWidget";

// ── Section definitions ────────────────────────────────────────
export const SETTINGS_SECTIONS = [
  { key: "appearance", labelKey: "settings.sections.appearance" },
  { key: "library",    labelKey: "settings.sections.library"    },
  { key: "behavior",   labelKey: "settings.sections.behavior"   },
  { key: "controller", labelKey: "settings.sections.controller" },
  { key: "data",       labelKey: "settings.sections.data"       },
  { key: "about",      labelKey: "settings.sections.about"      },
] as const;

/** Build full SETTINGS_ITEMS array with translated labels, annotated with section index. */
export function buildSettingsItems(t: any, isDark: boolean) {
  const APP_VERSION = "1.2.2";
  const D = (key: string, section: number) => ({ key: `div_${key}`, section, type: "divider", label: t(`settings.dividers.${key}`) });
  return [
    // ── Appearance ───────────────────────────────────────────────
    D("theme", 0),
    { key: "accent",        section: 0, label: t("settings.accentColor"),  type: "accent" },
    { key: "theme",         section: 0, label: t("settings.theme"),         type: "cycle",  options: ["dark","light","system"] },
    { key: "stars_enabled", section: 0, label: isDark ? t("settings.backgroundStars") : t("settings.backgroundClouds"), type: "toggle" },

    D("home", 0),
    { key: "cinematic_home",         section: 0, label: t("settings.immersiveHome"),       type: "toggle" },
    { key: "show_home_collections",  section: 0, label: t("settings.showHomeCollections"),  type: "toggle", subItems: [
      { key: "show_home_collection_names", label: t("settings.showHomeCollectionNames"), type: "toggle" },
    ]},

    D("layout", 0),
    { key: "wide_layout",       section: 0, label: t("settings.wideLayout"),     type: "toggle" },
    { key: "ui_scale",          section: 0, label: t("settings.uiScale"),         type: "slider", min: 0.75, max: 2.0, step: 0.05 },
    { key: "reset_scale",       section: 0, label: t("settings.resetScale"),      type: "action" },
    { key: "home_cover_scale",  section: 0, label: t("settings.homeCoverScale"),  type: "slider", min: 0.5, max: 2.0, step: 0.05 },
    { key: "game_cover_scale",  section: 0, label: t("settings.gameCoverScale"),  type: "slider", min: 0.5, max: 2.0, step: 0.05 },

    D("navbar", 0),
    { key: "hide_bottom_bar",        section: 0, label: t("settings.hideBottomBar"),       type: "toggle" },
    { key: "transparent_bars",       section: 0, label: t("settings.transparentBars"),      type: "toggle", subItems: [
      { key: "transparent_topbar",    label: t("settings.transparentTopbar"),    type: "toggle" },
      { key: "transparent_bottombar", label: t("settings.transparentBottombar"), type: "toggle" },
    ]},
    { key: "nav_bumpers_pos",         section: 0, label: t("settings.navBumpersPos"),        type: "cycle",  options: ["header", "bottom", "hidden"] },
    D("tabbar", 0),
    { key: "tabbar_show_buttons",    section: 0, label: t("settings.tabbarBadges"),          type: "cycle",  options: ["tabbar", "bottom", "hidden"] },
    { key: "tabbar_label_case",      section: 0, label: t("settings.tabbarLabelCase"),        type: "cycle",  options: ["default", "ucfirst", "uppercase"] },
    { key: "tabbar_text_tabs",       section: 0, label: t("settings.tabbarTextTabs"),         type: "toggle", subItems: [
      { key: "tabbar_font_weight", label: t("settings.tabbarFontWeight"), type: "cycle", options: ["thin", "medium", "bold"] },
    ]},
    { key: "tabbar_with_background", section: 0, label: t("settings.tabbarWithBackground"),   type: "toggle" },
    { key: "bottombar_alignment",     section: 0, label: t("settings.bottombarAlignment"),     type: "cycle",  options: ["left", "center", "right"] },

    // ── Library ──────────────────────────────────────────────────
    D("sources", 1),
    { key: "scan_steam",     section: 1, label: t("settings.scanSteam"),     type: "toggle" },
    { key: "scan_xbox",      section: 1, label: t("settings.scanXbox"),      type: "toggle" },
    { key: "scan_uwp",       section: 1, label: t("settings.scanStoreApps"), type: "toggle" },
    { key: "scan_desktop",   section: 1, label: t("settings.scanDesktop"),   type: "toggle" },
    { key: "scan_battlenet", section: 1, label: t("settings.scanBattlenet"), type: "toggle" },

    D("customFolders", 1),
    { key: "custom_folders",  section: 1, label: t("settings.customFolders"),  type: "custom_folders" },
    { key: "refresh_library", section: 1, label: t("settings.refreshLibrary"), type: "refresh" },

    // ── Behavior ─────────────────────────────────────────────────
    D("navigation", 2),
    { key: "default_tab",      section: 2, label: t("settings.defaultTab"),      type: "cycle",  options: ["Home","Games","Apps"] },
    { key: "repeat_speed",     section: 2, label: t("settings.repeatSpeed"),     type: "cycle",  options: ["slow","normal","fast"] },
    { key: "launch_at_startup",section: 2, label: t("settings.launchAtStartup"), type: "toggle" },

    D("localization", 2),
    { key: "language",    section: 2, label: t("settings.language"),   type: "cycle",  options: ["auto","en","fr"] },
    { key: "time_format", section: 2, label: t("settings.timeFormat"), type: "cycle",  options: ["auto","12h","24h"] },
    { key: "show_clock",  section: 2, label: t("settings.showClock"),  type: "toggle" },
    { key: "show_date",   section: 2, label: t("settings.showDate"),   type: "toggle" },
    { key: "show_battery",section: 2, label: t("settings.showBattery"),type: "toggle" },

    D("media", 2),
    { key: "animated_heroes", section: 2, label: t("settings.heroArtMode"), type: "cycle", options: ["static","animated","custom"] },

    // ── Controller ───────────────────────────────────────────────
    { key: "gamepad_platform",       section: 3, label: t("settings.gamepadPlatform"),     type: "cycle",  options: ["xbox","ps","switch"] },
    { key: "gamepad_auto_detect",    section: 3, label: t("settings.gamepadAutoDetect"),    type: "toggle" },
    { key: "gamepad_icons_colored",     section: 3, label: t("settings.gamepadIconsColored"),    type: "toggle" },
    { key: "gamepad_icons_filled",      section: 3, label: t("settings.gamepadIconsFilled"),     type: "toggle" },
    { key: "gamepad_icons_theme_color", section: 3, label: t("settings.gamepadIconsThemeColor"), type: "toggle" },
    { key: "gamepad_btn_size",          section: 3, label: t("settings.gamepadBtnSize"),          type: "cycle",  options: ["small", "medium", "large"] },
    { key: "gamepad_icon_preview",      section: 3, label: "",                                   type: "icon_preview" },
    { key: "controller_test",        section: 3, label: t("settings.controllerTest"),      type: "controller_test" },

    // ── Data ─────────────────────────────────────────────────────
    { key: "clear_recents", section: 4, label: t("settings.clearRecents"), type: "action" },
    { key: "clear_cache",   section: 4, label: t("settings.clearCache"),   type: "action" },

    // ── About ─────────────────────────────────────────────────────
    { key: "version",      section: 5, label: t("settings.version", { version: APP_VERSION }), type: "info" },
    { key: "check_updates",section: 5, label: t("settings.checkUpdates"), type: "update" },

    D("community", 5),
    { key: "coffee",  section: 5, label: t("settings.coffee"),  type: "link" },
    { key: "github",  section: 5, label: t("settings.github"),  type: "link" },
    { key: "discord", section: 5, label: t("settings.discord"), type: "link" },

    D("credits", 5),
    { key: "credit1", section: 5, label: "Mysterious Magical Bell Flourish", author: "DanaiOuranos",  license: "CC0",        url: "https://freesound.org/s/848847/",                       type: "attribution" },
    { key: "credit2", section: 5, label: "Achievement Sparkle",              author: "DanaiOuranos",  license: "CC0",        url: "https://freesound.org/s/715067/",                       type: "attribution" },
    { key: "credit3", section: 5, label: "Mysterious Sparkle Flourish",      author: "DanaiOuranos",  license: "CC0",        url: "https://freesound.org/s/844398/",                       type: "attribution" },
    { key: "credit4", section: 5, label: "Universal UI Soundpack",           author: "Nathan Gibson", license: "CC BY 4.0",  url: "https://cyrex-studios.itch.io/universal-ui-soundpack", type: "attribution" },
  ];
}

/** Returns the navigable items for a given section index. */
export function getSectionNavigableItems(
  sectionIndex: number,
  allItems: any[],
  settings: Record<string, any>
) {
  return allItems
    .filter((i) => i.section === sectionIndex)
    .flatMap((i) =>
      i.subItems && settings[i.key] ? [i, ...i.subItems] : [i]
    )
    .filter(
      (i) =>
        i.type !== "divider" &&
        i.type !== "info" &&
        i.type !== "icon_preview" &&
        i.type !== "controller_test"
    );
}

// ── SettingsScreen props ───────────────────────────────────────
export interface SettingsScreenProps {
  settings: Record<string, any>;
  updateSetting: (key: string, value: any) => void;
  accent: any;
  glass: any;
  isDark: boolean;
  theme: any;
  settingsFocusIndex: number;
  settingsSection: number;
  settingsFocusedRef: React.RefObject<any>;
  customFolders: Array<{ id: string; path: string; source: string; app_type: string; enabled: boolean }>;
  onOpenFolderManager: () => void;
  libraryRefreshStatus: string | null;
  refreshLibrary: () => void;
  updateStatus: string | null;
  updateInfo: string | null;
  checkForUpdates: () => void;
  onClearRecents: () => void;
  handleClearCache: () => void;
  autoScale: number;
  sliderDraft: { key: string | null; value: number | null };
  sliderDraftRef: React.RefObject<{ key: string | null; value: number | null }>;
  setSliderDraft: (v: { key: string | null; value: number | null }) => void;
  ACCENTS: Record<string, any>;
  wideLayout: boolean;
}

export function SettingsScreen({
  settings,
  updateSetting,
  accent,
  glass,
  isDark,
  theme,
  settingsFocusIndex,
  settingsSection,
  settingsFocusedRef,
  customFolders,
  onOpenFolderManager,
  libraryRefreshStatus,
  refreshLibrary,
  updateStatus,
  updateInfo,
  checkForUpdates,
  onClearRecents,
  handleClearCache,
  autoScale,
  sliderDraft,
  sliderDraftRef,
  setSliderDraft,
  ACCENTS,
  wideLayout,
}: SettingsScreenProps) {
  const { t } = useTranslation();
  const GITHUB_REPO = "PixelateWizard/LiftOff";

  const ALL_ITEMS = buildSettingsItems(t, isDark);
  const sectionItems = ALL_ITEMS.filter((i) => i.section === settingsSection);
  const navigableItems = getSectionNavigableItems(settingsSection, ALL_ITEMS, settings);

  const makeRowStyle = (focused: boolean, sub = false) => ({
    ...glass,
    borderRadius: 14,
    padding: "14px 20px",
    marginBottom: sub ? 6 : 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    transition: "all 0.15s ease",
    ...(focused && !sub
      ? {
          border: `1px solid ${accent.glow}0.6)`,
          boxShadow: `0 0 0 1px ${accent.glow}0.3), 0 0 20px ${accent.glow}0.1)`,
          background: isDark ? `${accent.glow}0.08)` : `${accent.glow}0.05)`,
        }
      : { border: "1px solid rgba(255,255,255,0.06)" }),
  });

  const renderItem = (item: any) => {
    if (item.type === "divider") {
      return (
        <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "22px 4px 6px" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: theme.textFaint, textTransform: "uppercase", letterSpacing: "0.12em", flexShrink: 0 }}>
            {item.label}
          </span>
          <div style={{ flex: 1, height: 1, background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }} />
        </div>
      );
    }

    const navIdx = navigableItems.findIndex((n) => n.key === item.key);
    const focused = settingsFocusIndex === navIdx && navIdx !== -1;
    const rowRef = focused ? settingsFocusedRef : null;
    const rowStyle = makeRowStyle(focused);

    if (item.type === "info")
      return (
        <div key={item.key} ref={rowRef} style={{ ...rowStyle, justifyContent: "center", cursor: "default" }}>
          <span style={{ fontSize: 13, color: theme.textDim }}>{item.label}</span>
        </div>
      );

    if (item.type === "toggle") {
      const val = settings[item.key];
      if (item.subItems) {
        return (
          <CollapsibleGroup
            key={item.key}
            glass={glass}
            accent={accent}
            isDark={isDark}
            theme={theme}
            label={item.label}
            value={val}
            onChange={(newVal: any) => updateSetting(item.key, newVal)}
            focused={focused}
            focusedRef={rowRef}
            items={item.subItems.map((sub: any) => {
              const subNavIdx = navigableItems.findIndex((n) => n.key === sub.key);
              const subFocused = settingsFocusIndex === subNavIdx && subNavIdx !== -1;
              if (sub.type === "cycle") {
                return {
                  type: "cycle" as const,
                  label: sub.label,
                  cycleValue: settings[sub.key],
                  cycleOptions: sub.options,
                  onCycleChange: (newVal: any) => updateSetting(sub.key, newVal),
                  cycleLabel: (v: string) => String(t(`settings.values.${v}`, v)),
                  focused: subFocused,
                  focusedRef: settingsFocusedRef,
                };
              }
              return {
                label: sub.label,
                value: settings[sub.key],
                onChange: (newVal: any) => updateSetting(sub.key, newVal),
                focused: subFocused,
                focusedRef: settingsFocusedRef,
              };
            })}
          />
        );
      }
      return (
        <div key={item.key} ref={rowRef} style={rowStyle} onClick={() => updateSetting(item.key, !val)}>
          <span style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{item.label}</span>
          <ToggleKnob value={val} accent={accent} isDark={isDark} />
        </div>
      );
    }

    if (item.type === "cycle") {
      const opts = item.options;
      const cur = opts.indexOf(settings[item.key]);
      return (
        <div key={item.key} ref={rowRef} style={rowStyle}>
          <span style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{item.label}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: theme.textDim, cursor: "pointer", userSelect: "none" }}
              onClick={() => updateSetting(item.key, opts[(cur - 1 + opts.length) % opts.length])}>◀</span>
            <span style={{ fontSize: 12, color: accent.primary, fontWeight: 600 }}>
              {String(t(`settings.values.${settings[item.key]}`, settings[item.key]))}
            </span>
            <span style={{ fontSize: 10, color: theme.textDim, cursor: "pointer", userSelect: "none" }}
              onClick={() => updateSetting(item.key, opts[(cur + 1) % opts.length])}>▶</span>
          </div>
        </div>
      );
    }

    if (item.type === "accent") {
      const accentKeys = Object.keys(ACCENTS);
      const curIdx = accentKeys.indexOf(settings.accent);
      return (
        <div key={item.key} ref={rowRef} style={rowStyle}>
          <span style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{item.label}</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 10, color: theme.textDim, cursor: "pointer", userSelect: "none" }}
              onClick={() => updateSetting("accent", accentKeys[(curIdx - 1 + accentKeys.length) % accentKeys.length])}>◀</span>
            {Object.entries(ACCENTS).map(([name, a]: [string, any]) => (
              <div key={name} onClick={() => updateSetting("accent", name)}
                style={{ width: 20, height: 20, borderRadius: "50%", background: a.primary, border: settings.accent === name ? "2px solid white" : "2px solid transparent", boxShadow: settings.accent === name ? `0 0 8px ${a.glow}0.8)` : "none", cursor: "pointer", transition: "all 0.15s ease" }} />
            ))}
            <span style={{ fontSize: 10, color: theme.textDim, cursor: "pointer", userSelect: "none" }}
              onClick={() => updateSetting("accent", accentKeys[(curIdx + 1) % accentKeys.length])}>▶</span>
          </div>
        </div>
      );
    }

    if (item.type === "refresh") {
      const statusText = libraryRefreshStatus === "scanning" ? t("settings.status.scanning")
        : libraryRefreshStatus === "done" ? t("settings.status.done")
        : t("settings.status.refresh");
      const statusColor = libraryRefreshStatus === "done" ? "#4ae88a" : theme.textDim;
      return (
        <div key={item.key} ref={rowRef} style={rowStyle} onClick={refreshLibrary}>
          <span style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{item.label}</span>
          <span style={{ fontSize: 12, color: statusColor }}>{statusText}</span>
        </div>
      );
    }

    if (item.type === "slider") {
      const val = settings[item.key] ?? 1.0;
      const isDragging = sliderDraft.key === item.key;
      const displayVal = isDragging ? sliderDraft.value! : val;
      const pct = `${Math.round(displayVal * 100)}%`;
      const trackPct = ((displayVal - item.min) / (item.max - item.min)) * 100;

      const handleTrackMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const clamp = (v: number) => Math.round(Math.max(item.min, Math.min(item.max, v)) * 100) / 100;
        const snap = (v: number) => Math.round(v / item.step) * item.step;
        const calcVal = (clientX: number) =>
          clamp(snap(item.min + ((clientX - rect.left) / rect.width) * (item.max - item.min)));
        const initial = calcVal(e.clientX);
        sliderDraftRef.current = { key: item.key, value: initial };
        setSliderDraft({ key: item.key, value: initial });
        const onMove = (me: MouseEvent) => {
          const v = calcVal(me.clientX);
          sliderDraftRef.current = { key: item.key, value: v };
          setSliderDraft({ key: item.key, value: v });
        };
        const onUp = () => {
          updateSetting(item.key, sliderDraftRef.current.value);
          sliderDraftRef.current = { key: null, value: null };
          setSliderDraft({ key: null, value: null });
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      };

      return (
        <div key={item.key} ref={rowRef} style={rowStyle}>
          <span style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{item.label}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: focused ? accent.primary : theme.textDim, cursor: "pointer", userSelect: "none" }}
              onClick={() => updateSetting(item.key, Math.max(item.min, Math.round((val - item.step) * 100) / 100))}>◀</span>
            <div onMouseDown={handleTrackMouseDown}
              style={{ width: 140, height: 4, borderRadius: 2, background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)", position: "relative", flexShrink: 0, cursor: "pointer" }}>
              <div style={{ height: "100%", borderRadius: 2, background: accent.primary, width: `${trackPct}%`, transition: isDragging ? "none" : "width 0.08s ease" }} />
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: accent.primary, position: "absolute", top: -5, left: `calc(${trackPct}% - 7px)`, transition: isDragging ? "none" : "left 0.08s ease", boxShadow: `0 0 8px ${accent.glow}0.6)` }} />
            </div>
            <span style={{ fontSize: 11, color: focused ? accent.primary : theme.textDim, cursor: "pointer", userSelect: "none" }}
              onClick={() => updateSetting(item.key, Math.min(item.max, Math.round((val + item.step) * 100) / 100))}>▶</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: accent.primary, minWidth: 40, textAlign: "right" }}>{pct}</span>
          </div>
        </div>
      );
    }

    if (item.type === "action")
      return (
        <div key={item.key} ref={rowRef} style={rowStyle} onClick={() => {
          if (item.key === "clear_recents") onClearRecents();
          if (item.key === "clear_cache")   handleClearCache();
          if (item.key === "reset_scale")   updateSetting("ui_scale", autoScale);
        }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: item.key === "reset_scale" ? theme.text : "#e84a4a" }}>{item.label}</span>
          <span style={{ fontSize: 12, color: theme.textDim }}>
            {item.key === "reset_scale" ? t("settings.status.apply") : t("settings.status.confirm")}
          </span>
        </div>
      );

    if (item.type === "update") {
      const statusText =
        updateStatus === "checking"   ? t("settings.status.checking")
        : updateStatus === "up_to_date" ? t("settings.status.upToDate")
        : updateStatus === "available"  ? t("settings.status.updateAvailable", { version: updateInfo })
        : updateStatus === "error"      ? t("settings.status.checkFailed")
        : t("settings.status.check");
      const statusColor =
        updateStatus === "up_to_date" ? "#4ae88a"
        : updateStatus === "available"  ? accent.primary
        : updateStatus === "error"      ? "#e84a4a"
        : theme.textDim;
      return (
        <div key={item.key} ref={rowRef} style={rowStyle} onClick={() => {
          if (updateStatus === "available")
            invoke("launch_app", { path: `https://github.com/${GITHUB_REPO}/releases/latest`, id: "releases", name: "LiftOff Releases", appType: "app" }).catch(() => {});
          else checkForUpdates();
        }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{item.label}</span>
          <span style={{ fontSize: 12, color: statusColor, fontWeight: updateStatus === "available" ? 600 : 400 }}>{statusText}</span>
        </div>
      );
    }

    if (item.type === "link")
      return (
        <div key={item.key} ref={rowRef} style={rowStyle} onClick={() => {
          if (item.key === "coffee")  invoke("launch_app", { path: "https://buymeacoffee.com/liftoff_handheld_launcher", id: "coffee", name: "Buy Me a Coffee", appType: "app" }).catch(() => {});
          if (item.key === "github")  invoke("launch_app", { path: "https://github.com/PixelateWizard/LiftOff", id: "github", name: "GitHub", appType: "app" }).catch(() => {});
          if (item.key === "discord") invoke("launch_app", { path: "https://discord.gg/F5ncP75WtD", id: "discord", name: "Discord", appType: "app" }).catch(() => {});
        }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{item.label}</span>
          <span style={{ fontSize: 12, color: theme.textDim }}>{t("settings.status.open")}</span>
        </div>
      );

    if (item.type === "attribution")
      return (
        <div key={item.key} ref={rowRef} style={rowStyle} onClick={() => {
          if (item.url) invoke("launch_app", { path: item.url, id: item.key, name: item.label, appType: "app" }).catch(() => {});
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: theme.text }}>{item.label}</span>
            <span style={{ fontSize: 11, color: theme.textDim }}>{t("settings.attribution", { author: item.author, license: item.license })}</span>
          </div>
          <span style={{ fontSize: 12, color: theme.textDim }}>{t("settings.status.open")}</span>
        </div>
      );

    if (item.type === "icon_preview")
      return (
        <div key={item.key} style={{ ...glass, borderRadius: 14, padding: "16px 20px", marginBottom: 8, border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` }}>
          <GamepadIconPreview isDark={isDark} theme={theme} />
        </div>
      );

    if (item.type === "controller_test")
      return (
        <div key={item.key} style={{ ...glass, borderRadius: 14, padding: "14px 20px", marginBottom: 8, border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` }}>
          <ControllerTestWidget accent={accent} theme={theme} isDark={isDark} glass={glass} />
        </div>
      );

    if (item.type === "custom_folders") {
      const gameFolders = customFolders.filter((f) => f.app_type === "game");
      const appFolders  = customFolders.filter((f) => f.app_type !== "game");
      const toggleFolder = (folderId: string, enabled: boolean) => {
        invoke("toggle_custom_folder", { id: folderId, enabled }).then(() => {
          // state update handled in parent via onOpenFolderManager
        });
      };
      const renderFolderGroup = (folders: any[], groupLabel: string) =>
        folders.length === 0 ? null : (
          <div key={groupLabel}>
            <div style={{ fontSize: 10, fontWeight: 700, color: theme.textFaint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4, marginTop: 8 }}>{groupLabel}</div>
            {folders.map((folder: any) => (
              <div key={folder.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` }}>
                <div style={{ fontSize: 11, color: folder.enabled !== false ? theme.text : theme.textFaint, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.path}</div>
                <div style={{ fontSize: 9, color: theme.textFaint, flexShrink: 0 }}>{folder.source}</div>
                <div onClick={() => toggleFolder(folder.id, folder.enabled !== false ? false : true)}
                  style={{ width: 36, height: 20, borderRadius: 10, background: folder.enabled !== false ? accent.primary : (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"), position: "relative", cursor: "pointer", flexShrink: 0 }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: "white", position: "absolute", top: 3, left: folder.enabled !== false ? 19 : 3, transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
                </div>
              </div>
            ))}
          </div>
        );

      return (
        <div key={item.key} ref={rowRef} style={{ ...glass, borderRadius: 14, padding: "14px 20px", marginBottom: 8, border: focused ? `1px solid ${accent.glow}0.6)` : `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, boxShadow: focused ? `0 0 0 1px ${accent.glow}0.3), 0 0 20px ${accent.glow}0.1)` : "none" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: customFolders.length > 0 ? 4 : 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: focused ? accent.primary : theme.textDim, textTransform: "uppercase", letterSpacing: "0.08em" }}>{item.label}</div>
            <span style={{ fontSize: 10, color: theme.textFaint, cursor: "pointer" }} onClick={onOpenFolderManager}>↵ {t("grid.manage")}</span>
          </div>
          {customFolders.length === 0 && <div style={{ fontSize: 12, color: theme.textFaint, fontStyle: "italic" }}>{t("settings.noCustomFolders")}</div>}
          {renderFolderGroup(gameFolders, t("tabs.games"))}
          {renderFolderGroup(appFolders, t("tabs.apps"))}
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ ...(wideLayout ? {} : { maxWidth: 1400, margin: "0 auto" }), width: "100%", boxSizing: "border-box" as const }}>
      <div style={{ padding: "0 24px 160px" }}>
        {sectionItems.map(renderItem)}
      </div>
    </div>
  );
}
