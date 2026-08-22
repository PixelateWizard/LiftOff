import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { IoChevronDown, IoChevronUp, IoVolumeHighOutline } from "react-icons/io5";
import { GamepadBtn } from "../GamepadBtn";
import { useTheme } from "../../contexts/ThemeContext";
import { useSettings } from "../../contexts/SettingsContext";

interface Props {
  tab: string;
  appCollectionsCount: number;
  spotifyMiniBar?: ReactNode;
  spotifyConnected?: boolean;
  spotifyHasTrack?: boolean;
  /** 0..1 charge level while MENU is held to open the helper tray. */
  spotifyHoldProgress?: number;
  trayOpen: boolean;
  onToggleTray: () => void;
  /** Forces the minimal pill visible briefly in hidden mode. */
  peekActive?: boolean;
}

export function AppBottomBar({
  tab,
  spotifyMiniBar,
  spotifyHasTrack = false,
  spotifyHoldProgress = 0,
  trayOpen,
  onToggleTray,
  peekActive = false,
}: Props) {
  const { t } = useTranslation();
  const { glassBar, theme, isDark, surfaceStyle, accent, resolvedTheme } = useTheme();
  const { settings } = useSettings();
  const [hoverPeek, setHoverPeek] = useState(false);
  const hoverLeavingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (hoverLeavingRef.current) clearTimeout(hoverLeavingRef.current);
  }, []);

  const mode = settings.bottombar_mode || (settings.hide_bottom_bar ? "minimal" : "full");
  const hasBackground = settings.bottombar_background ?? true;
  const isTransparent = !hasBackground || (settings.cinematic_home && tab === "Home");
  const isPixel = surfaceStyle === "win9x";
  const squareCorners = resolvedTheme === "cyberpunk" || isPixel;
  const showBumpers = settings.nav_bumpers_pos === "bottom";
  const showTriggers = settings.tabbar_show_buttons === "bottom";
  const wideBar = (settings.wide_layout ?? false) && (settings.wide_bottombar ?? false);

  const solidBarGlass: CSSProperties = {
    ...glassBar,
    borderRadius: squareCorners ? 0 : surfaceStyle === "material" ? 8 : 16,
    ...(surfaceStyle === "material" ? {
      boxShadow: isDark
        ? "0 -10px 30px rgba(0,0,0,0.30), 0 -24px 60px rgba(0,0,0,0.20)"
        : "0 -10px 30px rgba(46,34,22,0.12), 0 -24px 60px rgba(46,34,22,0.08)",
    } : surfaceStyle === "glass" ? {
      boxShadow: isDark
        ? "inset 0 0 0 0.5px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.18), 0 -6px 20px rgba(0,0,0,0.25)"
        : "inset 0 1px 0 rgba(255,255,255,0.75), 0 -8px 28px rgba(0,0,0,0.16)",
    } : {}),
  };

  const chevron = (compact = false) => (
    <button
      type="button"
      aria-label={t(trayOpen ? "helper.closeTray" : "helper.openTray")}
      onClick={onToggleTray}
      style={{
        width: compact ? 34 : 38,
        height: compact ? 34 : 38,
        borderRadius: squareCorners ? 0 : 999,
        border: `1px solid ${spotifyHoldProgress > 0 ? accent.primary : isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.14)"}`,
        background: spotifyHoldProgress > 0 ? `${accent.glow}${0.10 + spotifyHoldProgress * 0.22})` : "transparent",
        boxShadow: spotifyHoldProgress > 0 ? `0 0 ${8 + spotifyHoldProgress * 14}px ${accent.glow}0.42)` : undefined,
        color: spotifyHoldProgress > 0 ? accent.primary : theme.text,
        display: "grid",
        placeItems: "center",
        padding: 0,
        cursor: "pointer",
      }}
    >
      {trayOpen ? <IoChevronDown size={19} /> : <IoChevronUp size={19} />}
    </button>
  );

  const pillMargin =
    settings.bottombar_alignment === "right" ? "0 18px 18px auto" :
    settings.bottombar_alignment === "center" ? "0 auto 18px" :
    "0 auto 18px 18px";
  const minimalPill = (showMenuButton = false) => (
    <div style={{
      ...solidBarGlass,
      width: "fit-content",
      minHeight: 42,
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: spotifyHasTrack ? "4px 6px 4px 8px" : "4px 6px 4px 12px",
      pointerEvents: "auto",
    }}>
      {spotifyHasTrack && spotifyMiniBar}
      {spotifyHasTrack && <span aria-hidden style={{ width: 1, alignSelf: "stretch", background: isDark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.12)" }} />}
      {showMenuButton
        ? <span role="img" aria-label={t("helper.menuButtonHint")}><GamepadBtn btn="MENU" label="" /></span>
        : <IoVolumeHighOutline size={19} color={theme.textDim} aria-hidden />}
      {chevron(true)}
    </div>
  );

  if (mode === "minimal") {
    if (trayOpen) return null;
    return <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, pointerEvents: "none" }}><div style={{ width: "fit-content", margin: pillMargin }}>{minimalPill(true)}</div></div>;
  }

  if (mode === "hidden") {
    const visible = !trayOpen && (peekActive || hoverPeek);
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 100, pointerEvents: "none" }}>
        <div
          aria-hidden
          onMouseEnter={() => {
            if (hoverLeavingRef.current) clearTimeout(hoverLeavingRef.current);
            hoverLeavingRef.current = null;
            setHoverPeek(true);
          }}
          onMouseLeave={() => {
            if (hoverLeavingRef.current) clearTimeout(hoverLeavingRef.current);
            hoverLeavingRef.current = setTimeout(() => {
              hoverLeavingRef.current = null;
              setHoverPeek(false);
            }, 2200);
          }}
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 10, pointerEvents: "auto" }}
        />
        {visible && <div className="lo-anim-modal" style={{ position: "absolute", bottom: 0, left: 0, right: 0, width: "fit-content", margin: pillMargin }}>{minimalPill()}</div>}
      </div>
    );
  }

  const bumpersHint = showBumpers && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><GamepadBtn btn="LB" label="" /><GamepadBtn btn="RB" label={t("gamepad.tabs")} /></span>;
  const triggersHint = showTriggers && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><GamepadBtn btn="LT" label="" /><GamepadBtn btn="RT" label={t(tab === "Settings" ? "gamepad.sections" : "gamepad.source")} /></span>;

  return (
    <div style={{ position: isTransparent ? "sticky" : "absolute", bottom: 0, left: 0, right: 0, zIndex: 100 }}>
      <div data-bottom-bar="" style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        gap: 18,
        alignItems: "center",
        minHeight: 48,
        padding: "7px 14px",
        ...(isTransparent ? {} : solidBarGlass),
        ...(wideBar ? { width: "calc(100% - 16px)", margin: "0 8px 14px", boxSizing: "border-box" } : { maxWidth: 1400, margin: "0 auto 14px", width: "calc(100% - 48px)", boxSizing: "border-box" }),
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0 }}>
          {trayOpen ? <GamepadBtn btn="B" label={t("helper.closeTray")} /> : <>
            <GamepadBtn btn="A" label={t(tab === "Settings" ? "gamepad.aSelect" : "gamepad.aLaunch").replace(/^A\s*/, "")} />
            <GamepadBtn btn="B" label={t("gamepad.bBack").replace(/^B\s*/, "")} />
            <GamepadBtn btn="Y" label={t("gamepad.ySearch").replace(/^Y\s*/, "")} />
            {bumpersHint}
            {triggersHint}
          </>}
        </div>
        <div style={{ display: "flex", justifyContent: "center", minWidth: 0 }}>{spotifyMiniBar}</div>
        <div style={{ justifySelf: "end", display: "flex", alignItems: "center", gap: 7 }}>
          <IoVolumeHighOutline size={20} color={theme.textDim} aria-hidden />
          {chevron()}
        </div>
      </div>
    </div>
  );
}
