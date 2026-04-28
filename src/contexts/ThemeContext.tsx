import { createContext, useContext, type ReactNode } from "react";
import type { CSSProperties } from "react";
import type { ThemeColors, AccentColors } from "../types";

export type { ThemeColors, AccentColors };

export interface ThemeValue {
  isDark: boolean;
  theme: ThemeColors;
  accent: AccentColors;
  glass: CSSProperties;
  appBg: string;
  bgGlow1: string;
  bgGlow2: string;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ value, children }: { value: ThemeValue; children: ReactNode }) {
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
