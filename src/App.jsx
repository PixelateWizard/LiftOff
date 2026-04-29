//Copyright (C) 2025 Taylor Denby

import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import i18n from "./i18n";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import FileBrowser from "./components/FileBrowser";
import GamepadKeyboard from "./components/GamepadKeyboard";
import { GamepadBtn } from "./components/GamepadBtn";
import AddEntryModal from "./components/modals/AddEntryModal";
import ConfirmModal from "./components/modals/ConfirmModal";
import FolderManagerModal from "./components/modals/FolderManagerModal";
import ColPickerModal from "./components/modals/ColPickerModal";
import CollectionManagerModal from "./components/modals/CollectionManagerModal";
import ModalShell from "./components/modals/ModalShell";
import ContextMenuModal from "./components/modals/ContextMenuModal";
import HideModal from "./components/modals/HideModal";
import EditNameModal from "./components/modals/EditNameModal";
import uiSound from "./assets/uiSound.mp3";
import uiSoundAlt from "./assets/uiSoundAlt.mp3";
import startingSound from "./assets/appLaunchSound.wav";
import appStartSound from "./assets/gameLaunchSound.wav";
import appLoadedSound from "./assets/appLoadedSound.wav";
import { SettingsScreen, buildSettingsItems, getSectionNavigableItems, SETTINGS_SECTIONS } from "./views/settings";
import { GamepadProvider } from "./contexts/GamepadContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { AppHeader } from "./components/layout/AppHeader";
import { AppBottomBar } from "./components/layout/AppBottomBar";
import {
  COLS, GAME_COLS, TABS, APP_VERSION, GITHUB_REPO,
  ACCENTS, THEMES, CLOUD_SHAPES, CLOUD_CONFIGS, KB_ALPHA, KB_NUMS,
  SCAN_KEYS, DEFAULT_SETTINGS,
} from "./constants";


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
  const { t } = useTranslation();
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
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.22)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{t('launch.launching')}</span>
            <span style={{ display: "flex", gap: 3 }}>
              {[0,1,2].map(i => <span key={i} className="launch-dot" style={{ width: 4, height: 4, borderRadius: "50%", background: accent.primary, display: "inline-block" }} />)}
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 13, color: "rgba(255,90,90,0.95)", letterSpacing: "0.05em" }}>{t('launch.failed')}</div>
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
              {t('launch.dismiss')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Custom Art Picker Modal ───────────────────────────────────
function ArtPickerModal({ app, currentArt, hasCustomArt, cropMode = "portrait", accent, theme, isDark, glass, onClose, onSet, onReset }) {
  const { t } = useTranslation();
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
        <div style={{ fontSize: 12, color: theme.textDim, marginBottom: 16 }}>{t('artPicker.replaceCoverArt')}</div>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          {/* Preview — fixed width, 2:3 tall */}
          <div style={{ flexShrink: 0, width: 110 }}>
            {preview
              ? <img src={preview} alt="" style={{ width: "100%", aspectRatio: cropMode === "square" ? "1" : "2/3", objectFit: "cover", borderRadius: 10, display: "block" }} />
              : <div style={{ width: "100%", aspectRatio: cropMode === "square" ? "1" : "2/3", borderRadius: 10, background: `${accent.glow}0.1)`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 10, color: theme.textDim, textAlign: "center" }}>{t('artPicker.noArt')}</span></div>
            }
          </div>
          {/* Controls */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
            <button onClick={() => fileRef.current?.click()} style={btnStyle("browse", `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`, accent.darkText ? "#1a1a1a" : "white")}>{t('artPicker.browseImage')}</button>
            {pendingData && <button onClick={handleSave} disabled={saving} style={btnStyle("save", "#4a9c4a", "white", { opacity: saving ? 0.6 : 1 })}>{saving ? t('artPicker.saving') : t('common.save')}</button>}
            {hasCustomArt && !pendingData && <button onClick={handleReset} style={btnStyle("reset", "rgba(255,255,255,0.08)", theme.text)}>{t('artPicker.resetToDefault')}</button>}
            <button onClick={onClose} style={btnStyle("cancel", "rgba(255,255,255,0.05)", theme.textDim)}>{t('common.cancel')}</button>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, paddingTop: 4 }}>
              {[
                { bg: "#4a9c4a", label: t('gamepad.aConfirm') },
                { bg: "#b03030", label: t('gamepad.bCancel') },
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
  const { t } = useTranslation();
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
              {t('sgdb.hoverToPreview')}
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
          background: accent.primary, color: accent.darkText ? "#1a1a1a" : "white", fontSize: 8, fontWeight: 700, letterSpacing: "0.05em",
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
  const { t } = useTranslation();
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
      <span style={{ color: theme.textDim, fontSize: 13 }}>{t('sgdb.failedToLoad')}</span>
      <button onClick={loadResults}
        style={{ padding: "8px 20px", borderRadius: 8, background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`, color: accent.darkText ? "#1a1a1a" : "white", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer" }}>
        {t('common.retry')}
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
                color: heroFilter === f ? (accent.darkText ? "#1a1a1a" : "white") : theme.text }}>
              {t(`sgdb.filter.${f}`)}
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
              {t('sgdb.noResults')}
            </div>
          )}
        </div>
      </div>
      <div style={{ paddingTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", gap: 12, marginRight: "auto" }}>
          {[{ bg: "#4a9c4a", label: t('gamepad.aSelect') }, { bg: "#b03030", label: t('gamepad.bCancel') }].map(({ bg, label }) => (
            <span key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: theme.textDim }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "white", flexShrink: 0 }}>{label[0]}</span>
              {label.slice(1)}
            </span>
          ))}
          {artType === "hero" && (
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: theme.textDim }}>
              <span style={{ height: 18, minWidth: 20, borderRadius: 4, background: "rgba(255,255,255,0.52)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 700, color: "white", padding: "0 3px" }}>LT</span>
              <span style={{ height: 18, minWidth: 20, borderRadius: 4, background: "rgba(255,255,255,0.52)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 700, color: "white", padding: "0 3px" }}>RT</span>
              {t('sgdb.filter.label')}
            </span>
          )}
        </div>
        <button onClick={onClose}
          style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none",
            background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", color: theme.text }}>
          {t('common.cancel')}
        </button>
        <button onClick={handleSelect} disabled={selectedIdx === null || downloading}
          style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: selectedIdx !== null && !downloading ? "pointer" : "default", border: "none",
            background: selectedIdx !== null && !downloading
              ? `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`
              : (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"),
            color: selectedIdx !== null && !downloading ? (accent.darkText ? "#1a1a1a" : "white") : theme.textDim, transition: "all 0.15s" }}>
          {downloading ? t('sgdb.downloading') : t('common.select')}
        </button>
      </div>
    </div>
  );
}

// ── UploadTab ─────────────────────────────────────────────────
function UploadTab({ app, currentArt, hasCustomArt, cropMode = "portrait", accent, theme, isDark, onClose, onSet, onReset }) {
  const { t } = useTranslation();
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
        <div style={{ fontSize: 12, color: theme.textDim, marginBottom: 16 }}>{t('artPicker.uploadCustomImage')}</div>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ flexShrink: 0, width: cropMode === "hero" ? 220 : 110 }}>
            {preview
              ? <img src={preview} alt="" style={{ width: "100%", aspectRatio: cropMode === "square" ? "1" : cropMode === "hero" ? "1920/620" : "2/3", objectFit: "cover", borderRadius: 10, display: "block" }} />
              : <div style={{ width: "100%", aspectRatio: cropMode === "square" ? "1" : cropMode === "hero" ? "1920/620" : "2/3", borderRadius: 10, background: `${accent.glow}0.1)`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 10, color: theme.textDim, textAlign: "center" }}>{t('artPicker.noArt')}</span></div>
            }
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
            <button onClick={() => fileRef.current?.click()} style={btnStyle("browse", `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`, accent.darkText ? "#1a1a1a" : "white")}>{t('artPicker.browseImage')}</button>
            {pendingData && <button onClick={handleSave} disabled={saving} style={btnStyle("save", "#4a9c4a", "white", { opacity: saving ? 0.6 : 1 })}>{saving ? t('artPicker.saving') : t('common.save')}</button>}
            {hasCustomArt && !pendingData && <button onClick={handleReset} style={btnStyle("reset", "rgba(255,255,255,0.08)", theme.text)}>{t('artPicker.resetToDefault')}</button>}
            <button onClick={onClose} style={btnStyle("cancel", "rgba(255,255,255,0.05)", theme.textDim)}>{t('common.cancel')}</button>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, paddingTop: 4 }}>
              {[
                { bg: "#4a9c4a", label: t('gamepad.aConfirm') },
                { bg: "#b03030", label: t('gamepad.bCancel') },
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
  const { t } = useTranslation();
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
    color: activeTab === tab ? (accent.darkText ? "#1a1a1a" : "white") : theme.textDim,
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
          {showSgdb && <button onClick={() => setActiveTab("browse")} style={tabBtnStyle("browse")}>{t('artModal.browseSgdb')}</button>}
          <button onClick={() => setActiveTab("upload")} style={tabBtnStyle("upload")}>{t('artModal.uploadFile')}</button>
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
// Prefer standard-mapped controllers with ≥4 axes first (rules out audio HID),
// then fall back to any gamepad with ≥4 buttons and axes, then gps[0].
function getBestGamepad() {
  const gps = Array.from(navigator.getGamepads()).filter(Boolean);
  // Real gamepads always have ≥4 axes (two analog sticks).
  // Audio HID devices (e.g. Jabra headsets) register as gamepads but expose
  // buttons (volume/mute) with zero or very few axes — this filter excludes them.
  return (
    gps.find(gp => gp.mapping === "standard" && gp.axes.length >= 4) ||
    gps.find(gp => gp.buttons.length >= 4    && gp.axes.length >= 4) ||
    gps[0] || null
  );
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

// Detect controller platform from gamepad ID string
function detectPlatform(gpId) {
  const id = (gpId || "").toLowerCase();
  if (id.includes("054c") || id.includes("dualshock") || id.includes("dualsense") ||
      id.includes("playstation") || id.includes("sony")) return "ps";
  if (id.includes("057e") || id.includes("nintendo") || id.includes("switch") ||
      id.includes("pro controller") || id.includes("joycon")) return "switch";
  if (id.includes("xbox") || id.includes("xinput") || id.includes("045e") ||
      id.includes("microsoft")) return "xbox";
  return null; // unknown
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
  const { t } = useTranslation();
  const [tab, setTab]                               = useState("Home");
  const [apps, setApps]                             = useState([]);
  const [recent, setRecent]                         = useState([]);
  const [recentGames, setRecentGames]               = useState([]);
  const [pins, setPins]                             = useState([]);
  const [hidden, setHidden]                         = useState([]);
  const [iconColors, setIconColors]                 = useState({});
  const [gameSourceTab, setGameSourceTab]           = useState("All"); // "All" | "Steam" | "Xbox" | "Other"
  const [subtabFocusIndex, setSubtabFocusIndex]     = useState(0);    // index within subtab row
  const [showHideModal, setShowHideModal]           = useState(false);
  const [showFileBrowser, setShowFileBrowser]       = useState(null);  // null | "file" | "folder"
  const [addAppType, setAddAppType]                 = useState("game"); // "game" | "app"
  const [pendingFile, setPendingFile]               = useState(null);  // FileEntry from FileBrowser
  const [customSources, setCustomSources]           = useState([]);    // extra source names
  const [customFolders, setCustomFolders]           = useState([]);    // { id, path, source, app_type, enabled }
  const [appCollections, setAppCollections]         = useState([]);    // { id, name }
  const [appMemberships, setAppMemberships]         = useState({});    // app_id -> [collection_id, ...]
  const [appCollectionTab, setAppCollectionTab]     = useState("All"); // selected collection in Apps tab
  const [gameCollections, setGameCollections]       = useState([]);    // { id, name }
  const [gameMemberships, setGameMemberships]       = useState({});    // game_id -> [collection_id, ...]
  const [showColModal, setShowColModal]             = useState(false); // collection manager modal
  const [colPickerApp, setColPickerApp]             = useState(null);  // app whose collections are being edited
  const [confirmDelete, setConfirmDelete]           = useState(null);  // app pending deletion confirm
  const [showFolderManager, setShowFolderManager]   = useState(false); // folder manager modal
  const [loading, setLoading]                       = useState(true);
  const [splashExiting, setSplashExiting]           = useState(false);
  const [focusSection, setFocusSection]             = useState("hero");
  const [focusIndex, setFocusIndex]                 = useState(0);
  const [time, setTime]                             = useState("");
  const [date, setDate]                             = useState("");
  const [battery, setBattery]                       = useState(0);
  const [charging, setCharging]                     = useState(false);
  const [hasBattery, setHasBattery]                 = useState(false);
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
  const [settings, setSettings]                     = useState({ ...DEFAULT_SETTINGS });
  const [settingsFocusIndex, setSettingsFocusIndex] = useState(0);
  const [settingsSection, setSettingsSection]       = useState(0);
  const [heroIndex, setHeroIndex]                   = useState(0);
  const [updateStatus, setUpdateStatus]             = useState(null); // null | "checking" | "up_to_date" | "available" | "error"
  const [updateInfo, setUpdateInfo]                 = useState(null);
  const [libraryRefreshStatus, setLibraryRefreshStatus] = useState(null); // null | "scanning" | "done"
  const [sliderDraft, setSliderDraft] = useState({ key: null, value: null });
  const sliderDraftRef = useRef({ key: null, value: null });
  const [editNameApp, setEditNameApp] = useState(null);
  const editNameAppRef = useRef(null);
  const [homeColFocusRow, setHomeColFocusRow] = useState(0);
  const [homeColFocusCol, setHomeColFocusCol] = useState(0);
  const homeColFocusRowRef = useRef(0);
  const homeColFocusColRef = useRef(0);

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
  const focusedRowRef         = useRef(null);
  const searchFocusedCardRef  = useRef(null);   // FIX 3: focused search result card ref
  const settingsFocusedRef    = useRef(null);
  const settingsSectionRef    = useRef(0);
  const outerRef              = useRef(null);
  const homeScrollRef         = useRef(null);
  const tabScrollRef          = useRef(null);
  const drawerScrollRef       = useRef(null);
  const handleNavRef          = useRef(null);
  const tabRef                = useRef("Home");
  const focusSectionRef       = useRef("hero");
  const focusIndexRef         = useRef(0);
  const appsRef               = useRef([]);
  const allAppsRef            = useRef([]); // every app ever seen, including hidden ones
  const recentRef             = useRef([]);
  const recentGamesRef        = useRef([]);
  const pinsRef               = useRef([]);
  const hiddenRef             = useRef([]);
  const gameSourceTabRef      = useRef("All");
  const subtabFocusIndexRef   = useRef(0);
  const showHideModalRef      = useRef(false);
  const showFileBrowserRef    = useRef(null);
  const pendingFileRef        = useRef(null);
  const customSourcesRef      = useRef([]);
  const appCollectionsRef     = useRef([]);
  const appMembershipsRef     = useRef({});
  const appCollectionTabRef   = useRef("All");
  const gameCollectionsRef    = useRef([]);
  const gameMembershipsRef    = useRef({});
  const showColModalRef       = useRef(false);
  const colPickerAppRef       = useRef(null);
  const confirmDeleteRef      = useRef(null);
  const showFolderManagerRef  = useRef(false);
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
    if (app.app_type === "game") {
      const updatedGames = [app, ...recentGamesRef.current.filter(r => r.id !== app.id)].slice(0, 20);
      setRecentGames(updatedGames); recentGamesRef.current = updatedGames;
    }
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
      const gp = getBestGamepad();
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
            if (!showHideModalRef.current && !showFileBrowserRef.current && !pendingFileRef.current) handleNavRef.current?.(key);
            btnPressTime.current[key]  = now;
            btnRepeating.current[key]  = false;
          } else if (pressed && wasPressed && REPEATABLE.has(key)) {
            const heldMs = now - (btnPressTime.current[key] || now);
            if (!btnRepeating.current[key] && heldMs >= initialDelay) {
              btnRepeating.current[key] = true;
              btnPressTime.current[key] = now;
              if (!showHideModalRef.current && !showFileBrowserRef.current && !pendingFileRef.current) handleNavRef.current?.(key);
            } else if (btnRepeating.current[key] && heldMs >= repeatDelay) {
              btnPressTime.current[key] = now;
              if (!showHideModalRef.current && !showFileBrowserRef.current && !pendingFileRef.current) handleNavRef.current?.(key);
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
      "@keyframes colChevronBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(4px); } }",
      ".bg-star  { position: fixed; border-radius: 50%; pointer-events: none; z-index: 0; animation: bgStarTwinkle ease-in-out infinite; }",
      ".bg-cloud { position: fixed; top: 0; pointer-events: none; z-index: -1; animation: cloudDrift linear infinite; }",
      "html, body { overflow-x: hidden; }",
      "* { scrollbar-width: none !important; -ms-overflow-style: none !important; }",
      "*::-webkit-scrollbar { display: none !important; }",
    ].join("\n");
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  useEffect(() => { showFileBrowserRef.current = showFileBrowser; }, [showFileBrowser]);
  useEffect(() => { pendingFileRef.current = pendingFile; }, [pendingFile]);
  useEffect(() => { customSourcesRef.current = customSources; }, [customSources]);
  useEffect(() => { appCollectionsRef.current = appCollections; }, [appCollections]);
  useEffect(() => { appMembershipsRef.current = appMemberships; }, [appMemberships]);
  useEffect(() => { appCollectionTabRef.current = appCollectionTab; }, [appCollectionTab]);
  useEffect(() => { gameCollectionsRef.current = gameCollections; }, [gameCollections]);
  useEffect(() => { gameMembershipsRef.current = gameMemberships; }, [gameMemberships]);
  useEffect(() => { showColModalRef.current = showColModal; }, [showColModal]);
  useEffect(() => { colPickerAppRef.current = colPickerApp; }, [colPickerApp]);
  useEffect(() => { confirmDeleteRef.current = confirmDelete; }, [confirmDelete]);
  useEffect(() => { showFolderManagerRef.current = showFolderManager; }, [showFolderManager]);
  useEffect(() => { editNameAppRef.current = editNameApp; }, [editNameApp]);

  // Auto-detect controller platform on gamepad connect
  useEffect(() => {
    const handleConnected = (e) => {
      if (!(settingsRef.current?.gamepad_auto_detect ?? true)) return;
      const platform = detectPlatform(e.gamepad.id);
      if (platform) {
        setSettings(prev => ({ ...prev, gamepad_platform: platform }));
      }
    };
    window.addEventListener("gamepadconnected", handleConnected);
    return () => window.removeEventListener("gamepadconnected", handleConnected);
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
      const locale = i18n.language || "en";
      const fmt = settingsRef.current.time_format;
      const use12 = fmt === "12h" || (fmt === "auto" && new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions().hour12);
      setTime(now.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", hour12: use12 }));
      setDate(now.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" }));
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [settings.time_format, i18n.language]);

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
    const fetchBattery = () => { invoke("get_battery").then(info => { if (info.percent > 0) { setBattery(info.percent); setHasBattery(true); } setCharging(info.charging); }); };
    fetchBattery();
    const id = setInterval(fetchBattery, 10000);
    return () => clearInterval(id);
  }, []);



  useEffect(() => {
    Promise.all([invoke("get_screen_resolution"), invoke("get_settings")]).then(([res, s]) => {
      const auto = Math.min(2.0, Math.max(0.75, Math.min(res.width / 1920, res.height / 1080)));
      autoScaleRef.current = auto;
      // ui_scale is null when never saved; substitute the auto-detected value.
      const updated = { ...settingsRef.current, ...s, ui_scale: s.ui_scale ?? auto };
      setSettings(updated); settingsRef.current = updated;
      setTab(s.default_tab || "Home"); tabRef.current = s.default_tab || "Home";
      if (s.language && s.language !== "auto") i18n.changeLanguage(s.language);
    }).catch(() => {
      invoke("get_settings").then(s => {
        const merged = { ...settingsRef.current, ...s };
        setSettings(merged); settingsRef.current = merged;
        setTab(s.default_tab || "Home"); tabRef.current = s.default_tab || "Home";
        if (s.language && s.language !== "auto") i18n.changeLanguage(s.language);
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
    invoke("get_recent_games").then(games => {
      if (games.length > 0) { setRecentGames(games); recentGamesRef.current = games; }
    });
    invoke("get_pins").then(loadedPins => {
      setPins(loadedPins); pinsRef.current = loadedPins;
    });
    invoke("get_custom_data").then(data => {
      const sources = [...new Set([
        ...data.apps.map(a => a.source),
        ...data.folders.map(f => f.source),
      ])].filter(s => !["Steam","Xbox","Battle.net","Other","steam","xbox","battlenet","desktop","uwp"].includes(s));
      setCustomSources(sources); customSourcesRef.current = sources;
      setCustomFolders(data.folders || []);
    }).catch(() => {});
    invoke("get_app_collections").then(cols => {
      setAppCollections(cols); appCollectionsRef.current = cols;
    }).catch(() => {});
    invoke("get_app_memberships").then(m => {
      setAppMemberships(m); appMembershipsRef.current = m;
    }).catch(() => {});
    invoke("get_game_collections").then(cols => {
      setGameCollections(cols); gameCollectionsRef.current = cols;
    }).catch(() => {});
    invoke("get_game_memberships").then(m => {
      setGameMemberships(m); gameMembershipsRef.current = m;
    }).catch(() => {});
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
      if (recentGamesRef.current.length === 0) {
        const gamesFallback = visible.filter(a => a.app_type === "game").slice(0, 6);
        setRecentGames(gamesFallback); recentGamesRef.current = gamesFallback;
      }
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
    setCacheClearStatus({ line1: t('cache.clearing'), line2: t('cache.removingFiles') });
    await invoke("clear_art_cache");
    setGameArt({}); setHeroAnimated({}); setHeroStatic({});
    const games = appsRef.current.filter(a => a.app_type === "game");
    setCacheClearStatus({ line1: t('cache.downloadingArtwork'), line2: t('cache.startingDownload', { count: games.length }) });
    await fetchGameArt(games, (done, total, lastName) => {
      setCacheClearStatus({ line1: t('cache.downloadingArtwork'), line2: t('cache.progress', { name: lastName ? `${lastName} — ` : "", done, total }) });
    });
    setCacheClearLoading(false);
  };

  const updateSetting = (key, value) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value };
      if (key === "transparent_bars") { updated.transparent_topbar = value; updated.transparent_bottombar = value; }
      settingsRef.current = updated;
      invoke("save_settings", { settings: updated }).catch(console.error);
      return updated;
    });
    if (SCAN_KEYS.includes(key)) setTimeout(refreshLibrary, 50);
    if (key === "language") {
      if (value === "auto") {
        const detected = navigator.language?.split("-")[0] || "en";
        i18n.changeLanguage(detected);
      } else {
        i18n.changeLanguage(value);
      }
    }
  };

  const updateSettingsBatch = (updates) => {
    setSettings(prev => {
      const updated = { ...prev, ...updates };
      settingsRef.current = updated;
      invoke("save_settings", { settings: updated }).catch(console.error);
      return updated;
    });
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
      if (gameSourceTab === "Battle.net")  return a.source === "battlenet";
      if (gameSourceTab === "Other") return a.source !== "steam" && a.source !== "xbox" && a.source !== "battlenet" && !customSources.includes(a.source);
      if (customSources.includes(gameSourceTab)) return a.source === gameSourceTab;
      const gameCol = gameCollections.find(c => c.name === gameSourceTab);
      if (gameCol) return (gameMemberships[a.id] || []).includes(gameCol.id);
      return true; // "All"
    }
    if (tab === "Apps") {
      if (a.app_type !== "app") return false;
      if (appCollectionTab === "All") return true;
      const col = appCollections.find(c => c.name === appCollectionTab);
      if (!col) return true;
      return (appMemberships[a.id] || []).includes(col.id);
    }
    return true;
  });
  const filteredRecent = recent.filter(a =>
    tab === "Home" ? true : tab === "Games" ? a.app_type === "game" : a.app_type === "app"
  ).slice(0, 8);

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

  const effectiveGameCols = Math.max(2, Math.round(GAME_COLS / (settings.game_cover_scale ?? 1.0)));
  const currentCols = tab === "Games" ? effectiveGameCols : COLS;

  useEffect(() => {
    if (tab === "Settings") return;
    const hasPinned = pinsRef.current.length > 0;
    const gridIsOffscreen = tab !== "Home" && hasPinned;
    const scrollToTop = () => {
      const scroller = tab === "Home" ? homeScrollRef.current : tabScrollRef.current;
      if (scroller) scroller.scrollTo({ top: 0, behavior: "smooth" });
    };
    if (focusSection === "hero") {
      setTimeout(scrollToTop, 50);
    } else if (focusSection === "recent") {
      if (settingsRef.current?.cinematic_home) {
        // In cinematic mode, scroll drawer back to top so recents are fully visible
        setTimeout(() => { if (drawerScrollRef.current) drawerScrollRef.current.scrollTo({ top: 0, behavior: "smooth" }); }, 50);
      } else {
        setTimeout(scrollToTop, 50);
      }
    } else if (focusSection === "home_collections") {
      if (drawerScrollRef.current && focusedRowRef.current) {
        const drawerRect = drawerScrollRef.current.getBoundingClientRect();
        const rowRect = focusedRowRef.current.getBoundingClientRect();
        // rowRect.top is relative to viewport; convert to scroll position
        const scrollTarget = drawerScrollRef.current.scrollTop + rowRect.top - drawerRect.top - 16;
        drawerScrollRef.current.scrollTo({ top: scrollTarget, behavior: "smooth" });
      }
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
    setSettingsSection(0); settingsSectionRef.current = 0;
    setGameSourceTab("All"); gameSourceTabRef.current = "All";
    setSubtabFocusIndex(0); subtabFocusIndexRef.current = 0;
    setTimeout(() => {
      const scroller = newTab === "Home" ? homeScrollRef.current : tabScrollRef.current;
      if (scroller) scroller.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  };

  const ALL_SETTINGS_ITEMS = buildSettingsItems(t, isDark);
  const navigableSettings = getSectionNavigableItems(settingsSection, ALL_SETTINGS_ITEMS, settings);

  // ── handleNav ─────────────────────────────────────────────────
  const handleNav = (key) => {
    // Modal intercepts all input via its own poll — main nav must not run
    if (showHideModalRef.current || showFileBrowserRef.current || pendingFileRef.current || showFolderManagerRef.current || confirmDeleteRef.current || showColModalRef.current || colPickerAppRef.current || editNameAppRef.current) return;

    // Art picker open — only Escape closes it (user interacts via touch/mouse)
    if (artPickerAppRef.current) {
      if (key === "Escape") closeArtPicker();
      return;
    }

    // Context menu open — ContextMenuModal owns navigation; main loop just blocks other inputs
    if (contextMenuRef.current) {
      return;
    }

    const section         = focusSectionRef.current;
    const index           = focusIndexRef.current;
    const currentTab      = tabRef.current;
    const allApps         = appsRef.current;
    const rec             = recentRef.current;
    const currentPins     = pinsRef.current;
    const cols            = currentTab === "Games" ? Math.max(2, Math.round(GAME_COLS / (settingsRef.current.game_cover_scale ?? 1.0))) : COLS;
    const currentSettings = settingsRef.current;

    const fApps = allApps.filter(a => {
      if (currentTab === "Home" || currentTab === "All") return true;
      if (currentTab === "Games") {
        if (a.app_type !== "game") return false;
        const src = gameSourceTabRef.current;
        if (src === "Steam") return a.source === "steam";
        if (src === "Xbox")  return a.source === "xbox";
        if (src === "Battle.net")  return a.source === "battlenet";
        if (src === "Other") return a.source !== "steam" && a.source !== "xbox" && a.source !== "battlenet" && !customSourcesRef.current.includes(a.source);
        if (customSourcesRef.current.includes(src)) return a.source === src;
        const gameCol = gameCollectionsRef.current.find(c => c.name === src);
        if (gameCol) return (gameMembershipsRef.current[a.id] || []).includes(gameCol.id);
        return true; // "All"
      }
      if (a.app_type !== "app") return false;
      const colTab = appCollectionTabRef.current;
      if (colTab === "All") return true;
      const col = appCollectionsRef.current.find(c => c.name === colTab);
      if (!col) return true;
      return (appMembershipsRef.current[a.id] || []).includes(col.id);
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
    const fRecentGames = recentGamesRef.current;

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
      if (key === "TriggerLeft") {
        const ni = Math.max(0, settingsSectionRef.current - 1);
        if (ni !== settingsSectionRef.current) {
          setSettingsSection(ni); settingsSectionRef.current = ni;
          setSettingsFocusIndex(0); settingsFocusIndexRef.current = 0;
          if (tabScrollRef.current) tabScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
          playSound();
        }
        return;
      }
      if (key === "TriggerRight") {
        const ni = Math.min(SETTINGS_SECTIONS.length - 1, settingsSectionRef.current + 1);
        if (ni !== settingsSectionRef.current) {
          setSettingsSection(ni); settingsSectionRef.current = ni;
          setSettingsFocusIndex(0); settingsFocusIndexRef.current = 0;
          if (tabScrollRef.current) tabScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
          playSound();
        }
        return;
      }
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
        else if (item.type === "custom_folders") {
          setShowFolderManager(true); showFolderManagerRef.current = true;
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
          if (!settingsRef.current.cinematic_home && fPinned.length > 0) { setFocusSection("pinned"); focusSectionRef.current = "pinned"; setFocusIndex(0); focusIndexRef.current = 0; }
        }
        if (key === "ArrowDown") {
          if (settingsRef.current.cinematic_home) {
            if (fPinned.length > 0) { setFocusSection("pinned"); focusSectionRef.current = "pinned"; setFocusIndex(0); focusIndexRef.current = 0; }
          } else {
            if (fRecent.length > 0) { setFocusSection("recent"); focusSectionRef.current = "recent"; setFocusIndex(0); focusIndexRef.current = 0; }
          }
        }
        if (key === "Enter" && fRecentGames[heroIndexRef.current]) triggerLaunch(fRecentGames[heroIndexRef.current], rec);
        return;
      }
      if (section === "pinned") {
        if (key === "ArrowRight") { const ni = Math.min(index + 1, fPinned.length - 1); setFocusIndex(ni); focusIndexRef.current = ni; }
        if (key === "ArrowLeft")  { const ni = Math.max(index - 1, 0);                  setFocusIndex(ni); focusIndexRef.current = ni; }
        if (key === "ArrowUp")    { setFocusSection("hero"); focusSectionRef.current = "hero"; }
        if (key === "ArrowDown") {
          if (!settingsRef.current.cinematic_home && fRecent.length > 0) { setFocusSection("recent"); focusSectionRef.current = "recent"; setFocusIndex(Math.min(focusIndexRef.current, fRecent.length - 1)); }
          else if (settingsRef.current.cinematic_home && settingsRef.current.show_home_collections) {
            // In cinematic mode: down from pinned goes to recent first (if recents exist), else collections
            if (fRecent.length > 0) {
              setFocusSection("recent"); focusSectionRef.current = "recent";
              setFocusIndex(0); focusIndexRef.current = 0;
            } else {
              const allCols = [
                ...gameCollectionsRef.current.map(col => ({
                  id: col.id,
                  items: appsRef.current.filter(a => a.app_type === "game" && (gameMembershipsRef.current[a.id] || []).includes(col.id)).slice(0, 20),
                })),
                ...appCollectionsRef.current.map(col => ({
                  id: col.id,
                  items: appsRef.current.filter(a => a.app_type === "app" && (appMembershipsRef.current[a.id] || []).includes(col.id)).slice(0, 20),
                })),
              ].filter(c => c.items.length > 0);
              if (allCols.length > 0) {
                setFocusSection("home_collections"); focusSectionRef.current = "home_collections";
                setHomeColFocusRow(0); homeColFocusRowRef.current = 0;
                setHomeColFocusCol(0); homeColFocusColRef.current = 0;
              }
            }
          }
        }
        if (key === "Enter" && fPinned[index]) triggerLaunch(fPinned[index], rec);
        return;
      }
      if (section === "recent") {
        const maxIdx = Math.min(fRecent.length, 10) - 1;
        if (key === "ArrowRight") { const ni = Math.min(index + 1, maxIdx); setFocusIndex(ni); focusIndexRef.current = ni; }
        if (key === "ArrowLeft")  { const ni = Math.max(index - 1, 0);      setFocusIndex(ni); focusIndexRef.current = ni; }
        if (key === "ArrowUp") {
          if (settingsRef.current.cinematic_home) {
            // In cinematic mode, recent is inside the slide panel — up goes back to pinned
            if (fPinned.length > 0) { setFocusSection("pinned"); focusSectionRef.current = "pinned"; setFocusIndex(0); focusIndexRef.current = 0; }
            else { setFocusSection("hero"); focusSectionRef.current = "hero"; }
          } else {
            setFocusSection("hero"); focusSectionRef.current = "hero";
          }
        }
        if (key === "ArrowDown") {
          if (settingsRef.current.show_home_collections) {
            const allCols = [
              ...gameCollectionsRef.current.map(col => ({
                id: col.id,
                items: appsRef.current.filter(a => a.app_type === "game" && (gameMembershipsRef.current[a.id] || []).includes(col.id)).slice(0, 20),
              })),
              ...appCollectionsRef.current.map(col => ({
                id: col.id,
                items: appsRef.current.filter(a => a.app_type === "app" && (appMembershipsRef.current[a.id] || []).includes(col.id)).slice(0, 20),
              })),
            ].filter(c => c.items.length > 0);
            if (allCols.length > 0) {
              setFocusSection("home_collections"); focusSectionRef.current = "home_collections";
              setHomeColFocusRow(0); homeColFocusRowRef.current = 0;
              setHomeColFocusCol(0); homeColFocusColRef.current = 0;
            }
          }
        }
        if (key === "Enter" && fRecent[index]) triggerLaunch(fRecent[index], rec);
        return;
      }
      if (section === "home_collections") {
        const allCols = [
          ...gameCollectionsRef.current.map(col => ({
            id: col.id,
            items: appsRef.current.filter(a => a.app_type === "game" && (gameMembershipsRef.current[a.id] || []).includes(col.id)).slice(0, 20),
          })),
          ...appCollectionsRef.current.map(col => ({
            id: col.id,
            items: appsRef.current.filter(a => a.app_type === "app" && (appMembershipsRef.current[a.id] || []).includes(col.id)).slice(0, 20),
          })),
        ].filter(c => c.items.length > 0);
        const row = homeColFocusRowRef.current;
        const col = homeColFocusColRef.current;
        const currentRow = allCols[row];
        if (key === "ArrowRight") {
          if (currentRow && col < currentRow.items.length - 1) { const ni = col + 1; setHomeColFocusCol(ni); homeColFocusColRef.current = ni; }
        }
        if (key === "ArrowLeft") {
          if (col > 0) { const ni = col - 1; setHomeColFocusCol(ni); homeColFocusColRef.current = ni; }
        }
        if (key === "ArrowDown") {
          if (row < allCols.length - 1) {
            const nr = row + 1;
            const nc = Math.min(col, allCols[nr].items.length - 1);
            setHomeColFocusRow(nr); homeColFocusRowRef.current = nr;
            setHomeColFocusCol(nc); homeColFocusColRef.current = nc;
          }
        }
        if (key === "ArrowUp") {
          if (row > 0) {
            const nr = row - 1;
            const nc = Math.min(col, allCols[nr].items.length - 1);
            setHomeColFocusRow(nr); homeColFocusRowRef.current = nr;
            setHomeColFocusCol(nc); homeColFocusColRef.current = nc;
          } else {
            // Back up to recents (both normal and cinematic)
            if (fRecent.length > 0) {
              setFocusSection("recent"); focusSectionRef.current = "recent";
              setFocusIndex(0); focusIndexRef.current = 0;
            } else if (settingsRef.current.cinematic_home) {
              if (fPinned.length > 0) { setFocusSection("pinned"); focusSectionRef.current = "pinned"; setFocusIndex(0); focusIndexRef.current = 0; }
              else { setFocusSection("hero"); focusSectionRef.current = "hero"; }
            } else {
              setFocusSection("hero"); focusSectionRef.current = "hero";
            }
          }
        }
        if (key === "Enter" && currentRow) {
          const app = currentRow.items[col];
          if (app) triggerLaunch(app, rec);
        }
        return;
      }
      return;
    }

    // Games / Apps tabs
    // LT/RT cycle source sub-tabs on Games tab (from anywhere)
    if (currentTab === "Games") {
      const SOURCES = ["All", "Steam", "Xbox", "Battle.net", "Other", ...customSourcesRef.current, ...gameCollectionsRef.current.map(c => c.name)];
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
    if (currentTab === "Apps") {
      const APP_COLS = ["All", ...appCollectionsRef.current.map(c => c.name)];
      if (key === "TriggerLeft") {
        const cur = APP_COLS.indexOf(appCollectionTabRef.current);
        const next = APP_COLS[(cur - 1 + APP_COLS.length) % APP_COLS.length];
        setAppCollectionTab(next); appCollectionTabRef.current = next;
        setFocusSection("grid"); focusSectionRef.current = "grid";
        setFocusIndex(0); focusIndexRef.current = 0;
        playSound(); return;
      }
      if (key === "TriggerRight") {
        const cur = APP_COLS.indexOf(appCollectionTabRef.current);
        const next = APP_COLS[(cur + 1) % APP_COLS.length];
        setAppCollectionTab(next); appCollectionTabRef.current = next;
        setFocusSection("grid"); focusSectionRef.current = "grid";
        setFocusIndex(0); focusIndexRef.current = 0;
        playSound(); return;
      }
    }

    // subtabs row: source pills + game collections + add/folder buttons + manage
    const SOURCES = ["All", "Steam", "Xbox", "Battle.net", "Other", ...customSourcesRef.current, ...gameCollectionsRef.current.map(c => c.name)];
    const APP_COLS_NAV = ["All", ...appCollectionsRef.current.map(c => c.name)];
    const subtabItems = currentTab === "Games"
      ? [...SOURCES, "add_app", "add_folder", "manage", "collections"]
      : [...APP_COLS_NAV, "add_app", "add_folder", "manage", "collections"];

    const switchSubtabItem = (item) => {
      if (item === "add_app" || item === "add_folder" || item === "manage" || item === "collections") return;
      if (currentTab === "Games") { setGameSourceTab(item); gameSourceTabRef.current = item; }
      else { setAppCollectionTab(item); appCollectionTabRef.current = item; }
      setFocusIndex(0); focusIndexRef.current = 0;
    };

    if (section === "subtabs") {
      if (key === "ArrowRight") {
        const ni = Math.min(subtabFocusIndexRef.current + 1, subtabItems.length - 1);
        setSubtabFocusIndex(ni); subtabFocusIndexRef.current = ni;
        switchSubtabItem(subtabItems[ni]);
        playSound();
      }
      else if (key === "ArrowLeft") {
        const ni = Math.max(subtabFocusIndexRef.current - 1, 0);
        setSubtabFocusIndex(ni); subtabFocusIndexRef.current = ni;
        switchSubtabItem(subtabItems[ni]);
        playSound();
      }
      else if (key === "ArrowDown") {
        if (fPinned.length > 0) { setFocusSection("pinned"); focusSectionRef.current = "pinned"; setFocusIndex(0); focusIndexRef.current = 0; }
        else { setFocusSection("grid"); focusSectionRef.current = "grid"; setFocusIndex(0); focusIndexRef.current = 0; }
        playSound();
      }
      else if (key === "Enter") {
        const item = subtabItems[subtabFocusIndexRef.current];
        if (item === "manage")          { openHideModal(); }
        else if (item === "add_app")    { setAddAppType(tabRef.current === "Games" ? "game" : "app"); setShowFileBrowser("file"); }
        else if (item === "add_folder") { setAddAppType(tabRef.current === "Games" ? "game" : "app"); setShowFileBrowser("folder"); }
        else if (item === "collections") { setShowColModal(true); showColModalRef.current = true; }
        // Pills already auto-switched on focus movement — Enter is a no-op for them
      }
      return; // always return — never fall through to grid/pinned launch
    }

    if (section === "pinned") {
      const pinnedCols = currentTab === "Games" ? Math.max(2, Math.round(GAME_COLS / (settingsRef.current.game_cover_scale ?? 1.0))) : COLS;
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
      const pinnedCols = currentTab === "Games" ? Math.max(2, Math.round(GAME_COLS / (settingsRef.current.game_cover_scale ?? 1.0))) : COLS;
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
      if (showHideModalRef.current || showFileBrowserRef.current || pendingFileRef.current) return;
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
            {kbNumMode ? t('keyboard.numbersAndSymbols') : t('keyboard.letters')}
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
                    color: isActive ? (accent.darkText ? "#1a1a1a" : "white") : theme.text,
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
            { bg: "#4a9c4a", label: "A",  desc: t('keyboard.type'),    circle: true },
            { bg: "#3a5a8a", label: "X",  desc: t('keyboard.delete'),  circle: true },
            { bg: "#9a7020", label: "Y",  desc: t('keyboard.space'),   circle: true },
            { bg: "#b03030", label: "B",  desc: t('keyboard.results'), circle: true },
            { bg: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.18)", label: "RT", desc: kbNumMode ? "→ ABC" : "→ 123", circle: false },
            { bg: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.18)", label: "⊞",  desc: t('keyboard.results'), circle: false },
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
      <div style={{ display: "flex", flexDirection: "column", padding: settings.cinematic_home ? "0" : "0 24px 0", ...(settings.wide_layout || settings.cinematic_home ? {} : { maxWidth: 1400, margin: "0 auto" }), width: "100%", boxSizing: "border-box",
        ...(settings.cinematic_home ? { position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none" } : { minHeight: "100%" }) }}>
        {/* ── HERO ── */}
        <div style={{
          ...(settings.cinematic_home
            ? { position: "fixed", inset: 0, zIndex: 0 }
            : { position: "relative", height: "clamp(280px, 44vh, 460px)", borderRadius: 20, flexShrink: 0 }),
          overflow: "hidden", display: "flex", flexDirection: "column",
          border: settings.cinematic_home ? "none" : heroFocused ? `1px solid ${accent.glow}0.5)` : `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
          boxShadow: settings.cinematic_home ? "none" : heroFocused ? `0 0 0 1px ${accent.glow}0.2), 0 8px 40px ${accent.glow}0.15)` : "0 4px 24px rgba(0,0,0,0.15)",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          background: isDark ? "#0a0502" : appBg,
        }}>
          <div style={{ position: "absolute", inset: 0, zIndex: 0, borderRadius: settings.cinematic_home ? 0 : 20, overflow: "hidden" }}>
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

          {/* Pinned bar — hidden in cinematic mode, shown separately below hero */}
          {!settings.cinematic_home && <div style={{ position: "relative", zIndex: 2, padding: "16px 20px 0", flexShrink: 0 }}>
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
                      <div style={{ fontSize: 12, fontWeight: 500, color: focused ? (accent.darkText ? "#1a1a1a" : "white") : "rgba(245,237,232,0.88)", whiteSpace: "nowrap", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis" }}>{app.name}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: 10, color: "rgba(245,237,232,0.25)", letterSpacing: "0.1em" }}>{t('home.pinHint')}</div>
            )}
          </div>}

          {/* Hero content */}
          <div style={settings.cinematic_home
            ? { position: "fixed", left: 0, right: 0, bottom: "120px", zIndex: 2, pointerEvents: "auto", display: "flex", alignItems: "flex-end", padding: "0 32px 20px" }
            : { position: "relative", zIndex: 1, flex: 1, display: "flex", alignItems: "flex-end", padding: "0 20px 20px" }}>
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
                  {heroIdx === 0 ? t('home.resumePlaying') : t('home.recentlyPlayed')}
                </div>
                <div style={{ fontSize: "clamp(22px, 3.2vw, 48px)", fontWeight: 700, color: theme.text, marginBottom: 4, lineHeight: 1.05, textShadow: isDark ? "0 2px 20px rgba(0,0,0,0.8)" : "none" }}>{heroGame.name}</div>
                <div style={{ fontSize: 11, color: theme.textDim, marginBottom: 16 }}>{t('home.game')}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div onClick={() => triggerLaunch(heroGame, recentRef.current)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 24px", borderRadius: 10, cursor: "pointer", transition: "all 0.15s ease", fontWeight: 600, fontSize: 14,
                      background: heroFocused ? accent.primary : isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.07)",
                      color: heroFocused ? (accent.darkText ? "#1a1a1a" : "white") : theme.text,
                      border: `1px solid ${heroFocused ? accent.primary : isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)"}`,
                      backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                      boxShadow: heroFocused ? `0 4px 24px ${accent.glow}0.5)` : "none",
                    }}>
                    <svg width="11" height="11" viewBox="0 0 10 10" fill="currentColor"><path d="M2 1.5l7 3.5-7 3.5z"/></svg>
                    {t('home.launch')}
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
              <div style={{ fontSize: 14, color: theme.textFaint }}>{t('home.noGames')}</div>
            )}
          </div>
          {heroFocused && !settings.cinematic_home && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, ${accent.primary}, ${accent.glow}0))`, pointerEvents: "none", zIndex: 3 }} />}
        </div>

        {/* ── CINEMATIC PINNED SHELF — fixed overlay above bottom bar ── */}
        {settings.cinematic_home && homePinnedApps.length > 0 && (
          <div style={{ position: "fixed", left: 0, right: 0, bottom: "60px", zIndex: 2, padding: "0 24px 12px", display: "flex", gap: 8, overflowX: "auto", pointerEvents: "auto" }}>
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
                      background: focused ? accent.primary : "rgba(255,255,255,0.08)",
                      border: `1px solid ${focused ? accent.primary : "rgba(255,255,255,0.14)"}`,
                      boxShadow: focused ? `0 2px 12px ${accent.glow}0.5)` : "none",
                    }}>
                    {art
                      ? <img src={art} alt={app.name} style={{ width: 24, height: 24, borderRadius: 4, objectFit: "cover" }} />
                      : <AppIcon app={app} size={24} />}
                    <div style={{ fontSize: 12, fontWeight: 500, color: focused ? (accent.darkText ? "#1a1a1a" : "white") : "rgba(245,237,232,0.9)", whiteSpace: "nowrap", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis" }}>{app.name}</div>
                  </div>
                );
              })}
          </div>
        )}

        {/* ── RECENTS ── */}
        {!settings.cinematic_home && <div style={{ paddingTop: 0 }}>
          <div style={{ paddingTop: 14 }} />
          {homeFilteredRecent.length === 0 ? (
            <div style={{ fontSize: 13, color: theme.textFaint, paddingBottom: settings.show_home_collections ? 16 : 100 }}>{t('home.noRecents')}</div>
          ) : (
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: settings.show_home_collections ? 16 : 100, paddingTop: 8, marginTop: -8, paddingLeft: 6, paddingRight: 6 }}>
              {homeFilteredRecent.map((app, i) => {
                const focused = focusSec === "recent" && focusIdx === i;
                const isPinned = pins.includes(app.id);
                const art = app.app_type === "game" ? (customArt[app.id] || gameArt[app.id]) : (customArt[app.id] || null);
                const fullApp = allAppsRef.current.find(a => a.id === app.id) || app;
                const homeBase = Math.round(110 * (settings.home_cover_scale ?? 1.0));
                const CARD_W = `${homeBase}px`;
                const CARD_H = `${Math.round(homeBase * 1.5)}px`;
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
        </div>}

        {/* ── HOME COLLECTIONS ── */}
        {settings.show_home_collections && (() => {
          const homeBase = Math.round(110 * (settings.home_cover_scale ?? 1.0));
          const CARD_W = `${homeBase}px`;
          const CARD_H = `${Math.round(homeBase * 1.5)}px`;
          const allCols = [
            ...gameCollections.map(col => ({
              id: col.id, name: col.name, type: "game",
              items: apps.filter(a => a.app_type === "game" && (gameMemberships[a.id] || []).includes(col.id)).slice(0, 20),
            })),
            ...appCollections.map(col => ({
              id: col.id, name: col.name, type: "app",
              items: apps.filter(a => a.app_type === "app" && (appMemberships[a.id] || []).includes(col.id)).slice(0, 20),
            })),
          ].filter(c => c.items.length > 0);
          if (allCols.length === 0) return null;
          const colsFocused = focusSec === "home_collections";

          const collectionRows = allCols.map((col, rowIdx) => {
            const rowFocused = colsFocused && homeColFocusRow === rowIdx;
            return (
            <div key={col.id} ref={rowFocused ? focusedRowRef : null} style={{ marginBottom: 28 }}>
              {settings.show_home_collection_names && (
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: theme.textFaint, paddingBottom: 10, paddingLeft: 4 }}>
                  {col.name}
                </div>
              )}
              <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, paddingLeft: 4, paddingRight: 4, paddingTop: 8 }}>
                {col.items.map((app, colIdx) => {
                  const art = customArt[app.id] || (app.app_type === "game" ? gameArt[app.id] : null);
                  const focused = colsFocused && homeColFocusRow === rowIdx && homeColFocusCol === colIdx;
                  if (app.app_type === "game") {
                    return (
                      <div key={app.id}
                        ref={focused ? focusedCardRef : null}
                        onClick={() => { setFocusSection("home_collections"); focusSectionRef.current = "home_collections"; setHomeColFocusRow(rowIdx); homeColFocusRowRef.current = rowIdx; setHomeColFocusCol(colIdx); homeColFocusColRef.current = colIdx; }}
                        onDoubleClick={() => triggerLaunch(app, recentRef.current)}
                        style={{ flexShrink: 0, width: CARD_W, height: CARD_H, borderRadius: 12, overflow: "hidden", cursor: "pointer", position: "relative", transition: "box-shadow 0.15s ease, outline 0.15s ease",
                          outline: focused ? `2px solid ${accent.primary}` : "2px solid transparent",
                          outlineOffset: "2px",
                          border: "1px solid rgba(255,255,255,0.08)",
                          boxShadow: focused ? `0 0 0 1px ${accent.glow}0.3), 0 4px 20px ${accent.glow}0.3)` : "none",
                          scrollMarginTop: "120px",
                        }}>
                        {art
                          ? <img src={art} alt={app.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <div style={{ width: "100%", height: "100%", background: `${accent.glow}0.08)`, display: "flex", alignItems: "center", justifyContent: "center" }}><AppIcon app={app} size={36} /></div>
                        }
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 8px 7px", background: "linear-gradient(transparent, rgba(0,0,0,0.85))" }}>
                          <div style={{ fontSize: 9, fontWeight: 600, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.name}</div>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={app.id}
                      ref={focused ? focusedCardRef : null}
                      onClick={() => { setFocusSection("home_collections"); focusSectionRef.current = "home_collections"; setHomeColFocusRow(rowIdx); homeColFocusRowRef.current = rowIdx; setHomeColFocusCol(colIdx); homeColFocusColRef.current = colIdx; }}
                      onDoubleClick={() => triggerLaunch(app, recentRef.current)}
                      style={{ ...glass, flexShrink: 0, width: CARD_W, height: CARD_H, borderRadius: 12, overflow: "hidden", cursor: "pointer",
                        outline: focused ? `2px solid ${accent.primary}` : "2px solid transparent",
                        outlineOffset: "2px",
                        border: "1px solid rgba(255,255,255,0.08)",
                        boxShadow: focused ? `0 0 0 1px ${accent.glow}0.3), 0 4px 20px ${accent.glow}0.3)` : "none",
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 6px",
                        transition: "box-shadow 0.15s ease, outline 0.15s ease",
                        scrollMarginTop: "120px",
                      }}>
                      <AppIcon app={app} size={40} />
                      <div style={{ fontSize: 8, fontWeight: 500, color: theme.textDim, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{app.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            );
          });

          if (settings.cinematic_home) {
            // ── CINEMATIC: chevron hint + slide-up full-screen panel ──
            const panelOpen = colsFocused || focusSec === "recent";
            return (
              <>
                {/* Chevron — clickable for mouse/keyboard users to open drawer */}
                <div
                  onClick={() => { setFocusSection("recent"); focusSectionRef.current = "recent"; setFocusIndex(0); focusIndexRef.current = 0; }}
                  style={{
                    position: "fixed", left: 0, right: 0, bottom: "16px", zIndex: 3,
                    display: "flex", justifyContent: "center", pointerEvents: panelOpen ? "none" : "auto",
                    opacity: panelOpen ? 0 : 1,
                    cursor: "pointer",
                    transition: "opacity 0.3s ease",
                    animation: panelOpen ? "none" : "colChevronBob 1.6s ease-in-out infinite",
                    padding: "8px 0",
                  }}>
                  <svg width="22" height="12" viewBox="0 0 22 12" fill="none">
                    <path d="M2 2L11 10L20 2" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                {/* Slide-up drawer panel */}
                <div style={{
                  position: "fixed", left: 0, right: 0, bottom: 0, top: "72px", zIndex: 4,
                  background: isDark ? "rgba(14,8,4,0.98)" : "rgba(238,228,218,0.98)",
                  backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
                  borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                  boxShadow: `0 -8px 40px rgba(0,0,0,0.4)`,
                  transform: panelOpen ? "translateY(0)" : "translateY(100%)",
                  transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
                  display: "flex", flexDirection: "column",
                  pointerEvents: panelOpen ? "auto" : "none",
                }}>
                  {/* Up chevron — sticky outside scroll, always visible */}
                  <div
                    onClick={() => { setFocusSection("pinned"); focusSectionRef.current = "pinned"; setFocusIndex(0); focusIndexRef.current = 0; }}
                    style={{ display: "flex", justifyContent: "center", padding: "16px 0 16px", flexShrink: 0, cursor: "pointer" }}>
                    <svg width="18" height="10" viewBox="0 0 22 12" fill="none" style={{ opacity: 0.4 }}>
                      <path d="M20 10L11 2L2 10" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>

                  {/* Scrollable content */}
                  <div ref={drawerScrollRef} style={{ flex: 1, overflowY: "auto", paddingTop: 8 }}>
                    {/* Recents row — fully navigable */}
                    {homeFilteredRecent.length > 0 && (
                    <div style={{ marginBottom: 28, padding: "0 24px" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: theme.textFaint, paddingBottom: 10, paddingLeft: 4, paddingTop: 8 }}>
                        {t('home.recentlyPlayed').replace('▶ ', '')}
                      </div>
                      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8, paddingLeft: 4, paddingRight: 4, paddingTop: 8 }}>
                        {homeFilteredRecent.map((app, i) => {
                          const recFocused = focusSec === "recent" && focusIdx === i;
                          const art = app.app_type === "game" ? (customArt[app.id] || gameArt[app.id]) : (customArt[app.id] || null);
                          return (
                            <div key={app.id}
                              ref={recFocused ? focusedCardRef : null}
                              onClick={() => { setFocusSection("recent"); focusSectionRef.current = "recent"; setFocusIndex(i); focusIndexRef.current = i; }}
                              onDoubleClick={() => triggerLaunch(app, recentRef.current)}
                              style={{ flexShrink: 0, width: CARD_W, height: CARD_H, borderRadius: 12, overflow: "hidden", cursor: "pointer", position: "relative",
                                border: "1px solid rgba(255,255,255,0.08)",
                                outline: recFocused ? `2px solid ${accent.primary}` : "2px solid transparent",
                                outlineOffset: "2px",
                                boxShadow: recFocused ? `0 4px 20px ${accent.glow}0.3)` : "none",
                                transition: "outline-color 0.15s ease, box-shadow 0.15s ease",
                              }}>
                              {art
                                ? <img src={art} alt={app.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                : <div style={{ width: "100%", height: "100%", background: `${accent.glow}0.08)`, display: "flex", alignItems: "center", justifyContent: "center" }}><AppIcon app={app} size={36} /></div>
                              }
                              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 8px 7px", background: "linear-gradient(transparent, rgba(0,0,0,0.85))" }}>
                                <div style={{ fontSize: 9, fontWeight: 600, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.name}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    )}
                    {/* Collection rows */}
                    <div style={{ padding: "0 24px 100px" }}>
                      {collectionRows}
                    </div>
                  </div>
                </div>
              </>
            );
          }

          // ── NORMAL MODE: inline below recents ──
          return (
            <div style={{ paddingBottom: 100 }}>
              {collectionRows}
            </div>
          );
        })()}
      </div>
    );
  })();


    if (loading) return <SplashScreen exiting={splashExiting} />;

  const SettingsScreenWrapper = () => (
    <SettingsScreen
      settingsFocusIndex={settingsFocusIndex}
      settingsSection={settingsSection}
      settingsFocusedRef={settingsFocusedRef}
      customFolders={customFolders}
      onOpenFolderManager={() => { setShowFolderManager(true); showFolderManagerRef.current = true; }}
      libraryRefreshStatus={libraryRefreshStatus}
      refreshLibrary={refreshLibrary}
      updateStatus={updateStatus}
      updateInfo={updateInfo}
      checkForUpdates={checkForUpdates}
      onClearRecents={() => { invoke("clear_recents").then(() => { setRecent([]); recentRef.current = []; }); }}
      handleClearCache={handleClearCache}
      autoScale={autoScaleRef.current}
      sliderDraft={sliderDraft}
      sliderDraftRef={sliderDraftRef}
      setSliderDraft={setSliderDraft}
    />
  );

  // ── Hide/Show Modal ───────────────────────────────────────────
  // NOTE: HideModal is defined outside App (above) to prevent re-mounting on every App re-render
  // ─────────────────────────────────────────────────────────────

  // label format: "A Launch", "B Back" — first char is button, rest is description
  const Btn = ({ label }) => (
    <GamepadBtn btn={label[0]} label={label.slice(2)} />
  );

  // ── Section tab bar data for the unified sticky header ────────
  const _hdrSources = ["All", "Steam", "Xbox", "Battle.net", "Other", ...customSources, ...gameCollections.map(c => c.name)];
  const _hdrAppCols = ["All", ...appCollections.map(c => c.name)];
  const headerTabItems =
    tab === "Games"    ? _hdrSources.map(src => ({ label: src === "All" ? t('sources.all') : src === "Other" ? t('sources.other') : src, isDashed: gameCollections.some(c => c.name === src) }))
    : tab === "Apps"    ? _hdrAppCols.map(col => ({ label: col === "All" ? t('sources.all') : col }))
    : tab === "Settings" ? SETTINGS_SECTIONS.map(s => ({ label: t(s.labelKey) }))
    : [];
  const headerActiveIndex =
    tab === "Games"    ? _hdrSources.indexOf(gameSourceTab)
    : tab === "Apps"    ? _hdrAppCols.indexOf(appCollectionTab)
    : tab === "Settings" ? settingsSection : 0;
  const headerOnSelect = (i) => {
    if (tab === "Games") { const src = _hdrSources[i]; setGameSourceTab(src); gameSourceTabRef.current = src; }
    else if (tab === "Apps") { const col = _hdrAppCols[i]; setAppCollectionTab(col); appCollectionTabRef.current = col; }
    else if (tab === "Settings") { setSettingsSection(i); settingsSectionRef.current = i; setSettingsFocusIndex(0); settingsFocusIndexRef.current = 0; if (tabScrollRef.current) tabScrollRef.current.scrollTo({ top: 0, behavior: "smooth" }); }
    if (tab !== "Settings") { setFocusSection("subtabs"); focusSectionRef.current = "subtabs"; setSubtabFocusIndex(i); subtabFocusIndexRef.current = i; setFocusIndex(0); focusIndexRef.current = 0; }
  };

  // ── Render ────────────────────────────────────────────────────
  const themeValue = { isDark, theme, accent, glass, appBg, bgGlow1, bgGlow2 };
  const settingsValue = { settings, settingsRef, updateSetting, updateSettingsBatch };

  return (
    <ThemeProvider value={themeValue}>
    <SettingsProvider value={settingsValue}>
    <GamepadProvider value={{ platform: settings.gamepad_platform ?? "xbox", colored: settings.gamepad_icons_colored ?? false, filled: settings.gamepad_icons_filled ?? true, themeColor: (settings.gamepad_icons_theme_color ?? false) ? accent.primary : undefined, btnSize: settings.gamepad_btn_size ?? "medium" }}>
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
      {showHideModal && <HideModal key="hide-modal" tab={tab} appsRef={appsRef} hiddenRef={hiddenRef} allAppsRef={allAppsRef} closeHideModal={closeHideModal} toggleHidden={toggleHidden} />}
      {showFileBrowser && (
        <FileBrowser
          mode={showFileBrowser}
          repeatSpeed={settings.repeat_speed}
          onSelect={(file) => { setPendingFile(file); setShowFileBrowser(null); }}
          onClose={() => setShowFileBrowser(null)}
        />
      )}
      {pendingFile && (
        <AddEntryModal
          entryFile={pendingFile}
          mode={pendingFile.is_dir ? "folder" : "app"}
          appType={addAppType}
          existingSources={addAppType === "game" ? customSources : []}
          collections={addAppType === "game" ? gameCollections : appCollections}
          repeatSpeed={settings.repeat_speed}
          onConfirm={(result, colSelection) => {
            const wasFolder  = pendingFile?.is_dir;
            const isGameType = addAppType === "game";
            setPendingFile(null);

            // Assign a list of app IDs to an existing collection
            const assignToCollection = (appIds, colId) => {
              const cmd     = isGameType ? "set_game_memberships" : "set_app_memberships";
              const setMems = isGameType ? setGameMemberships : setAppMemberships;
              const memsRef = isGameType ? gameMembershipsRef : appMembershipsRef;
              appIds.forEach(id => invoke(cmd, { appId: id, collectionIds: [colId] }));
              setMems(prev => {
                const updates = Object.fromEntries(appIds.map(id => [id, [colId]]));
                const n = { ...prev, ...updates };
                memsRef.current = n;
                return n;
              });
            };

            // Create a new collection (game or app), then assign
            const createAndAssign = (appIds, name) => {
              const createCmd = isGameType ? "create_game_collection" : "create_app_collection";
              const setCols   = isGameType ? setGameCollections : setAppCollections;
              const colsRef   = isGameType ? gameCollectionsRef : appCollectionsRef;
              invoke(createCmd, { name }).then(newCol => {
                setCols(prev => { const n = [...prev, newCol]; colsRef.current = n; return n; });
                assignToCollection(appIds, newCol.id);
              });
            };

            if (wasFolder) {
              setCustomFolders(prev => [...prev, result]);
              // get_all_apps rescans all folders; filter by the source tag we just set
              // on this folder to find which apps it contributed
              if (colSelection?.colId || colSelection?.newName) {
                invoke("get_all_apps").then(all => {
                  const appIds = all
                    .filter(a => a.source === result.source && a.app_type === result.app_type)
                    .map(a => a.id);
                  if (colSelection.colId) assignToCollection(appIds, colSelection.colId);
                  else                    createAndAssign(appIds, colSelection.newName);
                });
              }
              refreshLibrary();
              return;
            }

            // Single entry: track custom source name unless it's a collection name
            if (isGameType && result.source) {
              const BUILTIN = new Set(["Steam","Xbox","Battle.net","Other","steam","xbox","battlenet","desktop","uwp"]);
              const isColName = gameCollectionsRef.current.some(c => c.name === result.source);
              if (!BUILTIN.has(result.source) && !isColName) {
                setCustomSources(prev => prev.includes(result.source) ? prev : [...prev, result.source]);
              }
            }
            if (result.id) {
              if (colSelection?.colId)   assignToCollection([result.id], colSelection.colId);
              else if (colSelection?.newName) createAndAssign([result.id], colSelection.newName);
            }
            refreshLibrary();
          }}
          onClose={() => setPendingFile(null)}
        />
      )}
      {/* ── Collection assignment picker (right-click → collections) ── */}
      {colPickerApp && (() => {
        const isGame = colPickerApp.app_type === "game";
        const pickerCols = isGame ? gameCollections : appCollections;
        const pickerMembers = isGame ? gameMemberships : appMemberships;
        const setPickerMembers = isGame ? setGameMemberships : setAppMemberships;
        const pickerMembersRef = isGame ? gameMembershipsRef : appMembershipsRef;
        const memberCmd = isGame ? "set_game_memberships" : "set_app_memberships";
        return (
          <ColPickerModal
            app={colPickerApp}
            collections={pickerCols}
            memberships={pickerMembers}
            onToggle={(col) => {
              const current = pickerMembersRef.current[colPickerApp.id] || [];
              const inCol = current.includes(col.id);
              const newList = inCol ? current.filter(id => id !== col.id) : [...current, col.id];
              invoke(memberCmd, { appId: colPickerApp.id, collectionIds: newList }).then(() => {
                setPickerMembers(prev => { const n = { ...prev, [colPickerApp.id]: newList }; pickerMembersRef.current = n; return n; });
              });
            }}
            onCreateCollection={(name) => {
              const cmd = isGame ? "create_game_collection" : "create_app_collection";
              invoke(cmd, { name }).then(col => {
                if (isGame) { setGameCollections(prev => { const n = [...prev, col]; gameCollectionsRef.current = n; return n; }); }
                else        { setAppCollections(prev => { const n = [...prev, col]; appCollectionsRef.current = n; return n; }); }
              });
            }}
            onClose={() => { setColPickerApp(null); colPickerAppRef.current = null; }}
          />
        );
      })()}
      {/* ── Collection manager modal ── */}
      {showColModal && (() => {
        const isGameTab = tab === "Games";
        return (
          <CollectionManagerModal
            key={isGameTab ? "game-col-mgr" : "app-col-mgr"}
            title={t(isGameTab ? 'collections.manageGames' : 'collections.manageApps')}
            collections={isGameTab ? gameCollections : appCollections}
            onCreateCollection={(name) => {
              const cmd = isGameTab ? "create_game_collection" : "create_app_collection";
              invoke(cmd, { name }).then(col => {
                if (isGameTab) { setGameCollections(prev => { const n = [...prev, col]; gameCollectionsRef.current = n; return n; }); }
                else           { setAppCollections(prev => { const n = [...prev, col]; appCollectionsRef.current = n; return n; }); }
              });
            }}
            onDeleteCollection={(id) => {
              if (isGameTab) {
                invoke("delete_game_collection", { id }).then(() => {
                  setGameCollections(prev => { const n = prev.filter(c => c.id !== id); gameCollectionsRef.current = n; return n; });
                  setGameMemberships(prev => {
                    const n = { ...prev };
                    Object.keys(n).forEach(gId => { n[gId] = n[gId].filter(cid => cid !== id); });
                    gameMembershipsRef.current = n; return n;
                  });
                });
              } else {
                invoke("delete_app_collection", { id }).then(() => {
                  setAppCollections(prev => { const n = prev.filter(c => c.id !== id); appCollectionsRef.current = n; return n; });
                  setAppMemberships(prev => {
                    const n = { ...prev };
                    Object.keys(n).forEach(aId => { n[aId] = n[aId].filter(cid => cid !== id); });
                    appMembershipsRef.current = n; return n;
                  });
                  if (appCollectionTab !== "All" && !appCollections.filter(c => c.id !== id).find(c => c.name === appCollectionTab)) {
                    setAppCollectionTab("All"); appCollectionTabRef.current = "All";
                  }
                });
              }
            }}
            onClose={() => { setShowColModal(false); showColModalRef.current = false; }}
            customSources={isGameTab ? customSources : []}
            onDeleteCustomSource={(source) => {
              invoke("remove_custom_source", { source }).then(() => {
                setCustomSources(prev => prev.filter(s => s !== source));
                customSourcesRef.current = customSourcesRef.current.filter(s => s !== source);
                refreshLibrary();
              });
            }}
          />
        );
      })()}
      {/* ── Folder manager modal (settings → custom folders → A) ── */}
      {showFolderManager && (
        <FolderManagerModal
          customFolders={customFolders}
          onToggle={(id, enabled) => {
            invoke("toggle_custom_folder", { id, enabled }).then(() => {
              setCustomFolders(prev => prev.map(f => f.id === id ? { ...f, enabled } : f));
            });
          }}
          onDelete={(id) => {
            invoke("remove_custom_folder", { id }).then(() => {
              setCustomFolders(prev => prev.filter(f => f.id !== id));
            });
          }}
          onClose={() => { setShowFolderManager(false); showFolderManagerRef.current = false; }}
        />
      )}
      {/* ── Confirm delete app modal ── */}
      {confirmDelete && (
        <ConfirmModal
          message={t('confirm.deleteApp', { name: confirmDelete.name })}
          onConfirm={() => {
            invoke("remove_custom_app", { id: confirmDelete.id }).then(() => {
              setApps(prev => prev.filter(a => a.id !== confirmDelete.id));
              allAppsRef.current = allAppsRef.current.filter(a => a.id !== confirmDelete.id);
              setConfirmDelete(null); confirmDeleteRef.current = null;
            });
          }}
          onCancel={() => { setConfirmDelete(null); confirmDeleteRef.current = null; }}
        />
      )}
      {/* ── Rename custom app modal ── */}
      {editNameApp && (
        <EditNameModal
          app={editNameApp}
          onConfirm={(name) => {
            invoke("rename_custom_app", { id: editNameApp.id, name }).then(() => refreshLibrary());
            setEditNameApp(null);
          }}
          onClose={() => setEditNameApp(null)}
        />
      )}
      {libraryRefreshStatus === "scanning" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center",
          background: isDark ? "rgba(10,5,2,0.75)" : "rgba(240,230,220,0.75)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
          <div style={{ ...glass, borderRadius: 20, padding: "32px 48px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
            border: `1px solid ${accent.glow}0.25)`, boxShadow: `0 8px 40px rgba(0,0,0,0.3)` }}>
            <div className="splash-dots" style={{ opacity: 1 }}>
              <div className="splash-dot" /><div className="splash-dot" /><div className="splash-dot" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>{t('library.refreshing')}</span>
            <span style={{ fontSize: 12, color: theme.textDim }}>{t('library.scanning')}</span>
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
                {searchQuery || t('search.placeholder')}
                {searchMode === "keyboard" && (
                  <span className="kb-cursor" style={{ display: "inline-block", width: 2, height: "0.9em",
                    background: accent.primary, marginLeft: 1, verticalAlign: "text-bottom", borderRadius: 1 }} />
                )}
              </div>
              {searchQuery && (
                <div onClick={() => { setSearchQuery(""); searchQueryRef.current = ""; setSearchFocusIndex(0); searchFocusIndexRef.current = 0; }}
                  style={{ fontSize: 12, color: theme.textDim, cursor: "pointer", padding: "3px 10px", borderRadius: 6, flexShrink: 0,
                    background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}>
                  {t('common.clear')}
                </div>
              )}
              <div style={{ fontSize: 11, fontWeight: 600, color: accent.primary, padding: "3px 10px",
                borderRadius: 20, flexShrink: 0, background: `${accent.glow}0.12)`,
                border: `1px solid ${accent.glow}0.25)` }}>
                {searchMode === "keyboard" ? t('search.mode.typing') : searchMode === "results" ? t('search.mode.browsing') : t('search.mode.idle')}
              </div>
              <div onClick={closeSearch}
                style={{ fontSize: 12, color: theme.textDim, cursor: "pointer", padding: "3px 10px", borderRadius: 6, flexShrink: 0,
                  background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}` }}>
                {t('common.close')}
              </div>
            </div>
          </div>

          {/* Results area */}
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "0 24px 12px" }}>
            {searchResults.length > 0 && (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase",
                  color: theme.textFaint, padding: "4px 4px 10px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span>{t('search.results', { count: searchResults.length })}</span>
                  {searchMode === "keyboard" && (
                    <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", fontSize: 11, color: theme.textFaint }}>
                      {t('search.startToBrowse')}
                    </span>
                  )}
                  {searchMode === "idle" && (
                    <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", fontSize: 11, color: theme.textFaint }}>
                      {t('search.idleHint')}
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
                  <Btn label={t('gamepad.aLaunch')} />
                  <Btn label={t('gamepad.yKeyboard')} />
                  <Btn label={t('gamepad.bClose')} />
                  <span style={{ marginLeft: "auto", fontSize: 11, color: theme.textFaint }}>↑ from top → Keyboard</span>
                </div>
              </div>
            )}

            {searchMode === "idle" && (
              <div style={{ position: "sticky", bottom: 0, paddingTop: 8 }}>
                <div style={{ ...glass, borderRadius: 12, padding: "9px 20px", display: "flex", gap: 16, alignItems: "center" }}>
                  <Btn label={t('gamepad.yKeyboard')} />
                  <Btn label={t('gamepad.bClose')} />
                  {searchResults.length > 0 && <span style={{ fontSize: 11, color: theme.textFaint }}>{t('search.startBrowse')}</span>}
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
        <AppHeader
          tab={tab}
          tabs={TABS}
          switchTab={switchTab}
          date={date}
          time={time}
          hasBattery={hasBattery}
          battery={battery}
          batteryWidth={batteryWidth}
          batteryColor={batteryColor}
          charging={charging}
          headerTabItems={headerTabItems}
          headerActiveIndex={headerActiveIndex}
          headerOnSelect={headerOnSelect}
        />
        {/* Tab content area — Home always mounted; cover layer hides it when elsewhere;
             clouds sit above cover, below all tab UI. */}
        <div style={{ position: "relative", flex: 1, overflow: (settings.transparent_topbar && tab === "Home") || (settings.cinematic_home && tab === "Home") ? "auto" : "hidden" }}>

          {tab === "Settings" && (
            <div ref={tabScrollRef} style={{ position: "absolute", inset: 0, overflowY: "auto", zIndex: 2 }}>
              <SettingsScreenWrapper />
            </div>
          )}
          <div
            ref={homeScrollRef}
            style={{
              position: "absolute", inset: 0, overflowY: settings.cinematic_home ? "visible" : "auto",
              zIndex: 2,
              pointerEvents: tab === "Home" ? "auto" : "none",
              contentVisibility: tab === "Home" ? "visible" : "hidden",
            }}>
            {homeContent}
          </div>
          {(tab === "Games" || tab === "Apps") && (() => {
              const SOURCES = ["All", "Steam", "Xbox", "Battle.net", "Other", ...customSources, ...gameCollections.map(c => c.name)];
              const APP_COLS = ["All", ...appCollections.map(c => c.name)];
              const subtabItems = tab === "Games"
                ? [...SOURCES, "add_app", "add_folder", "manage", "collections"]
                : [...APP_COLS, "add_app", "add_folder", "manage", "collections"];
              const addAppIdx    = tab === "Games" ? SOURCES.length     : APP_COLS.length;
              const addFolderIdx = tab === "Games" ? SOURCES.length + 1 : APP_COLS.length + 1;
              const manageIdx    = tab === "Games" ? SOURCES.length + 2 : APP_COLS.length + 2;
              const colModalIdx  = tab === "Games" ? SOURCES.length + 3 : APP_COLS.length + 3;
              const actionBtnStyle = (active) => ({
                fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", padding: "5px 12px", borderRadius: 20, cursor: "pointer", transition: "all 0.15s ease",
                background: active ? accent.primary : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"),
                color: active ? (accent.darkText ? "#1a1a1a" : "white") : theme.textDim,
                border: `1px solid ${active ? accent.primary : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)")}`,
                boxShadow: active ? `0 2px 10px ${accent.glow}0.35)` : "none",
                display: "flex", alignItems: "center", justifyContent: "center",
              });

              // Build tab items for SectionTabBar
              const tabItems = tab === "Games"
                ? SOURCES.map(src => ({
                    label: src === "All" ? t('sources.all') : src === "Other" ? t('sources.other') : src,
                    isDashed: gameCollections.some(c => c.name === src),
                  }))
                : APP_COLS.map(col => ({ label: col === "All" ? t('sources.all') : col }));

              const activeTabIndex = tab === "Games"
                ? SOURCES.indexOf(gameSourceTab)
                : APP_COLS.indexOf(appCollectionTab);

              return (
            <div ref={tabScrollRef} style={{ position: "absolute", inset: 0, overflowY: "auto", zIndex: 2 }}>
              <div style={{ padding: `0 24px 0`, ...(settings.wide_layout ? {} : { maxWidth: 1400, margin: "0 auto" }), width: "100%", boxSizing: "border-box" }}>
                {/* Action buttons — below the tab bar, aligned right */}
                <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end", paddingTop: 8, paddingBottom: 8 }}>
                  <div onClick={() => { setAddAppType(tab === "Games" ? "game" : "app"); setShowFileBrowser("file"); setFocusSection("subtabs"); focusSectionRef.current = "subtabs"; setSubtabFocusIndex(addAppIdx); subtabFocusIndexRef.current = addAppIdx; }}
                    style={{ ...actionBtnStyle(focusSection === "subtabs" && subtabFocusIndex === addAppIdx), padding: "5px 10px" }}
                    title={tab === "Games" ? t('addEntry.addGame') : t('addEntry.addApp')}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div onClick={() => { setAddAppType(tab === "Games" ? "game" : "app"); setShowFileBrowser("folder"); setFocusSection("subtabs"); focusSectionRef.current = "subtabs"; setSubtabFocusIndex(addFolderIdx); subtabFocusIndexRef.current = addFolderIdx; }}
                    style={{ ...actionBtnStyle(focusSection === "subtabs" && subtabFocusIndex === addFolderIdx), padding: "5px 10px" }}
                    title={t('addEntry.addFolder')}>
                    <svg width="16" height="13" viewBox="0 0 16 13" fill="none">
                      <path d="M1 3.5a1 1 0 011-1h3.8l1.4 1.5H14a1 1 0 011 1v6a1 1 0 01-1 1H2a1 1 0 01-1-1V3.5z" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M8 6.5v3M6.5 8h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div onClick={() => { openHideModal(); setFocusSection("subtabs"); focusSectionRef.current = "subtabs"; setSubtabFocusIndex(manageIdx); subtabFocusIndexRef.current = manageIdx; }}
                    style={actionBtnStyle(focusSection === "subtabs" && subtabFocusIndex === manageIdx)}>
                    {t('grid.manage')}
                  </div>
                  <div onClick={() => { setShowColModal(true); showColModalRef.current = true; setFocusSection("subtabs"); focusSectionRef.current = "subtabs"; setSubtabFocusIndex(colModalIdx); subtabFocusIndexRef.current = colModalIdx; }}
                    style={actionBtnStyle(focusSection === "subtabs" && subtabFocusIndex === colModalIdx)}>
                    {t('collections.manage')}
                  </div>
                </div>

            {/* ── PINNED — same card size/style as main grid ── */}
            {pinnedAppsReactive.length > 0 && !(tab === "Games" && gameSourceTab !== "All") && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 0 10px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: theme.textFaint }}>{t('grid.pinned')}</div>
                  <div style={{ fontSize: 10, color: theme.textFaint, opacity: 0.6 }}>{t('grid.unpinHint')}</div>
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
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${effectiveGameCols}, minmax(0, 1fr))`, gap: 12, paddingBottom: 100 }}>
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
          ); })()}
        </div>

        {/* Bottom bar */}
        <AppBottomBar
          tab={tab}
          appCollectionsCount={appCollections.length}
        />
      </div>

      {contextMenu && (() => {
        const ctxItems = [
          { label: t('contextMenu.open'),      action: () => { triggerLaunch(contextMenu.app, recentRef.current); setContextMenu(null); contextMenuRef.current = null; } },
          { label: t(hidden.includes(contextMenu.app.id) ? 'contextMenu.show' : 'contextMenu.hide'), action: () => { toggleHidden(contextMenu.app.id); setContextMenu(null); contextMenuRef.current = null; } },
          { label: t(pins.includes(contextMenu.app.id) ? 'contextMenu.unpin' : 'contextMenu.pin'), action: () => { togglePin(contextMenu.app); setContextMenu(null); contextMenuRef.current = null; } },
          { label: t('contextMenu.changeArt'), action: () => { setArtPickerMode("grid"); artPickerModeRef.current = "grid"; setArtPickerApp(contextMenu.app); artPickerAppRef.current = contextMenu.app; setContextMenu(null); contextMenuRef.current = null; } },
          ...(contextMenu.app.app_type === "game"
            ? [{ label: t('contextMenu.changeHeroArt'), action: () => { setArtPickerMode("hero"); artPickerModeRef.current = "hero"; setArtPickerApp(contextMenu.app); artPickerAppRef.current = contextMenu.app; setContextMenu(null); contextMenuRef.current = null; } }]
            : []),
          { label: t('contextMenu.collections'), action: () => { setColPickerApp(contextMenu.app); setContextMenu(null); contextMenuRef.current = null; } },
          ...(contextMenu.app.id.startsWith("custom_")
            ? [{ label: t('contextMenu.rename'), action: () => { setEditNameApp(contextMenu.app); setContextMenu(null); contextMenuRef.current = null; } }]
            : []),
          ...(contextMenu.app.id.startsWith("custom_")
            ? [{ label: t('contextMenu.delete'), danger: true, action: () => { setConfirmDelete(contextMenu.app); confirmDeleteRef.current = contextMenu.app; setContextMenu(null); contextMenuRef.current = null; } }]
            : []),
        ];
        return (
          <ContextMenuModal
            app={contextMenu.app}
            items={ctxItems}
            onClose={() => { setContextMenu(null); contextMenuRef.current = null; }}
          />
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
    </GamepadProvider>
    </SettingsProvider>
    </ThemeProvider>
  );
}