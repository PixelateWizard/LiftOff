import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

const startingSound = new URL("../../assets/appLaunchSound.wav", import.meta.url).href;

interface SplashScreenProps {
  exiting: boolean;
}

const ss: Record<string, CSSProperties> = {
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

export function SplashScreen({ exiting }: SplashScreenProps) {
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
