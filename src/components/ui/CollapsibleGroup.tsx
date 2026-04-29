import type { CSSProperties, RefObject } from "react";
import { ToggleKnob } from "./ToggleKnob";

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
  cycleOptions: string[];
  onCycleChange: (next: string) => void;
  cycleLabel?: (v: string) => string;
  focused?: boolean;
  focusedRef?: RefObject<HTMLDivElement>;
}

type SubItem = ToggleSubItem | CycleSubItem;

interface CollapsibleGroupProps {
  glass?: CSSProperties;
  accent: { primary: string; glow: string };
  isDark: boolean;
  theme: { text: string; textDim: string };
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
  focused?: boolean;
  focusedRef?: RefObject<HTMLDivElement>;
  items: SubItem[];
}

export function CollapsibleGroup({
  glass,
  accent,
  isDark,
  theme,
  label,
  value,
  onChange,
  focused,
  focusedRef,
  items,
}: CollapsibleGroupProps) {
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
          border: `1px solid ${accent.glow}0.6)`,
          boxShadow: `0 0 0 1px ${accent.glow}0.3), 0 0 20px ${accent.glow}0.1)`,
          background: isDark ? `${accent.glow}0.08)` : `${accent.glow}0.05)`,
        }
      : { border: "1px solid rgba(255,255,255,0.06)" }),
  };

  const subContainerStyle: CSSProperties = {
    marginBottom: 8,
    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    borderRadius: "0 0 14px 14px",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}`,
    borderTop: "none",
    overflow: "hidden",
  };

  return (
    <div>
      <div ref={focusedRef} style={parentStyle} onClick={() => onChange(!value)}>
        <span style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{label}</span>
        <ToggleKnob value={value} accent={accent} isDark={isDark} />
      </div>

      {value && (
        <div style={subContainerStyle}>
          {items.map((item, idx) => {
            const rowStyle: CSSProperties = {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 20px",
              cursor: "pointer",
              transition: "background 0.15s ease",
              background: item.focused
                ? isDark ? `${accent.glow}0.08)` : `${accent.glow}0.05)`
                : "transparent",
              borderBottom:
                idx < items.length - 1
                  ? `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`
                  : "none",
            };

            if (item.type === "cycle") {
              const cur = item.cycleOptions.indexOf(item.cycleValue);
              const prev = item.cycleOptions[(cur - 1 + item.cycleOptions.length) % item.cycleOptions.length];
              const next = item.cycleOptions[(cur + 1) % item.cycleOptions.length];
              const displayLabel = item.cycleLabel ? item.cycleLabel(item.cycleValue) : item.cycleValue;
              return (
                <div key={idx} ref={item.focused ? item.focusedRef : undefined} style={rowStyle}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: theme.textDim }}>{item.label}</span>
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
                <span style={{ fontSize: 13, fontWeight: 500, color: theme.textDim }}>
                  {item.label}
                </span>
                <ToggleKnob value={item.value} accent={accent} isDark={isDark} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
