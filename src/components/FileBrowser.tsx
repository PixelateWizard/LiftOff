import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { GamepadBtn } from "./GamepadBtn";
import { useTheme } from "../contexts/ThemeContext";
import { getBestGamepad, readGpState } from "../utils/gamepad";

// function getBestGamepad() {
//   const gps = Array.from(navigator.getGamepads()).filter(Boolean);
//   return (
//     gps.find(gp => gp!.mapping === "standard" && gp!.axes.length >= 4) ||
//     gps.find(gp => gp!.buttons.length >= 4    && gp!.axes.length >= 4) ||
//     gps[0] || null
//   );
// }
// function readGpState(gp: Gamepad) {
//   const btn = (i: number) => !!gp.buttons[i]?.pressed;
//   const hatLeft  = (gp.axes[6] ?? 0) < -0.5;
//   const hatRight = (gp.axes[6] ?? 0) >  0.5;
//   const hatUp    = (gp.axes[7] ?? 0) < -0.5;
//   const hatDown  = (gp.axes[7] ?? 0) >  0.5;
//   return {
//     ArrowUp:    btn(12) || hatUp    || gp.axes[1] < -0.5,
//     ArrowDown:  btn(13) || hatDown  || gp.axes[1] >  0.5,
//     Enter:      btn(0),
//     Escape:     btn(1),
//     ButtonX:    btn(2),
//   };
// }

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  extension: string;
}

interface Props {
  mode?: "file" | "folder";
  repeatSpeed?: string;
  onSelect: (entry: FileEntry) => void;
  onClose: () => void;
}

export default function FileBrowser({ mode = "file", repeatSpeed = "normal", onSelect, onClose }: Props) {
  const { glass, accent, theme, isDark } = useTheme();
  const { t } = useTranslation();
  const [entries, setEntries]   = useState<FileEntry[]>([]);
  const [path, setPath]         = useState<string | null>(null);
  const [history, setHistory]   = useState<(string | null)[]>([]);
  const [focusIdx, setFocusIdx] = useState(0);
  const focusIdxRef             = useRef(0);
  const focusedRef              = useRef<HTMLDivElement | null>(null);

  const iDelay = repeatSpeed === "slow" ? 500 : repeatSpeed === "fast" ? 250 : 400;
  const rDelay = repeatSpeed === "slow" ? 150 : repeatSpeed === "fast" ? 60  : 100;

  const load = useCallback((targetPath: string | null) => {
    const cmd = targetPath === null ? "get_drives" : "list_dir";
    const args = targetPath === null ? {} : { path: targetPath };
    invoke<FileEntry[]>(cmd, args).then(result => {
      setEntries(result);
      setFocusIdx(0);
      focusIdxRef.current = 0;
    }).catch(() => setEntries([]));
  }, []);

  useEffect(() => { load(null); }, [load]);

  useEffect(() => {
    if (focusedRef.current) focusedRef.current.scrollIntoView({ block: "nearest" });
  }, [focusIdx]);

  const navigate = useCallback((entry: FileEntry) => {
    if (entry.is_dir) {
      setHistory(h => [...h, path]);
      setPath(entry.path);
      load(entry.path);
    } else {
      onSelect(entry);
    }
  }, [path, load, onSelect]);

  const goUp = useCallback(() => {
    if (history.length === 0) { onClose(); return; }
    const prev = history[history.length - 1] ?? null;
    setHistory(h => h.slice(0, -1));
    setPath(prev);
    load(prev);
  }, [history, load, onClose]);

  const selectFolder = useCallback(() => {
    if (path === null) return;
    onSelect({ name: path.split("\\").pop() || path, path, is_dir: true, extension: "" });
  }, [path, onSelect]);

  const navigateRef     = useRef(navigate);
  const goUpRef         = useRef(goUp);
  const selectFolderRef = useRef(selectFolder);
  const entriesRef      = useRef(entries);
  const modeRef         = useRef(mode);
  const pathRef         = useRef(path);
  useEffect(() => { navigateRef.current     = navigate; },     [navigate]);
  useEffect(() => { goUpRef.current         = goUp; },         [goUp]);
  useEffect(() => { selectFolderRef.current = selectFolder; }, [selectFolder]);
  useEffect(() => { entriesRef.current      = entries; },      [entries]);
  useEffect(() => { modeRef.current         = mode; },         [mode]);
  useEffect(() => { pathRef.current         = path; },         [path]);

  useEffect(() => {
    const pressTime: Record<string, number>  = {};
    const repeating: Record<string, boolean> = {};

    const handle = (key: string) => {
      if (key === "ArrowDown") {
        const next = Math.min(focusIdxRef.current + 1, entriesRef.current.length - 1);
        setFocusIdx(next); focusIdxRef.current = next;
      } else if (key === "ArrowUp") {
        const next = Math.max(focusIdxRef.current - 1, 0);
        setFocusIdx(next); focusIdxRef.current = next;
      } else if (key === "Enter") {
        const entry = entriesRef.current[focusIdxRef.current];
        if (entry) navigateRef.current(entry);
        else if (modeRef.current === "folder" && pathRef.current !== null) selectFolderRef.current();
      } else if (key === "Escape") {
        goUpRef.current();
      } else if (key === "f") {
        if (modeRef.current === "folder" && pathRef.current !== null) selectFolderRef.current();
      }
    };

    const onKey = (e: KeyboardEvent) => {
      const key = e.key;
      if (!["ArrowDown","ArrowUp","Enter","Escape","f"].includes(key)) return;
      e.preventDefault();
      if (!pressTime[key]) {
        handle(key);
        pressTime[key] = Date.now();
        repeating[key] = false;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { delete pressTime[e.key]; delete repeating[e.key]; };

    const rAF = { current: 0 };
    const tick = () => {
      const now = Date.now();
      for (const key of Object.keys(pressTime)) {
        const held = now - pressTime[key];
        if (!repeating[key] && held >= iDelay) { repeating[key] = true; pressTime[key] = now; handle(key); }
        else if (repeating[key] && held >= rDelay) { pressTime[key] = now; handle(key); }
      }
      rAF.current = requestAnimationFrame(tick);
    };
    rAF.current = requestAnimationFrame(tick);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKeyUp, true);
    return () => {
      cancelAnimationFrame(rAF.current);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKeyUp, true);
    };
  }, [iDelay, rDelay]);

  useEffect(() => {
    type GpSnapshot = ReturnType<typeof readGpState>;
    const last: Partial<GpSnapshot>          = {};
    const gpPress: Record<string, number>    = {};
    const gpRepeat: Record<string, boolean>  = {};
    const REPEATABLE = new Set(["ArrowUp", "ArrowDown"]);
    let suppressFrames = 20;

    const handle = (key: string) => {
      if (key === "ArrowDown") {
        const next = Math.min(focusIdxRef.current + 1, entriesRef.current.length - 1);
        setFocusIdx(next); focusIdxRef.current = next;
      } else if (key === "ArrowUp") {
        const next = Math.max(focusIdxRef.current - 1, 0);
        setFocusIdx(next); focusIdxRef.current = next;
      } else if (key === "Enter") {
        const entry = entriesRef.current[focusIdxRef.current];
        if (entry) navigateRef.current(entry);
        else if (modeRef.current === "folder" && pathRef.current !== null) selectFolderRef.current();
      } else if (key === "Escape") {
        goUpRef.current();
      } else if (key === "ButtonX") {
        if (modeRef.current === "folder" && pathRef.current !== null) selectFolderRef.current();
      }
    };

    let rafId: number;
    const poll = (now: number) => {
      if (suppressFrames > 0) { suppressFrames--; requestAnimationFrame(poll); return; }
      const gp = getBestGamepad();
      if (gp) {
        const state = readGpState(gp);
        const iDelayCur = 400;
        const rDelayCur = 100;
        for (const key of Object.keys(state)) {
          const pressed = state[key as keyof GpSnapshot];
          const was = last[key as keyof GpSnapshot];
          if (pressed && !was) {
            handle(key);
            gpPress[key] = now;
            gpRepeat[key] = false;
          } else if (pressed && was && REPEATABLE.has(key)) {
            const held = now - (gpPress[key] || now);
            if (!gpRepeat[key] && held >= iDelayCur) { gpRepeat[key] = true; gpPress[key] = now; handle(key); }
            else if (gpRepeat[key] && held >= rDelayCur) { gpPress[key] = now; handle(key); }
          } else if (!pressed && was) {
            gpPress[key] = 0; gpRepeat[key] = false;
          }
          last[key as keyof GpSnapshot] = pressed;
        }
      }
      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const pathParts = path ? path.replace(/\\/g, "/").split("/").filter(Boolean) : [];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Segoe UI', sans-serif",
    }}>
      <div style={{
        ...glass, width: 560, maxHeight: "75vh", borderRadius: 20,
        display: "flex", flexDirection: "column", overflow: "hidden",
        border: `1px solid ${accent.glow}0.3)`,
        boxShadow: `0 8px 48px rgba(0,0,0,0.6)`,
      }}>
        <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 6 }}>
            {mode === "folder" ? t("fileBrowser.selectFolder") : t("fileBrowser.selectFile")}
          </div>
          <div style={{ fontSize: 11, color: theme.textDim, display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ cursor: "pointer", color: path === null ? accent.primary : theme.textDim }}
              onClick={() => { setHistory([]); setPath(null); load(null); }}>
              {t("fileBrowser.drives")}
            </span>
            {pathParts.map((part, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: theme.textFaint }}>›</span>
                <span style={{ cursor: "pointer", color: i === pathParts.length - 1 ? accent.primary : theme.textDim }}
                  onClick={() => {
                    const newPath = pathParts.slice(0, i + 1).join("\\") + (pathParts[0].endsWith(":") && i === 0 ? "\\" : "");
                    const hist = history.slice(0, history.length - (pathParts.length - 1 - i));
                    setHistory(hist); setPath(newPath); load(newPath);
                  }}>
                  {part}
                </span>
              </span>
            ))}
          </div>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
          {entries.length === 0 && (
            <div style={{ padding: "24px", textAlign: "center", color: theme.textDim, fontSize: 13 }}>
              {t("fileBrowser.empty")}
            </div>
          )}
          {entries.map((entry, i) => {
            const focused = focusIdx === i;
            return (
              <div key={entry.path} ref={focused ? focusedRef : null}
                onClick={() => { setFocusIdx(i); focusIdxRef.current = i; navigate(entry); }}
                style={{
                  padding: "9px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                  background: focused ? `${accent.glow}0.15)` : "transparent",
                  borderLeft: focused ? `2px solid ${accent.primary}` : "2px solid transparent",
                  transition: "background 0.1s",
                }}>
                <span style={{ fontSize: 16, width: 20, textAlign: "center", flexShrink: 0 }}>
                  {entry.is_dir ? "📁" : entry.extension === "lnk" ? "🔗" : "⚙️"}
                </span>
                <span style={{ fontSize: 13, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {entry.name}
                </span>
                {entry.is_dir && (
                  <span style={{ marginLeft: "auto", fontSize: 11, color: theme.textFaint }}>›</span>
                )}
              </div>
            );
          })}
        </div>

        <div style={{
          padding: "12px 20px", borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
          display: "flex", gap: 16, alignItems: "center",
        }}>
          <GamepadBtn btn="A"  label={mode === "folder" ? t("fileBrowser.open") : t("fileBrowser.select")} />
          {mode === "folder" && path !== null && (
            <span style={{ cursor: "pointer" }} onClick={selectFolder}>
              <GamepadBtn btn="X" label={t("fileBrowser.selectThis")}
                style={{ color: accent.primary }} />
            </span>
          )}
          <span style={{ marginLeft: "auto", cursor: "pointer" }} onClick={goUp}>
            <GamepadBtn btn="B" label={t("common.back")} />
          </span>
        </div>
      </div>
    </div>
  );
}
