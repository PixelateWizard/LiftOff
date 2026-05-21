import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { IoHomeSharp, IoGameController, IoApps, IoSettings } from "react-icons/io5";
import { GamepadBtn } from "../GamepadBtn";
import { SectionTabHeader } from "../SectionTabHeader";
import type { TabItem } from "../SectionTabBar";
import { useTheme } from "../../contexts/ThemeContext";
import { useSettings } from "../../contexts/SettingsContext";
import { FocusRing } from "../ui/FocusRing";

const TAB_ICONS: Record<string, (size: number, color: string) => ReactNode> = {
  Home:     (s, c) => <IoHomeSharp     size={s} color={c} />,
  Games:    (s, c) => <IoGameController size={s} color={c} />,
  Apps:     (s, c) => <IoApps          size={s} color={c} />,
  Settings: (s, c) => <IoSettings      size={s} color={c} />,
};

interface Props {
  tab: string;
  tabs: string[];
  switchTab: (tab: string) => void;
  date: string;
  time: string;
  hasBattery: boolean;
  battery: number;
  batteryWidth: string;
  batteryColor: string;
  batteryTextColor: string;
  batteryBoltFill: string;
  batteryBoltStroke: string;
  charging: boolean;
  headerTabItems: TabItem[];
  headerActiveIndex: number;
  headerOnSelect: (i: number) => void;
  headerRightActions?: ReactNode;
}

function RocketLogo({ accent }: { accent: { primary: string; light: string; dark: string } }) {
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

function widthConstraints(wideLayout: boolean, transparent: boolean, topMargin: boolean, uiScale: number): CSSProperties {
  const px = (n: number) => `${Math.round(n / uiScale)}px`;
  const mt = topMargin ? px(14) : px(4);
  if (wideLayout) {
    return transparent
      ? { width: "100%", margin: `${mt} 0 0`, boxSizing: "border-box" }
      : { width: "calc(100% - 16px)", margin: `${mt} 8px 0`, boxSizing: "border-box" };
  }
  return { maxWidth: 1400, margin: `${mt} auto 0`, width: "calc(100% - 48px)" };
}

export function AppHeader({
  tab, tabs, switchTab,
  date, time, hasBattery, battery, batteryWidth, batteryColor, batteryTextColor, batteryBoltFill, batteryBoltStroke, charging,
  headerTabItems, headerActiveIndex, headerOnSelect, headerRightActions,
}: Props) {
  const { t } = useTranslation();
  const { glassBar, accent, theme, isDark, glassEnabled, surfaceStyle, surface, resolvedTheme } = useTheme();
  const { settings } = useSettings();
  const activePillText = "rgba(20, 14, 10, 0.90)";
  const activeTextColor = isDark
    ? (accent.darkText ? activePillText : "white")
    : (accent.lightDarkText ? activePillText : "white");

  const transparentNav    = !(settings.topbar_background ?? true);
  const tabbarBg          = settings.tabbar_with_background ?? false;
  const tabbarBgCompact   = tabbarBg && (settings.tabbar_background_compact ?? false);
  const wideLayout        = settings.wide_topbar ?? false;
  const isHome         = tab === "Home";
  const uiScale        = settings.ui_scale ?? 1;
  const subtabGap      = Math.round(16 / uiScale);
  const isPixel        = surfaceStyle === "win9x";
  const navRadius      = isPixel ? 0 : surfaceStyle === "material" ? 8 : 16;
  const pixelFullBleedNav: CSSProperties = isPixel ? {
    width: "100%",
    maxWidth: "none",
    margin: 0,
    boxSizing: "border-box",
  } : {};
  const pixelTitleBar = isPixel ? (
    <div style={{
      height: 22,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 5px 0 7px",
      boxSizing: "border-box",
      background: surface.titleBarBg,
      borderBottom: surface.titleBarBorder,
    }}>
      <span style={{ color: "white", fontSize: 11, fontFamily: "Tahoma, Arial, sans-serif", fontWeight: 700 }}>
        LiftOff
      </span>
      <span style={{ width: 14, height: 14, background: surface.buttonBg, border: "1px solid", borderColor: surface.buttonBorder, boxShadow: surface.buttonShadow, color: surface.buttonText, fontSize: 10, lineHeight: "12px", textAlign: "center", fontFamily: "monospace", fontWeight: 700 }}>
        x
      </span>
    </div>
  ) : null;

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
          <GamepadBtn btn="LB" label="" style={{ gap: 0 }} />
        )}
        <div style={{ display: "flex", gap: 2 }}>
          {tabs.map((tabName) => {
            const isActive = tab === tabName;
            const iconMode = settings.tabbar_icon_mode ?? "text";
            const color = isActive ? (resolvedTheme === "onyx" ? accent.primary : activeTextColor) : theme.textDim;
            const iconNode = TAB_ICONS[tabName]?.(16, color);
            const showIcon = iconMode === "icons" || iconMode === "both";
            const showText = iconMode === "text"  || iconMode === "both";
            return (
              <div key={tabName} onClick={() => switchTab(tabName)} style={{
                fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
                padding: showIcon && !showText ? "6px 10px" : "6px 16px",
                borderRadius: isPixel ? 0 : 8, cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: showIcon && showText ? 2 : 0,
                position: "relative",
                transition: "background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, border-color 0.15s ease",
                ...(isActive
                  ? {
                      background: resolvedTheme === "onyx" ? "transparent" : accent.primary,
                      border: `1px solid ${resolvedTheme === "onyx" ? "transparent" : accent.primary}`,
                      boxShadow: resolvedTheme === "onyx"
                        ? "none"
                        : surfaceStyle === "aero"
                        ? `inset 0 1px 0 rgba(255,255,255,0.80), inset 0 2px 10px rgba(255,255,255,0.24), inset 0 -1px 0 rgba(0,0,0,0.28), 0 4px 16px ${accent.glow}0.55)`
                        : surfaceStyle === "material"
                        ? "var(--material-shadow-medium)"
                        : `0 4px 24px ${accent.glow}0.5)`,
                      color: resolvedTheme === "onyx" ? accent.primary : activeTextColor,
                    }
                  : {
                      background: "transparent",
                      border: "1px solid transparent",
                      color: theme.textDim,
                    }),
              }}>
                {showIcon && iconNode}
                {showText && <span style={{ lineHeight: 1 }}>{t(`tabs.${tabName.toLowerCase()}`)}</span>}
                <FocusRing focused={isActive} variant="spin" elementRadius={isPixel ? 0 : 8} />
              </div>
            );
          })}
        </div>
        {settings.nav_bumpers_pos === "header" && (
          <GamepadBtn btn="RB" label="" style={{ gap: 0 }} />
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, justifyContent: "flex-end" }}>
        {settings.show_date && <span style={{ fontSize: 12, color: theme.textDim, ...(isDark && glassEnabled && surfaceStyle !== "material" ? { textShadow: "0 1px 2px rgba(0,0,0,0.55)" } : {}) }}>{date}</span>}
        {settings.show_clock && (
          <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? "rgba(245,237,232,0.7)" : "rgba(42,26,14,0.7)", ...(isDark && glassEnabled && surfaceStyle !== "material" ? { textShadow: "0 1px 2px rgba(0,0,0,0.55)" } : {}) }}>{time}</span>
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
                  <path d="M5 1L1 7h3l-1 4 4-6H4l1-4z" fill={batteryBoltFill} stroke={batteryBoltStroke} strokeWidth="0.45" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span style={{ fontSize: 11, color: batteryTextColor, ...(isDark && glassEnabled && surfaceStyle !== "material" ? { textShadow: "0 1px 2px rgba(0,0,0,0.55)" } : {}) }}>{battery}%</span>
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
      showButtons={settings.tabbar_show_buttons === "tabbar"}
      textTabs={settings.tabbar_text_tabs}
      fontWeight={settings.tabbar_font_weight}
      labelCase={settings.tabbar_label_case}
      rightActions={headerRightActions}
    />
  );

  // ── Case: nav + subtab share a single glass container ──────────
  if (!transparentNav && tabbarBg && !tabbarBgCompact && !isHome) {
    return (
      <div data-liftoff-nav-boundary style={{ position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{
          ...widthConstraints(wideLayout, false, true, uiScale),
          ...pixelFullBleedNav,
          ...glassBar, borderRadius: navRadius,
          display: "flex", flexDirection: "column",
        }}>
          {pixelTitleBar}
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
    <div data-liftoff-nav-boundary style={{ position: "sticky", top: 0, zIndex: 100 }}>

      {/* Nav row */}
      <div style={{
        display: "flex", flexDirection: isPixel ? "column" : "row", alignItems: isPixel ? "stretch" : "center", gap: isPixel ? 0 : 16, padding: isPixel ? 0 : "10px 20px",
        ...widthConstraints(wideLayout, transparentNav, true, uiScale),
        ...pixelFullBleedNav,
        ...(transparentNav ? {} : { ...glassBar, borderRadius: navRadius }),
      }}>
        {!transparentNav && pixelTitleBar}
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: isPixel ? "10px 20px" : 0, width: "100%", flex: 1, boxSizing: "border-box" }}>
          {navContent}
        </div>
      </div>

      {/* Subtab row */}
      {!isHome && (
        tabbarBg ? (
          tabbarBgCompact ? (
            <div style={{ position: "relative", marginTop: subtabGap, ...widthConstraints(wideLayout, false, false, uiScale) }}>
              <div style={{ width: "fit-content", margin: "0 auto", padding: "0 12px", ...glassBar, borderRadius: navRadius }}>
                <SectionTabHeader
                  items={headerTabItems}
                  activeIndex={headerActiveIndex}
                  onSelect={headerOnSelect}
                  showButtons={settings.tabbar_show_buttons === "tabbar"}
                  textTabs={settings.tabbar_text_tabs}
                  fontWeight={settings.tabbar_font_weight}
                  labelCase={settings.tabbar_label_case}
                />
              </div>
              {headerRightActions && (
                <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 6, alignItems: "center" }}>
                  {headerRightActions}
                </div>
              )}
            </div>
          ) : (
            <div style={{ ...widthConstraints(wideLayout, false, false, uiScale), marginTop: subtabGap, ...glassBar, borderRadius: navRadius }}>
              {subtab}
            </div>
          )
        ) : (
          <div style={{ marginTop: subtabGap }}>{subtab}</div>
        )
      )}

    </div>
  );
}
