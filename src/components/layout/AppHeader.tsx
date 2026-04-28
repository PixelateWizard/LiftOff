import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { GamepadBtn } from "../GamepadBtn";
import { SectionTabHeader } from "../SectionTabHeader";
import type { TabItem } from "../SectionTabBar";

interface AccentPalette {
  primary: string;
  light: string;
  dark: string;
  glow: string;
}

interface ThemePalette {
  text: string;
  textDim: string;
  textFaint: string;
}

interface AppHeaderSettings {
  accent?: string;
  theme?: string;
  transparent_topbar?: boolean;
  wide_layout?: boolean;
  nav_bumpers_pos?: string;
  tabbar_show_buttons?: string | boolean;
  tabbar_text_tabs?: boolean;
  tabbar_with_background?: boolean;
  tabbar_font_weight?: string;
  tabbar_label_case?: "default" | "ucfirst" | "uppercase";
  show_date?: boolean;
  show_clock?: boolean;
  show_battery?: boolean;
}

interface Props {
  tab: string;
  tabs: string[];
  switchTab: (tab: string) => void;
  settings: AppHeaderSettings;
  glass: CSSProperties;
  accent: AccentPalette;
  theme: ThemePalette;
  isDark: boolean;
  date: string;
  time: string;
  hasBattery: boolean;
  battery: number;
  batteryWidth: string;
  batteryColor: string;
  charging: boolean;
  headerTabItems: TabItem[];
  headerActiveIndex: number;
  headerOnSelect: (i: number) => void;
}

function RocketLogo({ accent }: { accent: AccentPalette }) {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
      <path d="M16 2 L21 9 L22 19 Q22 22 19 22 L13 22 Q10 22 10 19 L11 9 Z" fill="url(#rocketGrad)"/>
      <circle cx="16" cy="13" r="3.5" fill="white" opacity="0.9"/>
      <circle cx="16" cy="13" r="2" fill="#bde0ff" opacity="0.7"/>
      <circle cx="17" cy="12" r="0.7" fill="white"/>
      <path d="M10 18 L5 25 L11 21 Z" fill={accent.dark}/>
      <path d="M22 18 L27 25 L21 21 Z" fill={accent.dark}/>
      <path d="M12 22 Q14 30 16 27 Q18 30 20 22" fill="#ffb347" opacity="0.95"/>
      <path d="M13.5 22 Q15 28 16 26 Q17 28 18.5 22" fill="#fff176" opacity="0.75"/>
      <defs>
        <linearGradient id="rocketGrad" x1="16" y1="2" x2="16" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={accent.light}/><stop offset="100%" stopColor={accent.dark}/>
        </linearGradient>
      </defs>
    </svg>
  );
}

function widthConstraints(wideLayout: boolean, transparent: boolean, topMargin: boolean): CSSProperties {
  const mt = topMargin ? "14px" : "4px";
  if (wideLayout) {
    return transparent
      ? { width: "100%", margin: `${mt} 0 0`, boxSizing: "border-box" }
      : { width: "calc(100% - 16px)", margin: `${mt} 8px 0`, boxSizing: "border-box" };
  }
  return { maxWidth: 1400, margin: `${mt} auto 0`, width: "calc(100% - 48px)" };
}

export function AppHeader({
  tab, tabs, switchTab, settings, glass, accent, theme, isDark,
  date, time, hasBattery, battery, batteryWidth, batteryColor, charging,
  headerTabItems, headerActiveIndex, headerOnSelect,
}: Props) {
  const { t } = useTranslation();

  const transparentNav = settings.transparent_topbar ?? false;
  const tabbarBg       = settings.tabbar_with_background ?? false;
  const wideLayout     = settings.wide_layout ?? false;
  const isHome         = tab === "Home";

  const navContent = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
        <RocketLogo accent={accent} />
        <span key={`${settings.accent}-${settings.theme}`} style={{
          fontWeight: 700, fontSize: 16, letterSpacing: "0.04em",
          background: `linear-gradient(135deg, ${accent.light}, ${accent.primary})`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>LiftOff</span>
      </div>
      <div style={{ display: "flex", gap: "40px", justifyContent: "center", alignItems: "center" }}>
        {settings.nav_bumpers_pos === "header" && (
          <GamepadBtn btn="LB" label="" theme={theme} isDark={isDark} style={{ gap: 0 }} />
        )}
        <div style={{ display: "flex", gap: 2 }}>
          {tabs.map((tabName) => (
            <div key={tabName} onClick={() => switchTab(tabName)} style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
              color: tab === tabName ? theme.text : theme.textDim,
              padding: "6px 16px", borderRadius: 8, cursor: "pointer",
              border: `1px solid ${tab === tabName ? `${accent.glow}0.35)` : "transparent"}`,
              background: tab === tabName ? `${accent.glow}0.15)` : "transparent",
            }}>{t(`tabs.${tabName.toLowerCase()}`)}</div>
          ))}
        </div>
        {settings.nav_bumpers_pos === "header" && (
          <GamepadBtn btn="RB" label="" theme={theme} isDark={isDark} style={{ gap: 0 }} />
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, justifyContent: "flex-end" }}>
        {settings.show_date && <span style={{ fontSize: 12, color: theme.textDim }}>{date}</span>}
        {settings.show_clock && (
          <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? "rgba(245,237,232,0.7)" : "rgba(42,26,14,0.7)" }}>{time}</span>
        )}
        {hasBattery && settings.show_battery && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <div style={{
                width: 22, height: 11,
                border: `1.5px solid ${isDark ? "rgba(245,237,232,0.3)" : "rgba(42,26,14,0.3)"}`,
                borderRadius: 3, padding: "1.5px", display: "flex", alignItems: "center",
              }}>
                <div style={{ height: "100%", width: batteryWidth, background: batteryColor, borderRadius: 1, transition: "width 0.3s ease, background 0.3s ease" }} />
              </div>
              {charging && (
                <svg width="8" height="11" viewBox="0 0 8 12" fill="none" style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }}>
                  <path d="M5 1L1 7h3l-1 4 4-6H4l1-4z" fill="#4ae88a" stroke="#4ae88a" strokeWidth="0.3" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span style={{ fontSize: 11, color: charging ? "#4ae88a" : theme.textDim }}>{battery}%</span>
          </div>
        )}
      </div>
    </>
  );

  const subtab = (
    <SectionTabHeader
      items={headerTabItems}
      activeIndex={headerActiveIndex}
      onSelect={headerOnSelect}
      showButtons={settings.tabbar_show_buttons === "tabbar" || settings.tabbar_show_buttons === true}
      textTabs={settings.tabbar_text_tabs ?? false}
      fontWeight={settings.tabbar_font_weight as "thin" | "medium" | "bold" ?? "medium"}
      labelCase={settings.tabbar_label_case ?? "default"}
      accent={accent}
      theme={theme}
      isDark={isDark}
    />
  );

  // ── Case: nav + subtab share a single glass container ──────────
  if (!transparentNav && tabbarBg && !isHome) {
    return (
      <div style={{ position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{
          ...widthConstraints(wideLayout, false, true),
          ...glass, borderRadius: 16,
          display: "flex", flexDirection: "column",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 20px" }}>
            {navContent}
          </div>
          {subtab}
        </div>
      </div>
    );
  }

  // ── Cases: independent nav / subtab backgrounds ────────────────
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 100 }}>

      {/* Nav row */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16, padding: "10px 20px",
        ...widthConstraints(wideLayout, transparentNav, true),
        ...(transparentNav ? {} : { ...glass, borderRadius: 16 }),
      }}>
        {navContent}
      </div>

      {/* Subtab row */}
      {!isHome && (
        tabbarBg ? (
          <div style={{
            ...widthConstraints(wideLayout, false, false),
            ...glass, borderRadius: 12,
          }}>
            {subtab}
          </div>
        ) : (
          subtab
        )
      )}

    </div>
  );
}
