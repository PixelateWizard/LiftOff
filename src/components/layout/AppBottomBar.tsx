import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { GamepadBtn } from "../GamepadBtn";
import { useTheme } from "../../contexts/ThemeContext";
import { useSettings } from "../../contexts/SettingsContext";

interface Props {
  tab: string;
  appCollectionsCount: number;
}

export function AppBottomBar({ tab, appCollectionsCount }: Props) {
  const { t } = useTranslation();
  const { glass, theme, isDark } = useTheme();
  const { settings } = useSettings();

  if (settings.hide_bottom_bar) return null;

  const Btn = ({ label }: { label: string }) => (
    <GamepadBtn btn={label[0]} label={label.slice(2)} />
  );

  const isTransparent = settings.transparent_bottombar || (settings.cinematic_home && tab === "Home");
  const justify =
    settings.bottombar_alignment === "center" ? "center" :
    settings.bottombar_alignment === "right"  ? "flex-end" : "flex-start";

  const showBumpersInBottom = settings.nav_bumpers_pos === "bottom";
  // support old boolean value (true → was "tabbar")
  const showTriggersInBottom = settings.tabbar_show_buttons === "bottom";

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
      <div style={{
        display: "flex", gap: 20, alignItems: "center", padding: "10px 20px",
        justifyContent: justify,
        ...(isTransparent ? {} : { ...glass, borderRadius: 12 }),
        ...(settings.wide_layout
          ? (settings.transparent_bottombar
            ? { width: "100%", margin: "0 0 14px", boxSizing: "border-box" }
            : { width: "calc(100% - 16px)", margin: "0 8px 14px", boxSizing: "border-box" })
          : { maxWidth: 1400, margin: "0 auto 14px", width: "calc(100% - 48px)" }),
      } as CSSProperties}>
        {tab === "Settings" ? (
          <>
            <Btn label={t('gamepad.aSelect')} />
            <Btn label={t('gamepad.bBack')} />
            {bumpersHint}
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: theme.textDim }}>
              <GamepadBtn btn="LT" label="" style={{ gap: 3 }} />
              <GamepadBtn btn="RT" label={t('gamepad.sections')} />
            </span>
          </>
        ) : (
          <>
            <Btn label={t('gamepad.aLaunch')} />
            <Btn label={t('gamepad.bBack')} />
            <Btn label={t('gamepad.ySearch')} />
            {tab !== "Apps" && <Btn label={t('gamepad.xPin')} />}
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
