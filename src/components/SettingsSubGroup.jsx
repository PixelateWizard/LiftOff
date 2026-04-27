function ToggleKnob({ value, accent, isDark }) {
  return (
    <div style={{ width: 44, height: 24, borderRadius: 12, flexShrink: 0, position: "relative", transition: "background 0.2s ease", background: value ? accent.primary : (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)") }}>
      <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute", top: 3, left: value ? 23 : 3, transition: "left 0.2s ease", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
    </div>
  );
}

/**
 * A collapsible settings group with a parent toggle and indented sub-toggles.
 *
 * items: [{ label, value, onChange, focused, focusedRef }]
 */
export default function SettingsSubGroup({ glass, accent, isDark, theme, label, value, onChange, focused, focusedRef, items }) {
  const parentStyle = {
    ...glass,
    borderRadius: value ? "14px 14px 0 0" : 14,
    padding: "14px 20px",
    marginBottom: value ? 0 : 8,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    cursor: "pointer", transition: "all 0.15s ease",
    ...(focused
      ? { border: `1px solid ${accent.glow}0.6)`, boxShadow: `0 0 0 1px ${accent.glow}0.3), 0 0 20px ${accent.glow}0.1)`, background: isDark ? `${accent.glow}0.08)` : `${accent.glow}0.05)` }
      : { border: "1px solid rgba(255,255,255,0.06)" }),
  };

  return (
    <div>
      <div ref={focusedRef} style={parentStyle} onClick={() => onChange(!value)}>
        <span style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{label}</span>
        <ToggleKnob value={value} accent={accent} isDark={isDark} />
      </div>

      {value && (
        <div style={{
          marginBottom: 8,
          background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
          borderRadius: "0 0 14px 14px",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}`,
          borderTop: "none",
          overflow: "hidden",
        }}>
          {items.map((item, idx) => (
            <div
              key={idx}
              ref={item.focused ? item.focusedRef : null}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 20px", cursor: "pointer", transition: "background 0.15s ease",
                background: item.focused ? (isDark ? `${accent.glow}0.08)` : `${accent.glow}0.05)`) : "transparent",
                borderBottom: idx < items.length - 1 ? `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` : "none",
              }}
              onClick={() => item.onChange(!item.value)}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: theme.textDim }}>{item.label}</span>
              <ToggleKnob value={item.value} accent={accent} isDark={isDark} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
