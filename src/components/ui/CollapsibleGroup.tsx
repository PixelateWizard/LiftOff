import type { CSSProperties, RefObject } from "react";
import { ToggleKnob } from "./ToggleKnob";
import { useTheme } from "../../contexts/ThemeContext";

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

type SubItem = ToggleSubItem | CycleSubItem;

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
  const { glass, accent, isDark, theme, surfaceStyle } = useTheme();
  const isMaterial = surfaceStyle === "material";
  const parentStyle: CSSProperties = {
    ...glass,
    borderRadius: value ? "14px 14px 0 0" : 14,
    padding: "14px 20px",
    marginBottom: value ? 0 : 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    transition: "all 0.15s ease",
    ...(focused
      ? {
          border: `1px solid ${isMaterial ? accent.primary : accent.glow + "0.6)"}`,
          boxShadow: isMaterial ? "var(--material-shadow-medium)" : `0 0 0 1px ${accent.glow}0.3), 0 0 20px ${accent.glow}0.1)`,
          background: isMaterial ? "var(--material-elevation-3)" : isDark ? `${accent.glow}0.08)` : `${accent.glow}0.05)`,
        }
      : { border: isMaterial ? "1px solid var(--material-border-subtle)" : "1px solid rgba(255,255,255,0.06)" }),
  };

  const subContainerStyle: CSSProperties = {
    marginBottom: 8,
    padding: isMaterial ? "5px 6px 6px" : undefined,
    background: isMaterial ? "var(--material-inset-bg)" : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    borderRadius: isMaterial ? "0 0 12px 12px" : "0 0 14px 14px",
    border: `1px solid ${isMaterial ? "var(--material-border-subtle)" : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}`,
    borderTop: isMaterial ? "1px solid var(--material-inset-top-edge)" : "none",
    boxShadow: isMaterial
      ? isDark
        ? "inset 0 9px 18px rgba(0,0,0,0.18), inset 0 1px 0 var(--material-inset-top-edge), inset 0 -1px 0 var(--material-inset-bottom-edge)"
        : "inset 0 9px 18px rgba(70,50,30,0.10), inset 0 1px 0 var(--material-inset-top-edge), inset 0 -1px 0 var(--material-inset-bottom-edge)"
      : undefined,
    overflow: "hidden",
  };

  return (
    <div>
      <div ref={focusedRef} style={parentStyle} onClick={() => onChange(!value)}>
        <span style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{label}</span>
        <ToggleKnob value={value} />
      </div>

      {value && (
        <div style={subContainerStyle}>
          {items.map((item, idx) => {
            const rowStyle: CSSProperties = {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: isMaterial ? "13px 16px" : "14px 20px",
              cursor: "pointer",
              transition: "background 0.15s ease, box-shadow 0.15s ease",
              borderRadius: isMaterial ? 8 : undefined,
              marginBottom: isMaterial && idx < items.length - 1 ? 3 : undefined,
              background: item.focused
                ? isMaterial ? "var(--material-inset-row-active)" : isDark ? `${accent.glow}0.08)` : `${accent.glow}0.05)`
                : isMaterial ? "var(--material-inset-row)" : "transparent",
              boxShadow: item.focused && isMaterial
                ? "var(--material-shadow-pressed)"
                : isMaterial
                ? isDark
                  ? "inset 0 1px 0 rgba(255,255,255,0.018)"
                  : "inset 0 1px 0 rgba(255,255,255,0.45)"
                : undefined,
              borderBottom:
                idx < items.length - 1 && !isMaterial
                  ? `1px solid ${isMaterial ? "var(--material-border-subtle)" : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`
                  : "none",
            };

            if (item.type === "cycle") {
              const cur = item.cycleOptions.indexOf(item.cycleValue);
              const prev = item.cycleOptions[(cur - 1 + item.cycleOptions.length) % item.cycleOptions.length];
              const next = item.cycleOptions[(cur + 1) % item.cycleOptions.length];
              const displayLabel = item.cycleLabel ? item.cycleLabel(item.cycleValue) : item.cycleValue;
              return (
                <div key={idx} ref={item.focused ? item.focusedRef : undefined} style={rowStyle}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: isMaterial ? theme.text : theme.textDim }}>{item.label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, color: theme.textDim, cursor: "pointer", userSelect: "none" }}
                      onClick={(e) => { e.stopPropagation(); item.onCycleChange(prev); }}>◀</span>
                    <span style={{ fontSize: 12, color: accent.primary, fontWeight: 600 }}>{displayLabel}</span>
                    <span style={{ fontSize: 10, color: theme.textDim, cursor: "pointer", userSelect: "none" }}
                      onClick={(e) => { e.stopPropagation(); item.onCycleChange(next); }}>▶</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={idx}
                ref={item.focused ? item.focusedRef : undefined}
                style={rowStyle}
                onClick={() => item.onChange(!item.value)}
              >
                <span style={{ fontSize: 13, fontWeight: 500, color: isMaterial ? theme.text : theme.textDim }}>
                  {item.label}
                </span>
                <ToggleKnob value={item.value} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
