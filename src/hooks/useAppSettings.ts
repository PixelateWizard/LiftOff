import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import i18n from "../i18n";
import type { Settings } from "../types";
import {
  DEFAULT_SETTINGS,
  SCAN_KEYS,
  THEME_SURFACE_DEFAULTS,
  normalizeThemeKey,
} from "../constants";

interface ScreenResolution {
  width: number;
  height: number;
}

interface UseAppSettingsOptions {
  onScanKeyChange: () => void;
  autoScaleRef: React.MutableRefObject<number>;
  onDefaultTabLoaded?: (tab: string) => void;
}

type SettingsAction = React.SetStateAction<Settings>;

export function useAppSettings({
  onScanKeyChange,
  autoScaleRef,
  onDefaultTabLoaded,
}: UseAppSettingsOptions) {
  const [settingsState, setSettingsState] = useState<Settings>({ ...DEFAULT_SETTINGS });
  const [defaultTab, setDefaultTab] = useState<string | null>(null);
  const settingsRef = useRef<Settings>({ ...DEFAULT_SETTINGS });

  const setSettings = (action: SettingsAction) => {
    setSettingsState(prev => {
      const next = typeof action === "function"
        ? (action as (prev: Settings) => Settings)(prev)
        : action;
      settingsRef.current = next;
      return next;
    });
  };

  useEffect(() => {
    const applyDefaultTab = (tab?: string) => {
      const loadedDefaultTab = tab || "Home";
      setDefaultTab(loadedDefaultTab);
      onDefaultTabLoaded?.(loadedDefaultTab);
    };

    Promise.all([invoke<ScreenResolution>("get_screen_resolution"), invoke<Partial<Settings>>("get_settings")]).then(([res, s]) => {
      const auto = Math.min(2.0, Math.max(0.75, Math.min(res.width / 1920, res.height / 1080)));
      autoScaleRef.current = auto;
      // ui_scale is null when never saved; substitute the auto-detected value.
      const updated = { ...settingsRef.current, ...s, ui_scale: s.ui_scale ?? auto };
      if (updated.surface_style === "pixel") updated.surface_style = "win9x";
      // Migrate: if wide_layout was true but sub-settings were never saved, enable content/bottom areas.
      if (updated.wide_layout && !updated.wide_topbar && !updated.wide_games && !updated.wide_apps && !updated.wide_settings && !updated.wide_bottombar) {
        updated.wide_games = true;
        updated.wide_apps = true;
        updated.wide_settings = true;
        updated.wide_bottombar = true;
      }
      const migratedHomePinnedPosition = updated.home_mode === "semi" && updated.home_pinned_pos === "bottom";
      if (migratedHomePinnedPosition) updated.home_pinned_pos = "top";
      setSettings(updated);
      if (s.surface_style === "pixel" || migratedHomePinnedPosition) invoke("save_settings", { settings: updated }).catch(console.error);
      applyDefaultTab(s.default_tab);
      if (s.language && s.language !== "auto") i18n.changeLanguage(s.language);
    }).catch(() => {
      invoke<Partial<Settings>>("get_settings").then(s => {
        const merged = { ...settingsRef.current, ...s };
        if (merged.surface_style === "pixel") merged.surface_style = "win9x";
        const migratedHomePinnedPosition = merged.home_mode === "semi" && merged.home_pinned_pos === "bottom";
        if (migratedHomePinnedPosition) merged.home_pinned_pos = "top";
        setSettings(merged);
        if (s.surface_style === "pixel" || migratedHomePinnedPosition) invoke("save_settings", { settings: merged }).catch(console.error);
        applyDefaultTab(s.default_tab);
        if (s.language && s.language !== "auto") i18n.changeLanguage(s.language);
      });
    });
  }, []);

  const updateSetting = (key: keyof Settings, value: Settings[keyof Settings]) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value };
      if (key === "wide_layout") {
        updated.wide_games = value as boolean;
        updated.wide_apps = value as boolean;
        updated.wide_settings = value as boolean;
        updated.wide_bottombar = value as boolean;
      }
      if (key === "home_mode") {
        updated.cinematic_home = (value as string) === "immersive";
        if (value === "semi" && updated.home_pinned_pos === "bottom") updated.home_pinned_pos = "top";
      }
      if (key === "home_pinned_pos" && updated.home_mode === "semi" && value === "bottom") {
        updated.home_pinned_pos = "top";
      }
      if (key === "theme") {
        const nextTheme = normalizeThemeKey(value as string);
        updated.theme = nextTheme;
        updated.surface_style = THEME_SURFACE_DEFAULTS[nextTheme] || updated.surface_style;
      }
      invoke("save_settings", { settings: updated }).catch(console.error);
      return updated;
    });
    if (SCAN_KEYS.includes(key as (typeof SCAN_KEYS)[number])) setTimeout(onScanKeyChange, 50);
    if (key === "language") {
      if (value === "auto") {
        const detected = navigator.language?.split("-")[0] || "en";
        i18n.changeLanguage(detected);
      } else {
        i18n.changeLanguage(value as string);
      }
    }
  };

  const updateSettingsBatch = (updates: Partial<Settings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...updates };
      if (Object.prototype.hasOwnProperty.call(updates, "theme")) {
        const nextTheme = normalizeThemeKey(updates.theme);
        updated.theme = nextTheme;
        if (!Object.prototype.hasOwnProperty.call(updates, "surface_style")) {
          updated.surface_style = THEME_SURFACE_DEFAULTS[nextTheme] || updated.surface_style;
        }
      }
      invoke("save_settings", { settings: updated }).catch(console.error);
      return updated;
    });
  };

  return {
    settings: settingsState,
    settingsRef,
    updateSetting,
    updateSettingsBatch,
    defaultTab,
  };
}
