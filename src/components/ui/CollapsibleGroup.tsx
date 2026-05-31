import type { CSSProperties, RefObject } from "react";
import { ToggleKnob } from "./ToggleKnob";
import { FocusRing } from "./FocusRing";
import { useTheme } from "../../contexts/ThemeContext";
import { useSettings } from "../../contexts/SettingsContext";

interface ToggleSubItem {
  type?: "toggle";
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
  focused?: boolean;
  focusedRef?: RefObject<HTMLDivElement>;
}

interface CycleSubItem {
  type: "cycle";
  label: string;
  cycleValue: string;
  cycleOptions: readonly string[];
  onCycleChange: (next: string) => void;
  cycleLabel?: (v: string) => string;
  focused?: boolean;
  focusedRef?: RefObject<HTMLDivElement>;
}

interface SliderSubItem {
  type: "slider";
  label: string;
  sliderValue: number;
  sliderMin: number;
  sliderMax: number;
  sliderStep: number;
  integer?: boolean;
  onSliderChange: (next: number) => void;
  focused?: boolean;
  focusedRef?: RefObject<HTMLDivElement>;
}

type SubItem = ToggleSubItem | CycleSubItem | SliderSubItem;

interface CollapsibleGroupProps {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
  focused?: boolean;
  focusedRef?: RefObject<HTMLDivElement>;
  items: SubItem[];
}

export function CollapsibleGroup({
  label,
  value,
  onChange,
  focused,
  focusedRef,
  items,
}: CollapsibleGroupProps) {
  const { glass, accent, isDark, theme, surfaceStyle, surface, resolvedTheme } = useTheme();
  const { settings } = useSettings();
  const isMaterial = surfaceStyle === "material";
  const isPixel = surfaceStyle === "win9x";
  const isOnyx = resolvedTheme === "onyx";
  const isCyber = resolvedTheme === "cyberpunk";
  const flatSettings = isOnyx && (settings.onyx_flat_settings ?? true);
  const onyxSettingsFocusRadius = 10;
  const materialFocusStyle: CSSProperties = isMaterial ? {
    border: `2px solid ${accent.primary}`,
    background: isDark
      ? `color-mix(in srgb, var(--material-elevation-3) 82%, ${accent.primary} 18%)`
      : `color-mix(in srgb, var(--material-elevation-3) 88%, ${accent.primary} 12%)`,
    boxShadow: "var(--material-shadow-high)",
  } : {};
  const materialSubFocusStyle: CSSProperties = isMaterial ? {
    border: `2px solid ${accent.primary}`,
    background: isDark
      ? `color-mix(in srgb, var(--material-inset-row-active) 82%, ${accent.primary} 18%)`
      : `color-mix(in srgb, var(--material-inset-row-active) 88%, ${accent.primary} 12%)`,
    boxShadow: "var(--material-shadow-medium)",
  } : {};
  const pixelFocusStyle: CSSProperties = isPixel ? {
    border: "2px solid",
    borderColor: surface.borderRaised,
    background: surface.activeBg,
    boxShadow: `${surface.bevelRaisedSoft}, 0 0 0 2px ${accent.primary}`,
  } : {};
  const pixelSubFocusStyle: CSSProperties = isPixel ? {
    background: surface.activeBg,
    boxShadow: `${surface.bevelSunken}, 0 0 0 1px ${accent.primary}`,
  } : {};
  const parentStyle: CSSProperties = flatSettings ? {
    background: "transparent",
    borderRadius: focused ? onyxSettingsFocusRadius : 0,
    padding: "14px 20px",
    marginBottom: 0,
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    transition: "background 0.15s ease, border-radius 0.15s ease",
    position: "relative" as const,
    zIndex: focused ? 2 : undefined,
  } : {
    ...glass,
    borderRadius: isPixel || isCyber ? 0 : value ? (isMaterial ? "8px 8px 0 0" : "16px 16px 0 0") : isMaterial ? 8 : 16,
    padding: "14px 20px",
    marginBottom: value ? 0 : 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    transition: "all 0.15s ease",
    position: "relative" as const,
    zIndex: focused ? 2 : undefined,
    ...(focused
      ? {
          border: `1px solid ${isMaterial ? accent.primary : accent.glow + "0.6)"}`,
          boxShadow: isMaterial ? "var(--material-shadow-medium)" : `0 0 0 1px ${accent.glow}0.3), 0 0 20px ${accent.glow}0.1)`,
          background: isMaterial ? "var(--material-elevation-3)" : isDark ? `${accent.glow}0.08)` : `${accent.glow}0.05)`,
          ...(isMaterial ? materialFocusStyle : {}),
          ...(isPixel ? pixelFocusStyle : {}),
        }
      : { border: isMaterial ? "1px solid var(--material-border-subtle)" : "1px solid rgba(255,255,255,0.06)" }),
  };

  const subContainerStyle: CSSProperties = flatSettings ? {
    marginBottom: 0,
  } : {
    marginBottom: 8,
    padding: isMaterial ? "5px 6px 6px" : undefined,
    background: isCyber ? `color-mix(in srgb, ${accent.primary} 10%, #04060d 90%)` : isPixel ? surface.insetBg : isMaterial ? "var(--material-inset-bg)" : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    borderRadius: isPixel || isCyber ? 0 : isMaterial ? "0 0 8px 8px" : "0 0 16px 16px",
    border: isPixel ? "2px solid" : "none",
    borderColor: isPixel ? surface.borderSunken : undefined,
    borderTop: isPixel ? undefined : isCyber ? `1px solid ${accent.glow}0.14)` : isMaterial ? "1px solid var(--material-inset-top-edge)" : `1px solid ${isDark ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.05)"}`,
    boxShadow: isMaterial
      ? isDark
        ? "inset 0 9px 18px rgba(0,0,0,0.18), inset 0 1px 0 var(--material-inset-top-edge), inset 0 -1px 0 var(--material-inset-bottom-edge)"
        : "inset 0 9px 18px rgba(70,50,30,0.10), inset 0 1px 0 var(--material-inset-top-edge), inset 0 -1px 0 var(--material-inset-bottom-edge)"
      : undefined,
    overflow: "hidden",
  };

  return (
    <div>
      <div data-settings-row="" className={focused ? "focused" : ""} ref={focusedRef} style={parentStyle} onClick={() => onChange(!value)}>
        <span style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{label}</span>
        <ToggleKnob value={value} />
        <FocusRing focused={!!focused} variant="spin" wide elementRadius={flatSettings ? onyxSettingsFocusRadius : isPixel || isCyber ? 0 : isMaterial ? 8 : 16} />
      </div>

      {value && (
        <div style={subContainerStyle}>
          {items.map((item, idx) => {
            const rowStyle: CSSProperties = flatSettings ? {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 20px 12px 36px",
              cursor: "pointer",
              transition: "background 0.15s ease",
              borderRadius: item.focused ? onyxSettingsFocusRadius : 0,
              background: "transparent",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              position: "relative" as const,
              zIndex: item.focused ? 2 : undefined,
            } : {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: isMaterial ? "13px 16px" : "14px 20px",
              cursor: "pointer",
              transition: "background 0.15s ease, box-shadow 0.15s ease",
              borderRadius: isPixel ? 0 : isMaterial ? 8 : undefined,
              marginBottom: isMaterial && idx < items.length - 1 ? 3 : undefined,
              background: item.focused
                ? isPixel ? surface.activeBg : isMaterial ? "var(--material-inset-row-active)" : isDark ? `${accent.glow}0.08)` : `${accent.glow}0.05)`
                : isPixel ? surface.insetBg : isMaterial ? "var(--material-inset-row)" : "transparent",
              boxShadow: item.focused && isPixel
                ? pixelSubFocusStyle.boxShadow
                : item.focused && isMaterial
                ? "var(--material-shadow-pressed)"
                : isPixel
                ? surface.bevelRaisedSoft
                : isMaterial
                ? isDark
                  ? "inset 0 1px 0 rgba(255,255,255,0.018)"
                  : "inset 0 1px 0 rgba(255,255,255,0.45)"
                : undefined,
              borderBottom:
                idx < items.length - 1 && !isMaterial && !isPixel
                  ? `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`
                  : "none",
              ...(item.focused && isMaterial ? materialSubFocusStyle : {}),
              ...(item.focused && isPixel ? pixelSubFocusStyle : {}),
            };

            if (item.type === "cycle") {
              const cur = item.cycleOptions.indexOf(item.cycleValue);
              const prev = item.cycleOptions[(cur - 1 + item.cycleOptions.length) % item.cycleOptions.length];
              const next = item.cycleOptions[(cur + 1) % item.cycleOptions.length];
              const displayLabel = item.cycleLabel ? item.cycleLabel(item.cycleValue) : item.cycleValue;
              return (
                <div key={idx} data-settings-row="" className={item.focused ? "focused" : ""} ref={item.focused ? item.focusedRef : undefined} style={rowStyle}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: isMaterial ? theme.text : theme.textDim }}>{item.label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, color: theme.textDim, cursor: "pointer", userSelect: "none" }}
                      onClick={(e) => { e.stopPropagation(); item.onCycleChange(prev); }}>◀</span>
                    <span style={{ fontSize: 12, color: accent.primary, fontWeight: 600 }}>{displayLabel}</span>
                    <span style={{ fontSize: 10, color: theme.textDim, cursor: "pointer", userSelect: "none" }}
                      onClick={(e) => { e.stopPropagation(); item.onCycleChange(next); }}>▶</span>
                  </div>
                  {flatSettings && <FocusRing focused={!!item.focused} variant="spin" wide elementRadius={onyxSettingsFocusRadius} />}
                </div>
              );
            }

            if (item.type === "slider") {
              const pct = (item.sliderValue - item.sliderMin) / (item.sliderMax - item.sliderMin);
              const displayVal = item.integer ? `${Math.round(item.sliderValue)}` : `${Math.round(item.sliderValue * 100)}%`;
              return (
                <div key={idx} data-settings-row="" className={item.focused ? "focused" : ""} ref={item.focused ? item.focusedRef : undefined} style={rowStyle}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: isMaterial ? theme.text : theme.textDim }}>{item.label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, color: theme.textDim, cursor: "pointer", userSelect: "none" }}
                      onClick={(e) => { e.stopPropagation(); item.onSliderChange(Math.max(item.sliderMin, Math.round((item.sliderValue - item.sliderStep) / item.sliderStep) * item.sliderStep)); }}>◀</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 60, height: 4, borderRadius: 2, background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)", position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct * 100}%`, background: accent.primary, borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 12, color: accent.primary, fontWeight: 600, minWidth: 28, textAlign: "right" }}>{displayVal}</span>
                    </div>
                    <span style={{ fontSize: 10, color: theme.textDim, cursor: "pointer", userSelect: "none" }}
                      onClick={(e) => { e.stopPropagation(); item.onSliderChange(Math.min(item.sliderMax, Math.round((item.sliderValue + item.sliderStep) / item.sliderStep) * item.sliderStep)); }}>▶</span>
                  </div>
                  {flatSettings && <FocusRing focused={!!item.focused} variant="spin" wide elementRadius={onyxSettingsFocusRadius} />}
                </div>
              );
            }

            return (
              <div
                key={idx}
                data-settings-row=""
                className={item.focused ? "focused" : ""}
                ref={item.focused ? item.focusedRef : undefined}
                style={rowStyle}
                onClick={() => item.onChange(!item.value)}
              >
                <span style={{ fontSize: 13, fontWeight: 500, color: isMaterial ? theme.text : theme.textDim }}>
                  {item.label}
                </span>
                <ToggleKnob value={item.value} />
                {flatSettings && <FocusRing focused={!!item.focused} variant="spin" wide elementRadius={onyxSettingsFocusRadius} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
