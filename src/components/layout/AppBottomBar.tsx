import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { GamepadBtn } from "../GamepadBtn";
import { useTheme } from "../../contexts/ThemeContext";
import { useSettings } from "../../contexts/SettingsContext";

interface Props {
  tab: string;
  appCollectionsCount: number;
  spotifyMiniBar?: ReactNode;
  spotifyConnected?: boolean;
  spotifyHasTrack?: boolean;
  /** 0..1 charge level while MENU is held to open the Spotify overlay. */
  spotifyHoldProgress?: number;
}

export function AppBottomBar({ tab, appCollectionsCount, spotifyMiniBar, spotifyConnected = false, spotifyHasTrack = false, spotifyHoldProgress = 0 }: Props) {
  const { t } = useTranslation();
  const { glassBar, theme, isDark, surfaceStyle, accent, resolvedTheme } = useTheme();
  const { settings } = useSettings();

  const Btn = ({ label }: { label: string }) => (
    <GamepadBtn btn={label[0]} label={label.slice(2)} />
  );

  const hasBackground = settings.bottombar_background ?? true;
  const compact = settings.bottombar_compact ?? "off";
  const isCompact = hasBackground && (
    compact === "always" ||
    (compact === "home" && tab === "Home") ||
    (compact === "except_home" && tab !== "Home")
  );
  // cinematic home rend la barre transparente uniquement quand pas en mode compact
  const isTransparent = !hasBackground || (!isCompact && settings.cinematic_home && tab === "Home");
  const justify =
    settings.bottombar_alignment === "center" ? "center" :
    settings.bottombar_alignment === "right"  ? "flex-end" : "flex-start";

  const showBumpersInBottom = settings.nav_bumpers_pos === "bottom";
  // support old boolean value (true → was "tabbar")
  const showTriggersInBottom = settings.tabbar_show_buttons === "bottom";
  const isPixel = surfaceStyle === "win9x";
  // Match the nav header: the bar only goes wide when Wide Layout itself is
  // enabled, so a stale hidden wide_bottombar value cannot stretch it
  // full-width while the header stays inset.
  const wideBar = (settings.wide_layout ?? false) && (settings.wide_bottombar ?? false);

  // Bottom bar casts its shadow upward onto content above it — override the downward drop shadow
  // from glassBar (which is designed for the top nav). Inset highlights stay the same.
  const solidBarGlass: CSSProperties = {
    ...glassBar,
    borderRadius: resolvedTheme === "cyberpunk" ? 0 : isPixel ? 0 : surfaceStyle === "material" ? 8 : 16,
    ...(surfaceStyle === "aero" ? {
      boxShadow: isDark
        ? `inset 0 1px 0 rgba(255,255,255,0.52), inset 0 2px 7px rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.18), 0 0 0 1px ${accent.glow}0.14), 0 -4px 16px rgba(0,0,0,0.22)`
        : `inset 0 1px 0 rgba(255,255,255,0.99), inset 0 -1px 0 rgba(0,0,0,0.06), 0 0 0 1px ${accent.glow}0.10), 0 -4px 16px rgba(0,0,0,0.10)`,
    } : surfaceStyle === "material" ? {
      boxShadow: isDark
        ? "0 -10px 30px rgba(0,0,0,0.30), 0 -24px 60px rgba(0,0,0,0.20)"
        : "0 -10px 30px rgba(46,34,22,0.12), 0 -24px 60px rgba(46,34,22,0.08)",
    } : surfaceStyle === "glass" ? {
      boxShadow: isDark
        ? "inset 0 0 0 0.5px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.16), 0 -6px 20px rgba(0,0,0,0.25)"
        : "inset 0 1px 0 rgba(255,255,255,0.75), inset 0 -1px 0 rgba(0,0,0,0.08), 0 -8px 28px rgba(0,0,0,0.16)",
    } : {}),
  };
  const barGlass: CSSProperties = isTransparent ? {} : solidBarGlass;

  if (settings.hide_bottom_bar) {
    if (!spotifyMiniBar || !spotifyHasTrack) return null;
    const pillMargin =
      settings.bottombar_alignment === "right" ? "0 18px 18px auto" :
      settings.bottombar_alignment === "center" ? "0 auto 18px" :
      "0 auto 18px 18px";

    return (
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, pointerEvents: "none" }}>
        <div style={{
          width: "fit-content",
          margin: pillMargin,
          pointerEvents: "auto",
        } as CSSProperties}>
          {spotifyMiniBar}
        </div>
      </div>
    );
  }

  const bumpersHint = showBumpersInBottom && (
    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: theme.textDim }}>
      <GamepadBtn btn="LB" label="" style={{ gap: 3 }} />
      <GamepadBtn btn="RB" label={t('gamepad.tabs')} />
    </span>
  );

  const triggersHint = (label: string) => showTriggersInBottom && (
    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: theme.textDim }}>
      <GamepadBtn btn="LT" label="" style={{ gap: 3 }} />
      <GamepadBtn btn="RT" label={t(label)} />
    </span>
  );

  return (
    <div style={{ position: "sticky", bottom: 0, zIndex: 100 }}>
      <div data-bottom-bar="" style={{
        display: "flex", gap: 20, alignItems: "center", padding: "10px 20px",
        justifyContent: justify,
        ...barGlass,
        ...(isCompact
          ? {
              width: "fit-content",
              padding: "10px 24px",
              ...(settings.bottombar_alignment === "right"
                ? { margin: "0 16px 14px auto" }
                : settings.bottombar_alignment === "center"
                ? { margin: "0 auto 14px" }
                : { margin: "0 auto 14px 16px" }),
            }
          : wideBar
          ? (isTransparent
            ? { width: "100%", margin: "0 0 14px", boxSizing: "border-box" }
            : { width: "calc(100% - 16px)", margin: "0 8px 14px", boxSizing: "border-box" })
          : { maxWidth: 1400, margin: "0 auto 14px", width: "calc(100% - 48px)" }),
      } as CSSProperties}>
        {spotifyMiniBar}
        {tab === "Settings" ? (
          <>
            <Btn label={t('gamepad.aSelect')} />
            <Btn label={t('gamepad.bBack')} />
            {bumpersHint}
            {triggersHint('gamepad.sections')}
          </>
        ) : (
          <>
            <Btn label={t('gamepad.aLaunch')} />
            <Btn label={t('gamepad.bBack')} />
            <Btn label={t('gamepad.ySearch')} />
            {tab !== "Apps" && <Btn label={t('gamepad.xPin')} />}
            {tab === "Home" && spotifyConnected && <GamepadBtn btn="BACK" label={t('spotify.title')} />}
            {bumpersHint}
            {tab === "Games" && (
              <>
                {triggersHint('gamepad.source')}
                <GamepadBtn btn="MENU" label={t('gamepad.options')} />
                <GamepadBtn btn="BACK" label={t('grid.manage')}    />
              </>
            )}
            {tab === "Apps" && (
              <>
                {appCollectionsCount > 0 && triggersHint('gamepad.source')}
                <GamepadBtn btn="MENU" label={t('gamepad.options')} />
                <GamepadBtn btn="BACK" label={t('grid.manage')}    />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
