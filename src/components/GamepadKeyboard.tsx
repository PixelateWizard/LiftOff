import { useState, useRef, useEffect } from "react";
import { getBestGamepad, readGpState } from "../utils/gamepad";
import { useTheme } from "../contexts/ThemeContext";

const KB_ALPHA = [
  ["q","w","e","r","t","y","u","i","o","p"],
  ["a","s","d","f","g","h","j","k","l"],
  ["z","x","c","v","b","n","m"],
];
const KB_NUMS = [
  ["1","2","3","4","5","6","7","8","9","0"],
  ["-","_","=","+","[","]","{","}","\\","|"],
  [";","'",",",".","!","@","#","$","%","^"],
];
const ROW_OFFSETS = [0, 0.5, 1.5];

interface Props {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onConfirm?: () => void;
  title?: string;
}

export default function GamepadKeyboard({ value, onChange, onClose, onConfirm, title = "" }: Props) {
  const { glass, accent, theme, isDark } = useTheme();
  const [row,     setRow]     = useState(0);
  const [col,     setCol]     = useState(0);
  const [numMode, setNumMode] = useState(false);

  const rowRef     = useRef(0);
  const colRef     = useRef(0);
  const numModeRef = useRef(false);
  const valueRef   = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  const layout = numMode ? KB_NUMS : KB_ALPHA;

  const fireKey    = (k: string) => onChange(valueRef.current + k);
  const deleteChar = ()          => onChange(valueRef.current.slice(0, -1));
  const addSpace   = ()          => onChange(valueRef.current + " ");
  const toggleNum  = () => {
    const next = !numModeRef.current;
    setNumMode(next); numModeRef.current = next;
    setRow(0); rowRef.current = 0;
    setCol(0); colRef.current = 0;
  };

  useEffect(() => {
    const last: any = {};
    const pressTime: any = {};
    const repeating: any = {};
    const REPEATABLE = new Set(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","ButtonX"]);
    const iDelay = 350;
    const rDelay = 80;

    const handle = (key: string) => {
      const lay = numModeRef.current ? KB_NUMS : KB_ALPHA;
      const curRow = rowRef.current;
      const curCol = colRef.current;
      const rowLen = lay[curRow]?.length ?? 0;

      if (key === "ArrowRight") {
        const ni = Math.min(curCol + 1, rowLen - 1);
        setCol(ni); colRef.current = ni;
      } else if (key === "ArrowLeft") {
        const ni = Math.max(curCol - 1, 0);
        setCol(ni); colRef.current = ni;
      } else if (key === "ArrowDown") {
        if (curRow < lay.length - 1) {
          const nr = curRow + 1;
          const nc = Math.min(curCol, lay[nr].length - 1);
          setRow(nr); rowRef.current = nr;
          setCol(nc); colRef.current = nc;
        }
      } else if (key === "ArrowUp") {
        if (curRow > 0) {
          const nr = curRow - 1;
          const nc = Math.min(curCol, lay[nr].length - 1);
          setRow(nr); rowRef.current = nr;
          setCol(nc); colRef.current = nc;
        }
      } else if (key === "Enter") {
        const k = lay[curRow]?.[curCol];
        if (k) fireKey(k);
      } else if (key === "ButtonX") {
        deleteChar();
      } else if (key === "ButtonY") {
        addSpace();
      } else if (key === "TriggerRight") {
        toggleNum();
      } else if (key === "Escape") {
        onClose();
      }
    };

    let rafId: number;
    let suppressFrames = 20;
    const poll = (now: number) => {
      if (suppressFrames > 0) { suppressFrames--; rafId = requestAnimationFrame(poll); return; }
      const gp = getBestGamepad();
      if (gp) {
        const state = readGpState(gp);
        for (const key of Object.keys(state)) {
          const pressed = (state as any)[key];
          const was = last[key];
          if (pressed && !was) {
            handle(key);
            pressTime[key] = now;
            repeating[key] = false;
          } else if (pressed && was && REPEATABLE.has(key)) {
            const held = now - (pressTime[key] || now);
            if (!repeating[key] && held >= iDelay) { repeating[key] = true; pressTime[key] = now; handle(key); }
            else if (repeating[key] && held >= rDelay) { pressTime[key] = now; handle(key); }
          } else if (!pressed && was) {
            pressTime[key] = 0; repeating[key] = false;
          }
          last[key] = pressed;
        }
      }
      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 3000,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "'Segoe UI', sans-serif",
    }}>
      <div style={{ ...glass, borderRadius: 20, padding: "20px 24px", width: 520, display: "flex", flexDirection: "column", gap: 14,
        border: `1px solid ${accent.glow}0.3)`, boxShadow: "0 12px 60px rgba(0,0,0,0.7)" }}>

        {title && <div style={{ fontSize: 12, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: "0.08em" }}>{title}</div>}

        <div style={{ background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", borderRadius: 10, padding: "10px 14px",
          fontSize: 15, color: theme.text, minHeight: 40, letterSpacing: "0.02em",
          border: `1px solid ${accent.glow}0.25)` }}>
          {value || <span style={{ color: theme.textFaint, fontStyle: "italic" }}>…</span>}
          <span style={{ display: "inline-block", width: 2, height: "1em", background: accent.primary, marginLeft: 2, verticalAlign: "text-bottom", animation: "kbCursor 1s steps(1) infinite" }} />
        </div>

        <div>
          {layout.map((rowKeys, rIdx) => (
            <div key={rIdx} style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 4,
              paddingLeft: `${ROW_OFFSETS[rIdx] * 25}px` }}>
              {rowKeys.map((k, cIdx) => {
                const active = row === rIdx && col === cIdx;
                return (
                  <div key={k + cIdx} onClick={() => { fireKey(k); }}
                    style={{
                      width: 44, height: 38, display: "flex", alignItems: "center", justifyContent: "center",
                      borderRadius: 7, cursor: "pointer", userSelect: "none", flexShrink: 0,
                      fontSize: 14, fontWeight: active ? 700 : 500,
                      background: active ? `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` : (isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.8)"),
                      color: active ? (accent.darkText ? "#1a1a1a" : "white") : theme.text,
                      border: active ? `1px solid ${accent.glow}0.7)` : `1px solid ${isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)"}`,
                      boxShadow: active ? `0 0 14px ${accent.glow}0.5)` : "none",
                      transform: active ? "scale(1.14)" : "scale(1)",
                      transition: "transform 0.07s, box-shadow 0.07s",
                    }}>
                    {k}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 14, paddingTop: 4, borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}` }}>
          {[
            { bg: "#4a9c4a", label: "A", desc: "Type" },
            { bg: "#3a5a8a", label: "X", desc: "Delete" },
            { bg: "#9a7020", label: "Y", desc: "Space" },
            { bg: "#b03030", label: "B", desc: "Done" },
            { bg: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.18)", label: "RT", desc: numMode ? "ABC" : "123", circle: false },
          ].map(({ bg, label, desc, circle = true }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: circle ? 18 : "auto", height: 18, minWidth: 18, borderRadius: circle ? "50%" : 4,
                background: bg, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 8, fontWeight: 700, color: "white", padding: circle ? 0 : "0 3px", flexShrink: 0 }}>
                {label}
              </div>
              <span style={{ fontSize: 10, color: theme.textDim }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes kbCursor { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  );
}
