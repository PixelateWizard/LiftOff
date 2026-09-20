import { memo, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  IoArrowUpCircleOutline, IoCheckmark, IoChevronDown, IoChevronUp, IoDownloadOutline,
  IoMusicalNotes, IoPlay, IoRefresh,
} from "react-icons/io5";
import { GamepadBtn } from "../GamepadBtn";
import { useTheme } from "../../contexts/ThemeContext";
import type { BarEvent } from "../../hooks/useBarActivity";
import { installPhaseLabelKey, runningMinutes, type BarActivity, type BarHint } from "../../utils/smartBar";

interface SmartPillProps {
  hints: BarHint[];
  collapsed: boolean;
  activity: BarActivity | null;
  now: number;
  event: BarEvent | null;
  musicChip?: ReactNode;
  trayOpen: boolean;
  onToggleTray: () => void;
  glass: CSSProperties;
  squareCorners: boolean;
}

const RING_RADIUS = 14;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const RUNNING_FILL = "rgba(74,232,138,0.16)";

function PinGlyph() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 4h6l-1 6 4 3v2H6v-2l4-3z" />
      <path d="M12 15v6" />
    </svg>
  );
}

export const SmartPill = memo(function SmartPill({
  hints, collapsed, activity, now, event, musicChip, trayOpen, onToggleTray, glass, squareCorners,
}: SmartPillProps) {
  const { t } = useTranslation();
  const { accent, theme, isDark } = useTheme();
  const radius = squareCorners ? 0 : 16;
  const runningColor = isDark ? "#4ae88a" : "#1f8a4c";
  const ringTrack = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)";
  const divider = (
    <span aria-hidden style={{ width: 1, alignSelf: "stretch", margin: "6px 0", flexShrink: 0, background: isDark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.12)" }} />
  );

  const eventIcon = (kind: BarEvent["kind"]) => {
    if (kind === "pin" || kind === "unpin") return <PinGlyph />;
    if (kind === "installDone" || kind === "closed") return <IoCheckmark size={18} />;
    if (kind === "refresh") return <IoRefresh size={17} />;
    if (kind === "track") return <IoMusicalNotes size={16} />;
    if (kind === "installStarted") return <IoDownloadOutline size={18} />;
    return <IoPlay size={15} />;
  };

  const renderActivity = () => {
    if (!activity) return null;
    let icon: ReactNode;
    let title: string;
    let subtitle: string;
    if (activity.kind === "install") {
      const d = activity.download;
      title = d.app.name;
      subtitle = d.indeterminate ? String(t(installPhaseLabelKey(d.phase))) : String(t("smartBar.activity.downloading", { pct: Math.round(d.pct) }));
      if (activity.extra > 0) subtitle += ` · ${t("smartBar.activity.more", { count: activity.extra })}`;
      icon = d.indeterminate
        ? <span className="lo-loading-spinner" style={{ width: 22, height: 22, borderWidth: 2.5, color: accent.primary }} />
        : (
          <>
            <svg width={34} height={34} viewBox="0 0 34 34" aria-hidden style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
              <circle cx={17} cy={17} r={RING_RADIUS} fill="none" stroke={ringTrack} strokeWidth={3} />
              <circle cx={17} cy={17} r={RING_RADIUS} fill="none" stroke={accent.primary} strokeWidth={3} strokeLinecap="round"
                strokeDasharray={`${(d.pct / 100) * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`} />
            </svg>
            <IoDownloadOutline size={14} color={theme.text} style={{ position: "relative" }} />
          </>
        );
    } else if (activity.kind === "running") {
      const minutes = runningMinutes(activity.running.startedAt, now);
      title = activity.running.app.name;
      subtitle = minutes < 1 ? String(t("helper.runningJustNow")) : String(t("helper.runningFor", { count: minutes }));
      icon = (
        <span style={{ width: 34, height: 34, borderRadius: "50%", background: RUNNING_FILL, color: runningColor, display: "grid", placeItems: "center" }}>
          <IoPlay size={14} />
        </span>
      );
    } else {
      title = activity.version ? String(t("smartBar.activity.updateTitle", { version: activity.version })) : String(t("smartBar.activity.updateTitleNoVersion"));
      subtitle = String(t("smartBar.activity.updateReady"));
      icon = (
        <span style={{ width: 34, height: 34, borderRadius: "50%", background: `${accent.glow}0.16)`, color: accent.primary, display: "grid", placeItems: "center" }}>
          <IoArrowUpCircleOutline size={18} />
        </span>
      );
    }
    return (
      <>
        <div data-smart-bar-activity={activity.kind} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 14px 0 10px", minWidth: 0 }}>
          <div style={{ width: 34, height: 34, position: "relative", flexShrink: 0, display: "grid", placeItems: "center" }}>{icon}</div>
          <div style={{ minWidth: 0, maxWidth: 170 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
            <div style={{ fontSize: 11, color: theme.textDim, whiteSpace: "nowrap", marginTop: 1 }}>{subtitle}</div>
          </div>
        </div>
        {divider}
      </>
    );
  };

  const shadows = [glass.boxShadow, event ? `0 0 0 1px ${accent.glow}0.55), 0 0 22px ${accent.glow}0.26)` : null]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      data-smart-bar=""
      data-smart-bar-collapsed={collapsed ? "true" : "false"}
      style={{
        ...glass,
        position: "relative",
        width: "fit-content",
        minHeight: 52,
        boxSizing: "border-box",
        borderRadius: radius,
        padding: "5px 6px",
        pointerEvents: "auto",
        boxShadow: shadows || undefined,
      }}
    >
      <span aria-hidden className="lo-smartbar-tint" style={{ position: "absolute", inset: 0, borderRadius: radius, background: `${accent.glow}${isDark ? 0.18 : 0.14})`, opacity: event ? 1 : 0, pointerEvents: "none" }} />
      <div style={{ position: "relative", display: "flex", alignItems: "center", minHeight: 42 }}>
        {event ? (
          <>
            <div key={event.id} className="lo-smartbar-event" role="status" aria-live="polite" style={{ display: "flex", alignItems: "center", gap: 11, padding: "0 16px 0 2px", minWidth: 220 }}>
              <span style={{ width: 36, height: 36, borderRadius: squareCorners ? 0 : 10, background: `${accent.glow}0.24)`, color: accent.primary, display: "grid", placeItems: "center", flexShrink: 0 }}>
                {eventIcon(event.kind)}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, whiteSpace: "nowrap" }}>{t(event.titleKey)}</div>
                {event.subtitle && <div style={{ fontSize: 11, color: theme.textDim, whiteSpace: "nowrap", marginTop: 1, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis" }}>{event.subtitle}</div>}
              </div>
            </div>
            {divider}
          </>
        ) : (
          <>
            <div
              className="lo-smartbar-hints"
              aria-hidden={collapsed}
              style={{ display: "flex", alignItems: "center", overflow: "hidden", maxWidth: collapsed || hints.length === 0 ? 0 : 360, opacity: collapsed ? 0 : 1 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 15, padding: "0 15px 0 8px", whiteSpace: "nowrap" }}>
                {hints.map((hint) => (
                  <GamepadBtn key={`${hint.btn}:${hint.labelKey}`} btn={hint.btn} label={String(t(hint.labelKey))} style={{ fontSize: 12, fontWeight: 600, color: theme.text }} />
                ))}
              </div>
              {divider}
            </div>
            {renderActivity()}
          </>
        )}
        {musicChip && (
          <>
            <div style={{ padding: "0 4px" }}>{musicChip}</div>
            {divider}
          </>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 9 }}>
          <span role="img" aria-label={t("helper.menuButtonHint")}><GamepadBtn btn="MENU" label="" /></span>
          <button
            type="button"
            aria-label={t(trayOpen ? "helper.closeTray" : "helper.openTray")}
            onClick={onToggleTray}
            style={{
              width: 36, height: 36, borderRadius: squareCorners ? 0 : 999, padding: 0, cursor: "pointer",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.14)"}`,
              background: "transparent", color: theme.text, display: "grid", placeItems: "center",
            }}
          >
            {trayOpen ? <IoChevronDown size={18} /> : <IoChevronUp size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
});
