//Copyright (C) 2025 Taylor Denby

import { useState, useEffect, useRef, useMemo } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import uiSound from "./assets/uiSound.mp3";
import uiSoundAlt from "./assets/uiSoundAlt.mp3";
import startingSound from "./assets/appLaunchSound.wav";
import appStartSound from "./assets/gameLaunchSound.wav";
import appLoadedSound from "./assets/appLoadedSound.wav";

const COLS = 6;
const GAME_COLS = 5;
const TABS = ["Home", "Games", "Apps", "Settings"];
const APP_VERSION = "1.2.1";
const GITHUB_REPO = "PixelateWizard/LiftOff"; // owner/repo — update before release

const ACCENTS = {
  ember:    { primary: "#e8714a", light: "#ff9a6c", dark: "#c94f28", glow: "rgba(232,113,74,", lightBg: "#f5e8e0" },
  ocean:    { primary: "#4a9ee8", light: "#6cb8ff", dark: "#2878c9", glow: "rgba(74,158,232,",  lightBg: "#ddeeff" },
  neon:     { primary: "#4ae88a", lightPrimary: "#15803d", light: "#6cffaa", dark: "#28c96a", glow: "rgba(74,232,138,",  lightBg: "#ddf5e8" },
  rose:     { primary: "#e84a8a", light: "#ff6caa", dark: "#c9286a", glow: "rgba(232,74,138,",  lightBg: "#f5dde8" },
  midnight: { primary: "#8a4ae8", light: "#aa6cff", dark: "#6a28c9", glow: "rgba(138,74,232,",  lightBg: "#e8ddff" },
};

const THEMES = {
  dark:  { text: "#f5ede8", textDim: "rgba(245,237,232,0.4)", textFaint: "rgba(245,237,232,0.3)" },
  light: { text: "#2a1a0e", textDim: "rgba(42,26,14,0.5)",    textFaint: "rgba(42,26,14,0.35)"  },
};

const CLOUD_SHAPES = [
  `<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg"><ellipse cx="100" cy="55" rx="95" ry="28"/><ellipse cx="70" cy="45" rx="45" ry="35"/><ellipse cx="110" cy="38" rx="52" ry="40"/><ellipse cx="150" cy="48" rx="38" ry="30"/></svg>`,
  `<svg viewBox="0 0 160 60" xmlns="http://www.w3.org/2000/svg"><ellipse cx="80" cy="42" rx="75" ry="20"/><ellipse cx="55" cy="32" rx="38" ry="28"/><ellipse cx="95" cy="26" rx="42" ry="30"/><ellipse cx="128" cy="35" rx="30" ry="22"/></svg>`,
  `<svg viewBox="0 0 120 50" xmlns="http://www.w3.org/2000/svg"><ellipse cx="60" cy="35" rx="56" ry="18"/><ellipse cx="42" cy="26" rx="30" ry="22"/><ellipse cx="72" cy="20" rx="34" ry="26"/><ellipse cx="95" cy="28" rx="24" ry="18"/></svg>`,
  `<svg viewBox="0 0 240 55" xmlns="http://www.w3.org/2000/svg"><ellipse cx="120" cy="38" rx="115" ry="18"/><ellipse cx="80" cy="28" rx="50" ry="24"/><ellipse cx="140" cy="22" rx="55" ry="26"/><ellipse cx="190" cy="32" rx="45" ry="20"/></svg>`,
];

const CLOUD_CONFIGS = [
  { shape: 0, width: 280, top: "8%",  duration: 90,  delay: -45,  opacity: 0.75 },
  { shape: 1, width: 200, top: "22%", duration: 110, delay: -22,  opacity: 0.65 },
  { shape: 2, width: 140, top: "40%", duration: 75,  delay: -60,  opacity: 0.70 },
  { shape: 3, width: 320, top: "60%", duration: 130, delay: -85,  opacity: 0.60 },
  { shape: 0, width: 180, top: "72%", duration: 95,  delay: -10,  opacity: 0.72 },
  { shape: 1, width: 240, top: "15%", duration: 120, delay: -100, opacity: 0.62 },
  { shape: 2, width: 160, top: "50%", duration: 85,  delay: -38,  opacity: 0.68 },
  { shape: 3, width: 200, top: "85%", duration: 100, delay: -70,  opacity: 0.60 },
  { shape: 0, width: 120, top: "5%",  duration: 80,  delay: -15,  opacity: 0.55 },
  { shape: 1, width: 260, top: "30%", duration: 115, delay: -55,  opacity: 0.63 },
  { shape: 2, width: 190, top: "65%", duration: 105, delay: -88,  opacity: 0.67 },
  { shape: 3, width: 150, top: "80%", duration: 88,  delay: -33,  opacity: 0.58 },
  { shape: 0, width: 340, top: "45%", duration: 140, delay: -72,  opacity: 0.50 },
  { shape: 1, width: 110, top: "18%", duration: 72,  delay: -48,  opacity: 0.70 },
  { shape: 2, width: 220, top: "90%", duration: 95,  delay: -20,  opacity: 0.55 },
  { shape: 3, width: 170, top: "55%", duration: 108, delay: -95,  opacity: 0.62 },
];

// ── Xbox-style keyboard layouts ───────────────────────────────
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
// ─────────────────────────────────────────────────────────────

const launchApp = (app) =>
  invoke("launch_app", { path: app.launch_path, id: app.id, name: app.name, appType: app.app_type });

function SplashScreen({ exiting }) {
  const audioRefStart = useRef(new Audio(startingSound));

  useEffect(() => {
    audioRefStart.current.currentTime = 0;
    audioRefStart.current.play().catch(() => {});
  }, []);

  useEffect(() => {
    if (exiting) { audioRefStart.current.pause(); audioRefStart.current.currentTime = 0; }
  }, [exiting]);

  useEffect(() => {
    const style = document.createElement("style");
    style.id = "splash-styles";
    style.textContent = `
      @keyframes splashRocket {
        0%   { opacity: 0; transform: translateY(40px) scale(0.8); }
        20%  { opacity: 1; transform: translateY(0px) scale(1); }
        70%  { opacity: 1; transform: translateY(0px) scale(1); }
        85%  { opacity: 1; transform: translateY(-8px) scale(1.05); }
        100% { opacity: 1; transform: translateY(0px) scale(1); }
      }
      @keyframes splashRocketExit {
        0%   { opacity: 1; transform: translateY(0px) scale(1); }
        100% { opacity: 0; transform: translateY(-140px) scale(0.6); }
      }
      @keyframes splashFlicker {
        0%   { transform: scaleY(1) scaleX(1); opacity: 0.95; }
        100% { transform: scaleY(1.06) scaleX(0.97); opacity: 0.85; }
      }
      @keyframes splashFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes splashFadeOut { 0% { opacity: 1; } 100% { opacity: 0; } }
      @keyframes splashDot {
        0%, 100% { background: rgba(232,113,74,0.3); transform: scale(1); }
        50%      { background: #e8714a; transform: scale(1.3); }
      }
      @keyframes splashGlow    { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.15); opacity: 1; } }
      @keyframes splashTrail   { 0% { opacity: 0.9; transform: scaleY(1); } 100% { opacity: 0.3; transform: scaleY(0.6); } }
      @keyframes starFall {
        0%   { transform: translateY(-10px); opacity: 0; }
        5%   { opacity: 1; } 95% { opacity: 1; }
        100% { transform: translateY(110vh); opacity: 0; }
      }
      @keyframes cursorBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      .splash-rocket  { animation: splashRocket 2.5s cubic-bezier(0.4,0,0.2,1) forwards; animation-delay: 0.5s; opacity: 0; position: relative; }
      .splash-flame   { animation: splashFlicker 0.25s ease-in-out infinite alternate; transform-origin: top center; }
      .splash-word    { animation: splashFadeUp 0.6s ease forwards; animation-delay: 0.9s; opacity: 0; }
      .splash-dots    { animation: splashFadeUp 0.4s ease forwards; animation-delay: 1.5s; opacity: 0; display: flex; gap: 6px; }
      .splash-dot     { width: 5px; height: 5px; border-radius: 50%; animation: splashDot 1.2s ease-in-out infinite; background: rgba(232,113,74,0.3); }
      .splash-dot:nth-child(2) { animation-delay: 0.2s; }
      .splash-dot:nth-child(3) { animation-delay: 0.4s; }
      .splash-glow    { animation: splashGlow 2s ease-in-out infinite; }
      .splash-trail1  { animation: splashTrail 0.4s ease-in-out infinite alternate; }
      .splash-trail2  { animation: splashTrail 0.4s ease-in-out infinite alternate; animation-delay: 0.08s; }
      .splash-trail3  { animation: splashTrail 0.4s ease-in-out infinite alternate; animation-delay: 0.13s; }
      .splash-star    { animation: starFall linear infinite; position: absolute; border-radius: 50%; background: rgba(245,237,232,0.6); }
      .splash-exiting .splash-rocket { animation: splashRocketExit 0.6s cubic-bezier(0.4,0,0.2,1) forwards !important; }
      .splash-exiting .splash-word, .splash-exiting .splash-dots { animation: splashFadeOut 0.35s ease forwards !important; }
      .splash-exiting { animation: splashFadeOut 0.8s ease forwards; }
      .kb-cursor      { animation: cursorBlink 1s ease-in-out infinite; }
      @keyframes pinPop { 0% { transform: scale(0.5); opacity: 0; } 60% { transform: scale(1.3); } 100% { transform: scale(1); opacity: 1; } }
      .pin-pop { animation: pinPop 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards; }
    `;
    document.head.appendChild(style);
    const container = document.getElementById("splash-stars");
    if (container) {
      for (let i = 0; i < 80; i++) {
        const star = document.createElement("div");
        star.className = "splash-star";
        star.style.left = Math.random() * 100 + "%";
        star.style.top  = Math.random() * 100 + "%";
        const size = (Math.random() * 2.5 + 0.5) + "px";
        star.style.width = star.style.height = size;
        star.style.animationDuration = (Math.random() * 3 + 2) + "s";
        star.style.animationDelay    = -(Math.random() * 5) + "s";
        star.style.opacity = (Math.random() * 0.5 + 0.3).toString();
        container.appendChild(star);
      }
    }
    return () => { document.getElementById("splash-styles")?.remove(); };
  }, []);

  return (
    <div style={ss.outer} className={exiting ? "splash-exiting" : ""}>
      <div className="splash-glow" style={ss.glow} />
      <div style={ss.stars} id="splash-stars" />
      <div style={ss.inner}>
        <div className="splash-rocket" style={{ opacity: 0 }}>
          <svg width="80" height="80" viewBox="0 0 32 32" fill="none">
            <path d="M16 2 L21 9 L22 19 Q22 22 19 22 L13 22 Q10 22 10 19 L11 9 Z" fill="url(#splashGrad)"/>
            <circle cx="16" cy="13" r="3.5" fill="white" opacity="0.9"/>
            <circle cx="16" cy="13" r="2" fill="#bde0ff" opacity="0.7"/>
            <circle cx="17" cy="12" r="0.7" fill="white"/>
            <path d="M10 18 L5 25 L11 21 Z" fill="#c94f28"/>
            <path d="M22 18 L27 25 L21 21 Z" fill="#c94f28"/>
            <g className="splash-flame">
              <path d="M12 22 Q14 30 16 27 Q18 30 20 22" fill="#ffb347" opacity="0.95"/>
              <path d="M13.5 22 Q15 28 16 26 Q17 28 18.5 22" fill="#fff176" opacity="0.75"/>
            </g>
            <defs>
              <linearGradient id="splashGrad" x1="16" y1="2" x2="16" y2="22" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ff9a6c"/>
                <stop offset="100%" stopColor="#c94f28"/>
              </linearGradient>
            </defs>
          </svg>
          <div style={ss.trail}>
            <div className="splash-trail1" style={ss.tl1} />
            <div className="splash-trail2" style={ss.tl2} />
            <div className="splash-trail3" style={ss.tl3} />
          </div>
        </div>
        <div className="splash-word" style={{ ...ss.wordmark, opacity: 0 }}>LiftOff</div>
        <div className="splash-dots" style={{ opacity: 0 }}>
          <div className="splash-dot" /><div className="splash-dot" /><div className="splash-dot" />
        </div>
      </div>
    </div>
  );
}

const ss = {
  outer:    { position: "fixed", inset: 0, background: "#100a06", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 },
  glow:     { position: "fixed", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(180,60,20,0.25) 0%, transparent 70%)", pointerEvents: "none" },
  stars:    { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1 },
  inner:    { display: "flex", flexDirection: "column", alignItems: "center", gap: 24, position: "relative", zIndex: 2 },
  trail:    { position: "absolute", bottom: -22, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  tl1:      { width: 4, height: 14, borderRadius: 2, background: "linear-gradient(to bottom, rgba(255,200,80,0.8), transparent)" },
  tl2:      { width: 3, height: 10, borderRadius: 2, background: "linear-gradient(to bottom, rgba(255,140,50,0.5), transparent)", marginLeft: 5 },
  tl3:      { width: 3, height: 8,  borderRadius: 2, background: "linear-gradient(to bottom, rgba(255,140,50,0.5), transparent)", marginLeft: -5 },
  wordmark: { fontWeight: 700, fontSize: 36, letterSpacing: "0.04em", background: "linear-gradient(135deg, #ff9a6c, #e8714a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", fontFamily: "'Segoe UI', sans-serif" },
};

function LaunchOverlay({ app, gameArt, customArt, accent, onDone }) {
  const art = app?.app_type === "game" ? (customArt?.[app?.id] || gameArt[app?.id]) : null;
  const [status, setStatus] = useState("launching"); // "launching" | "failed"
  const rafRef   = useRef(null);
  const lastEsc  = useRef(false);
  const mounted  = useRef(true);

  useEffect(() => {
    mounted.current = true;

    const style = document.createElement("style");
    style.id = "launch-overlay-styles";
    style.textContent = `
      @keyframes overlayFadeIn   { from { opacity: 0; } to { opacity: 1; } }
      @keyframes launchIconPop   { 0% { transform: scale(0.7); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
      @keyframes launchTextFade  { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes launchDot       { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
      @keyframes launchGlowPulse { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.2); opacity: 1; } }
      .launch-overlay { animation: overlayFadeIn 0.25s ease forwards; }
      .launch-icon    { animation: launchIconPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
      .launch-text    { animation: launchTextFade 0.3s ease forwards; animation-delay: 0.3s; opacity: 0; }
      .launch-dot     { animation: launchDot 1s ease-in-out infinite; }
      .launch-dot:nth-child(2) { animation-delay: 0.15s; }
      .launch-dot:nth-child(3) { animation-delay: 0.3s; }
      .launch-glow    { animation: launchGlowPulse 1.5s ease-in-out infinite; }
    `;
    document.head.appendChild(style);

    // Tauri event listeners — dismiss on success, show error on failure.
    let unlistenSuccess, unlistenFailed;
    listen("launch-success", () => { if (mounted.current) onDone(); })
      .then(fn => { unlistenSuccess = fn; });
    listen("launch-failed", () => { if (mounted.current) setStatus("failed"); })
      .then(fn => { unlistenFailed = fn; });

    // Keyboard dismiss (Escape).
    const handleKey = (e) => { if (e.key === "Escape") onDone(); };
    window.addEventListener("keydown", handleKey);

    // Gamepad B button dismiss. Suppress the first several frames so the
    // button press that triggered launch doesn't immediately close the overlay.
    let suppressFrames = 10;
    const poll = () => {
      const gp = getBestGamepad();
      if (gp) {
        const state = readGpState(gp);
        if (suppressFrames > 0) {
          suppressFrames--;
        } else if (state.Escape && !lastEsc.current) {
          onDone();
        }
        lastEsc.current = state.Escape;
      }
      rafRef.current = requestAnimationFrame(poll);
    };
    rafRef.current = requestAnimationFrame(poll);

    return () => {
      mounted.current = false;
      document.getElementById("launch-overlay-styles")?.remove();
      window.removeEventListener("keydown", handleKey);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      unlistenSuccess?.();
      unlistenFailed?.();
    };
  }, []);

  return (
    <div className="launch-overlay" style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <div className="launch-glow" style={{ position: "absolute", width: 320, height: 320, borderRadius: "50%", background: `radial-gradient(circle, ${accent.glow}0.25) 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div className="launch-icon" style={{ position: "relative", zIndex: 1 }}>
        {art ? (
          <img src={art} alt={app.name} style={{ width: 160, height: 240, borderRadius: 16, objectFit: "cover", boxShadow: `0 8px 40px ${accent.glow}0.5), 0 0 0 2px ${accent.glow}0.3)` }} />
        ) : app?.icon_base64 ? (
          <div style={{ width: 120, height: 120, borderRadius: 24, background: `${accent.glow}0.15)`, border: `2px solid ${accent.glow}0.4)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 8px 40px ${accent.glow}0.4)`, overflow: "hidden" }}>
            <img src={`data:image/png;base64,${app.icon_base64}`} alt={app.name} style={{ width: 72, height: 72, maxWidth: "100%", maxHeight: "100%", borderRadius: 12, objectFit: "contain", objectPosition: "center", display: "block" }} />
          </div>
        ) : (
          <div style={{ width: 120, height: 120, borderRadius: 24, background: `${accent.glow}0.2)`, border: `2px solid ${accent.glow}0.4)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52, fontWeight: 700, color: accent.primary, boxShadow: `0 8px 40px ${accent.glow}0.4)` }}>
            {app?.name?.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="launch-text" style={{ fontFamily: "'Segoe UI', sans-serif", textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "white", marginBottom: 8, letterSpacing: "0.02em" }}>{app?.name}</div>
        {status === "launching" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.22)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Launching</span>
            <span style={{ display: "flex", gap: 3 }}>
              {[0,1,2].map(i => <span key={i} className="launch-dot" style={{ width: 4, height: 4, borderRadius: "50%", background: accent.primary, display: "inline-block" }} />)}
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 13, color: "rgba(255,90,90,0.95)", letterSpacing: "0.05em" }}>Failed to launch</div>
            <button
              onClick={onDone}
              style={{
                padding: "8px 22px", borderRadius: 10, cursor: "pointer",
                fontFamily: "'Segoe UI', sans-serif", fontSize: 13, fontWeight: 600,
                background: `${accent.glow}0.18)`,
                border: `1px solid ${accent.glow}0.5)`,
                color: "rgba(255,255,255,0.85)",
                letterSpacing: "0.06em",
              }}
            >
              Dismiss  ·  B
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Custom Art Picker Modal ───────────────────────────────────
function ArtPickerModal({ app, currentArt, hasCustomArt, cropMode = "portrait", accent, theme, isDark, glass, onClose, onSet, onReset }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(currentArt || null);
  const [pendingData, setPendingData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [focusedBtn, setFocusedBtn] = useState("browse");

  const pendingDataRef  = useRef(null);
  const focusedBtnRef   = useRef("browse");
  const lastBtnRef      = useRef({});

  // Compute which buttons are visible given current pending state
  const getButtons = () => {
    const btns = ["browse"];
    if (pendingDataRef.current) btns.push("save");
    if (hasCustomArt && !pendingDataRef.current) btns.push("reset");
    btns.push("cancel");
    return btns;
  };

  const handleSave = () => {
    if (!pendingDataRef.current) return;
    setSaving(true);
    invoke("set_custom_art", { id: app.id, data: pendingDataRef.current })
      .then(() => { onSet(app.id, pendingDataRef.current); onClose(); })
      .catch(console.error)
      .finally(() => setSaving(false));
  };
  const handleReset = () => {
    invoke("clear_custom_art", { id: app.id })
      .then(() => { onReset(app.id); onClose(); })
      .catch(console.error);
  };

  // Keep latest handlers accessible inside the RAF closure
  const handleSaveRef  = useRef(handleSave);
  const handleResetRef = useRef(handleReset);
  useEffect(() => { handleSaveRef.current  = handleSave; });
  useEffect(() => { handleResetRef.current = handleReset; });

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const TW = cropMode === "square" ? 500 : 600;
        const TH = cropMode === "square" ? 500 : 900;
        const canvas = document.createElement("canvas");
        canvas.width = TW; canvas.height = TH;
        const ctx = canvas.getContext("2d");
        const scale = Math.max(TW / img.width, TH / img.height);
        const sw = TW / scale, sh = TH / scale;
        const sx = (img.width  - sw) / 2;
        const sy = (img.height - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, TW, TH);
        const url = canvas.toDataURL("image/jpeg", 0.88);
        setPreview(url);
        setPendingData(url);
        pendingDataRef.current = url;
        setFocusedBtn("save"); focusedBtnRef.current = "save";
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Own RAF gamepad poll — runs while modal is mounted
  useEffect(() => {
    let rAFId;
    const poll = () => {
      const gp = getBestGamepad();
      if (gp) {
        const state = readGpState(gp);
        const btns  = getButtons();

        if (state.ArrowDown && !lastBtnRef.current.ArrowDown) {
          const i    = btns.indexOf(focusedBtnRef.current);
          const next = btns[Math.min(i + 1, btns.length - 1)];
          if (next !== focusedBtnRef.current) { setFocusedBtn(next); focusedBtnRef.current = next; }
        }
        if (state.ArrowUp && !lastBtnRef.current.ArrowUp) {
          const i    = btns.indexOf(focusedBtnRef.current);
          const next = btns[Math.max(i - 1, 0)];
          if (next !== focusedBtnRef.current) { setFocusedBtn(next); focusedBtnRef.current = next; }
        }
        if (state.Enter && !lastBtnRef.current.Enter) {
          const btn = focusedBtnRef.current;
          if (btn === "browse") fileRef.current?.click();
          else if (btn === "save")   handleSaveRef.current();
          else if (btn === "reset")  handleResetRef.current();
          else if (btn === "cancel") onClose();
        }
        if (state.Escape && !lastBtnRef.current.Escape) onClose();

        lastBtnRef.current = state;
      }
      rAFId = requestAnimationFrame(poll);
    };
    rAFId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rAFId);
  }, []);

  const btnStyle = (key, bg, color, extra = {}) => {
    const focused = focusedBtn === key;
    return {
      padding: "10px 20px", borderRadius: 10, cursor: "pointer",
      fontFamily: "'Segoe UI', sans-serif", fontSize: 14, fontWeight: 600,
      border: focused ? `2px solid ${accent.primary}` : "2px solid transparent",
      width: "100%", background: bg, color,
      transition: "all 0.15s ease",
      boxShadow: focused ? `0 0 0 2px ${accent.glow}0.4), 0 0 16px ${accent.glow}0.2)` : "none",
      transform: focused ? "scale(1.02)" : "scale(1)",
      ...extra,
    };
  };

  return (
    <div data-modal-overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
      <div style={{ ...glass, borderRadius: 20, padding: 24, width: 380 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: theme.text, marginBottom: 4 }}>{app.name}</div>
        <div style={{ fontSize: 12, color: theme.textDim, marginBottom: 16 }}>Replace cover art</div>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          {/* Preview — fixed width, 2:3 tall */}
          <div style={{ flexShrink: 0, width: 110 }}>
            {preview
              ? <img src={preview} alt="" style={{ width: "100%", aspectRatio: cropMode === "square" ? "1" : "2/3", objectFit: "cover", borderRadius: 10, display: "block" }} />
              : <div style={{ width: "100%", aspectRatio: cropMode === "square" ? "1" : "2/3", borderRadius: 10, background: `${accent.glow}0.1)`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 10, color: theme.textDim, textAlign: "center" }}>No art</span></div>
            }
          </div>
          {/* Controls */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
            <button onClick={() => fileRef.current?.click()} style={btnStyle("browse", `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`, "white")}>Browse Image</button>
            {pendingData && <button onClick={handleSave} disabled={saving} style={btnStyle("save", "#4a9c4a", "white", { opacity: saving ? 0.6 : 1 })}>{saving ? "Saving…" : "Save"}</button>}
            {hasCustomArt && !pendingData && <button onClick={handleReset} style={btnStyle("reset", "rgba(255,255,255,0.08)", theme.text)}>Reset to Default</button>}
            <button onClick={onClose} style={btnStyle("cancel", "rgba(255,255,255,0.05)", theme.textDim)}>Cancel</button>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, paddingTop: 4 }}>
              {[
                { bg: "#4a9c4a", label: "A Confirm" },
                { bg: "#b03030", label: "B Cancel" },
              ].map(({ bg, label }) => (
                <span key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: theme.textDim }}>
                  <span style={{ width: 18, height: 18, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "white", flexShrink: 0 }}>{label[0]}</span>
                  {label.slice(1)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SGDB thumbnail card ──────────────────────────────────────
// Only one thumbnail video plays at a time — module-level reference to the active element
let _activeThumbVideo = null;

function ThumbnailCard({ result, selected, isSelected, accent, theme, thumbW, aspect, onClick, ...rest }) {
  const [hovered, setHovered] = useState(false);
  const [videoSrc, setVideoSrc] = useState(null);
  const videoRef = useRef(null);
  const active = isSelected || hovered;
  // A real static thumbnail exists only when thumb differs from the full content URL
  const hasStaticThumb = result.thumb !== result.url;
  const urlLower = result.url.toLowerCase();
  const isVideoFormat = /\.(webm|mp4)$/i.test(urlLower);
  const isGifOrWebp = /\.(gif|webp)$/i.test(urlLower);

  // Set src only on first activation — never clears (keeps it buffered for re-hover)
  useEffect(() => {
    if (active && !videoSrc) setVideoSrc(result.url);
  }, [active]);

  // Play/pause imperatively based on active state
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoSrc) return;
    if (active) {
      if (_activeThumbVideo && _activeThumbVideo !== v) {
        _activeThumbVideo.pause();
        _activeThumbVideo.currentTime = 0;
      }
      _activeThumbVideo = v;
      v.play().catch(() => {});
    } else {
      if (_activeThumbVideo === v) _activeThumbVideo = null;
      v.pause();
      v.currentTime = 0;
    }
  }, [active, videoSrc]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const v = videoRef.current;
      if (v && _activeThumbVideo === v) _activeThumbVideo = null;
    };
  }, []);

  const fillStyle = { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" };

  return (
    <div
      style={{
        position: "relative", width: thumbW, aspectRatio: aspect, cursor: "pointer",
        borderRadius: 8, overflow: "hidden",
        outline: selected ? `2px solid ${accent.primary}` : "2px solid transparent",
        outlineOffset: -2, transition: "outline 0.1s", flexShrink: 0,
        transform: "translateZ(0)", willChange: "opacity",
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...rest}
    >
      {/* Bottom layer: static thumb when available, otherwise placeholder when idle */}
      {hasStaticThumb
        ? <img src={result.thumb} alt="" style={fillStyle} />
        : !active && (
          <div style={{
            ...fillStyle,
            background: "linear-gradient(135deg, rgba(30,15,8,0.95) 0%, rgba(50,25,10,0.9) 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Hover to preview
            </span>
          </div>
        )
      }

      {/* Top layer: animated content — only rendered/loaded when active */}
      {result.is_animated && (
        isVideoFormat ? (
          <video
            ref={videoRef}
            src={videoSrc || undefined}
            muted
            loop
            playsInline
            preload="none"
            style={{ ...fillStyle, opacity: active ? 1 : 0, transition: "opacity 0.15s" }}
          />
        ) : isGifOrWebp ? (
          <img
            src={active ? result.url : undefined}
            alt=""
            style={{ ...fillStyle, opacity: active ? 1 : 0, transition: "opacity 0.15s" }}
          />
        ) : null
      )}

      {result.is_animated && hasStaticThumb && (
        <div style={{
          position: "absolute", top: 5, left: 5, padding: "2px 5px", borderRadius: 4,
          background: accent.primary, color: "white", fontSize: 8, fontWeight: 700, letterSpacing: "0.05em",
        }}>
          ANIM
        </div>
      )}

      {active && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, padding: "4px 6px",
          background: "rgba(0,0,0,0.72)", display: "flex", gap: 6, alignItems: "center",
        }}>
          {result.author && (
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              {result.author}
            </span>
          )}
          {result.upvotes > 0 && (
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", flexShrink: 0 }}>▲{result.upvotes}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── SgdbBrowser ───────────────────────────────────────────────
const HERO_FILTERS = ["all", "animated", "static"];

function SgdbBrowser({ app, artType, accent, theme, isDark, onSet, onClose, repeatSpeed = "normal" }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [heroFilter, setHeroFilter] = useState("all");
  const [downloading, setDownloading] = useState(false);

  const selectedIdxRef = useRef(null);
  const heroFilterRef = useRef("all");
  const lastBtnRef = useRef({});
  const btnPressTimeRef = useRef({});
  const btnRepeatingRef = useRef({});
  const btnRepeatTimeRef = useRef({});
  const filteredResultsRef = useRef([]);
  const scrollContainerRef = useRef(null);

  const filteredResults = useMemo(() => {
    if (artType !== "hero" || heroFilter === "all") return results;
    if (heroFilter === "animated") return results.filter(r => r.is_animated);
    return results.filter(r => !r.is_animated);
  }, [results, heroFilter, artType]);

  useEffect(() => { filteredResultsRef.current = filteredResults; }, [filteredResults]);
  useEffect(() => { heroFilterRef.current = heroFilter; }, [heroFilter]);
  useEffect(() => {
    if (selectedIdx === null || !scrollContainerRef.current) return;
    const el = scrollContainerRef.current.querySelector(`[data-sgdb-idx="${selectedIdx}"]`);
    if (!el) return;
    const c = scrollContainerRef.current;
    const elRect = el.getBoundingClientRect();
    const cRect  = c.getBoundingClientRect();
    const elTop    = elRect.top  - cRect.top;
    const elBottom = elRect.bottom - cRect.top;
    if (elBottom > c.clientHeight) c.scrollTop += elBottom - c.clientHeight + 8;
    else if (elTop < 0)            c.scrollTop = Math.max(0, c.scrollTop + elTop - 8);
  }, [selectedIdx, filteredResults]);

  const loadResults = () => {
    setLoading(true);
    setError(false);
    setSelectedIdx(null);
    selectedIdxRef.current = null;
    invoke("search_sgdb_art", { gameName: app.name, artType })
      .then(data => { setResults(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  };

  useEffect(() => { loadResults(); }, []);

  const GRID_COLS   = artType === "grid" ? 4 : 2;
  const THUMB_W     = artType === "grid" ? 148 : 258;
  const THUMB_ASPECT = artType === "grid" ? "2/3" : "16/9";

  const handleSelect = () => {
    const idx = selectedIdxRef.current;
    const list = filteredResultsRef.current;
    if (idx === null || idx >= list.length) return;
    const chosen = list[idx];
    setDownloading(true);
    invoke("download_sgdb_art", { gameName: app.name, url: chosen.url, artType })
      .then(path => {
        if (path) { onSet(app.id, path); onClose(); }
        else setDownloading(false);
      })
      .catch(() => setDownloading(false));
  };
  const handleSelectRef = useRef(handleSelect);
  useEffect(() => { handleSelectRef.current = handleSelect; });

  useEffect(() => {
    let rAFId;
    const poll = (now) => {
      const gp = getBestGamepad();
      if (gp) {
        const state = readGpState(gp);
        const list  = filteredResultsRef.current;
        const cur   = selectedIdxRef.current;
        const iDelay = repeatSpeed === "slow" ? 500 : repeatSpeed === "fast" ? 250 : 400;
        const rDelay = repeatSpeed === "slow" ? 150 : repeatSpeed === "fast" ? 60  : 100;

        const fireDir = (key) => {
          const c = selectedIdxRef.current;
          const l = filteredResultsRef.current;
          if (key === "ArrowRight") {
            const next = c === null ? 0 : Math.min(c + 1, l.length - 1);
            if (next !== c) { setSelectedIdx(next); selectedIdxRef.current = next; }
          } else if (key === "ArrowLeft") {
            if (c === null && l.length > 0) { setSelectedIdx(0); selectedIdxRef.current = 0; }
            else if (c !== null && c > 0) { setSelectedIdx(c - 1); selectedIdxRef.current = c - 1; }
          } else if (key === "ArrowDown") {
            if (c === null && l.length > 0) { setSelectedIdx(0); selectedIdxRef.current = 0; }
            else if (c !== null) {
              const next = Math.min(c + GRID_COLS, l.length - 1);
              if (next !== c) { setSelectedIdx(next); selectedIdxRef.current = next; }
            }
          } else if (key === "ArrowUp") {
            if (c !== null && c - GRID_COLS >= 0) { const next = c - GRID_COLS; setSelectedIdx(next); selectedIdxRef.current = next; }
          }
        };

        for (const key of ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"]) {
          const pressed = state[key], wasPressed = lastBtnRef.current[key];
          if (pressed && !wasPressed) {
            btnPressTimeRef.current[key] = now;
            btnRepeatingRef.current[key] = false;
            btnRepeatTimeRef.current[key] = now;
            fireDir(key);
          } else if (pressed && wasPressed) {
            const held = now - (btnPressTimeRef.current[key] || now);
            if (!btnRepeatingRef.current[key] && held >= iDelay) {
              btnRepeatingRef.current[key] = true;
              btnRepeatTimeRef.current[key] = now;
              fireDir(key);
            } else if (btnRepeatingRef.current[key] && now - (btnRepeatTimeRef.current[key] || 0) >= rDelay) {
              btnRepeatTimeRef.current[key] = now;
              fireDir(key);
            }
          } else if (!pressed) {
            btnPressTimeRef.current[key] = 0;
            btnRepeatingRef.current[key] = false;
          }
        }

        if (state.Enter && !lastBtnRef.current.Enter) handleSelectRef.current();
        if (state.Escape && !lastBtnRef.current.Escape) onClose();
        if (artType === "hero") {
          if (state.TriggerLeft && !lastBtnRef.current.TriggerLeft) {
            const i = HERO_FILTERS.indexOf(heroFilterRef.current);
            const next = HERO_FILTERS[Math.max(i - 1, 0)];
            if (next !== heroFilterRef.current) { setHeroFilter(next); heroFilterRef.current = next; setSelectedIdx(null); selectedIdxRef.current = null; }
          }
          if (state.TriggerRight && !lastBtnRef.current.TriggerRight) {
            const i = HERO_FILTERS.indexOf(heroFilterRef.current);
            const next = HERO_FILTERS[Math.min(i + 1, HERO_FILTERS.length - 1)];
            if (next !== heroFilterRef.current) { setHeroFilter(next); heroFilterRef.current = next; setSelectedIdx(null); selectedIdxRef.current = null; }
          }
        }

        lastBtnRef.current = state;
      }
      rAFId = requestAnimationFrame(poll);
    };
    rAFId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rAFId);
  }, [artType, GRID_COLS, repeatSpeed]);

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="splash-dots" style={{ opacity: 1 }}>
        <div className="splash-dot" /><div className="splash-dot" /><div className="splash-dot" />
      </div>
    </div>
  );

  if (error) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <span style={{ color: theme.textDim, fontSize: 13 }}>Failed to load results</span>
      <button onClick={loadResults}
        style={{ padding: "8px 20px", borderRadius: 8, background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`, color: "white", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer" }}>
        Retry
      </button>
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {artType === "hero" && (
        <div style={{ display: "flex", gap: 6, paddingBottom: 10 }}>
          {["all", "animated", "static"].map(f => (
            <button key={f}
              onClick={() => { setHeroFilter(f); setSelectedIdx(null); selectedIdxRef.current = null; }}
              style={{ padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
                background: heroFilter === f ? accent.primary : (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"),
                color: heroFilter === f ? "white" : theme.text }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      )}
      <div ref={scrollContainerRef} style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        <div style={{ display: "grid",
          gridTemplateColumns: `repeat(${GRID_COLS}, ${THUMB_W}px)`, gap: 8, alignContent: "start", paddingRight: 4, paddingBottom: 4 }}>
          {filteredResults.map((r, i) => (
            <ThumbnailCard key={r.url} result={r} selected={selectedIdx === i} isSelected={selectedIdx === i}
              accent={accent} theme={theme} thumbW={THUMB_W} aspect={THUMB_ASPECT}
              data-sgdb-idx={i}
              onClick={() => { setSelectedIdx(i); selectedIdxRef.current = i; }} />
          ))}
          {filteredResults.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", color: theme.textDim, fontSize: 13, padding: 24 }}>
              No results found
            </div>
          )}
        </div>
      </div>
      <div style={{ paddingTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", gap: 12, marginRight: "auto" }}>
          {[{ bg: "#4a9c4a", label: "A Select" }, { bg: "#b03030", label: "B Cancel" }].map(({ bg, label }) => (
            <span key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: theme.textDim }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "white", flexShrink: 0 }}>{label[0]}</span>
              {label.slice(1)}
            </span>
          ))}
          {artType === "hero" && (
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: theme.textDim }}>
              <span style={{ height: 18, minWidth: 20, borderRadius: 4, background: "rgba(255,255,255,0.52)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 700, color: "white", padding: "0 3px" }}>LT</span>
              <span style={{ height: 18, minWidth: 20, borderRadius: 4, background: "rgba(255,255,255,0.52)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 700, color: "white", padding: "0 3px" }}>RT</span>
              Filter
            </span>
          )}
        </div>
        <button onClick={onClose}
          style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none",
            background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", color: theme.text }}>
          Cancel
        </button>
        <button onClick={handleSelect} disabled={selectedIdx === null || downloading}
          style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: selectedIdx !== null && !downloading ? "pointer" : "default", border: "none",
            background: selectedIdx !== null && !downloading
              ? `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`
              : (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"),
            color: selectedIdx !== null && !downloading ? "white" : theme.textDim, transition: "all 0.15s" }}>
          {downloading ? "Downloading…" : "Select"}
        </button>
      </div>
    </div>
  );
}

// ── UploadTab ─────────────────────────────────────────────────
function UploadTab({ app, currentArt, hasCustomArt, cropMode = "portrait", accent, theme, isDark, onClose, onSet, onReset }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(currentArt || null);
  const [pendingData, setPendingData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [focusedBtn, setFocusedBtn] = useState("browse");

  const pendingDataRef  = useRef(null);
  const focusedBtnRef   = useRef("browse");
  const lastBtnRef      = useRef({});

  const getButtons = () => {
    const btns = ["browse"];
    if (pendingDataRef.current) btns.push("save");
    if (hasCustomArt && !pendingDataRef.current) btns.push("reset");
    btns.push("cancel");
    return btns;
  };

  const handleSave = () => {
    if (!pendingDataRef.current) return;
    setSaving(true);
    const storageId = cropMode === "hero" ? "hero:" + app.id : app.id;
    invoke("set_custom_art", { id: storageId, data: pendingDataRef.current })
      .then(() => { onSet(app.id, pendingDataRef.current); onClose(); })
      .catch(console.error)
      .finally(() => setSaving(false));
  };
  const handleReset = () => {
    const storageId = cropMode === "hero" ? "hero:" + app.id : app.id;
    invoke("clear_custom_art", { id: storageId })
      .then(() => { onReset(app.id); onClose(); })
      .catch(console.error);
  };

  const handleSaveRef  = useRef(handleSave);
  const handleResetRef = useRef(handleReset);
  useEffect(() => { handleSaveRef.current  = handleSave; });
  useEffect(() => { handleResetRef.current = handleReset; });

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const TW = cropMode === "square" ? 500 : cropMode === "hero" ? 1920 : 600;
        const TH = cropMode === "square" ? 500 : cropMode === "hero" ?  620 : 900;
        const canvas = document.createElement("canvas");
        canvas.width = TW; canvas.height = TH;
        const ctx = canvas.getContext("2d");
        const scale = Math.max(TW / img.width, TH / img.height);
        const sw = TW / scale, sh = TH / scale;
        const sx = (img.width  - sw) / 2;
        const sy = (img.height - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, TW, TH);
        const url = canvas.toDataURL("image/jpeg", 0.88);
        setPreview(url);
        setPendingData(url);
        pendingDataRef.current = url;
        setFocusedBtn("save"); focusedBtnRef.current = "save";
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const gp0 = getBestGamepad();
    if (gp0) lastBtnRef.current = readGpState(gp0);

    let rAFId;
    const poll = () => {
      const gp = getBestGamepad();
      if (gp) {
        const state = readGpState(gp);
        const btns  = getButtons();

        if (state.ArrowDown && !lastBtnRef.current.ArrowDown) {
          const i    = btns.indexOf(focusedBtnRef.current);
          const next = btns[Math.min(i + 1, btns.length - 1)];
          if (next !== focusedBtnRef.current) { setFocusedBtn(next); focusedBtnRef.current = next; }
        }
        if (state.ArrowUp && !lastBtnRef.current.ArrowUp) {
          const i    = btns.indexOf(focusedBtnRef.current);
          const next = btns[Math.max(i - 1, 0)];
          if (next !== focusedBtnRef.current) { setFocusedBtn(next); focusedBtnRef.current = next; }
        }
        if (state.Enter && !lastBtnRef.current.Enter) {
          const btn = focusedBtnRef.current;
          if (btn === "browse") fileRef.current?.click();
          else if (btn === "save")   handleSaveRef.current();
          else if (btn === "reset")  handleResetRef.current();
          else if (btn === "cancel") onClose();
        }
        if (state.Escape && !lastBtnRef.current.Escape) onClose();

        lastBtnRef.current = state;
      }
      rAFId = requestAnimationFrame(poll);
    };
    rAFId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rAFId);
  }, []);

  const btnStyle = (key, bg, color, extra = {}) => {
    const focused = focusedBtn === key;
    return {
      padding: "10px 20px", borderRadius: 10, cursor: "pointer",
      fontFamily: "'Segoe UI', sans-serif", fontSize: 14, fontWeight: 600,
      border: focused ? `2px solid ${accent.primary}` : "2px solid transparent",
      width: "100%", background: bg, color,
      transition: "all 0.15s ease",
      boxShadow: focused ? `0 0 0 2px ${accent.glow}0.4), 0 0 16px ${accent.glow}0.2)` : "none",
      transform: focused ? "scale(1.02)" : "scale(1)",
      ...extra,
    };
  };

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 380 }}>
        <div style={{ fontSize: 12, color: theme.textDim, marginBottom: 16 }}>Upload a custom image</div>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ flexShrink: 0, width: cropMode === "hero" ? 220 : 110 }}>
            {preview
              ? <img src={preview} alt="" style={{ width: "100%", aspectRatio: cropMode === "square" ? "1" : cropMode === "hero" ? "1920/620" : "2/3", objectFit: "cover", borderRadius: 10, display: "block" }} />
              : <div style={{ width: "100%", aspectRatio: cropMode === "square" ? "1" : cropMode === "hero" ? "1920/620" : "2/3", borderRadius: 10, background: `${accent.glow}0.1)`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 10, color: theme.textDim, textAlign: "center" }}>No art</span></div>
            }
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
            <button onClick={() => fileRef.current?.click()} style={btnStyle("browse", `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`, "white")}>Browse Image</button>
            {pendingData && <button onClick={handleSave} disabled={saving} style={btnStyle("save", "#4a9c4a", "white", { opacity: saving ? 0.6 : 1 })}>{saving ? "Saving…" : "Save"}</button>}
            {hasCustomArt && !pendingData && <button onClick={handleReset} style={btnStyle("reset", "rgba(255,255,255,0.08)", theme.text)}>Reset to Default</button>}
            <button onClick={onClose} style={btnStyle("cancel", "rgba(255,255,255,0.05)", theme.textDim)}>Cancel</button>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, paddingTop: 4 }}>
              {[
                { bg: "#4a9c4a", label: "A Confirm" },
                { bg: "#b03030", label: "B Cancel" },
              ].map(({ bg, label }) => (
                <span key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: theme.textDim }}>
                  <span style={{ width: 18, height: 18, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "white", flexShrink: 0 }}>{label[0]}</span>
                  {label.slice(1)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SgdbBrowserModal ──────────────────────────────────────────
function SgdbBrowserModal({ app, currentArt, hasCustomArt, cropMode = "portrait", artType = "grid", repeatSpeed = "normal", accent, theme, isDark, glass, onClose, onSet, onReset }) {
  const showSgdb = app?.app_type === "game";
  const [activeTab, setActiveTab] = useState(showSgdb ? "browse" : "upload");
  const lastBtnRef = useRef({});

  useEffect(() => {
    let rAFId;
    const poll = () => {
      const gp = getBestGamepad();
      if (gp) {
        const state = readGpState(gp);
        if (state.BumperLeft  && !lastBtnRef.current.BumperLeft  && showSgdb) setActiveTab("browse");
        if (state.BumperRight && !lastBtnRef.current.BumperRight && showSgdb) setActiveTab("upload");
        lastBtnRef.current = state;
      }
      rAFId = requestAnimationFrame(poll);
    };
    rAFId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rAFId);
  }, []);

  const badgeStyle = {
    height: 18, minWidth: 24, borderRadius: 4,
    background: isDark ? "rgba(255,255,255,0.52)" : "rgba(0,0,0,0.15)",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontSize: 8, fontWeight: 700, color: isDark ? "white" : "#333", padding: "0 4px",
  };

  const tabBtnStyle = (tab) => ({
    padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: "pointer", border: "none",
    background: activeTab === tab ? `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` : "transparent",
    color: activeTab === tab ? "white" : theme.textDim,
    transition: "all 0.15s",
  });

  return (
    <div data-modal-overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
      <div style={{ ...glass, borderRadius: 20, padding: 20, width: "min(860px, 92vw)", height: "min(600px, 85vh)", display: "flex", flexDirection: "column",
        border: `1px solid ${accent.glow}0.25)`, boxShadow: `0 8px 40px rgba(0,0,0,0.4)`, fontFamily: "'Segoe UI', sans-serif" }}>
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>{app.name}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, paddingBottom: 10,
          borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` }}>
          {showSgdb && <span style={badgeStyle}>LB</span>}
          {showSgdb && <button onClick={() => setActiveTab("browse")} style={tabBtnStyle("browse")}>Browse SteamGridDB</button>}
          <button onClick={() => setActiveTab("upload")} style={tabBtnStyle("upload")}>Upload File</button>
          {showSgdb && <span style={badgeStyle}>RB</span>}
        </div>
        {showSgdb && activeTab === "browse"
          ? <SgdbBrowser app={app} artType={artType} repeatSpeed={repeatSpeed} accent={accent} theme={theme} isDark={isDark}
              onSet={onSet} onClose={onClose} />
          : <UploadTab app={app} currentArt={currentArt} hasCustomArt={hasCustomArt} cropMode={cropMode}
              accent={accent} theme={theme} isDark={isDark}
              onClose={onClose} onSet={onSet} onReset={onReset} />
        }
      </div>
    </div>
  );
}

// ── Gamepad selector ─────────────────────────────────────────
// Some USB devices (headset adapters, audio dongles) expose a HID interface
// that the browser registers as a gamepad. They have 0–2 buttons and no axes.
// Prefer the first gamepad with ≥4 buttons; fall back to the first connected one.
function getBestGamepad() {
  const gps = Array.from(navigator.getGamepads()).filter(Boolean);
  return gps.find(gp => gp.buttons.length >= 4) || gps[0] || null;
}

// ── Gamepad state reader ──────────────────────────────────────
// Centralises button mapping so both the main poll and the modal poll
// benefit from the same non-standard-controller fixes.
//
// Standard ("standard" mapping) controllers use Chromium's XInput layout:
//   buttons 0-3  = A/B/X/Y   buttons 4-7  = LB/RB/LT/RT
//   buttons 9    = Start      buttons 12-15 = D-pad Up/Down/Left/Right
//
// Non-standard (DirectInput / raw HID / some GameSir modes) often report the
// D-pad as a hat-switch on axes[6] (X) and axes[7] (Y) instead of buttons.
// Using optional chaining (?.pressed) avoids crashes if a controller reports
// fewer buttons than expected.
function readGpState(gp) {
  const btn = (i) => !!gp.buttons[i]?.pressed;
  // Hat-switch axes present on many DirectInput / non-standard controllers
  const hatLeft  = (gp.axes[6] ?? 0) < -0.5;
  const hatRight = (gp.axes[6] ?? 0) >  0.5;
  const hatUp    = (gp.axes[7] ?? 0) < -0.5;
  const hatDown  = (gp.axes[7] ?? 0) >  0.5;
  return {
    ArrowUp:      btn(12) || hatUp    || gp.axes[1] < -0.5,
    ArrowDown:    btn(13) || hatDown  || gp.axes[1] >  0.5,
    ArrowLeft:    btn(14) || hatLeft  || gp.axes[0] < -0.5,
    ArrowRight:   btn(15) || hatRight || gp.axes[0] >  0.5,
    Enter:        btn(0),
    Escape:       btn(1),
    ButtonX:      btn(2),
    ButtonY:      btn(3),
    BumperLeft:   btn(4),
    BumperRight:  btn(5),
    TriggerLeft:  btn(6),
    TriggerRight: btn(7),
    Select:       btn(8),
    Start:        btn(9),
  };
}

// ── Controller Test Widget ─────────────────────────────────────
// Live gamepad debug display rendered in the Settings screen.
// Persists last-known gamepad snapshot across remounts so there's no blank
// flash when SettingsScreen re-creates itself on each navigation keypress.
let _cachedGpSnap = null;

// Shows the controller name, mapping type, every button (lit when pressed),
// and every axis as a bar — lets users identify index offsets on odd hardware.
function ControllerTestWidget({ accent, theme, isDark, glass }) {
  const [gpSnap, setGpSnap] = useState(_cachedGpSnap);
  const rAFRef = useRef(null);
  useEffect(() => {
    const poll = () => {
      const all  = Array.from(navigator.getGamepads()).filter(Boolean);
      const best = getBestGamepad();
      const next = best ? {
        name:    best.id,
        mapping: best.mapping,
        buttons: Array.from(best.buttons).map(b => b.pressed),
        axes:    Array.from(best.axes).map(v => (typeof v === "number" && isFinite(v)) ? v : 0),
        allDevices: all.map((gp, i) => ({ index: i, name: gp.id, btnCount: gp.buttons.length, isBest: gp === best })),
      } : null;
      _cachedGpSnap = next;
      setGpSnap(next);
      rAFRef.current = requestAnimationFrame(poll);
    };
    rAFRef.current = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rAFRef.current);
  }, []);

  if (!gpSnap) return (
    <div style={{ fontSize: 13, color: theme.textDim, padding: "4px 0 8px" }}>
      No controller detected — connect a gamepad and press any button.
    </div>
  );

  const isStandard = gpSnap.mapping === "standard";
  const BUTTON_LABELS = { 0:"A",1:"B",2:"X",3:"Y",4:"LB",5:"RB",6:"LT",7:"RT",8:"⊞",9:"☰",10:"LS",11:"RS",12:"↑",13:"↓",14:"←",15:"→" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12, color: theme.textDim, wordBreak: "break-all" }}>
        <span style={{ fontWeight: 600, color: theme.text }}>{gpSnap.name}</span>
        <span style={{
          marginLeft: 10, fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 6,
          background: isStandard ? `${accent.glow}0.15)` : (isDark ? "rgba(255,165,0,0.15)" : "rgba(180,100,0,0.12)"),
          color: isStandard ? accent.primary : (isDark ? "#ffa040" : "#a06000"),
        }}>
          {isStandard ? "standard mapping ✓" : `non-standard${gpSnap.mapping ? ` (${gpSnap.mapping})` : ""}`}
        </span>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {gpSnap.buttons.map((pressed, i) => (
          <div key={i} style={{
            minWidth: 36, height: 30, borderRadius: 7, fontSize: 9, fontWeight: 700, padding: "0 4px",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
            background: pressed ? accent.primary : (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"),
            color: pressed ? "white" : theme.textDim,
            border: `1px solid ${pressed ? accent.primary : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)")}`,
            transition: "background 0.05s, color 0.05s, border-color 0.05s",
          }}>
            <span style={{ fontSize: 8, opacity: 0.7 }}>{BUTTON_LABELS[i] ?? ""}</span>
            <span>{i}</span>
          </div>
        ))}
      </div>

      {/* Axes */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "5px 14px" }}>
        {gpSnap.axes.map((val, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 10, color: theme.textFaint, width: 52, flexShrink: 0 }}>
              A{i}: {val >= 0 ? " " : ""}{val.toFixed(2)}
            </span>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", position: "relative" }}>
              <div style={{
                position: "absolute",
                left:  val >= 0 ? "50%" : `${(1 + val) * 50}%`,
                width: `${Math.abs(val) * 50}%`,
                height: "100%", borderRadius: 3,
                background: accent.primary,
              }} />
              <div style={{ position: "absolute", left: "50%", top: 0, width: 1, height: "100%", background: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)" }} />
            </div>
          </div>
        ))}
      </div>

      {gpSnap.allDevices?.length > 1 && (
        <div style={{ fontSize: 11, color: theme.textDim, lineHeight: 1.6 }}>
          <span style={{ fontWeight: 600, color: theme.textDim }}>All HID devices: </span>
          {gpSnap.allDevices.map(d => (
            <span key={d.index} style={{ marginRight: 12, color: d.isBest ? accent.primary : theme.textFaint }}>
              [{d.index}] {d.name.split('(')[0].trim()} ({d.btnCount} btns){d.isBest ? " ←" : ""}
            </span>
          ))}
        </div>
      )}

      {!isStandard && (
        <div style={{ fontSize: 11, color: isDark ? "#ffa040" : "#a06000", lineHeight: 1.5 }}>
          Non-standard mapping detected. If navigation isn't working, try switching your controller to XInput mode (hold the GameSir / mode button until the indicator changes).
          D-pad may be on axes 6 &amp; 7 — check the bars above.
        </div>
      )}
    </div>
  );
}

// ── Manage Apps Modal ─────────────────────────────────────────
// Defined outside App so the component type is stable across re-renders.
// If it were defined inside App, every clock-tick re-render would create a
// new function reference, causing React to unmount/remount and wipe state.
//
// Shows all apps (visible + hidden) in one list.
// Checked = shown in launcher. Uncheck to hide, check to restore.
function HideModal({ tab, appsRef, hiddenRef, allAppsRef, closeHideModal, toggleHidden, glass, accent, isDark, theme }) {
    const visibleApps = appsRef.current.filter(a => tab === "Games" ? a.app_type === "game" : a.app_type === "app");
    const hiddenIds   = hiddenRef.current;

    // Checked = currently visible. Unchecked = hidden.
    const [localChecked, setLocalChecked] = useState(() => new Set(visibleApps.map(a => a.id)));
    const [focusIdx, setFocusIdx] = useState(0);
    const focusIdxRef = useRef(0);
    const listRef     = useRef(null);

    // Combined list: visible apps first, then hidden apps (with full data looked up from allAppsRef)
    const hiddenApps = hiddenIds.map(id => {
      const full = allAppsRef.current.find(a => a.id === id);
      return full ? { ...full, _hidden: true } : { id, name: id, _hidden: true };
    }).filter(a => tab === "Games" ? a.app_type === "game" : a.app_type === "app" || !a.app_type);
    const allItems = [...visibleApps.map(a => ({ ...a, _hidden: false })), ...hiddenApps];

    // Keep refs current so the no-dep effect can always read latest values
    const allItemsRef     = useRef(allItems);
    const localCheckedRef = useRef(localChecked);
    useEffect(() => { allItemsRef.current     = allItems;     });
    useEffect(() => { localCheckedRef.current = localChecked; });

    // Scroll focused row into view
    useEffect(() => {
      if (listRef.current) {
        const rows = listRef.current.querySelectorAll("[data-modal-row]");
        if (rows[focusIdx]) rows[focusIdx].scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }, [focusIdx]);

    // No-dep effect — all mutable state accessed via refs
    useEffect(() => {
      let closed = false;

      const toggleItem = (i) => {
        const item = allItemsRef.current[i];
        if (!item) return;
        setLocalChecked(prev => { const n = new Set(prev); n.has(item.id) ? n.delete(item.id) : n.add(item.id); return n; });
      };

      const doClose = () => { closed = true; closeHideModal(); };

      const doConfirm = () => {
        closed = true;
        const checked = localCheckedRef.current;
        const items   = allItemsRef.current;
        // Hide visible apps that were unchecked
        items.filter(a => !a._hidden && !checked.has(a.id)).forEach(a => toggleHidden(a.id));
        // Restore hidden apps that were checked
        items.filter(a =>  a._hidden &&  checked.has(a.id)).forEach(a => toggleHidden(a.id));
        closeHideModal();
      };

      const handle = (key) => {
        if (closed) return;
        const total      = allItemsRef.current.length + 2;
        const cancelIdx  = allItemsRef.current.length;
        const confirmIdx = allItemsRef.current.length + 1;
        if      (key === "ArrowDown" || key === "ArrowRight") { const ni = Math.min(focusIdxRef.current + 1, total - 1); setFocusIdx(ni); focusIdxRef.current = ni; }
        else if (key === "ArrowUp"   || key === "ArrowLeft")  { const ni = Math.max(focusIdxRef.current - 1, 0);         setFocusIdx(ni); focusIdxRef.current = ni; }
        else if (key === "Enter") {
          const i = focusIdxRef.current;
          if      (i === cancelIdx)  doClose();
          else if (i === confirmIdx) doConfirm();
          else                       toggleItem(i);
        }
        else if (key === "Start")  doConfirm();
        else if (key === "Escape") doClose();
      };

      // Keyboard — capture phase, runs before main handler guard
      const onKey = (e) => {
        if (closed) return;
        const map = { ArrowDown:"ArrowDown", ArrowUp:"ArrowUp", ArrowLeft:"ArrowLeft", ArrowRight:"ArrowRight", Enter:"Enter", Escape:"Escape", " ":"Enter" };
        if (map[e.key]) { e.preventDefault(); e.stopPropagation(); handle(map[e.key]); }
      };
      window.addEventListener("keydown", onKey, true);

      // Gamepad poll with hold-repeat for directions
      let rAF;
      const lastBtn   = {};
      const pressTime = {};
      const repeating = {};
      const DIRS      = new Set(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"]);
      const INIT_MS   = 400;
      const RPT_MS    = 100;
      let startReleased = false;

      const pollModal = (now) => {
        if (closed) return;
        const gp  = getBestGamepad();
        if (gp) {
          const base = readGpState(gp);
          if (!base.Start) startReleased = true;
          const state = { ...base, Start: startReleased && base.Start };
          Object.keys(state).forEach(k => {
            const pressed = state[k], was = lastBtn[k];
            if (pressed && !was) {
              handle(k); pressTime[k] = now; repeating[k] = false;
            } else if (pressed && was && DIRS.has(k)) {
              const held = now - (pressTime[k] || now);
              if (!repeating[k] && held >= INIT_MS) { repeating[k] = true; pressTime[k] = now; handle(k); }
              else if (repeating[k] && held >= RPT_MS) { pressTime[k] = now; handle(k); }
            } else if (!pressed && was) { pressTime[k] = 0; repeating[k] = false; }
            lastBtn[k] = pressed;
          });
        }
        rAF = requestAnimationFrame(pollModal);
      };
      rAF = requestAnimationFrame(pollModal);

      return () => { closed = true; window.removeEventListener("keydown", onKey, true); cancelAnimationFrame(rAF); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const listLen    = allItems.length;
    const cancelIdx  = listLen;
    const confirmIdx = listLen + 1;

    const pendingHide    = visibleApps.filter(a => !localChecked.has(a.id)).length;
    const pendingRestore = hiddenIds.filter(id => localChecked.has(id)).length;
    const changeCount    = pendingHide + pendingRestore;

    return (
      <div
        data-modal-overlay
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        onDoubleClick={e => e.stopPropagation()}
        style={{
          position: "fixed", inset: 0, zIndex: 8500,
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Segoe UI', sans-serif",
          userSelect: "none",
        }}>
        <div data-modal-container style={{ ...glass, borderRadius: 20, width: "min(600px, 90vw)", maxHeight: "75vh",
          display: "flex", flexDirection: "column", overflow: "hidden",
          border: `1px solid ${accent.glow}0.3)` }}>

          {/* Header */}
          <div style={{ padding: "20px 24px 14px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`, flexShrink: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: theme.text, marginBottom: 4 }}>
              Manage {tab === "Games" ? "games" : "apps"}
            </div>
            <div style={{ fontSize: 12, color: theme.textDim }}>
              Checked = visible · Uncheck to hide · A to toggle · ↑↓ navigate · Menu to save · B to cancel
            </div>
          </div>

          {/* List */}
          <div ref={listRef} style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
            {allItems.length === 0 && (
              <div style={{ padding: "40px 24px", textAlign: "center", color: theme.textFaint, fontSize: 13 }}>No apps found.</div>
            )}
            {allItems.map((item, i) => {
              const checked  = localChecked.has(item.id);
              const rowFocus = focusIdx === i;
              const isHidden = item._hidden;
              return (
                <div key={item.id} data-modal-row
                  onClick={() => { setFocusIdx(i); focusIdxRef.current = i; setLocalChecked(prev => { const n = new Set(prev); checked ? n.delete(item.id) : n.add(item.id); return n; }); }}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 24px", cursor: "pointer",
                    background: rowFocus ? `${accent.glow}0.12)` : "transparent",
                    borderLeft: `3px solid ${rowFocus ? accent.primary : "transparent"}`,
                    opacity: isHidden && !checked ? 0.5 : 1,
                    transition: "all 0.1s ease" }}>
                  <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                    border: `2px solid ${checked ? accent.primary : (isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)")}`,
                    background: checked ? accent.primary : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.1s ease" }}>
                    {checked && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  {item.icon_base64
                    ? <div style={{ width: 28, height: 28, borderRadius: 6, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <img src={`data:image/png;base64,${item.icon_base64}`} alt={item.name} style={{ width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%", objectFit: "contain", objectPosition: "center", display: "block" }} />
                      </div>
                    : <div style={{ width: 28, height: 28, borderRadius: 6, background: `${accent.glow}0.15)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: accent.primary, flexShrink: 0 }}>{(item.name || "?")[0]}</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.name || item.id}
                    </div>
                    <div style={{ fontSize: 10, color: theme.textFaint, textTransform: "capitalize" }}>
                      {isHidden ? `${item.source || "hidden"}` : item.source}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ padding: "14px 24px", borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`,
            display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0 }}>
            <div data-modal-row onClick={closeHideModal}
              style={{ padding: "9px 20px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600,
                color: theme.textDim,
                background: focusIdx === cancelIdx ? (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)") : (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"),
                border: `2px solid ${focusIdx === cancelIdx ? accent.primary : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)")}`,
                transition: "all 0.1s ease" }}>
              Cancel
            </div>
            <div data-modal-row onClick={() => {
                const checked = localChecked;
                visibleApps.filter(a => !checked.has(a.id)).forEach(a => toggleHidden(a.id));
                hiddenIds.filter(id => checked.has(id)).forEach(id => toggleHidden(id));
                closeHideModal();
              }}
              style={{ padding: "9px 20px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600,
                color: "white",
                background: focusIdx === confirmIdx ? accent.light : accent.primary,
                border: `2px solid ${focusIdx === confirmIdx ? "white" : accent.primary}`,
                boxShadow: `0 2px 12px ${accent.glow}0.4)`,
                transition: "all 0.1s ease" }}>
              {changeCount > 0 ? `Save ${changeCount} change${changeCount !== 1 ? "s" : ""}` : "Save"}
            </div>
          </div>
        </div>
      </div>
    );
}
// ─────────────────────────────────────────────────────────────

async function sampleIconColor(base64) {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    canvas.width = 16; canvas.height = 16;
    const ctx = canvas.getContext("2d");
    const timer = setTimeout(() => resolve(null), 3000);
    img.onload = () => {
      clearTimeout(timer);
      try {
        ctx.drawImage(img, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] > 30) { r += data[i]; g += data[i + 1]; b += data[i + 2]; count++; }
        }
        resolve(count > 0 ? { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) } : null);
      } catch { resolve(null); }
    };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = `data:image/png;base64,${base64}`;
  });
}

export default function App() {
  const [tab, setTab]                               = useState("Home");
  const [apps, setApps]                             = useState([]);
  const [recent, setRecent]                         = useState([]);
  const [pins, setPins]                             = useState([]);
  const [hidden, setHidden]                         = useState([]);
  const [iconColors, setIconColors]                 = useState({});
  const [gameSourceTab, setGameSourceTab]           = useState("All"); // "All" | "Steam" | "Xbox" | "Other"
  const [subtabFocusIndex, setSubtabFocusIndex]     = useState(0);    // index within subtab row
  const [showHideModal, setShowHideModal]           = useState(false);
  const [loading, setLoading]                       = useState(true);
  const [splashExiting, setSplashExiting]           = useState(false);
  const [focusSection, setFocusSection]             = useState("hero");
  const [focusIndex, setFocusIndex]                 = useState(0);
  const [time, setTime]                             = useState("");
  const [date, setDate]                             = useState("");
  const [battery, setBattery]                       = useState(0);
  const [charging, setCharging]                     = useState(false);
  const [gameArt, setGameArt]                       = useState({});
  const [heroStatic, setHeroStatic]                 = useState({});
  const [heroAnimated, setHeroAnimated]             = useState({});
  const [customArt, setCustomArt]                   = useState({});
  const [customHeroArt, setCustomHeroArt]           = useState({});
  const [artPickerApp, setArtPickerApp]             = useState(null);
  const [artPickerMode, setArtPickerMode]           = useState("grid"); // "grid" | "hero"
  const [contextMenu, setContextMenu]               = useState(null); // { x, y, app, focusedIdx }
  const [heroCustomType, setHeroCustomType]         = useState(() => { try { return JSON.parse(localStorage.getItem("liftoff_heroCustomType") || "{}"); } catch { return {}; } });
  const [cacheClearLoading, setCacheClearLoading]   = useState(false);
  const [cacheClearStatus, setCacheClearStatus]     = useState({ line1: "", line2: "" });
  const [launchingApp, setLaunchingApp]             = useState(null);
  const [settings, setSettings]                     = useState({
    accent: "ember", theme: "dark", stars_enabled: true,
    default_tab: "Home", scan_steam: true, scan_xbox: true,
    scan_uwp: true, scan_desktop: true, scan_battlenet: true, repeat_speed: "normal",
    launch_at_startup: false, animated_heroes: "animated", ui_scale: 1.0,
  });
  const [settingsFocusIndex, setSettingsFocusIndex] = useState(0);
  const [heroIndex, setHeroIndex]                   = useState(0);
  const [updateStatus, setUpdateStatus]             = useState(null); // null | "checking" | "up_to_date" | "available" | "error"
  const [updateInfo, setUpdateInfo]                 = useState(null);
  const [libraryRefreshStatus, setLibraryRefreshStatus] = useState(null); // null | "scanning" | "done"
  const [sliderDraft, setSliderDraft] = useState(null);
  const sliderDraftRef = useRef(null);
  const sliderTrackRef = useRef(null);

  // ── Search state ──────────────────────────────────────────────
  const [searchOpen, setSearchOpen]               = useState(false);
  const [searchQuery, setSearchQuery]             = useState("");
  const [searchMode, setSearchMode]               = useState("keyboard");
  const [searchFocusIndex, setSearchFocusIndex]   = useState(0);
  const [kbRow, setKbRow]                         = useState(0);
  const [kbCol, setKbCol]                         = useState(0);
  const [kbNumMode, setKbNumMode]                 = useState(false);

  const searchOpenRef       = useRef(false);
  const searchQueryRef      = useRef("");
  const searchModeRef       = useRef("keyboard");
  const searchFocusIndexRef = useRef(0);
  const kbRowRef            = useRef(0);
  const kbColRef            = useRef(0);
  const kbNumModeRef        = useRef(false);
  // ─────────────────────────────────────────────────────────────

  const customArtRef          = useRef({});
  const customHeroArtRef      = useRef({});
  const artPickerAppRef       = useRef(null);
  const artPickerModeRef      = useRef("grid");
  const contextMenuRef        = useRef(null);
  const focusedCardRef        = useRef(null);
  const searchFocusedCardRef  = useRef(null);   // FIX 3: focused search result card ref
  const settingsFocusedRef    = useRef(null);
  const outerRef              = useRef(null);
  const homeScrollRef         = useRef(null);
  const tabScrollRef          = useRef(null);
  const handleNavRef          = useRef(null);
  const tabRef                = useRef("Home");
  const focusSectionRef       = useRef("hero");
  const focusIndexRef         = useRef(0);
  const appsRef               = useRef([]);
  const allAppsRef            = useRef([]); // every app ever seen, including hidden ones
  const recentRef             = useRef([]);
  const pinsRef               = useRef([]);
  const hiddenRef             = useRef([]);
  const gameSourceTabRef      = useRef("All");
  const subtabFocusIndexRef   = useRef(0);
  const showHideModalRef      = useRef(false);
  const suppressUntilRelease  = useRef({}); // buttons held when modal closed — suppress until released
  const isReadyRef            = useRef(false);
  const heroVideoRefs         = useRef({});
  const settingsRef           = useRef(settings);
  const autoScaleRef          = useRef(1.0);
  const settingsFocusIndexRef = useRef(0);
  const heroIndexRef          = useRef(0);
  const audioCtxRef           = useRef(null);
  const audioBuffers          = useRef({});
  const lastBtn               = useRef({});
  // FIX 2: per-button press timestamp and repeating flag for hold-repeat in RAF
  const btnPressTime          = useRef({});
  const btnRepeating          = useRef({});

  const resolvedTheme = settings.theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : settings.theme;
  const isDark = resolvedTheme === "dark";

  // Memoized so homeContent useMemo deps stay stable across unrelated re-renders
  // (clock ticks every 10s, battery polls every 10s would otherwise bust the memo constantly)
  const theme = useMemo(() => THEMES[resolvedTheme] || THEMES.dark, [resolvedTheme]);
  const accent = useMemo(() => {
    const base = ACCENTS[settings.accent] || ACCENTS.ember;
    return (!isDark && base.lightPrimary) ? { ...base, primary: base.lightPrimary } : base;
  }, [settings.accent, isDark]);
  const appBg  = isDark ? "#100a06" : accent.lightBg;

  const bgGlow1 = `${accent.glow}${isDark ? "0.07)" : "0.08)"}`;
  const bgGlow2 = `${accent.glow}${isDark ? "0.05)" : "0.06)"}`;

  const glass = useMemo(() => ({
    background:           isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.75)",
    backdropFilter:       "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border:               `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.9)"}`,
    boxShadow:            isDark ? "none" : "0 2px 16px rgba(0,0,0,0.06)",
  }), [isDark]);

  const lastLaunchTime = useRef(0);
  const _triggerLaunchImpl = (app, rec) => {
    const now = Date.now();
    console.warn(`triggerLaunch @ ${new Date().toISOString()}`, app?.name, `(${now - lastLaunchTime.current}ms since last)`);
    if (now - lastLaunchTime.current < 5000) {
      console.warn("triggerLaunch BLOCKED — too soon after last launch");
      return;
    }
    lastLaunchTime.current = now;
    playSoundGameStart();
    setLaunchingApp(app);
    launchApp(app);
    const updated = [app, ...rec.filter(r => r.id !== app.id)].slice(0, 10);
    setRecent(updated); recentRef.current = updated;
  };
  const _triggerLaunchRef = useRef(_triggerLaunchImpl);
  _triggerLaunchRef.current = _triggerLaunchImpl;
  const triggerLaunch = useRef((app, rec) => _triggerLaunchRef.current(app, rec)).current;

  // ── Pin helpers ───────────────────────────────────────────────
  const togglePin = (app) => {
    invoke("toggle_pin", { appId: app.id }).then((updatedPins) => {
      setPins(updatedPins);
      pinsRef.current = updatedPins;
    }).catch(console.error);
  };

  // ── Hide helpers ──────────────────────────────────────────────
  const openHideModal  = () => {
    // Blur whatever DOM element has focus so the browser doesn't send synthetic
    // keypresses to it while the modal is open
    if (document.activeElement) document.activeElement.blur();
    setShowHideModal(true); showHideModalRef.current = true;
  };
  const closeHideModal = ()     => {
    // Snapshot whichever buttons are currently held so main poll won't fire them on release
    const gps = navigator.getGamepads();
    const gp  = gps[0] || gps[1] || gps[2] || gps[3];
    if (gp) {
      const s = readGpState(gp);
      suppressUntilRelease.current = {
        Enter:       s.Enter,
        Escape:      s.Escape,
        ButtonX:     s.ButtonX,
        ButtonY:     s.ButtonY,
        BumperLeft:  s.BumperLeft,
        BumperRight: s.BumperRight,
        Start:       s.Start,
      };
    }
    setShowHideModal(false); showHideModalRef.current = false;
  };

  const closeArtPicker = () => {
    const gp = getBestGamepad();
    if (gp) {
      const s = readGpState(gp);
      suppressUntilRelease.current = {
        Enter: s.Enter, Escape: s.Escape, Select: s.Select, ButtonX: s.ButtonX, ButtonY: s.ButtonY,
      };
    }
    setArtPickerApp(null); artPickerAppRef.current = null;
  };

  const toggleHidden = (appId) => {
    invoke("toggle_hidden", { appId }).then((updatedHidden) => {
      setHidden(updatedHidden);
      hiddenRef.current = updatedHidden;
      // Update visible apps list reactively
      setApps(prev => {
        const isNowHidden = updatedHidden.includes(appId);
        const next = isNowHidden
          ? prev.filter(a => a.id !== appId)
          : [...prev, allAppsRef.current.find(a => a.id === appId)].filter(Boolean);
        appsRef.current = next;
        return next;
      });
    }).catch(console.error);
  };

  // ── Search helpers ────────────────────────────────────────────
  const openSearch = () => {
    setSearchOpen(true);       searchOpenRef.current = true;
    setSearchQuery("");         searchQueryRef.current = "";
    setSearchMode("keyboard");  searchModeRef.current = "keyboard";
    setSearchFocusIndex(0);    searchFocusIndexRef.current = 0;
    setKbRow(0);               kbRowRef.current = 0;
    setKbCol(0);               kbColRef.current = 0;
    setKbNumMode(false);       kbNumModeRef.current = false;
  };

  const closeSearch = () => {
    setSearchOpen(false);      searchOpenRef.current = false;
    setSearchQuery("");         searchQueryRef.current = "";
    setSearchMode("keyboard");  searchModeRef.current = "keyboard";
    setSearchFocusIndex(0);    searchFocusIndexRef.current = 0;
    setKbRow(0);               kbRowRef.current = 0;
    setKbCol(0);               kbColRef.current = 0;
    setKbNumMode(false);       kbNumModeRef.current = false;
  };

  const switchSearchMode = (mode) => {
    setSearchMode(mode); searchModeRef.current = mode;
    if (mode === "results")  { setSearchFocusIndex(0); searchFocusIndexRef.current = 0; }
    if (mode === "keyboard") { setKbRow(0); kbRowRef.current = 0; setKbCol(0); kbColRef.current = 0; }
  };

  const kbDelete    = () => { const next = searchQueryRef.current.slice(0, -1); setSearchQuery(next); searchQueryRef.current = next; setSearchFocusIndex(0); searchFocusIndexRef.current = 0; };
  const kbSpace     = () => { const next = searchQueryRef.current + " ";        setSearchQuery(next); searchQueryRef.current = next; setSearchFocusIndex(0); searchFocusIndexRef.current = 0; };
  const kbToggleNum = () => { const next = !kbNumModeRef.current; setKbNumMode(next); kbNumModeRef.current = next; setKbRow(0); kbRowRef.current = 0; setKbCol(0); kbColRef.current = 0; };
  const fireKey     = (key) => { const next = searchQueryRef.current + key; setSearchQuery(next); searchQueryRef.current = next; setSearchFocusIndex(0); searchFocusIndexRef.current = 0; };

  const searchResults = searchQuery.trim().length === 0
    ? []
    : apps.filter(a => a.name.toLowerCase().includes(searchQuery.trim().toLowerCase()));

  // FIX 3: scroll focused search result into view when index or mode changes
  useEffect(() => {
    if (searchMode === "results" && searchFocusedCardRef.current) {
      searchFocusedCardRef.current.style.scrollMarginTop    = "12px";
      searchFocusedCardRef.current.style.scrollMarginBottom = "80px";
      searchFocusedCardRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [searchFocusIndex, searchMode]);
  // ─────────────────────────────────────────────────────────────

  // ── Gamepad polling with hold-repeat (FIX 2) ─────────────────
  useEffect(() => {
    invoke("set_frontend_active", { active: true });
    let rAF;
    const REPEATABLE = new Set(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"]);

    const poll = (now) => {
      const gps = navigator.getGamepads();
      const gp  = gps[0] || gps[1] || gps[2] || gps[3];
      if (gp && isReadyRef.current) {
        const speed = settingsRef.current.repeat_speed;
        const initialDelay = speed === "slow" ? 500 : speed === "fast" ? 250 : 400;
        const repeatDelay  = speed === "slow" ? 150 : speed === "fast" ? 60  : 100;

        const state = readGpState(gp);

        Object.keys(state).forEach(key => {
          const pressed    = state[key];
          const wasPressed = lastBtn.current[key];

          // If this button was held when the modal closed, suppress it until released
          if (suppressUntilRelease.current[key]) {
            if (!pressed) suppressUntilRelease.current[key] = false;
            lastBtn.current[key] = pressed;
            return;
          }

          if (pressed && !wasPressed) {
            if (!showHideModalRef.current) handleNavRef.current?.(key);
            btnPressTime.current[key]  = now;
            btnRepeating.current[key]  = false;
          } else if (pressed && wasPressed && REPEATABLE.has(key)) {
            const heldMs = now - (btnPressTime.current[key] || now);
            if (!btnRepeating.current[key] && heldMs >= initialDelay) {
              btnRepeating.current[key] = true;
              btnPressTime.current[key] = now;
              if (!showHideModalRef.current) handleNavRef.current?.(key);
            } else if (btnRepeating.current[key] && heldMs >= repeatDelay) {
              btnPressTime.current[key] = now;
              if (!showHideModalRef.current) handleNavRef.current?.(key);
            }
          } else if (!pressed && wasPressed) {
            btnPressTime.current[key]  = 0;
            btnRepeating.current[key]  = false;
          }

          lastBtn.current[key] = pressed;
        });
      }
      rAF = requestAnimationFrame(poll);
    };
    rAF = requestAnimationFrame(poll);
    return () => { cancelAnimationFrame(rAF); invoke("set_frontend_active", { active: false }); };
  }, []);
  // ─────────────────────────────────────────────────────────────

  useEffect(() => { settingsRef.current = settings; settingsFocusIndexRef.current = settingsFocusIndex; heroIndexRef.current = heroIndex; });

  useEffect(() => {
    if (tab !== "Settings") return;
    if (settingsFocusedRef.current) {
      settingsFocusedRef.current.style.scrollMarginTop    = "80px";
      settingsFocusedRef.current.style.scrollMarginBottom = "80px";
      settingsFocusedRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [settingsFocusIndex, tab]);

  // Global styles
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "app-global-styles";
    style.textContent = [
      "@keyframes appFadeIn     { from { opacity: 0; } to { opacity: 1; } }",
      "@keyframes heroArtFade   { from { opacity: 0; transform: scale(1.03); } to { opacity: 1; transform: scale(1); } }",
      "@keyframes spin          { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }",
      "@keyframes bgStarTwinkle { 0%, 100% { opacity: 0.08; transform: scale(1); } 50% { opacity: 0.35; transform: scale(1.2); } }",
      "@keyframes cloudDrift    { from { transform: translateX(110vw); } to { transform: translateX(-110vw); } }",
      ".bg-star  { position: fixed; border-radius: 50%; pointer-events: none; z-index: 0; animation: bgStarTwinkle ease-in-out infinite; }",
      ".bg-cloud { position: fixed; top: 0; pointer-events: none; z-index: -1; animation: cloudDrift linear infinite; }",
      "html, body { overflow-x: hidden; }",
      "* { scrollbar-width: none !important; -ms-overflow-style: none !important; }",
      "*::-webkit-scrollbar { display: none !important; }",
    ].join("\n");
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  useEffect(() => {
    const currentIsDark = (() => {
      const resolved = settings.theme === "system"
        ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
        : settings.theme;
      return resolved === "dark";
    })();
    document.querySelectorAll(".bg-star, .bg-cloud").forEach(s => s.remove());
    if (!settings.stars_enabled) return;
    if (currentIsDark) {
      for (let i = 0; i < 60; i++) {
        const star = document.createElement("div");
        star.className = "bg-star";
        const size = (Math.random() * 2 + 0.5) + "px";
        star.style.width = star.style.height = size;
        star.style.left  = Math.random() * 100 + "vw";
        star.style.top   = Math.random() * 100 + "vh";
        star.style.animationDuration = (Math.random() * 4 + 2) + "s";
        star.style.animationDelay    = (Math.random() * 4) + "s";
        star.style.background = "rgba(245,237,232,0.9)";
        const sc = document.getElementById("star-container"); if (sc) sc.appendChild(star);
      }
    } else {
      CLOUD_CONFIGS.forEach((cfg) => {
        const div = document.createElement("div");
        div.className = "bg-cloud";
        div.style.top             = cfg.top;
        div.style.width           = cfg.width + "px";
        div.style.opacity         = cfg.opacity;
        div.style.animationDuration = cfg.duration + "s";
        div.style.animationDelay    = cfg.delay + "s";
        div.innerHTML = CLOUD_SHAPES[cfg.shape];
        div.querySelector("svg").style.fill = "rgba(255,255,255,0.9)";
        const cc = document.getElementById("cloud-container"); if (cc) cc.appendChild(div);
      });
    }
    return () => document.querySelectorAll(".bg-star, .bg-cloud").forEach(s => s.remove());
  }, [settings.stars_enabled, settings.theme, settings.accent, loading]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      let h = now.getHours(), m = now.getMinutes();
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      setTime(`${h}:${String(m).padStart(2, "0")} ${ampm}`);
      setDate(now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }));
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);

  const getAudioCtx = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    return audioCtxRef.current;
  };

  const preloadAudio = async (key, url) => {
    try {
      const ctx = getAudioCtx();
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      audioBuffers.current[key] = await ctx.decodeAudioData(arr);
    } catch (e) {}
  };

  const playBuffer = (key) => {
    try {
      const ctx = getAudioCtx();
      if (ctx.state === "suspended") ctx.resume();
      const buf = audioBuffers.current[key];
      if (!buf) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    } catch (e) {}
  };

  const playSound          = () => playBuffer("ui");
  const playSoundAlt       = () => playBuffer("uiAlt");
  const playSoundGameStart = () => playBuffer("gameStart");

  // Preload all sounds up front so first play has zero decode lag
  useEffect(() => {
    preloadAudio("ui",        uiSound);
    preloadAudio("uiAlt",     uiSoundAlt);
    preloadAudio("gameStart", appStartSound);
    preloadAudio("appLoaded", appLoadedSound);
  }, []);

  useEffect(() => {
    const fetchBattery = () => { invoke("get_battery").then(info => { if (info.percent > 0) setBattery(info.percent); setCharging(info.charging); }); };
    fetchBattery();
    const id = setInterval(fetchBattery, 10000);
    return () => clearInterval(id);
  }, []);



  useEffect(() => {
    Promise.all([invoke("get_screen_resolution"), invoke("get_settings")]).then(([res, s]) => {
      const auto = Math.min(2.0, Math.max(0.75, Math.min(res.width / 1920, res.height / 1080)));
      autoScaleRef.current = auto;
      // ui_scale is null when never saved; substitute the auto-detected value.
      const updated = { ...s, ui_scale: s.ui_scale ?? auto };
      setSettings(updated); settingsRef.current = updated;
      setTab(s.default_tab || "Home"); tabRef.current = s.default_tab || "Home";
    }).catch(() => {
      invoke("get_settings").then(s => {
        setSettings(s); settingsRef.current = s;
        setTab(s.default_tab || "Home"); tabRef.current = s.default_tab || "Home";
      });
    });
    invoke("get_custom_art").then(art => {
      const heroArt = {}, gridArt = {};
      for (const [k, v] of Object.entries(art)) {
        if (k.startsWith("hero:")) heroArt[k.slice(5)] = v;
        else gridArt[k] = v;
      }
      setCustomArt(gridArt); customArtRef.current = gridArt;
      setCustomHeroArt(heroArt); customHeroArtRef.current = heroArt;
    }).catch(() => {});
    invoke("get_recents").then(recents => {
      if (recents.length > 0) { setRecent(recents); recentRef.current = recents; }
    });
    invoke("get_pins").then(loadedPins => {
      setPins(loadedPins); pinsRef.current = loadedPins;
    });
    Promise.all([invoke("get_all_apps"), invoke("get_hidden")]).then(([all, loadedHidden]) => {
      allAppsRef.current = all;
      setHidden(loadedHidden); hiddenRef.current = loadedHidden;
      const visible = all.filter(a => !loadedHidden.includes(a.id));
      setApps(visible); appsRef.current = visible;
      visible.filter(a => a.app_type !== "game" && a.icon_base64).forEach(a => {
        sampleIconColor(a.icon_base64).then(color => {
          if (color) setIconColors(prev => ({ ...prev, [a.id]: color }));
        });
      });
      invoke("get_recents").then(recents => {
        if (recents.length === 0) { setRecent(visible.slice(0, 10)); recentRef.current = visible.slice(0, 10); }
      });
      fetchGameArt(visible.filter(a => a.app_type === "game"));
      setSplashExiting(true);
      playBuffer("appLoaded");
      setTimeout(() => {
        setLoading(false);
        setTimeout(() => invoke("set_gamepad_ready"), 2000);
        setTimeout(() => { isReadyRef.current = true; }, 200);
      }, 800);
    }).catch((e) => { console.error("Failed to load apps:", e); setLoading(false); });
  }, []);

  // Convert a path-or-URL returned from Rust into a browser-loadable URL.
  // New entries are local file paths (asset:// via convertFileSrc); old cached entries
  // that were stored as remote https:// URLs still work as-is.
  const toUrl = (pathOrUrl) => {
    if (!pathOrUrl) return null;
    if (pathOrUrl.startsWith("http")) return pathOrUrl;
    return convertFileSrc(pathOrUrl);
  };

  const fetchGameArt = async (games, onProgress) => {
    if (!games.length) return;
    // Bulk cache read — instant disk read, no HTTP — hydrates all previously cached art at once
    try {
      const bulk = await invoke("get_cached_art_bulk", { gameNames: games.map(g => g.name) });
      const newGrid = {}, newAnimated = {}, newStatic = {};
      games.forEach(game => {
        const b = bulk[game.name];
        if (!b) return;
        if (b.grid)          newGrid[game.id]     = toUrl(b.grid);
        if (b.hero_animated) newAnimated[game.id] = toUrl(b.hero_animated);
        if (b.hero_static)   newStatic[game.id]   = toUrl(b.hero_static);
      });
      if (Object.keys(newGrid).length)     setGameArt(prev => ({ ...prev, ...newGrid }));
      if (Object.keys(newAnimated).length) setHeroAnimated(prev => ({ ...prev, ...newAnimated }));
      if (Object.keys(newStatic).length)   setHeroStatic(prev => ({ ...prev, ...newStatic }));
    } catch {}
    // Per-game fetch — batched to avoid rate-limiting SteamGridDB
    let done = 0;
    const total = games.length;
    const BATCH = 4;
    for (let i = 0; i < games.length; i += BATCH) {
      const batchGrid = {}, batchAnimated = {}, batchStatic = {};
      await Promise.all(games.slice(i, i + BATCH).map(game =>
        invoke("fetch_game_art", { gameName: game.name })
          .then(bundle => {
            if (bundle.grid)          batchGrid[game.id]     = toUrl(bundle.grid);
            if (bundle.hero_animated) batchAnimated[game.id] = toUrl(bundle.hero_animated);
            if (bundle.hero_static)   batchStatic[game.id]   = toUrl(bundle.hero_static);
            onProgress?.(++done, total, game.name);
          })
          .catch(() => { onProgress?.(++done, total, game.name); })
      ));
      if (Object.keys(batchGrid).length)     setGameArt(prev => ({ ...prev, ...batchGrid }));
      if (Object.keys(batchAnimated).length) setHeroAnimated(prev => ({ ...prev, ...batchAnimated }));
      if (Object.keys(batchStatic).length)   setHeroStatic(prev => ({ ...prev, ...batchStatic }));
    }
  };

  const handleClearCache = async () => {
    setCacheClearLoading(true);
    setCacheClearStatus({ line1: "Clearing Cache", line2: "Removing cached artwork files…" });
    await invoke("clear_art_cache");
    setGameArt({}); setHeroAnimated({}); setHeroStatic({});
    const games = appsRef.current.filter(a => a.app_type === "game");
    setCacheClearStatus({ line1: "Downloading Artwork", line2: `Starting download for ${games.length} games…` });
    await fetchGameArt(games, (done, total, lastName) => {
      setCacheClearStatus({ line1: "Downloading Artwork", line2: `${lastName ? `${lastName} — ` : ""}${done} / ${total} games` });
    });
    setCacheClearLoading(false);
  };

  const SCAN_KEYS = ["scan_steam", "scan_xbox", "scan_uwp", "scan_desktop", "scan_battlenet"];

  const updateSetting = (key, value) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value };
      settingsRef.current = updated;
      invoke("save_settings", { settings: updated }).catch(console.error);
      return updated;
    });
    if (SCAN_KEYS.includes(key)) setTimeout(refreshLibrary, 50);
  };

  const checkForUpdates = () => {
    setUpdateStatus("checking");
    fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`)
      .then(r => r.json())
      .then(data => {
        const latest = data.tag_name?.replace(/^v/, "");
        if (!latest) { setUpdateStatus("error"); return; }
        if (latest === APP_VERSION) {
          setUpdateStatus("up_to_date");
        } else {
          setUpdateStatus("available");
          setUpdateInfo(latest);
        }
      })
      .catch(() => setUpdateStatus("error"));
  };

  const refreshLibrary = () => {
    if (libraryRefreshStatus === "scanning") return;
    setLibraryRefreshStatus("scanning");
    Promise.all([invoke("get_all_apps"), invoke("get_hidden")]).then(([all, loadedHidden]) => {
      allAppsRef.current = all;
      setHidden(loadedHidden); hiddenRef.current = loadedHidden;
      const visible = all.filter(a => !loadedHidden.includes(a.id));
      setApps(visible); appsRef.current = visible;
      visible.filter(a => a.app_type !== "game" && a.icon_base64).forEach(a => {
        sampleIconColor(a.icon_base64).then(color => {
          if (color) setIconColors(prev => ({ ...prev, [a.id]: color }));
        });
      });
      fetchGameArt(visible.filter(a => a.app_type === "game"));
      setLibraryRefreshStatus("done");
      setTimeout(() => setLibraryRefreshStatus(null), 2500);
    }).catch(() => setLibraryRefreshStatus(null));
  };

  const filteredApps = apps.filter((a) => {
    if (tab === "Games") {
      if (a.app_type !== "game") return false;
      if (gameSourceTab === "Steam") return a.source === "steam";
      if (gameSourceTab === "Xbox")  return a.source === "xbox";
      if (gameSourceTab === "Bnet")  return a.source === "battlenet";
      if (gameSourceTab === "Other") return a.source !== "steam" && a.source !== "xbox" && a.source !== "battlenet";
      return true; // "All"
    }
    if (tab === "Apps") return a.app_type === "app";
    return true;
  });
  const filteredRecent = recent.filter(a =>
    tab === "Home" ? true : tab === "Games" ? a.app_type === "game" : a.app_type === "app"
  ).slice(0, 8);

  // Games-only recent list — drives the hero on Home (stable ref via useMemo)
  const recentGames = useMemo(() => recent.filter(a => a.app_type === "game"), [recent]);

  // Manage hero video playback: pause all when off Home; on Home keep active + adjacent
  // videos playing so heroIndex transitions feel instant (no play() decode stutter).
  //
  // IMPORTANT: when navigating TO Home, defer play() by one frame so the browser
  // paints the tab switch first — calling play() synchronously blocks the main thread
  // and causes the visible lag when animated heroes are enabled.

  useEffect(() => {
    const isHome = tab === "Home";

    if (!isHome) {
      // Leaving Home — pause all videos immediately but keep them loaded so
      // they're warm (decoded frame 0 in memory) when we return.
      Object.entries(heroVideoRefs.current).forEach(([id, vid]) => {
        if (vid) vid.pause();
      });
      return;
    }

    // Arriving on Home — let the browser paint first, THEN start playback.
    // requestAnimationFrame fires after paint, eliminating the decode-on-render stall.
    let rafId = requestAnimationFrame(() => {
      Object.entries(heroVideoRefs.current).forEach(([id, vid]) => {
        if (!vid) return;
        // eslint-disable-next-line eqeqeq
        const isActive = recentGames[heroIndex]?.id == id;
        if (isActive) { vid.play().catch(() => {}); } else { vid.pause(); }
      });
      // Kick off buffering for adjacent heroes
      [heroIndex + 1, heroIndex + 2, heroIndex - 1, heroIndex - 2].forEach(i => {
        const game = recentGames[i];
        if (!game) return;
        const vid = heroVideoRefs.current[game.id];
        if (vid && vid.readyState < 3) vid.load();
      });
    });

    return () => cancelAnimationFrame(rafId);
  }, [heroIndex, recentGames, tab]);

  useEffect(() => {
    const onBlur = () => {
      Object.values(heroVideoRefs.current).forEach(vid => {
        if (vid) vid.pause();
      });
    };

    const onFocus = () => {
      if (tab !== "Home") return;
      const activeGame = recentGames[heroIndex];
      if (!activeGame) return;
      const vid = heroVideoRefs.current[activeGame.id];
      if (vid) vid.play().catch(() => {});
    };

    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [tab, heroIndex, recentGames]);

  // Pinned apps reactive (for render)
  const pinnedAppsReactive = pins
    .map(id => apps.find(a => a.id === id))
    .filter(Boolean)
    .filter(a => tab === "Home" ? true : tab === "Games" ? a.app_type === "game" : a.app_type === "app");

  const currentCols = tab === "Games" ? GAME_COLS : COLS;

  useEffect(() => {
    if (tab === "Settings") return;
    const hasPinned = pinsRef.current.length > 0;
    const gridIsOffscreen = tab !== "Home" && hasPinned;
    const scrollToTop = () => {
      const scroller = tab === "Home" ? homeScrollRef.current : tabScrollRef.current;
      if (scroller) scroller.scrollTo({ top: 0, behavior: "smooth" });
    };
    if (focusSection === "hero" || focusSection === "recent") {
      setTimeout(scrollToTop, 50);
    } else if (focusSection === "pinned") {
      setTimeout(scrollToTop, 50);
      // On Home tab, pinned is a horizontal pill shelf — scroll focused pill into view horizontally
      if (tab === "Home") {
        setTimeout(() => {
          if (focusedCardRef.current) {
            focusedCardRef.current.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
          }
        }, 80);
      }
    } else if (focusSection === "grid" && focusIndex < currentCols) {
      const hasPinned = pinsRef.current.length > 0;
      const gridPushedDown = tab !== "Home" && hasPinned;
      if (!gridPushedDown) {
        // No pinned section — grid starts near top, snap there
        setTimeout(scrollToTop, 50);
      } else if (focusedCardRef.current) {
        // Pinned section pushes grid down — scroll first row into view properly
        focusedCardRef.current.style.scrollMarginTop    = "100px";
        focusedCardRef.current.style.scrollMarginBottom = "80px";
        focusedCardRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    } else if (focusedCardRef.current) {
      focusedCardRef.current.style.scrollMarginTop    = "100px";
      focusedCardRef.current.style.scrollMarginBottom = "80px";
      focusedCardRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [focusSection, focusIndex, tab]);

  const switchTab = (newTab) => {
    setTab(newTab); tabRef.current = newTab;
    let defaultSection;
    if (newTab === "Home") defaultSection = "hero";
    else if (newTab === "Settings") defaultSection = "grid";
    else {
      const hasPinned = pinsRef.current.length > 0 && pinsRef.current.some(id => appsRef.current.find(a => a.id === id));
      defaultSection = hasPinned ? "pinned" : "grid";
    }
    setFocusSection(defaultSection); focusSectionRef.current = defaultSection;
    setFocusIndex(0); focusIndexRef.current = 0;
    setHeroIndex(0); heroIndexRef.current = 0;
    setSettingsFocusIndex(0); settingsFocusIndexRef.current = 0;
    setGameSourceTab("All"); gameSourceTabRef.current = "All";
    setSubtabFocusIndex(0); subtabFocusIndexRef.current = 0;
    setTimeout(() => {
      const scroller = newTab === "Home" ? homeScrollRef.current : tabScrollRef.current;
      if (scroller) scroller.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  };

  const SETTINGS_ITEMS = [
    { key: "accent",            label: "Accent Color",           type: "accent" },
    { key: "theme",             label: "Theme",                  type: "cycle",  options: ["dark","light","system"] },
    { key: "stars_enabled",     label: isDark ? "Background Stars" : "Background Clouds", type: "toggle" },
    { key: "divider_display",   label: "DISPLAY",                type: "divider" },
    { key: "ui_scale",          label: "UI Scale",               type: "slider", min: 0.75, max: 2.0, step: 0.05 },
    { key: "reset_scale",       label: "Reset Scale to Auto",    type: "action" },
    { key: "divider",           label: "LIBRARY",                type: "divider" },
    { key: "scan_steam",        label: "Scan Steam",             type: "toggle" },
    { key: "scan_xbox",         label: "Scan Xbox",              type: "toggle" },
    { key: "scan_uwp",          label: "Scan Store Apps",        type: "toggle" },
    { key: "scan_desktop",      label: "Scan Desktop Shortcuts", type: "toggle" },
    { key: "scan_battlenet",    label: "Scan Battle.net",        type: "toggle" },
    { key: "refresh_library",   label: "Refresh Library",        type: "refresh" },
    { key: "divider2",          label: "BEHAVIOR",               type: "divider" },
    { key: "default_tab",       label: "Default Tab",            type: "cycle",  options: ["Home","Games","Apps"] },
    { key: "repeat_speed",      label: "Stick Repeat Speed",     type: "cycle",  options: ["slow","normal","fast"] },
    { key: "launch_at_startup", label: "Launch at Startup",      type: "toggle" },
    { key: "animated_heroes",   label: "Hero Art Mode",          type: "cycle",  options: ["static", "animated", "custom"] },
    { key: "divider_ctrl",      label: "CONTROLLER",             type: "divider" },
    { key: "controller_test",   label: "Controller Test",        type: "controller_test" },
    { key: "divider3",          label: "DATA",                   type: "divider" },
    { key: "clear_recents",     label: "Clear Recently Played",  type: "action" },
    { key: "clear_cache",       label: "Clear Art Cache",        type: "action" },
    { key: "divider4",          label: "ABOUT",                  type: "divider" },
    { key: "version",           label: `LiftOff v${APP_VERSION}`, type: "info" },
    { key: "check_updates",     label: "Check for Updates",       type: "update" },
    { key: "coffee",            label: "☕ Buy Me a Coffee",      type: "link" },
    { key: "github",            label: "⭐ GitHub",               type: "link" },
    { key: "discord",           label: "💬 Discord",              type: "link" },
    { key: "divider5",  label: "CREDITS",                         type: "divider" },
    { key: "credit1",   label: "Mysterious Magical Bell Flourish", author: "DanaiOuranos", license: "CC0",       url: "https://freesound.org/s/848847/",                        type: "attribution" },
    { key: "credit2",   label: "Achievement Sparkle",              author: "DanaiOuranos", license: "CC0",       url: "https://freesound.org/s/715067/",                        type: "attribution" },
    { key: "credit3",   label: "Mysterious Sparkle Flourish",      author: "DanaiOuranos", license: "CC0",       url: "https://freesound.org/s/844398/",                        type: "attribution" },
    { key: "credit4",   label: "Universal UI Soundpack",           author: "Nathan Gibson", license: "CC BY 4.0", url: "https://cyrex-studios.itch.io/universal-ui-soundpack",  type: "attribution" },
  ];
  const navigableSettings = SETTINGS_ITEMS.filter(i => i.type !== "divider" && i.type !== "info" && i.type !== "controller_test");

  // ── handleNav ─────────────────────────────────────────────────
  const handleNav = (key) => {
    // Modal intercepts all input via its own poll — main nav must not run
    if (showHideModalRef.current) return;

    // Art picker open — only Escape closes it (user interacts via touch/mouse)
    if (artPickerAppRef.current) {
      if (key === "Escape") closeArtPicker();
      return;
    }

    // Context menu open — navigate with D-pad, confirm with A, dismiss with B or bumpers
    if (contextMenuRef.current) {
      const menu = contextMenuRef.current;
      const menuItems = [
        { label: "Open" },
        { label: menu.app.app_type === "game" ? (pins.includes(menu.app.id) ? "Unpin" : "Pin") : (pins.includes(menu.app.id) ? "Unpin" : "Pin") },
        { label: "Change Art" },
        ...(menu.app.app_type === "game" ? [{ label: "Change Hero Art" }] : []),
      ];
      const cur = menu.focusedIdx || 0;
      if (key === "ArrowDown") {
        const next = Math.min(cur + 1, menuItems.length - 1);
        const updated = { ...menu, focusedIdx: next };
        setContextMenu(updated); contextMenuRef.current = updated;
        return;
      }
      if (key === "ArrowUp") {
        const next = Math.max(cur - 1, 0);
        const updated = { ...menu, focusedIdx: next };
        setContextMenu(updated); contextMenuRef.current = updated;
        return;
      }
      if (key === "Enter") {
        const label = menuItems[cur]?.label;
        if (label === "Open") { triggerLaunch(menu.app, recentRef.current); setContextMenu(null); contextMenuRef.current = null; }
        else if (label === "Pin" || label === "Unpin") { togglePin(menu.app); setContextMenu(null); contextMenuRef.current = null; }
        else if (label === "Change Art") { setArtPickerMode("grid"); artPickerModeRef.current = "grid"; setArtPickerApp(menu.app); artPickerAppRef.current = menu.app; setContextMenu(null); contextMenuRef.current = null; }
        else if (label === "Change Hero Art") { setArtPickerMode("hero"); artPickerModeRef.current = "hero"; setArtPickerApp(menu.app); artPickerAppRef.current = menu.app; setContextMenu(null); contextMenuRef.current = null; }
        return;
      }
      if (key === "Escape" || key === "BumperLeft" || key === "BumperRight") {
        setContextMenu(null); contextMenuRef.current = null;
        if (key !== "Escape") {
          // Let bumpers fall through to tab-switching after closing
          const i = TABS.indexOf(tabRef.current);
          if (key === "BumperLeft")  switchTab(TABS[(i - 1 + TABS.length) % TABS.length]);
          if (key === "BumperRight") switchTab(TABS[(i + 1) % TABS.length]);
        }
        return;
      }
      return;
    }

    const section         = focusSectionRef.current;
    const index           = focusIndexRef.current;
    const currentTab      = tabRef.current;
    const allApps         = appsRef.current;
    const rec             = recentRef.current;
    const currentPins     = pinsRef.current;
    const cols            = currentTab === "Games" ? GAME_COLS : COLS;
    const currentSettings = settingsRef.current;

    const fApps = allApps.filter(a => {
      if (currentTab === "Home" || currentTab === "All") return true;
      if (currentTab === "Games") {
        if (a.app_type !== "game") return false;
        const src = gameSourceTabRef.current;
        if (src === "Steam") return a.source === "steam";
        if (src === "Xbox")  return a.source === "xbox";
        if (src === "Bnet")  return a.source === "battlenet";
        if (src === "Other") return a.source !== "steam" && a.source !== "xbox" && a.source !== "battlenet";
        return true;
      }
      return a.app_type === "app";
    });
    const fRecent = rec.filter(a =>
      currentTab === "Home" || currentTab === "All" ? true
        : currentTab === "Games" ? a.app_type === "game" : a.app_type === "app"
    ).slice(0, 8);
    const fPinned = currentPins
      .map(id => allApps.find(a => a.id === id))
      .filter(Boolean)
      .filter(a => currentTab === "Home" || currentTab === "All" ? true
        : currentTab === "Games" ? a.app_type === "game" : a.app_type === "app");

    // ══ SEARCH OVERLAY ════════════════════════════════════════════
    if (searchOpenRef.current) {
      const mode    = searchModeRef.current;
      const results = allApps.filter(a =>
        searchQueryRef.current.trim().length > 0 &&
        a.name.toLowerCase().includes(searchQueryRef.current.trim().toLowerCase())
      );
      const SCOLS = COLS;

      if (mode === "keyboard") {
        const layout  = kbNumModeRef.current ? KB_NUMS : KB_ALPHA;
        const rowKeys = layout[kbRowRef.current] || [];

        if      (key === "ArrowRight") { const ni = Math.min(kbColRef.current + 1, rowKeys.length - 1); setKbCol(ni); kbColRef.current = ni; playSound(); }
        else if (key === "ArrowLeft")  { const ni = Math.max(kbColRef.current - 1, 0);                  setKbCol(ni); kbColRef.current = ni; playSound(); }
        else if (key === "ArrowDown") {
          if (kbRowRef.current < layout.length - 1) {
            const nr = kbRowRef.current + 1;
            const nc = Math.min(kbColRef.current, layout[nr].length - 1);
            setKbRow(nr); kbRowRef.current = nr; setKbCol(nc); kbColRef.current = nc; playSound();
          }
        }
        else if (key === "ArrowUp") {
          if (kbRowRef.current > 0) {
            const nr = kbRowRef.current - 1;
            const nc = Math.min(kbColRef.current, layout[nr].length - 1);
            setKbRow(nr); kbRowRef.current = nr; setKbCol(nc); kbColRef.current = nc; playSound();
          }
        }
        else if (key === "Enter")        { const k = rowKeys[kbColRef.current]; if (k) { fireKey(k); playSound(); } }
        else if (key === "ButtonX")      { kbDelete(); playSound(); }
        else if (key === "ButtonY")      { kbSpace(); playSound(); }
        else if (key === "TriggerRight") { kbToggleNum(); playSound(); }
        else if (key === "Start")        { if (results.length > 0) { playSoundAlt(); switchSearchMode("results"); } }
        // FIX 1: B in keyboard mode — jump to results if any, else go idle
        else if (key === "Escape") {
          playSound();
          if (results.length > 0) { switchSearchMode("results"); }
          else { switchSearchMode("idle"); }
        }
        return;
      }

      if (mode === "results") {
        if      (key === "ArrowRight") { const ni = Math.min(searchFocusIndexRef.current + 1, results.length - 1); setSearchFocusIndex(ni); searchFocusIndexRef.current = ni; playSound(); }
        else if (key === "ArrowLeft")  { const ni = Math.max(searchFocusIndexRef.current - 1, 0);                   setSearchFocusIndex(ni); searchFocusIndexRef.current = ni; playSound(); }
        else if (key === "ArrowDown")  { const ni = Math.min(searchFocusIndexRef.current + SCOLS, results.length - 1); setSearchFocusIndex(ni); searchFocusIndexRef.current = ni; playSound(); }
        else if (key === "ArrowUp") {
          const ni = searchFocusIndexRef.current - SCOLS;
          if (ni >= 0) { setSearchFocusIndex(ni); searchFocusIndexRef.current = ni; playSound(); }
          else { playSound(); switchSearchMode("keyboard"); }
        }
        else if (key === "Enter" || key === "Start") {
          const app = results[searchFocusIndexRef.current];
          if (app) { closeSearch(); triggerLaunch(app, recentRef.current); }
        }
        else if (key === "Escape")  { playSound(); closeSearch(); }
        else if (key === "ButtonY") { playSound(); switchSearchMode("keyboard"); }
        else if (key === "ButtonX") { kbDelete(); playSound(); }
        return;
      }

      if (mode === "idle") {
        if      (key === "ButtonY") { playSound(); switchSearchMode("keyboard"); }
        else if (key === "Escape")  { playSound(); closeSearch(); }
        else if (key === "Start") {
          if (results.length > 0) { playSoundAlt(); switchSearchMode("results"); }
          else { playSound(); closeSearch(); }
        }
        else if (key === "ButtonX") { kbDelete(); playSound(); }
        return;
      }

      return;
    }
    // ══ END SEARCH OVERLAY ════════════════════════════════════════

    // Y opens search from main UI
    if (key === "ButtonY") { playSound(); openSearch(); return; }

    // ── Main nav sections ──────────────────────────────────────
    // Compute filtered data using refs (same as render-time but from refs)
    const fRecentGames = rec.filter(a => a.app_type === "game");

    // X pins/unpins focused app
    if (key === "ButtonX") {
      let focusedApp = null;
      if (section === "hero")   focusedApp = fRecentGames[heroIndexRef.current] ? allApps.find(a => a.id === fRecentGames[heroIndexRef.current].id) : null;
      if (section === "pinned" && fPinned[index]) focusedApp = fPinned[index];
      else if (section === "recent" && fRecent[index]) focusedApp = fRecent[index];
      else if (section === "grid"   && fApps[index])   focusedApp = fApps[index];
      if (focusedApp) { playSound(); togglePin(focusedApp); }
      return;
    }

    if (key === "BumperLeft" || key === "BumperRight") playSoundAlt(); else playSound();
    if (key === "BumperLeft")  { const i = TABS.indexOf(currentTab); switchTab(TABS[(i - 1 + TABS.length) % TABS.length]); return; }
    if (key === "BumperRight") { const i = TABS.indexOf(currentTab); switchTab(TABS[(i + 1) % TABS.length]); return; }

    // BACK (Select) opens Manage modal; MENU (Start) opens context menu for focused card
    if (key === "Select" && (currentTab === "Games" || currentTab === "Apps")) {
      openHideModal(); return;
    }
    if (key === "Start" && (currentTab === "Games" || currentTab === "Apps")) {
      const focusedApp = section === "pinned" ? fPinned[index] : section === "grid" ? fApps[index] : null;
      if (focusedApp) {
        const cx = Math.min(Math.floor(window.innerWidth / 2) - 90, window.innerWidth - 200);
        const cy = Math.min(Math.floor(window.innerHeight / 2) - 80, window.innerHeight - 180);
        const menu = { x: cx, y: cy, app: focusedApp, focusedIdx: 0 };
        setContextMenu(menu); contextMenuRef.current = menu;
      }
      return;
    }

    if (currentTab === "Settings") {
      const sfIndex = settingsFocusIndexRef.current;
      const item    = navigableSettings[sfIndex];
      if (key === "ArrowDown") { const ni = Math.min(sfIndex + 1, navigableSettings.length - 1); setSettingsFocusIndex(ni); settingsFocusIndexRef.current = ni; }
      if (key === "ArrowUp") {
        const ni = Math.max(sfIndex - 1, 0); setSettingsFocusIndex(ni); settingsFocusIndexRef.current = ni;
        if (sfIndex === 0 && tabScrollRef.current) tabScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
      if (key === "ArrowRight" || key === "Enter") {
        if (!item) return;
        if (item.type === "toggle")  updateSetting(item.key, !currentSettings[item.key]);
        else if (item.type === "cycle")  { const opts = item.options; const cur = opts.indexOf(currentSettings[item.key]); updateSetting(item.key, opts[(cur + 1) % opts.length]); }
        else if (item.type === "accent") { const keys = Object.keys(ACCENTS); const cur = keys.indexOf(currentSettings.accent); updateSetting("accent", keys[(cur + 1) % keys.length]); }
        else if (item.type === "slider") {
          const cur = currentSettings[item.key] ?? 1.0;
          updateSetting(item.key, Math.min(item.max, Math.round((cur + item.step) * 100) / 100));
        }
        else if (item.type === "action") {
          if (item.key === "clear_recents") invoke("clear_recents").then(() => { setRecent([]); recentRef.current = []; });
          if (item.key === "clear_cache")   handleClearCache();
          if (item.key === "reset_scale")   updateSetting("ui_scale", autoScaleRef.current);
        }
        else if (item.type === "refresh") { refreshLibrary(); }
        else if (item.type === "update") {
          if (updateStatus === "available") invoke("launch_app", { path: `https://github.com/${GITHUB_REPO}/releases/latest`, id: "releases", name: "LiftOff Releases", appType: "app" }).catch(() => {});
          else checkForUpdates();
        }
        else if (item.type === "link") {
          if (item.key === "coffee")  invoke("launch_app", { path: "https://buymeacoffee.com/liftoff_handheld_launcher", id: "coffee", name: "Buy Me a Coffee", appType: "app" }).catch(() => {});
          if (item.key === "github")  invoke("launch_app", { path: "https://github.com/PixelateWizard/LiftOff", id: "github", name: "GitHub", appType: "app" }).catch(() => {});
          if (item.key === "discord") invoke("launch_app", { path: "https://discord.gg/F5ncP75WtD", id: "discord", name: "Discord", appType: "app" }).catch(() => {});
        }
        else if (item.type === "attribution") {
          if (item.url) invoke("launch_app", { path: item.url, id: item.key, name: item.label, appType: "app" }).catch(() => {});
        }
      }
      if (key === "ArrowLeft") {
        if (!item) return;
        if (item.type === "toggle")  updateSetting(item.key, !currentSettings[item.key]);
        else if (item.type === "cycle")  { const opts = item.options; const cur = opts.indexOf(currentSettings[item.key]); updateSetting(item.key, opts[(cur - 1 + opts.length) % opts.length]); }
        else if (item.type === "accent") { const keys = Object.keys(ACCENTS); const cur = keys.indexOf(currentSettings.accent); updateSetting("accent", keys[(cur - 1 + keys.length) % keys.length]); }
        else if (item.type === "slider") {
          const cur = currentSettings[item.key] ?? 1.0;
          updateSetting(item.key, Math.max(item.min, Math.round((cur - item.step) * 100) / 100));
        }
      }
      return;
    }

    if (currentTab === "Home") {
      if (section === "hero") {
        if (key === "ArrowLeft")  { const ni = Math.max(heroIndexRef.current - 1, 0); setHeroIndex(ni); heroIndexRef.current = ni; }
        if (key === "ArrowRight") { const ni = Math.min(heroIndexRef.current + 1, Math.min(fRecentGames.length, 6) - 1); setHeroIndex(ni); heroIndexRef.current = ni; }
        if (key === "ArrowUp") {
          if (fPinned.length > 0) { setFocusSection("pinned"); focusSectionRef.current = "pinned"; setFocusIndex(0); focusIndexRef.current = 0; }
        }
        if (key === "ArrowDown") {
          if (fRecent.length > 0) { setFocusSection("recent"); focusSectionRef.current = "recent"; setFocusIndex(0); focusIndexRef.current = 0; }
        }
        if (key === "Enter" && fRecentGames[heroIndexRef.current]) triggerLaunch(fRecentGames[heroIndexRef.current], rec);
        return;
      }
      if (section === "pinned") {
        if (key === "ArrowRight") { const ni = Math.min(index + 1, fPinned.length - 1); setFocusIndex(ni); focusIndexRef.current = ni; }
        if (key === "ArrowLeft")  { const ni = Math.max(index - 1, 0);                  setFocusIndex(ni); focusIndexRef.current = ni; }
        if (key === "ArrowDown")  { setFocusSection("hero"); focusSectionRef.current = "hero"; }
        if (key === "ArrowUp"  && fRecent.length > 0) { setFocusSection("recent"); focusSectionRef.current = "recent"; setFocusIndex(Math.min(focusIndexRef.current, fRecent.length - 1)); }
        if (key === "Enter" && fPinned[index]) triggerLaunch(fPinned[index], rec);
        return;
      }
      if (section === "recent") {
        const maxIdx = Math.min(fRecent.length, 10) - 1;
        if (key === "ArrowRight") { const ni = Math.min(index + 1, maxIdx); setFocusIndex(ni); focusIndexRef.current = ni; }
        if (key === "ArrowLeft")  { const ni = Math.max(index - 1, 0);      setFocusIndex(ni); focusIndexRef.current = ni; }
        if (key === "ArrowUp")    { setFocusSection("hero"); focusSectionRef.current = "hero"; }
        if (key === "Enter" && fRecent[index]) triggerLaunch(fRecent[index], rec);
        return;
      }
      return;
    }

    // Games / Apps tabs
    // LT/RT cycle source sub-tabs on Games tab (from anywhere)
    if (currentTab === "Games") {
      const SOURCES = ["All", "Steam", "Xbox", "Bnet", "Other"];
      // "Manage" is the last item in the subtab row, index = SOURCES.length (for Games) or 0 (for Apps)
      if (key === "TriggerLeft") {
        const cur = SOURCES.indexOf(gameSourceTabRef.current);
        const next = SOURCES[(cur - 1 + SOURCES.length) % SOURCES.length];
        setGameSourceTab(next); gameSourceTabRef.current = next;
        const hasPinned = next === "All" && pinsRef.current.length > 0 && pinsRef.current.some(id => appsRef.current.find(a => a.id === id));
        setFocusSection(hasPinned ? "pinned" : "grid"); focusSectionRef.current = hasPinned ? "pinned" : "grid";
        setFocusIndex(0); focusIndexRef.current = 0;
        playSound(); return;
      }
      if (key === "TriggerRight") {
        const cur = SOURCES.indexOf(gameSourceTabRef.current);
        const next = SOURCES[(cur + 1) % SOURCES.length];
        setGameSourceTab(next); gameSourceTabRef.current = next;
        const hasPinned = next === "All" && pinsRef.current.length > 0 && pinsRef.current.some(id => appsRef.current.find(a => a.id === id));
        setFocusSection(hasPinned ? "pinned" : "grid"); focusSectionRef.current = hasPinned ? "pinned" : "grid";
        setFocusIndex(0); focusIndexRef.current = 0;
        playSound(); return;
      }
    }

    // subtabs row: source pills + manage button
    // For Games: indices 0–3 = All/Steam/Xbox/Other, index 4 = "Manage", index 5 = "Restore" (if hidden exist)
    // For Apps:  index 0 = "Manage", index 1 = "Restore" (if hidden exist)
    const SOURCES = ["All", "Steam", "Xbox", "Bnet", "Other"];
    const subtabItems = currentTab === "Games"
      ? [...SOURCES, "manage"]
      : ["manage"];

    if (section === "subtabs") {
      if (key === "ArrowRight") {
        const ni = Math.min(subtabFocusIndexRef.current + 1, subtabItems.length - 1);
        setSubtabFocusIndex(ni); subtabFocusIndexRef.current = ni;
        // Auto-switch source if the new focus is a pill
        const item = subtabItems[ni];
        if (item !== "manage" && item !== "restore") { setGameSourceTab(item); gameSourceTabRef.current = item; setFocusIndex(0); focusIndexRef.current = 0; }
        playSound();
      }
      else if (key === "ArrowLeft") {
        const ni = Math.max(subtabFocusIndexRef.current - 1, 0);
        setSubtabFocusIndex(ni); subtabFocusIndexRef.current = ni;
        const item = subtabItems[ni];
        if (item !== "manage" && item !== "restore") { setGameSourceTab(item); gameSourceTabRef.current = item; setFocusIndex(0); focusIndexRef.current = 0; }
        playSound();
      }
      else if (key === "ArrowDown") {
        if (fPinned.length > 0) { setFocusSection("pinned"); focusSectionRef.current = "pinned"; setFocusIndex(0); focusIndexRef.current = 0; }
        else { setFocusSection("grid"); focusSectionRef.current = "grid"; setFocusIndex(0); focusIndexRef.current = 0; }
        playSound();
      }
      else if (key === "Enter") {
        const item = subtabItems[subtabFocusIndexRef.current];
        if (item === "manage") { openHideModal(); }
        // Pills already auto-switched on focus movement — Enter is a no-op for them
      }
      return; // always return — never fall through to grid/pinned launch
    }

    if (section === "pinned") {
      const pinnedCols = currentTab === "Games" ? GAME_COLS : COLS;
      if (fPinned.length === 0) { setFocusSection("grid"); focusSectionRef.current = "grid"; setFocusIndex(0); focusIndexRef.current = 0; return; }
      if (key === "ArrowRight") { const ni = Math.min(index + 1, fPinned.length - 1); setFocusIndex(ni); focusIndexRef.current = ni; }
      if (key === "ArrowLeft")  { const ni = Math.max(index - 1, 0);                  setFocusIndex(ni); focusIndexRef.current = ni; }
      if (key === "ArrowUp") {
        setFocusSection("subtabs"); focusSectionRef.current = "subtabs";
        setSubtabFocusIndex(0); subtabFocusIndexRef.current = 0;
        playSound();
      }
      if (key === "ArrowDown") {
        const ni = index + pinnedCols;
        if (ni < fPinned.length) { setFocusIndex(ni); focusIndexRef.current = ni; }
        else { setFocusSection("grid"); focusSectionRef.current = "grid"; setFocusIndex(0); focusIndexRef.current = 0; }
      }
      if (key === "Enter" && fPinned[index]) triggerLaunch(fPinned[index], rec);
      return;
    }
    if (section === "grid") {
      const pinnedCols = currentTab === "Games" ? GAME_COLS : COLS;
      if (fApps.length === 0) return;
      if (key === "ArrowRight") { const ni = Math.min(index + 1, fApps.length - 1); setFocusIndex(ni); focusIndexRef.current = ni; }
      if (key === "ArrowLeft")  { const ni = Math.max(index - 1, 0);                setFocusIndex(ni); focusIndexRef.current = ni; }
      if (key === "ArrowDown")  { const ni = Math.min(index + cols, fApps.length - 1); setFocusIndex(ni); focusIndexRef.current = ni; }
      if (key === "ArrowUp") {
        if (index < cols) {
          if (fPinned.length > 0) {
            const pinnedTarget = Math.min(index % pinnedCols, fPinned.length - 1);
            setFocusSection("pinned"); focusSectionRef.current = "pinned"; setFocusIndex(pinnedTarget); focusIndexRef.current = pinnedTarget;
          } else {
            setFocusSection("subtabs"); focusSectionRef.current = "subtabs";
            setSubtabFocusIndex(0); subtabFocusIndexRef.current = 0;
          }
        } else { const ni = index - cols; setFocusIndex(ni); focusIndexRef.current = ni; }
      }
      if (key === "Enter" && fApps[index]) triggerLaunch(fApps[index], rec);
      return;
    }
  };

  useEffect(() => { handleNavRef.current = handleNav; });

  // Block ALL click/mousedown events while modal is open — gamepad A button fires
  // synthetic browser clicks on focused elements, which bypasses our gamepad guards
  useEffect(() => {
    const block = (e) => {
      if (!showHideModalRef.current) return;
      // Allow clicks that originate inside the modal overlay
      if (e.target?.closest?.("[data-modal-overlay]")) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };
    window.addEventListener("click",       block, true);
    window.addEventListener("dblclick",    block, true);
    window.addEventListener("mousedown",   block, true);
    window.addEventListener("mouseup",     block, true);
    window.addEventListener("pointerdown", block, true);
    window.addEventListener("pointerup",   block, true);
    return () => {
      window.removeEventListener("click",       block, true);
      window.removeEventListener("dblclick",    block, true);
      window.removeEventListener("mousedown",   block, true);
      window.removeEventListener("mouseup",     block, true);
      window.removeEventListener("pointerdown", block, true);
      window.removeEventListener("pointerup",   block, true);
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      // Modal has its own capture-phase keyboard handler — don't double-fire
      if (showHideModalRef.current) return;
      if (e.key === "Escape") {
        e.preventDefault();
        if (searchOpenRef.current) {
          const mode = searchModeRef.current;
          if (mode === "keyboard") {
            const results = appsRef.current.filter(a =>
              searchQueryRef.current.trim().length > 0 &&
              a.name.toLowerCase().includes(searchQueryRef.current.trim().toLowerCase())
            );
            if (results.length > 0) { switchSearchMode("results"); }
            else { switchSearchMode("idle"); }
          } else { closeSearch(); }
          return;
        }
        handleNavRef.current?.("Escape");
        return;
      }
      if (searchOpenRef.current && searchModeRef.current === "keyboard") {
        if (e.key.length === 1 && e.key !== " ") { fireKey(e.key); return; }
        if (e.key === " ")         { e.preventDefault(); kbSpace(); return; }
        if (e.key === "Backspace") { kbDelete(); return; }
      }
      if (["ArrowRight","ArrowLeft","ArrowDown","ArrowUp","Enter"].includes(e.key)) {
        if (searchOpenRef.current) return;
        e.preventDefault();
        handleNavRef.current?.(e.key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let unlisten;
    listen("gamepad-button", (e) => {
      if (!isReadyRef.current || showHideModalRef.current) return;
      handleNavRef.current?.(e.payload);
    }).then((fn) => { unlisten = fn; });
    return () => { if (unlisten) unlisten(); };
  }, []);

  useEffect(() => {
    let repeatInterval = null, initialTimeout = null, currentDir = null, unlisten;
    listen("gamepad-axis", (e) => {
      const dir = e.payload;
      if (!isReadyRef.current || showHideModalRef.current) return;
      const speed = settingsRef.current.repeat_speed;
      const initialDelay = speed === "slow" ? 800 : speed === "fast" ? 400 : 600;
      const repeatDelay  = speed === "slow" ? 300 : speed === "fast" ? 100 : 200;
      if (dir === "none") {
        clearTimeout(initialTimeout); clearInterval(repeatInterval);
        initialTimeout = null; repeatInterval = null; currentDir = null;
      } else if (dir !== currentDir) {
        clearTimeout(initialTimeout); clearInterval(repeatInterval);
        currentDir = dir; handleNavRef.current?.(dir);
        initialTimeout = setTimeout(() => {
          repeatInterval = setInterval(() => { handleNavRef.current?.(dir); }, repeatDelay);
        }, initialDelay);
      }
    }).then((fn) => { unlisten = fn; });
    return () => { if (unlisten) unlisten(); clearTimeout(initialTimeout); clearInterval(repeatInterval); };
  }, []);

  const isFocused = (section, index) => focusSection === section && focusIndex === index;

  const AppIcon = ({ app, size = 36 }) => {
    if (app.icon_base64) {
      return (
        <div style={{ width: size, height: size, borderRadius: 8, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <img
            src={`data:image/png;base64,${app.icon_base64}`}
            alt={app.name}
            style={{ width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%", objectFit: "contain", objectPosition: "center", display: "block" }}
          />
        </div>
      );
    }
    return <div style={{ width: size, height: size, borderRadius: 10, background: `${accent.glow}0.25)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.45, fontWeight: 700, color: accent.primary }}>{app.name.charAt(0).toUpperCase()}</div>;
  };

  // Pin badge shown on cards
  const PinBadge = ({ isPinned, small = false }) => {
    if (!isPinned) return null;
    return (
      <div className="pin-pop" style={{
        position: "absolute", top: small ? 6 : 8, right: small ? 6 : 8,
        width: small ? 18 : 22, height: small ? 18 : 22,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: small ? 9 : 11,
        boxShadow: `0 2px 8px ${accent.glow}0.5)`,
        zIndex: 2,
      }}>📌</div>
    );
  };

  const GameCard = ({ app, focused, onClick, onDoubleClick, cardRef, isPinned, onRightClick }) => {
    const art = customArt[app.id] || gameArt[app.id];
    return (
      <div ref={cardRef} onClick={onClick} onDoubleClick={onDoubleClick}
        onContextMenu={onRightClick ? (e) => { e.preventDefault(); onRightClick(e, app); } : undefined}
        style={focused
          ? { ...glass, border: `1px solid ${accent.glow}0.6)`, borderRadius: 16, cursor: "pointer", overflow: "hidden", position: "relative", aspectRatio: "2/3", transition: "all 0.15s ease", boxShadow: `0 0 0 1px ${accent.glow}0.3), 0 0 40px ${accent.glow}0.2)`, transform: "scale(1.04)" }
          : { ...glass, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, cursor: "pointer", overflow: "hidden", position: "relative", aspectRatio: "2/3", transition: "all 0.15s ease" }
        }
      >
        {art
          ? <img src={art} alt={app.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: `${accent.glow}0.08)` }}><AppIcon app={app} size={48} /></div>
        }
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 12px 12px", background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "white", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.name}</span>
        </div>
        <PinBadge isPinned={isPinned} />
        {focused && <div style={{ position: "absolute", inset: 0, border: `2px solid ${accent.glow}0.6)`, borderRadius: 16, pointerEvents: "none" }} />}
      </div>
    );
  };

  // ── Virtual Keyboard ──────────────────────────────────────────
  const VirtualKeyboard = () => {
    const layout     = kbNumMode ? KB_NUMS : KB_ALPHA;
    const rowOffsets = kbNumMode ? [0, 0, 0] : [0, 0.5, 1];
    return (
      <div style={{ ...glass, borderRadius: "20px 20px 0 0", padding: "12px 24px 16px", borderBottom: "none", borderColor: `${accent.glow}0.25)` }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
            color: accent.primary, background: `${accent.glow}0.12)`, borderRadius: 20,
            padding: "3px 14px", border: `1px solid ${accent.glow}0.25)` }}>
            {kbNumMode ? "Numbers & Symbols" : "Letters"}
          </div>
        </div>
        {layout.map((row, rIdx) => (
          <div key={rIdx} style={{ display: "flex", gap: 5, justifyContent: "center", marginBottom: 5, paddingLeft: `${rowOffsets[rIdx] * 26}px` }}>
            {row.map((key, cIdx) => {
              const isActive = kbRow === rIdx && kbCol === cIdx;
              return (
                <div key={key + cIdx} onClick={() => { fireKey(key); playSound(); }}
                  style={{
                    width: 46, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
                    borderRadius: 8, cursor: "pointer", transition: "all 0.1s ease",
                    fontFamily: "'Segoe UI', sans-serif", fontWeight: isActive ? 700 : 500,
                    fontSize: 14, userSelect: "none", flexShrink: 0,
                    background: isActive
                      ? `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`
                      : isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.8)",
                    color: isActive ? "white" : theme.text,
                    border: isActive
                      ? `1px solid ${accent.glow}0.7)`
                      : `1px solid ${isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)"}`,
                    boxShadow: isActive
                      ? `0 0 16px ${accent.glow}0.5), 0 4px 10px rgba(0,0,0,0.3)`
                      : isDark ? "none" : "0 1px 3px rgba(0,0,0,0.06)",
                    transform: isActive ? "scale(1.16)" : "scale(1)",
                  }}>
                  {key}
                </div>
              );
            })}
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 8, paddingTop: 8,
          borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}` }}>
          {[
            { bg: "#4a9c4a", label: "A",  desc: "Type",       circle: true },
            { bg: "#3a5a8a", label: "X",  desc: "Delete",     circle: true },
            { bg: "#9a7020", label: "Y",  desc: "Space",      circle: true },
            { bg: "#b03030", label: "B",  desc: "Results",    circle: true },
            { bg: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.18)", label: "RT", desc: kbNumMode ? "→ ABC" : "→ 123", circle: false },
            { bg: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.18)", label: "⊞",  desc: "Results",    circle: false },
          ].map(({ bg, label, desc, circle }) => (
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
    );
  };
  // ─────────────────────────────────────────────────────────────

  const batteryColor = charging ? "#4ae88a" : battery > 20 ? accent.primary : "#e84a4a";
  const batteryWidth = battery > 0 ? `${battery}%` : "72%";


  // ── Home-tab-specific derived data (no dependency on `tab`) ──
  const homeFilteredRecent = useMemo(() => recent.filter(a => true).slice(0, 8), [recent]);
  const homePinnedApps     = useMemo(() => pins.map(id => apps.find(a => a.id === id)).filter(Boolean), [pins, apps]);

  // ── Home screen content ──
  const homeContent = (() => {
    const heroIdx  = heroIndex;
    const focusSec = focusSection;
    const focusIdx = focusIndex;
    const heroGame   = recentGames[heroIdx];
    const heroArt    = heroGame ? (customArt[heroGame.id] || gameArt[heroGame.id]) : null;
    const resolveHeroType = (id) => {
      if (settings.animated_heroes === "static")   return "static";
      if (settings.animated_heroes === "animated") return "animated";
      return heroCustomType[id] || "static";
    };
    const heroBanner = heroGame
      ? (resolveHeroType(heroGame.id) === "animated"
          ? (heroAnimated[heroGame.id] || heroStatic[heroGame.id])
          : heroStatic[heroGame.id])
      : null;
    const heroFocused = focusSec === "hero";

    return (
      <div style={{ display: "flex", flexDirection: "column", padding: "14px 24px 0", maxWidth: 1400, margin: "0 auto", width: "100%", boxSizing: "border-box", minHeight: "100%" }}>
        {/* ── HERO ── */}
        <div style={{ position: "relative", height: "clamp(280px, 44vh, 460px)", borderRadius: 20, overflow: "hidden", display: "flex", flexDirection: "column", flexShrink: 0,
          border: heroFocused ? `1px solid ${accent.glow}0.5)` : `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
          boxShadow: heroFocused ? `0 0 0 1px ${accent.glow}0.2), 0 8px 40px ${accent.glow}0.15)` : "0 4px 24px rgba(0,0,0,0.15)",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          background: isDark ? "#0a0502" : appBg,
        }}>
          <div style={{ position: "absolute", inset: 0, zIndex: 0, borderRadius: 20, overflow: "hidden" }}>
            {recentGames.map((game, idx) => {
              const isActive = idx === heroIdx;
              const isNearby = Math.abs(idx - heroIdx) <= 1;

              const staticBanner = customHeroArt[game.id] || heroStatic[game.id];
              const fallback = customArt[game.id] || gameArt[game.id];
              const animatedUrl = resolveHeroType(game.id) === "animated"
                ? heroAnimated[game.id] : null;
              const showVideo = animatedUrl && animatedUrl.endsWith(".webm");

              const coverStyle = { width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" };
              return (
                <div key={game.id} style={{ position: "absolute", inset: 0, opacity: isActive ? 1 : 0.001, transition: "opacity 0.35s ease", zIndex: isActive ? 1 : 0, pointerEvents: isActive ? "auto" : "none" }}>
                  {/* Base layer: render images only for active ±1 to reduce GPU texture pressure */}
                  {isNearby
                    ? (staticBanner
                        ? <img src={staticBanner} alt="" decoding="async" loading="eager" fetchPriority={isActive ? "high" : "low"} style={{ ...coverStyle, transform: "translateZ(0)" }} />
                        : fallback
                          ? <img src={fallback} alt="" decoding="async" loading="eager" style={{ ...coverStyle, filter: `blur(18px) brightness(${isDark ? "0.42" : "0.92"}) saturate(${isDark ? "1.3" : "0.9"})`, transform: "scale(1.08)" }} />
                          : <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${accent.glow}0.25) 0%, ${accent.glow}0.06) 100%)` }} />)
                    : <div style={{ width: "100%", height: "100%" }} />
                  }
                  {/* Video layer: always in DOM; only active hero preloads */}
                  {showVideo && (
                    <video
                      ref={el => { if (el) heroVideoRefs.current[game.id] = el; else delete heroVideoRefs.current[game.id]; }}
                      src={animatedUrl}
                      loop muted playsInline preload={idx === heroIdx ? "auto" : "none"}
                      style={{
                        position: "absolute",
                        top: 0, left: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "center top",
                        transform: "translateZ(0)",
                        willChange: "opacity",
                      }}
                    />
                  )}
                </div>
              );
            })}
            <div style={{ position: "absolute", inset: 0, zIndex: 2, background: heroBanner
              ? (isDark
                  ? "linear-gradient(to right, rgba(6,3,1,0.82) 0%, rgba(6,3,1,0.55) 45%, rgba(6,3,1,0.18) 100%)"
                  : `linear-gradient(to right, ${appBg}dd 0%, ${appBg}99 45%, ${appBg}22 100%)`)
              : (isDark
                  ? "linear-gradient(to right, rgba(8,4,2,0.88) 0%, rgba(8,4,2,0.5) 50%, rgba(8,4,2,0.2) 100%)"
                  : `linear-gradient(to right, ${appBg}ee 0%, ${appBg}99 50%, transparent 100%)`)
            }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "55%", zIndex: 2, background: isDark
              ? "linear-gradient(to bottom, transparent, rgba(6,3,1,0.95))"
              : `linear-gradient(to bottom, transparent, ${appBg})`
            }} />
          </div>

          {/* Pinned bar */}
          <div style={{ position: "relative", zIndex: 2, padding: "16px 20px 0", flexShrink: 0 }}>
            {homePinnedApps.length > 0 ? (
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingTop: 4, paddingBottom: 4 }}>
                {homePinnedApps.map((app, i) => {
                  const focused = focusSec === "pinned" && focusIdx === i;
                  const art = app.app_type === "game" ? (customArt[app.id] || gameArt[app.id]) : null;
                  return (
                    <div key={app.id} ref={focused ? focusedCardRef : null}
                      onClick={() => { setFocusSection("pinned"); focusSectionRef.current = "pinned"; setFocusIndex(i); focusIndexRef.current = i; }}
                      onDoubleClick={() => triggerLaunch(app, recentRef.current)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "7px 12px",
                        flexShrink: 0, cursor: "pointer", borderRadius: 10, transition: "all 0.15s ease",
                        background: focused ? accent.primary : "rgba(8,4,2,0.55)",
                        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
                        border: `1px solid ${focused ? accent.primary : "rgba(255,255,255,0.14)"}`,
                        boxShadow: focused ? `0 2px 12px ${accent.glow}0.6)` : "none",
                      }}>
                      {art
                        ? <img src={art} alt={app.name} style={{ width: 24, height: 24, borderRadius: 4, objectFit: "cover" }} />
                        : <AppIcon app={app} size={24} />}
                      <div style={{ fontSize: 12, fontWeight: 500, color: focused ? "white" : "rgba(245,237,232,0.88)", whiteSpace: "nowrap", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis" }}>{app.name}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: 10, color: "rgba(245,237,232,0.25)", letterSpacing: "0.1em" }}>Pin apps with X to show them here</div>
            )}
          </div>

          {/* Hero content */}
          <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", alignItems: "flex-end", padding: "0 20px 20px" }}>
            <div style={{ flexShrink: 0, width: "clamp(80px, 10vw, 150px)", aspectRatio: "2/3", marginRight: 20 }}>
              {heroArt
                ? <img key={heroGame?.id} src={heroArt} alt={heroGame?.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.7)", animation: "heroArtFade 0.3s ease forwards" }} />
                : heroGame
                  ? <div style={{ width: "100%", height: "100%", borderRadius: 10, background: `${accent.glow}0.15)`, border: `1px solid ${accent.glow}0.3)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, fontWeight: 700, color: accent.primary }}>{heroGame.name.charAt(0).toUpperCase()}</div>
                  : <div style={{ width: "100%", height: "100%", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
              }
            </div>
            {heroGame ? (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: accent.primary, marginBottom: 6, fontWeight: 600 }}>
                  {heroIdx === 0 ? "▶ Resume playing" : "▶ Recently played"}
                </div>
                <div style={{ fontSize: "clamp(22px, 3.2vw, 48px)", fontWeight: 700, color: theme.text, marginBottom: 4, lineHeight: 1.05, textShadow: isDark ? "0 2px 20px rgba(0,0,0,0.8)" : "none" }}>{heroGame.name}</div>
                <div style={{ fontSize: 11, color: theme.textDim, marginBottom: 16 }}>Game</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div onClick={() => triggerLaunch(heroGame, recentRef.current)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 24px", borderRadius: 10, cursor: "pointer", transition: "all 0.15s ease", fontWeight: 600, fontSize: 14,
                      background: heroFocused ? accent.primary : isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.07)",
                      color: heroFocused ? "white" : theme.text,
                      border: `1px solid ${heroFocused ? accent.primary : isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)"}`,
                      backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                      boxShadow: heroFocused ? `0 4px 24px ${accent.glow}0.5)` : "none",
                    }}>
                    <svg width="11" height="11" viewBox="0 0 10 10" fill="currentColor"><path d="M2 1.5l7 3.5-7 3.5z"/></svg>
                    Launch
                  </div>
                  {recentGames.length > 1 && (
                    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                      {recentGames.slice(0, 6).map((_, i) => (
                        <div key={i} onClick={() => { setHeroIndex(i); heroIndexRef.current = i; }}
                          style={{ width: i === heroIdx ? 20 : 6, height: 6, borderRadius: 3, cursor: "pointer", transition: "all 0.2s ease",
                            background: i === heroIdx ? accent.primary : isDark ? "rgba(245,237,232,0.25)" : "rgba(0,0,0,0.2)" }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 14, color: theme.textFaint }}>Launch a game to see it here</div>
            )}
          </div>
          {heroFocused && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, ${accent.primary}, ${accent.glow}0))`, pointerEvents: "none", zIndex: 3 }} />}
        </div>

        {/* ── RECENTS ── */}
        <div style={{ paddingTop: 0 }}>
          <div style={{ paddingTop: 14 }} />
          {homeFilteredRecent.length === 0 ? (
            <div style={{ fontSize: 13, color: theme.textFaint, paddingBottom: 100 }}>Nothing here yet — launch something!</div>
          ) : (
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 100, paddingTop: 8, marginTop: -8, paddingLeft: 6, paddingRight: 6 }}>
              {homeFilteredRecent.map((app, i) => {
                const focused = focusSec === "recent" && focusIdx === i;
                const isPinned = pins.includes(app.id);
                const art = app.app_type === "game" ? (customArt[app.id] || gameArt[app.id]) : (customArt[app.id] || null);
                const fullApp = allAppsRef.current.find(a => a.id === app.id) || app;
                const CARD_W = "clamp(76px, 10vw, 110px)";
                const CARD_H = "clamp(114px, 15vw, 165px)";
                if (app.app_type === "game") {
                  return (
                    <div key={app.id} ref={focused ? focusedCardRef : null}
                      onClick={() => { setFocusSection("recent"); focusSectionRef.current = "recent"; setFocusIndex(i); focusIndexRef.current = i; }}
                      onDoubleClick={() => triggerLaunch(app, recentRef.current)}
                      style={{ flexShrink: 0, width: CARD_W, height: CARD_H, borderRadius: 12, overflow: "hidden", cursor: "pointer", position: "relative", transition: "all 0.15s ease",
                        border: `1px solid ${focused ? accent.glow + "0.6)" : "rgba(255,255,255,0.08)"}`,
                        boxShadow: focused ? `0 0 0 1px ${accent.glow}0.3), 0 0 24px ${accent.glow}0.2)` : "none",
                        transform: focused ? "scale(1.05) translateY(-3px)" : "scale(1)" }}>
                      {art
                        ? <img src={art} alt={app.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <div style={{ width: "100%", height: "100%", background: `${accent.glow}0.08)`, display: "flex", alignItems: "center", justifyContent: "center" }}><AppIcon app={fullApp} size={36} /></div>
                      }
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 8px 7px", background: "linear-gradient(transparent, rgba(0,0,0,0.85))" }}>
                        <div style={{ fontSize: 9, fontWeight: 600, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.name}</div>
                      </div>
                      <PinBadge isPinned={isPinned} small />
                      {focused && <div style={{ position: "absolute", inset: 0, border: `2px solid ${accent.glow}0.6)`, borderRadius: 12, pointerEvents: "none" }} />}
                    </div>
                  );
                }
                const color = iconColors[app.id];
                const tintBg = color ? `rgba(${color.r},${color.g},${color.b},0.18)` : glass.background;
                const tintBorder = color ? `rgba(${color.r},${color.g},${color.b},0.18)` : "rgba(255,255,255,0.08)";
                if (art) {
                  return (
                    <div key={app.id} ref={focused ? focusedCardRef : null}
                      onClick={() => { setFocusSection("recent"); focusSectionRef.current = "recent"; setFocusIndex(i); focusIndexRef.current = i; }}
                      onDoubleClick={() => triggerLaunch(app, recentRef.current)}
                      style={{ flexShrink: 0, width: CARD_W, height: CARD_H, borderRadius: 12, overflow: "hidden", cursor: "pointer", position: "relative", transition: "all 0.15s ease",
                        border: `1px solid ${focused ? accent.glow + "0.6)" : "rgba(255,255,255,0.08)"}`,
                        boxShadow: focused ? `0 0 0 1px ${accent.glow}0.3), 0 0 24px ${accent.glow}0.2)` : "none",
                        transform: focused ? "scale(1.05) translateY(-3px)" : "scale(1)" }}>
                      <img src={art} alt={app.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 8px 7px", background: "linear-gradient(transparent, rgba(0,0,0,0.85))" }}>
                        <div style={{ fontSize: 9, fontWeight: 600, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.name}</div>
                      </div>
                      <PinBadge isPinned={isPinned} small />
                      {focused && <div style={{ position: "absolute", inset: 0, border: `2px solid ${accent.glow}0.6)`, borderRadius: 12, pointerEvents: "none" }} />}
                    </div>
                  );
                }
                return (
                  <div key={app.id} ref={focused ? focusedCardRef : null}
                    onClick={() => { setFocusSection("recent"); focusSectionRef.current = "recent"; setFocusIndex(i); focusIndexRef.current = i; }}
                    onDoubleClick={() => triggerLaunch(app, recentRef.current)}
                    style={{ ...glass, background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.52)", backdropFilter: isDark ? "blur(16px)" : "blur(28px)", WebkitBackdropFilter: isDark ? "blur(16px)" : "blur(28px)",
                      border: focused ? `1px solid ${accent.glow}0.6)` : `1px solid ${tintBorder}`,
                      flexShrink: 0, borderRadius: 12, cursor: "pointer", transition: "all 0.15s ease",
                      width: CARD_W, height: CARD_H, boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 6px", position: "relative",
                      ...(focused ? { background: isDark ? `${accent.glow}0.1)` : `${accent.glow}0.07)`, boxShadow: `0 0 0 1px ${accent.glow}0.3), 0 0 20px ${accent.glow}0.1)`, transform: "scale(1.05) translateY(-3px)" } : {}) }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", position: "relative", zIndex: 1 }}>
                      <AppIcon app={fullApp} size={40} />
                      <div style={{ fontSize: 8, fontWeight: 500, color: theme.textDim, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{app.name}</div>
                    </div>
                    <PinBadge isPinned={isPinned} small />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  })();


    if (loading) return <SplashScreen exiting={splashExiting} />;

  const RocketLogo = () => (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
      <path d="M16 2 L21 9 L22 19 Q22 22 19 22 L13 22 Q10 22 10 19 L11 9 Z" fill="url(#rocketGrad)"/>
      <circle cx="16" cy="13" r="3.5" fill="white" opacity="0.9"/>
      <circle cx="16" cy="13" r="2" fill="#bde0ff" opacity="0.7"/>
      <circle cx="17" cy="12" r="0.7" fill="white"/>
      <path d="M10 18 L5 25 L11 21 Z" fill={accent.dark}/>
      <path d="M22 18 L27 25 L21 21 Z" fill={accent.dark}/>
      <path d="M12 22 Q14 30 16 27 Q18 30 20 22" fill="#ffb347" opacity="0.95"/>
      <path d="M13.5 22 Q15 28 16 26 Q17 28 18.5 22" fill="#fff176" opacity="0.75"/>
      <defs>
        <linearGradient id="rocketGrad" x1="16" y1="2" x2="16" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={accent.light}/><stop offset="100%" stopColor={accent.dark}/>
        </linearGradient>
      </defs>
    </svg>
  );

  const SettingsScreen = () => (
    <div style={{ padding: "14px 24px 160px", maxWidth: 1400, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      {SETTINGS_ITEMS.map((item) => {
        if (item.type === "divider") return <div key={item.key} style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: theme.textFaint, padding: "22px 4px 10px" }}>{item.label}</div>;
        const navIdx  = navigableSettings.findIndex(n => n.key === item.key);
        const focused = settingsFocusIndex === navIdx;
        const rowStyle = {
          ...glass, borderRadius: 14, padding: "14px 20px", marginBottom: 8,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer", transition: "all 0.15s ease",
          ...(focused ? { border: `1px solid ${accent.glow}0.6)`, boxShadow: `0 0 0 1px ${accent.glow}0.3), 0 0 20px ${accent.glow}0.1)`, background: isDark ? `${accent.glow}0.08)` : `${accent.glow}0.05)` } : { border: "1px solid rgba(255,255,255,0.06)" }),
        };
        const rowRef = focused ? settingsFocusedRef : null;
        if (item.type === "info") return <div key={item.key} ref={rowRef} style={{ ...rowStyle, justifyContent: "center", cursor: "default" }}><span style={{ fontSize: 13, color: theme.textDim }}>{item.label}</span></div>;
        if (item.type === "toggle") {
          const val = settings[item.key];
          return (
            <div key={item.key} ref={rowRef} style={rowStyle} onClick={() => updateSetting(item.key, !val)}>
              <span style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{item.label}</span>
              <div style={{ width: 44, height: 24, borderRadius: 12, background: val ? accent.primary : (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"), position: "relative", transition: "background 0.2s ease", flexShrink: 0 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute", top: 3, left: val ? 23 : 3, transition: "left 0.2s ease", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
              </div>
            </div>
          );
        }
        if (item.type === "cycle") {
          const opts = item.options;
          const cur = opts.indexOf(settings[item.key]);
          return (
            <div key={item.key} ref={rowRef} style={rowStyle}>
              <span style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{item.label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, color: theme.textDim, cursor: "pointer", userSelect: "none" }}
                  onClick={() => updateSetting(item.key, opts[(cur - 1 + opts.length) % opts.length])}>◀</span>
                <span style={{ fontSize: 12, color: accent.primary, fontWeight: 600, textTransform: "capitalize" }}>{settings[item.key]}</span>
                <span style={{ fontSize: 10, color: theme.textDim, cursor: "pointer", userSelect: "none" }}
                  onClick={() => updateSetting(item.key, opts[(cur + 1) % opts.length])}>▶</span>
              </div>
            </div>
          );
        }
        if (item.type === "accent") {
          const accentKeys = Object.keys(ACCENTS);
          const curIdx = accentKeys.indexOf(settings.accent);
          return (
            <div key={item.key} ref={rowRef} style={rowStyle}>
              <span style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{item.label}</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: theme.textDim, cursor: "pointer", userSelect: "none" }}
                  onClick={() => updateSetting("accent", accentKeys[(curIdx - 1 + accentKeys.length) % accentKeys.length])}>◀</span>
                {Object.entries(ACCENTS).map(([name, a]) => (
                  <div key={name} onClick={() => updateSetting("accent", name)}
                    style={{ width: 20, height: 20, borderRadius: "50%", background: a.primary, border: settings.accent === name ? "2px solid white" : "2px solid transparent", boxShadow: settings.accent === name ? `0 0 8px ${a.glow}0.8)` : "none", cursor: "pointer", transition: "all 0.15s ease" }} />
                ))}
                <span style={{ fontSize: 10, color: theme.textDim, cursor: "pointer", userSelect: "none" }}
                  onClick={() => updateSetting("accent", accentKeys[(curIdx + 1) % accentKeys.length])}>▶</span>
              </div>
            </div>
          );
        }
        if (item.type === "refresh") {
          const statusText  = libraryRefreshStatus === "scanning" ? "Scanning..."
                            : libraryRefreshStatus === "done"     ? "✓ Done"
                            : "↵ Refresh";
          const statusColor = libraryRefreshStatus === "done" ? "#4ae88a"
                            : theme.textDim;
          return (
            <div key={item.key} ref={rowRef} style={rowStyle} onClick={refreshLibrary}>
              <span style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{item.label}</span>
              <span style={{ fontSize: 12, color: statusColor }}>{statusText}</span>
            </div>
          );
        }
        if (item.type === "slider") {
          const val = settings[item.key] ?? 1.0;
          const displayVal = sliderDraft !== null ? sliderDraft : val;
          const pct = `${Math.round(displayVal * 100)}%`;
          const trackPct = ((displayVal - item.min) / (item.max - item.min)) * 100;
          const isDragging = sliderDraft !== null;

          const handleTrackMouseDown = (e) => {
            e.preventDefault();
            const rect = sliderTrackRef.current.getBoundingClientRect();
            const clamp = (v) => Math.round(Math.max(item.min, Math.min(item.max, v)) * 100) / 100;
            const snap = (v) => Math.round(v / item.step) * item.step;
            const calcVal = (clientX) => clamp(snap(item.min + ((clientX - rect.left) / rect.width) * (item.max - item.min)));
            const initial = calcVal(e.clientX);
            sliderDraftRef.current = initial;
            setSliderDraft(initial);
            const onMove = (me) => {
              const v = calcVal(me.clientX);
              sliderDraftRef.current = v;
              setSliderDraft(v);
            };
            const onUp = () => {
              updateSetting(item.key, sliderDraftRef.current);
              sliderDraftRef.current = null;
              setSliderDraft(null);
              window.removeEventListener("mousemove", onMove);
              window.removeEventListener("mouseup", onUp);
            };
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
          };

          return (
            <div key={item.key} ref={rowRef} style={rowStyle}>
              <span style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{item.label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, color: focused ? accent.primary : theme.textDim, cursor: "pointer", userSelect: "none" }}
                  onClick={() => updateSetting(item.key, Math.max(item.min, Math.round((val - item.step) * 100) / 100))}>◀</span>
                <div ref={sliderTrackRef} onMouseDown={handleTrackMouseDown}
                  style={{ width: 140, height: 4, borderRadius: 2, background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)", position: "relative", flexShrink: 0, cursor: "pointer" }}>
                  <div style={{ height: "100%", borderRadius: 2, background: accent.primary, width: `${trackPct}%`, transition: isDragging ? "none" : "width 0.08s ease" }} />
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: accent.primary, position: "absolute", top: -5, left: `calc(${trackPct}% - 7px)`, transition: isDragging ? "none" : "left 0.08s ease", boxShadow: `0 0 8px ${accent.glow}0.6)` }} />
                </div>
                <span style={{ fontSize: 11, color: focused ? accent.primary : theme.textDim, cursor: "pointer", userSelect: "none" }}
                  onClick={() => updateSetting(item.key, Math.min(item.max, Math.round((val + item.step) * 100) / 100))}>▶</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: accent.primary, minWidth: 40, textAlign: "right" }}>{pct}</span>
              </div>
            </div>
          );
        }
        if (item.type === "action") return (
          <div key={item.key} ref={rowRef} style={rowStyle} onClick={() => {
            if (item.key === "clear_recents") invoke("clear_recents").then(() => { setRecent([]); recentRef.current = []; });
            if (item.key === "clear_cache")   handleClearCache();
            if (item.key === "reset_scale")   updateSetting("ui_scale", autoScaleRef.current);
          }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: item.key === "reset_scale" ? theme.text : "#e84a4a" }}>{item.label}</span>
            <span style={{ fontSize: 12, color: theme.textDim }}>{item.key === "reset_scale" ? "↵ Apply" : "↵ Confirm"}</span>
          </div>
        );
        if (item.type === "update") {
          const statusText = updateStatus === "checking"   ? "Checking..."
                           : updateStatus === "up_to_date" ? "✓ Up to date"
                           : updateStatus === "available"  ? `↓ v${updateInfo} available`
                           : updateStatus === "error"      ? "⚠ Check failed"
                           : "↵ Check";
          const statusColor = updateStatus === "up_to_date" ? "#4ae88a"
                            : updateStatus === "available"  ? accent.primary
                            : updateStatus === "error"      ? "#e84a4a"
                            : theme.textDim;
          return (
            <div key={item.key} ref={rowRef} style={rowStyle} onClick={() => {
              if (updateStatus === "available") invoke("launch_app", { path: `https://github.com/${GITHUB_REPO}/releases/latest`, id: "releases", name: "LiftOff Releases", appType: "app" }).catch(() => {});
              else checkForUpdates();
            }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{item.label}</span>
              <span style={{ fontSize: 12, color: statusColor, fontWeight: updateStatus === "available" ? 600 : 400 }}>{statusText}</span>
            </div>
          );
        }
        if (item.type === "link") return (
          <div key={item.key} ref={rowRef} style={rowStyle}>
            <span style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{item.label}</span>
            <span style={{ fontSize: 12, color: theme.textDim }}>↵ Open</span>
          </div>
        );
        if (item.type === "attribution") return (
          <div key={item.key} ref={rowRef} style={rowStyle}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: theme.text }}>{item.label}</span>
              <span style={{ fontSize: 11, color: theme.textDim }}>by {item.author} · {item.license}</span>
            </div>
            <span style={{ fontSize: 12, color: theme.textDim }}>↵ Open</span>
          </div>
        );
        if (item.type === "controller_test") return (
          <div key={item.key} style={{ ...glass, borderRadius: 14, padding: "14px 20px", marginBottom: 8, border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` }}>
            <ControllerTestWidget accent={accent} theme={theme} isDark={isDark} glass={glass} />
          </div>
        );
        return null;
      })}
    </div>
  );

  // ── Hide/Show Modal ───────────────────────────────────────────
  // NOTE: HideModal is defined outside App (above) to prevent re-mounting on every App re-render
  // ─────────────────────────────────────────────────────────────

  const Btn = ({ color, label }) => (
    <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: theme.textDim }}>
      <span style={{ width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "white", background: color, flexShrink: 0 }}>{label[0]}</span>
      {label.slice(1)}
    </span>
  );

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: `${100 / (settings.ui_scale ?? 1)}vw`, height: `${100 / (settings.ui_scale ?? 1)}vh`, transform: `scale(${settings.ui_scale ?? 1})`, transformOrigin: "top left", overflowY: "auto", overflowX: "hidden", animation: "appFadeIn 0.5s ease forwards", zIndex: 1 }} ref={outerRef}>

      <div style={{ position: "fixed", inset: 0, background: appBg, zIndex: -2 }} />
      {isDark && settings.stars_enabled && (
        <div id="star-container" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }} />
      )}
      {!isDark && settings.stars_enabled && (
        <div id="cloud-container" style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none", overflow: "hidden" }} />
      )}
      {launchingApp && <LaunchOverlay app={launchingApp} gameArt={gameArt} customArt={customArt} accent={accent} onDone={() => setLaunchingApp(null)} />}
      {artPickerApp && (
        <SgdbBrowserModal
          app={artPickerApp}
          currentArt={artPickerMode === "hero"
            ? (customHeroArt[artPickerApp.id] || heroStatic[artPickerApp.id])
            : (customArt[artPickerApp.id] || gameArt[artPickerApp.id])}
          hasCustomArt={artPickerMode === "hero" ? !!customHeroArt[artPickerApp.id] : !!customArt[artPickerApp.id]}
          artType={artPickerMode}
          cropMode={artPickerMode === "hero" ? "hero" : artPickerApp?.app_type === "game" ? "portrait" : "square"}
          repeatSpeed={settings.repeat_speed}
          accent={accent} theme={theme} isDark={isDark} glass={glass}
          onClose={closeArtPicker}
          onSet={(id, result) => {
            if (typeof result === "string" && result.startsWith("data:")) {
              if (artPickerModeRef.current === "hero") {
                const next = { ...customHeroArtRef.current, [id]: result };
                setCustomHeroArt(next); customHeroArtRef.current = next;
                setHeroCustomType(prev => {
                  const next2 = { ...prev, [id]: "static" };
                  try { localStorage.setItem("liftoff_heroCustomType", JSON.stringify(next2)); } catch {}
                  return next2;
                });
                if (settings.animated_heroes !== "custom") updateSetting("animated_heroes", "custom");
              } else {
                const next = { ...customArtRef.current, [id]: result };
                setCustomArt(next); customArtRef.current = next;
              }
            } else {
              const url = convertFileSrc(result);
              if (artPickerModeRef.current === "hero") {
                const lower = result.toLowerCase();
                const isAnim = lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".gif");
                if (isAnim) setHeroAnimated(prev => ({ ...prev, [id]: url }));
                else        setHeroStatic(prev => ({ ...prev, [id]: url }));
                const heroType = isAnim ? "animated" : "static";
                setHeroCustomType(prev => {
                  const next = { ...prev, [id]: heroType };
                  try { localStorage.setItem("liftoff_heroCustomType", JSON.stringify(next)); } catch {}
                  return next;
                });
                if (settings.animated_heroes !== "custom") updateSetting("animated_heroes", "custom");
              } else {
                setGameArt(prev => ({ ...prev, [id]: url }));
              }
            }
          }}
          onReset={(id) => {
            if (artPickerModeRef.current === "hero") {
              const next = { ...customHeroArtRef.current }; delete next[id];
              setCustomHeroArt(next); customHeroArtRef.current = next;
            } else {
              const next = { ...customArtRef.current }; delete next[id];
              setCustomArt(next); customArtRef.current = next;
            }
          }}
        />
      )}
      {showHideModal && <HideModal key="hide-modal" tab={tab} appsRef={appsRef} hiddenRef={hiddenRef} allAppsRef={allAppsRef} closeHideModal={closeHideModal} toggleHidden={toggleHidden} glass={glass} accent={accent} isDark={isDark} theme={theme} />}
      {libraryRefreshStatus === "scanning" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center",
          background: isDark ? "rgba(10,5,2,0.75)" : "rgba(240,230,220,0.75)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
          <div style={{ ...glass, borderRadius: 20, padding: "32px 48px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
            border: `1px solid ${accent.glow}0.25)`, boxShadow: `0 8px 40px rgba(0,0,0,0.3)` }}>
            <div className="splash-dots" style={{ opacity: 1 }}>
              <div className="splash-dot" /><div className="splash-dot" /><div className="splash-dot" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>Refreshing library…</span>
            <span style={{ fontSize: 12, color: theme.textDim }}>Scanning for apps and games</span>
          </div>
        </div>
      )}
      <div style={{ position: "fixed", top: "-80%", left: "-80%", width: "180%", height: "180%", borderRadius: "50%", background: `radial-gradient(circle, ${bgGlow1} 0%, transparent 55%)`, pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-80%", right: "-80%", width: "180%", height: "180%", borderRadius: "50%", background: `radial-gradient(circle, ${bgGlow2} 0%, transparent 55%)`, pointerEvents: "none", zIndex: 0 }} />
      {/* ══════════════ SEARCH OVERLAY ══════════════ */}
      {searchOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 7000,
          background: isDark ? "rgba(10,5,2,0.95)" : "rgba(240,230,220,0.95)",
          backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
          display: "flex", flexDirection: "column",
          fontFamily: "'Segoe UI', sans-serif",
          animation: "appFadeIn 0.18s ease forwards",
        }}>
          {/* Search bar */}
          <div style={{ padding: "18px 24px 10px", flexShrink: 0 }}>
            <div style={{ ...glass, borderRadius: 16, padding: "12px 20px", display: "flex", alignItems: "center", gap: 14,
              ...(searchMode === "keyboard" ? { borderColor: `${accent.glow}0.45)`, boxShadow: `0 0 0 1px ${accent.glow}0.2)` } : {}) }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
                <circle cx="8.5" cy="8.5" r="5.5" stroke={theme.text} strokeWidth="1.8"/>
                <path d="M13 13l3.5 3.5" stroke={theme.text} strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <div style={{ flex: 1, fontSize: 20, fontWeight: 500, minWidth: 0, overflow: "hidden",
                whiteSpace: "nowrap", textOverflow: "ellipsis",
                color: searchQuery ? theme.text : theme.textFaint }}>
                {searchQuery || "Search games & apps…"}
                {searchMode === "keyboard" && (
                  <span className="kb-cursor" style={{ display: "inline-block", width: 2, height: "0.9em",
                    background: accent.primary, marginLeft: 1, verticalAlign: "text-bottom", borderRadius: 1 }} />
                )}
              </div>
              {searchQuery && (
                <div onClick={() => { setSearchQuery(""); searchQueryRef.current = ""; setSearchFocusIndex(0); searchFocusIndexRef.current = 0; }}
                  style={{ fontSize: 12, color: theme.textDim, cursor: "pointer", padding: "3px 10px", borderRadius: 6, flexShrink: 0,
                    background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}>
                  Clear
                </div>
              )}
              <div style={{ fontSize: 11, fontWeight: 600, color: accent.primary, padding: "3px 10px",
                borderRadius: 20, flexShrink: 0, background: `${accent.glow}0.12)`,
                border: `1px solid ${accent.glow}0.25)` }}>
                {searchMode === "keyboard" ? "Typing" : searchMode === "results" ? "Browsing" : "Idle"}
              </div>
              <div onClick={closeSearch}
                style={{ fontSize: 12, color: theme.textDim, cursor: "pointer", padding: "3px 10px", borderRadius: 6, flexShrink: 0,
                  background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}` }}>
                Close
              </div>
            </div>
          </div>

          {/* Results area */}
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "0 24px 12px" }}>
            {searchResults.length > 0 && (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase",
                  color: theme.textFaint, padding: "4px 4px 10px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span>{searchResults.length} result{searchResults.length !== 1 ? "s" : ""}</span>
                  {searchMode === "keyboard" && (
                    <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", fontSize: 11, color: theme.textFaint }}>
                      — <strong style={{ color: theme.textDim }}>⊞ Start</strong> to browse
                    </span>
                  )}
                  {searchMode === "idle" && (
                    <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", fontSize: 11, color: theme.textFaint }}>
                      — <strong style={{ color: theme.textDim }}>Y</strong> to type · <strong style={{ color: theme.textDim }}>⊞</strong> to browse
                    </span>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, gap: 10 }}>
                  {searchResults.map((app, i) => {
                    const focused = searchMode === "results" && searchFocusIndex === i;
                    const isPinned = pins.includes(app.id);
                    if (app.app_type === "game") {
                      return (
                        <GameCard key={app.id} app={app} focused={focused} isPinned={isPinned}
                          cardRef={focused ? searchFocusedCardRef : null}
                          onClick={() => { setSearchFocusIndex(i); searchFocusIndexRef.current = i; if (searchModeRef.current !== "results") switchSearchMode("results"); }}
                          onDoubleClick={() => { closeSearch(); triggerLaunch(app, recentRef.current); }}
                        />
                      );
                    }
                    return (
                      <div key={app.id} ref={focused ? searchFocusedCardRef : null}
                        onClick={() => { setSearchFocusIndex(i); searchFocusIndexRef.current = i; if (searchModeRef.current !== "results") switchSearchMode("results"); }}
                        onDoubleClick={() => { closeSearch(); triggerLaunch(app, recentRef.current); }}
                        style={{ ...glass, border: focused ? `1px solid ${accent.glow}0.6)` : "1px solid rgba(255,255,255,0.06)", borderRadius: 16, cursor: "pointer", transition: "all 0.15s ease", aspectRatio: "2/3", position: "relative", overflow: "hidden",
                          ...(focused ? { background: isDark ? `${accent.glow}0.12)` : `${accent.glow}0.08)`,
                            boxShadow: `0 0 0 1px ${accent.glow}0.3), 0 0 30px ${accent.glow}0.15)`,
                            transform: "scale(1.06)" } : {}) }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, height: "100%", padding: "12px 8px" }}>
                          <AppIcon app={app} size={40} />
                          <div style={{ fontSize: 10, fontWeight: 500, color: theme.textDim, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{app.name}</div>
                        </div>
                        <PinBadge isPinned={isPinned} small />
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {searchQuery.trim().length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, color: theme.textFaint }}>
                <svg width="36" height="36" viewBox="0 0 20 20" fill="none" style={{ opacity: 0.15 }}>
                  <circle cx="8.5" cy="8.5" r="5.5" stroke={theme.text} strokeWidth="1.3"/>
                  <path d="M13 13l3.5 3.5" stroke={theme.text} strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                <span style={{ fontSize: 13 }}>Start typing to search</span>
                {searchMode === "idle" && (
                  <span style={{ fontSize: 11, color: theme.textFaint }}>Press <strong style={{ color: theme.textDim }}>Y</strong> to bring the keyboard back</span>
                )}
              </div>
            )}
            {searchQuery.trim().length > 0 && searchResults.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, color: theme.textFaint }}>
                <span style={{ fontSize: 28 }}>¯\_(ツ)_/¯</span>
                <span style={{ fontSize: 13 }}>No results for "{searchQuery}"</span>
                {searchMode === "idle" && (
                  <span style={{ fontSize: 11, color: theme.textFaint }}>Press <strong style={{ color: theme.textDim }}>Y</strong> to keep typing</span>
                )}
              </div>
            )}

            {searchMode === "results" && (
              <div style={{ position: "sticky", bottom: 0, paddingTop: 8 }}>
                <div style={{ ...glass, borderRadius: 12, padding: "9px 20px", display: "flex", gap: 16, alignItems: "center" }}>
                  <Btn color="#4a9c4a" label="A Launch" />
                  <Btn color="#9a7020" label="Y Keyboard" />
                  <Btn color="#b03030" label="B Close" />
                  <span style={{ marginLeft: "auto", fontSize: 11, color: theme.textFaint }}>↑ from top → Keyboard</span>
                </div>
              </div>
            )}

            {searchMode === "idle" && (
              <div style={{ position: "sticky", bottom: 0, paddingTop: 8 }}>
                <div style={{ ...glass, borderRadius: 12, padding: "9px 20px", display: "flex", gap: 16, alignItems: "center" }}>
                  <Btn color="#9a7020" label="Y Keyboard" />
                  <Btn color="#b03030" label="B Close" />
                  {searchResults.length > 0 && <span style={{ fontSize: 11, color: theme.textFaint }}>⊞ Start → Browse</span>}
                </div>
              </div>
            )}
          </div>

          {searchMode === "keyboard" && (
            <div style={{ flexShrink: 0 }}>
              <VirtualKeyboard />
            </div>
          )}
        </div>
      )}
      {/* ══════════════ END SEARCH OVERLAY ══════════════ */}

      <div style={{ color: theme.text, fontFamily: "'Segoe UI', sans-serif", display: "flex", flexDirection: "column", minHeight: "100%", userSelect: "none", position: "relative", zIndex: 1, pointerEvents: showHideModal ? "none" : "auto" }}>

        {/* Topbar */}
        <div style={{ position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ ...glass, borderRadius: 16, padding: "10px 20px", display: "flex", alignItems: "center", gap: 16, maxWidth: 1400, margin: "14px auto 0", width: "calc(100% - 48px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <RocketLogo />
              <span key={`${settings.accent}-${settings.theme}`} style={{ fontWeight: 700, fontSize: 16, letterSpacing: "0.04em", background: `linear-gradient(135deg, ${accent.light}, ${accent.primary})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>LiftOff</span>
            </div>
            <div style={{ display: "flex", gap: 2, flex: 1, justifyContent: "center" }}>
              {TABS.map((t) => (
                <div key={t} onClick={() => switchTab(t)} style={{
                  fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
                  color: tab === t ? theme.text : theme.textDim, padding: "6px 16px", borderRadius: 8, cursor: "pointer",
                  border: `1px solid ${tab === t ? `${accent.glow}0.35)` : "transparent"}`,
                  background: tab === t ? `${accent.glow}0.15)` : "transparent",
                }}>{t}</div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: theme.textDim }}>{date}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? "rgba(245,237,232,0.7)" : "rgba(42,26,14,0.7)" }}>{time}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <div style={{ width: 22, height: 11, border: `1.5px solid ${isDark ? "rgba(245,237,232,0.3)" : "rgba(42,26,14,0.3)"}`, borderRadius: 3, padding: "1.5px", display: "flex", alignItems: "center" }}>
                    <div style={{ height: "100%", width: batteryWidth, background: batteryColor, borderRadius: 1, transition: "width 0.3s ease, background 0.3s ease" }} />
                  </div>
                  {charging && (
                    <svg width="8" height="11" viewBox="0 0 8 12" fill="none" style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }}>
                      <path d="M5 1L1 7h3l-1 4 4-6H4l1-4z" fill="#4ae88a" stroke="#4ae88a" strokeWidth="0.3" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span style={{ fontSize: 11, color: charging ? "#4ae88a" : theme.textDim }}>{battery > 0 ? `${battery}%` : "--"}</span>
              </div>
            </div>
          </div>
        </div>
        {/* Tab content area — Home always mounted; cover layer hides it when elsewhere;
             clouds sit above cover, below all tab UI. */}
        <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>

          {tab === "Settings" && (
            <div ref={tabScrollRef} style={{ position: "absolute", inset: 0, overflowY: "auto", zIndex: 2 }}>
              <SettingsScreen />
            </div>
          )}
          <div
            ref={homeScrollRef}
            style={{
              position: "absolute", inset: 0, overflowY: "auto",
              zIndex: 2,
              pointerEvents: tab === "Home" ? "auto" : "none",
              contentVisibility: tab === "Home" ? "visible" : "hidden",
            }}>
            {homeContent}
          </div>
          {(tab === "Games" || tab === "Apps") && (
            <div ref={tabScrollRef} style={{ position: "absolute", inset: 0, overflowY: "auto", zIndex: 2 }}>
            <div style={{ padding: "14px 24px 0", maxWidth: 1400, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>

            {/* ── SOURCE SUB-TABS (Games only) + MANAGE BUTTONS ── */}
            {(() => {
              const SOURCES = ["All", "Steam", "Xbox", "Bnet", "Other"];
              const subtabItems = tab === "Games"
                ? [...SOURCES, "manage"]
                : ["manage"];
              const manageIdx  = tab === "Games" ? SOURCES.length : 0;
              return (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 4 }}>
                  {tab === "Games" ? (
                    <div style={{ display: "flex", gap: 4 }}>
                      {SOURCES.map((src, i) => {
                        const active  = gameSourceTab === src;
                        return (
                          <div key={src} onClick={() => { setGameSourceTab(src); gameSourceTabRef.current = src; setFocusSection("subtabs"); focusSectionRef.current = "subtabs"; setSubtabFocusIndex(i); subtabFocusIndexRef.current = i; setFocusIndex(0); focusIndexRef.current = 0; }}
                            style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", padding: "5px 14px", borderRadius: 20, cursor: "pointer", transition: "all 0.15s ease",
                              background: active ? accent.primary : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"),
                              color: active ? "white" : theme.textDim,
                              border: `1px solid ${active ? accent.primary : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)")}`,
                              boxShadow: active ? `0 2px 10px ${accent.glow}0.35)` : "none",
                            }}>
                            {src}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div />
                  )}
                  <div onClick={() => { openHideModal(); setFocusSection("subtabs"); focusSectionRef.current = "subtabs"; setSubtabFocusIndex(manageIdx); subtabFocusIndexRef.current = manageIdx; }}
                    style={{ fontSize: 11, fontWeight: 600, padding: "5px 14px", borderRadius: 20, cursor: "pointer", transition: "all 0.15s ease",
                      color: theme.textDim, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                    }}>
                    Manage
                  </div>
                </div>
              );
            })()}

            {/* ── PINNED — same card size/style as main grid ── */}
            {pinnedAppsReactive.length > 0 && !(tab === "Games" && gameSourceTab !== "All") && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 0 10px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: theme.textFaint }}>Pinned</div>
                  <div style={{ fontSize: 10, color: theme.textFaint, opacity: 0.6 }}>X to unpin</div>
                </div>
                {tab === "Games" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12, paddingTop: 6, marginTop: -6, paddingBottom: 14 }}>
                    {pinnedAppsReactive.map((app, i) => {
                      const focused = focusSection === "pinned" && focusIndex === i;
                      const isPinned = true;
                      return <GameCard key={app.id} app={app} focused={focused} isPinned={isPinned}
                        cardRef={focused ? focusedCardRef : null}
                        onClick={() => { setFocusSection("pinned"); focusSectionRef.current = "pinned"; setFocusIndex(i); focusIndexRef.current = i; }}
                        onDoubleClick={() => triggerLaunch(app, recent)}
                        onRightClick={(e, a) => { setContextMenu({ x: e.clientX, y: e.clientY, app: a }); }} />;
                    })}
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, gap: 10, paddingTop: 6, marginTop: -6, paddingBottom: 14 }}>
                    {pinnedAppsReactive.map((app, i) => {
                      const focused = focusSection === "pinned" && focusIndex === i;
                      const color = iconColors[app.id];
                      const art = customArt[app.id];
                      const tintBg = color ? `rgba(${color.r},${color.g},${color.b},0.18)` : glass.background;
                      const tintBorder = color ? `rgba(${color.r},${color.g},${color.b},0.18)` : "rgba(255,255,255,0.08)";
                      return (
                        <div key={app.id} ref={focused ? focusedCardRef : null}
                          onClick={() => { setFocusSection("pinned"); focusSectionRef.current = "pinned"; setFocusIndex(i); focusIndexRef.current = i; }}
                          onDoubleClick={() => triggerLaunch(app, recent)}
                          onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, app }); }}
                          style={{ ...glass, background: art ? "transparent" : (isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.52)"), backdropFilter: isDark ? "blur(16px)" : "blur(28px)", WebkitBackdropFilter: isDark ? "blur(16px)" : "blur(28px)",
                            border: focused ? `1px solid ${accent.glow}0.6)` : `1px solid ${art ? "rgba(255,255,255,0.12)" : tintBorder}`,
                            borderRadius: 16, cursor: "pointer", transition: "all 0.15s ease", aspectRatio: "1", position: "relative", overflow: "hidden",
                            ...(focused ? { boxShadow: `0 0 0 1px ${accent.glow}0.3), 0 0 30px ${accent.glow}0.15)`, transform: "scale(1.06)" } : {}) }}>
                          {art ? (
                            <>
                              <img src={art} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.75))", zIndex: 1 }} />
                              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 10px", zIndex: 2 }}>
                                <div style={{ fontSize: 11, fontWeight: 500, color: "white", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.name}</div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", position: "relative", zIndex: 1 }}>
                                <AppIcon app={app} size={64} />
                              </div>
                              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 10px 10px", zIndex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 500, color: theme.textDim, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.name}</div>
                              </div>
                            </>
                          )}
                          <PinBadge isPinned={true} small />
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ── FULL GRID ── */}
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: theme.textFaint, padding: "18px 0 10px" }}>
              {tab}
              <span style={{ color: isDark ? "rgba(245,237,232,0.2)" : "rgba(42,26,14,0.2)", fontWeight: 400 }}> ({filteredApps.length})</span>
            </div>

            {tab === "Games" ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12, paddingBottom: 100 }}>
                {filteredApps.map((app, i) => {
                  const focused = isFocused("grid", i);
                  const isPinned = pins.includes(app.id);
                  return <GameCard key={app.id} app={app} focused={focused} isPinned={isPinned}
                    cardRef={focused ? focusedCardRef : null}
                    onClick={() => { setFocusSection("grid"); focusSectionRef.current = "grid"; setFocusIndex(i); focusIndexRef.current = i; }}
                    onDoubleClick={() => triggerLaunch(app, recent)}
                    onRightClick={(e, a) => { setContextMenu({ x: e.clientX, y: e.clientY, app: a }); }} />;
                })}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, gap: 10, paddingBottom: 100 }}>
                {filteredApps.map((app, i) => {
                  const focused = isFocused("grid", i);
                  const isPinned = pins.includes(app.id);
                  const color = iconColors[app.id];
                  const art = customArt[app.id];
                  const tintBg = color ? `rgba(${color.r},${color.g},${color.b},0.18)` : glass.background;
                  const tintBorder = color ? `rgba(${color.r},${color.g},${color.b},0.18)` : "rgba(255,255,255,0.08)";
                  return (
                    <div key={app.id} ref={focused ? focusedCardRef : null}
                      onClick={() => { setFocusSection("grid"); focusSectionRef.current = "grid"; setFocusIndex(i); focusIndexRef.current = i; }}
                      onDoubleClick={() => triggerLaunch(app, recent)}
                      onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, app }); }}
                      style={{ ...glass, background: art ? "transparent" : (isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.52)"), backdropFilter: isDark ? "blur(16px)" : "blur(28px)", WebkitBackdropFilter: isDark ? "blur(16px)" : "blur(28px)",
                        border: focused ? `1px solid ${accent.glow}0.6)` : `1px solid ${art ? "rgba(255,255,255,0.12)" : tintBorder}`,
                        borderRadius: 16, cursor: "pointer", transition: "all 0.15s ease", aspectRatio: "1", position: "relative", overflow: "hidden",
                        ...(focused ? { boxShadow: `0 0 0 1px ${accent.glow}0.3), 0 0 30px ${accent.glow}0.15)`, transform: "scale(1.06)" } : {}) }}>
                      {art ? (
                        <>
                          <img src={art} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.75))", zIndex: 1 }} />
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 10px", zIndex: 2 }}>
                            <div style={{ fontSize: 11, fontWeight: 500, color: "white", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.name}</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", position: "relative", zIndex: 1 }}>
                            <AppIcon app={app} size={64} />
                          </div>
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 10px 10px", zIndex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 500, color: theme.textDim, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.name}</div>
                          </div>
                        </>
                      )}
                      <PinBadge isPinned={isPinned} small />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div style={{ position: "sticky", bottom: 0, zIndex: 100 }}>
          <div style={{ ...glass, borderRadius: 12, padding: "10px 20px", display: "flex", gap: 20, alignItems: "center", maxWidth: 1400, margin: "0 auto 14px", width: "calc(100% - 48px)" }}>
            {tab === "Settings"
              ? <><Btn color="#4a9c4a" label="A Select" /><Btn color="#b03030" label="B Back" /></>
              : <>
                  <Btn color="#4a9c4a" label="A Launch" />
                  <Btn color="#b03030" label="B Back" />
                  <Btn color="#9a7020" label="Y Search" />
                  <Btn color="#3a5a8a" label="X Pin" />
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: theme.textDim }}>
                    <span style={{ height: 18, minWidth: 24, borderRadius: 4, background: isDark ? "rgba(255,255,255,0.52)" : "rgba(0,0,0,0.15)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: isDark ? "white" : "#333", padding: "0 4px" }}>LB</span>
                    <span style={{ height: 18, minWidth: 24, borderRadius: 4, background: isDark ? "rgba(255,255,255,0.52)" : "rgba(0,0,0,0.15)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: isDark ? "white" : "#333", padding: "0 4px" }}>RB</span>
                    Tabs
                  </span>
                  {tab === "Games" && <>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: theme.textDim }}>
                      <span style={{ height: 18, minWidth: 24, borderRadius: 4, background: isDark ? "rgba(255,255,255,0.52)" : "rgba(0,0,0,0.15)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: isDark ? "white" : "#333", padding: "0 4px" }}>LT</span>
                      <span style={{ height: 18, minWidth: 24, borderRadius: 4, background: isDark ? "rgba(255,255,255,0.52)" : "rgba(0,0,0,0.15)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: isDark ? "white" : "#333", padding: "0 4px" }}>RT</span>
                      Source
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: theme.textDim }}>
                      <span style={{ height: 18, minWidth: 28, borderRadius: 4, background: isDark ? "rgba(255,255,255,0.52)" : "rgba(0,0,0,0.15)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 700, color: isDark ? "white" : "#333", padding: "0 4px" }}>MENU</span>
                      Options
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: theme.textDim }}>
                      <span style={{ height: 18, minWidth: 28, borderRadius: 4, background: isDark ? "rgba(255,255,255,0.52)" : "rgba(0,0,0,0.15)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 700, color: isDark ? "white" : "#333", padding: "0 4px" }}>BACK</span>
                      Manage
                    </span>
                  </>}
                  {tab === "Apps" && <>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: theme.textDim }}>
                      <span style={{ height: 18, minWidth: 28, borderRadius: 4, background: isDark ? "rgba(255,255,255,0.52)" : "rgba(0,0,0,0.15)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 700, color: isDark ? "white" : "#333", padding: "0 4px" }}>MENU</span>
                      Options
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: theme.textDim }}>
                      <span style={{ height: 18, minWidth: 28, borderRadius: 4, background: isDark ? "rgba(255,255,255,0.52)" : "rgba(0,0,0,0.15)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 700, color: isDark ? "white" : "#333", padding: "0 4px" }}>BACK</span>
                      Manage
                    </span>
                  </>}
                </>
            }
          </div>
        </div>
      </div>

      {contextMenu && (() => {
        const ctxItems = [
          { label: "Open", action: () => { triggerLaunch(contextMenu.app, recentRef.current); setContextMenu(null); contextMenuRef.current = null; } },
          { label: pins.includes(contextMenu.app.id) ? "Unpin" : "Pin", action: () => { togglePin(contextMenu.app); setContextMenu(null); contextMenuRef.current = null; } },
          { label: "Change Art", action: () => { setArtPickerMode("grid"); artPickerModeRef.current = "grid"; setArtPickerApp(contextMenu.app); artPickerAppRef.current = contextMenu.app; setContextMenu(null); contextMenuRef.current = null; } },
          ...(contextMenu.app.app_type === "game"
            ? [{ label: "Change Hero Art", action: () => { setArtPickerMode("hero"); artPickerModeRef.current = "hero"; setArtPickerApp(contextMenu.app); artPickerAppRef.current = contextMenu.app; setContextMenu(null); contextMenuRef.current = null; } }]
            : []),
        ];
        const ctxFocused = contextMenu.focusedIdx || 0;
        const menuH = ctxItems.length * 52 + 16;
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 9000 }}
            onClick={() => { setContextMenu(null); contextMenuRef.current = null; }}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); contextMenuRef.current = null; }}>
            <div onClick={(e) => e.stopPropagation()}
              style={{ position: "fixed",
                left: Math.min(contextMenu.x, window.innerWidth - 210),
                top: Math.min(contextMenu.y, window.innerHeight - menuH),
                background: isDark ? "rgba(18,12,8,0.98)" : "rgba(255,255,255,0.98)",
                backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.14)"}`,
                borderRadius: 14, overflow: "hidden", minWidth: 200, zIndex: 9001,
                boxShadow: "0 12px 48px rgba(0,0,0,0.5)", fontFamily: "'Segoe UI', sans-serif" }}>
              <div style={{ padding: "8px 0" }}>
                {ctxItems.map(({ label, action }, i) => (
                  <div key={label} onClick={action}
                    style={{ padding: "12px 20px", cursor: "pointer", fontSize: 14, fontWeight: 500, color: theme.text,
                      background: i === ctxFocused ? `${accent.glow}0.18)` : "transparent",
                      borderLeft: i === ctxFocused ? `3px solid ${accent.primary}` : "3px solid transparent",
                      transition: "background 0.1s ease" }}
                    onMouseEnter={(e) => { setContextMenu(prev => { const u = { ...prev, focusedIdx: i }; contextMenuRef.current = u; return u; }); }}
                    onMouseLeave={(e) => e.currentTarget.style.background = i === ctxFocused ? `${accent.glow}0.18)` : "transparent"}>
                    {label}
                  </div>
                ))}
              </div>
              <div style={{ padding: "6px 16px 8px", borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`, display: "flex", gap: 10 }}>
                {[{ bg: "#4a9c4a", label: "A Select" }, { bg: "#b03030", label: "B Close" }].map(({ bg, label }) => (
                  <span key={label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: theme.textDim }}>
                    <span style={{ width: 16, height: 16, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 700, color: "white", flexShrink: 0 }}>{label[0]}</span>
                    {label.slice(1)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {cacheClearLoading && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: theme.card, borderRadius: 18, padding: "36px 52px", textAlign: "center", display: "flex", flexDirection: "column", gap: 14, alignItems: "center",
            boxShadow: "0 8px 48px rgba(0,0,0,0.5)", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}` }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${accent.primary}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>{cacheClearStatus.line1}</div>
            <div style={{ fontSize: 13, color: theme.textDim }}>{cacheClearStatus.line2}</div>
          </div>
        </div>
      )}
    </div>
  );
}