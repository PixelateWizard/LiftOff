import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { GamepadBtn } from "../GamepadBtn";
import { getBestGamepad, readGpState, type GpState } from "../../utils/gamepad";
import { useTheme } from "../../contexts/ThemeContext";
import { useSettings } from "../../contexts/SettingsContext";
import ModalShell from "./ModalShell";

interface ControlsModalProps {
  initialTab: string;
  onClose: () => void;
}

const TABS = ["Home", "Games", "Apps", "Settings"] as const;

export default function ControlsModal({ initialTab, onClose }: ControlsModalProps) {
  const { t } = useTranslation();
  const { accent, theme, isDark, surfaceStyle } = useTheme();
  const { settings } = useSettings();
  const bottomBarMode = settings.bottombar_mode || (settings.hide_bottom_bar ? "minimal" : "full");
  const initial = Math.max(0, TABS.indexOf(initialTab as (typeof TABS)[number]));
  const [tabIndex, setTabIndex] = useState(initial);
  const tabIndexRef = useRef(initial);
  const closedRef = useRef(false);

  const changeTab = (direction: -1 | 1) => {
    const next = (tabIndexRef.current + direction + TABS.length) % TABS.length;
    tabIndexRef.current = next;
    setTabIndex(next);
  };

  useEffect(() => {
    closedRef.current = false;
    const close = () => {
      if (closedRef.current) return;
      closedRef.current = true;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" && event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Escape") close();
      else changeTab(event.key === "ArrowLeft" ? -1 : 1);
    };
    window.addEventListener("keydown", onKey, true);

    let raf = 0;
    const last: Partial<GpState> = {};
    let bumpersReleased = false;
    let escapeReleased = false;
    const poll = () => {
      if (closedRef.current) return;
      const gp = getBestGamepad();
      if (gp) {
        const state = readGpState(gp);
        if (!state.BumperLeft && !state.BumperRight) bumpersReleased = true;
        if (!state.Escape) escapeReleased = true;
        if (bumpersReleased && state.BumperLeft && !last.BumperLeft) changeTab(-1);
        if (bumpersReleased && state.BumperRight && !last.BumperRight) changeTab(1);
        if (escapeReleased && state.Escape && !last.Escape) close();
        Object.assign(last, state);
      }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => {
      closedRef.current = true;
      window.removeEventListener("keydown", onKey, true);
      cancelAnimationFrame(raf);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tab = TABS[tabIndex];
  const baseRows = [
    { btn: "A", label: t(tab === "Settings" ? "gamepad.aSelect" : "gamepad.aLaunch").replace(/^A\s*/, "") },
    { btn: "B", label: t("gamepad.bBack").replace(/^B\s*/, "") },
    { btn: "X", label: tab === "Settings" ? "—" : t("gamepad.xPin").replace(/^X\s*/, "") },
    { btn: "Y", label: tab === "Settings" ? "—" : t("gamepad.ySearch").replace(/^Y\s*/, "") },
    { btn: "LB / RB", label: t("gamepad.tabs") },
    ...(tab === "Games" || tab === "Apps" || tab === "Settings"
      ? [{ btn: "LT / RT", label: t(tab === "Settings" ? "gamepad.sections" : "gamepad.source") }]
      : []),
    ...(tab === "Games" ? [{ btn: "RS", label: t("grid.filter.dock") }] : []),
    ...(tab === "Games" ? [{ btn: "BACK", label: t("grid.manage") }] : []),
    ...(bottomBarMode !== "minimal" && (tab === "Games" || tab === "Apps") ? [{ btn: "MENU", label: t("controls.menuTapOptions") }] : []),
    { btn: "MENU", label: t(bottomBarMode === "minimal" ? "controls.menuTapTray" : "controls.menuHoldTray") },
  ];

  return (
    <ModalShell
      title={t("controls.title", { tab: t(`tabs.${tab.toLowerCase()}`) })}
      shortcuts={[{ btn: "LB / RB", label: t("gamepad.tabs") }, { btn: "B", label: t("common.close") }]}
      width={620}
      maxHeight="82vh"
      zIndex={9200}
      onOverlayClick={onClose}
    >
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {TABS.map((candidate, index) => {
            const selected = index === tabIndex;
            return (
              <button
                key={candidate}
                type="button"
                onClick={() => { tabIndexRef.current = index; setTabIndex(index); }}
                style={{
                  padding: "7px 13px",
                  borderRadius: surfaceStyle === "win9x" ? 0 : 999,
                  border: `1px solid ${selected ? accent.primary : isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)"}`,
                  background: selected ? `${accent.glow}0.18)` : "transparent",
                  color: selected ? accent.primary : theme.textDim,
                  font: "inherit",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {t(`tabs.${candidate.toLowerCase()}`)}
              </button>
            );
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          {baseRows.map((row, index) => (
            <div key={`${row.btn}-${index}`} style={{ padding: "11px 13px", borderRadius: surfaceStyle === "win9x" ? 0 : 10, background: isDark ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.045)" }}>
              <GamepadBtn btn={row.btn} label={row.label} style={{ fontSize: 13, color: theme.text }} />
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  );
}
