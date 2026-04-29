import { createContext, useContext, type ReactNode, type RefObject } from "react";
import type { Settings } from "../types";

export interface SettingsValue {
  settings: Settings;
  settingsRef: RefObject<Settings>;
  updateSetting: (key: keyof Settings, value: Settings[keyof Settings]) => void;
  updateSettingsBatch: (updates: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ value, children }: { value: SettingsValue; children: ReactNode }) {
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
