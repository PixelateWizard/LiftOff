import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../contexts/ThemeContext";
import { getBestGamepad } from "../utils/gamepad";

interface GpSnap {
  name: string;
  mapping: string;
  buttons: boolean[];
  axes: number[];
  allDevices: Array<{ index: number; name: string; btnCount: number; isBest: boolean }>;
}

let _cachedGpSnap: GpSnap | null = null;

const BUTTON_LABELS: Record<number, string> = {
  0: "A", 1: "B", 2: "X", 3: "Y",
  4: "LB", 5: "RB", 6: "LT", 7: "RT",
  8: "⊞", 9: "☰", 10: "LS", 11: "RS",
  12: "↑", 13: "↓", 14: "←", 15: "→",
};

export function ControllerTestWidget() {
  const { t } = useTranslation();
  const { theme, accent, isDark } = useTheme();
  const [gpSnap, setGpSnap] = useState<GpSnap | null>(_cachedGpSnap);
  const rAFRef = useRef<number | null>(null);

  useEffect(() => {
    const poll = () => {
      const all = Array.from(navigator.getGamepads()).filter((g): g is Gamepad => g !== null);
      const best = getBestGamepad();
      const next: GpSnap | null = best
        ? {
            name: best.id,
            mapping: best.mapping,
            buttons: Array.from(best.buttons).map(b => b.pressed),
            axes: Array.from(best.axes).map(v =>
              typeof v === "number" && isFinite(v) ? v : 0
            ),
            allDevices: all.map((gp, i) => ({
              index: i,
              name: gp.id,
              btnCount: gp.buttons.length,
              isBest: gp === best,
            })),
          }
        : null;
      _cachedGpSnap = next;
      setGpSnap(next);
      rAFRef.current = requestAnimationFrame(poll);
    };
    rAFRef.current = requestAnimationFrame(poll);
    return () => {
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    };
  }, []);

  if (!gpSnap)
    return (
      <div style={{ fontSize: 13, color: theme.textDim, padding: "4px 0 8px" }}>
        {t("settings.noController")}
      </div>
    );

  const isStandard = gpSnap.mapping === "standard";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12, color: theme.textDim, wordBreak: "break-all" }}>
        <span style={{ fontWeight: 600, color: theme.text }}>{gpSnap.name}</span>
        <span style={{
          marginLeft: 10, fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 6,
          background: isStandard
            ? `${accent.glow}0.15)`
            : isDark ? "rgba(255,165,0,0.15)" : "rgba(180,100,0,0.12)",
          color: isStandard ? accent.primary : isDark ? "#ffa040" : "#a06000",
        }}>
          {isStandard
            ? "standard mapping ✓"
            : `non-standard${gpSnap.mapping ? ` (${gpSnap.mapping})` : ""}`}
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {gpSnap.buttons.map((pressed, i) => (
          <div key={i} style={{
            minWidth: 36, height: 30, borderRadius: 7, fontSize: 9, fontWeight: 700, padding: "0 4px",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
            background: pressed ? accent.primary : isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
            color: pressed ? "white" : theme.textDim,
            border: `1px solid ${pressed ? accent.primary : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
            transition: "background 0.05s, color 0.05s, border-color 0.05s",
          }}>
            <span style={{ fontSize: 8, opacity: 0.7 }}>{BUTTON_LABELS[i] ?? ""}</span>
            <span>{i}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "5px 14px" }}>
        {gpSnap.axes.map((val, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 10, color: theme.textFaint, width: 52, flexShrink: 0 }}>
              A{i}: {val >= 0 ? " " : ""}{val.toFixed(2)}
            </span>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", position: "relative" }}>
              <div style={{
                position: "absolute",
                left: val >= 0 ? "50%" : `${(1 + val) * 50}%`,
                width: `${Math.abs(val) * 50}%`,
                height: "100%", borderRadius: 3,
                background: accent.primary,
              }} />
              <div style={{ position: "absolute", left: "50%", top: 0, width: 1, height: "100%", background: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)" }} />
            </div>
          </div>
        ))}
      </div>

      {(gpSnap.allDevices?.length ?? 0) > 1 && (
        <div style={{ fontSize: 11, color: theme.textDim, lineHeight: 1.6 }}>
          <span style={{ fontWeight: 600, color: theme.textDim }}>All HID devices: </span>
          {gpSnap.allDevices.map(d => (
            <span key={d.index} style={{ marginRight: 12, color: d.isBest ? accent.primary : theme.textFaint }}>
              [{d.index}] {d.name.split("(")[0].trim()} ({d.btnCount} btns){d.isBest ? " ←" : ""}
            </span>
          ))}
        </div>
      )}

      {!isStandard && (
        <div style={{ fontSize: 11, color: isDark ? "#ffa040" : "#a06000", lineHeight: 1.5 }}>
          Non-standard mapping detected. If navigation isn't working, try switching your controller to XInput mode
          (hold the GameSir / mode button until the indicator changes). D-pad may be on axes 6 &amp; 7 — check the bars above.
        </div>
      )}
    </div>
  );
}
