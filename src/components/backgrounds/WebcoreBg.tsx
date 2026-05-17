import React, { useState, useEffect, useRef } from "react";
import type { AccentConfig } from "../../constants";

interface Props { accent: AccentConfig; }

// Blurred puff: the core primitive.
interface PuffProps {
  left: string; top: string;
  w: string; h: string;
  blur: number; opacity: number;
  color?: string;
}
function Puff({ left, top, w, h, blur, opacity, color = "255,255,255" }: PuffProps) {
  return (
    <div style={{
      position: "absolute", left, top, width: w, height: h,
      borderRadius: "50%",
      background: `rgba(${color},${opacity})`,
      filter: `blur(${blur}px)`,
      pointerEvents: "none",
    }} />
  );
}

function Cloud1() {
  return (
    <div style={{ position:"absolute", left:"-4%", top:"-6%", width:"45%", height:"38%", pointerEvents:"none" }}>
      <Puff left="10%" top="20%" w="62%" h="55%" blur={38} opacity={0.92} />
      <Puff left="22%" top="10%" w="54%" h="50%" blur={34} opacity={0.88} />
      <Puff left="35%" top="5%"  w="48%" h="46%" blur={32} opacity={0.90} />
      <Puff left="5%"  top="30%" w="44%" h="42%" blur={30} opacity={0.80} />
      <Puff left="48%" top="18%" w="40%" h="38%" blur={28} opacity={0.82} />
      <Puff left="60%" top="10%" w="36%" h="35%" blur={30} opacity={0.78} />
      <Puff left="0%"  top="40%" w="35%" h="30%" blur={50} opacity={0.40} />
      <Puff left="70%" top="25%" w="30%" h="28%" blur={48} opacity={0.38} />
      <Puff left="55%" top="38%" w="32%" h="26%" blur={52} opacity={0.32} />
      <Puff left="30%" top="2%"  w="28%" h="30%" blur={22} opacity={0.95} />
      <Puff left="42%" top="0%"  w="24%" h="26%" blur={20} opacity={0.92} />
      <Puff left="8%"  top="52%" w="70%" h="22%" blur={44} opacity={0.18} color="140,168,200" />
      <Puff left="18%" top="58%" w="55%" h="16%" blur={40} opacity={0.12} color="140,168,200" />
    </div>
  );
}

function Cloud2() {
  return (
    <div style={{ position:"absolute", left:"30%", top:"-8%", width:"38%", height:"34%", pointerEvents:"none" }}>
      <Puff left="12%" top="24%" w="58%" h="50%" blur={36} opacity={0.88} />
      <Puff left="25%" top="12%" w="50%" h="44%" blur={32} opacity={0.85} />
      <Puff left="38%" top="6%"  w="44%" h="40%" blur={30} opacity={0.87} />
      <Puff left="6%"  top="32%" w="40%" h="36%" blur={28} opacity={0.75} />
      <Puff left="52%" top="16%" w="36%" h="33%" blur={28} opacity={0.78} />
      <Puff left="62%" top="8%"  w="30%" h="30%" blur={32} opacity={0.72} />
      <Puff left="28%" top="2%"  w="26%" h="28%" blur={20} opacity={0.90} />
      <Puff left="40%" top="-2%" w="22%" h="25%" blur={18} opacity={0.88} />
      <Puff left="-2%" top="42%" w="30%" h="24%" blur={52} opacity={0.34} />
      <Puff left="68%" top="30%" w="28%" h="22%" blur={50} opacity={0.30} />
      <Puff left="10%" top="54%" w="66%" h="20%" blur={42} opacity={0.16} color="140,168,200" />
    </div>
  );
}

function Cloud3() {
  return (
    <div style={{ position:"absolute", right:"-2%", top:"-4%", width:"32%", height:"28%", pointerEvents:"none" }}>
      <Puff left="14%" top="26%" w="54%" h="46%" blur={40} opacity={0.82} />
      <Puff left="28%" top="14%" w="46%" h="40%" blur={35} opacity={0.80} />
      <Puff left="42%" top="8%"  w="38%" h="34%" blur={30} opacity={0.82} />
      <Puff left="8%"  top="36%" w="36%" h="30%" blur={32} opacity={0.68} />
      <Puff left="58%" top="18%" w="30%" h="28%" blur={28} opacity={0.70} />
      <Puff left="30%" top="2%"  w="24%" h="24%" blur={20} opacity={0.86} />
      <Puff left="0%"  top="48%" w="28%" h="20%" blur={58} opacity={0.28} />
      <Puff left="65%" top="35%" w="26%" h="18%" blur={55} opacity={0.26} />
      <Puff left="75%" top="22%" w="22%" h="20%" blur={52} opacity={0.28} />
      <Puff left="10%" top="56%" w="60%" h="18%" blur={44} opacity={0.14} color="140,168,200" />
    </div>
  );
}

function Cloud4() {
  return (
    <div style={{ position:"absolute", left:"4%", top:"18%", width:"26%", height:"26%", pointerEvents:"none" }}>
      <Puff left="16%" top="28%" w="50%" h="44%" blur={34} opacity={0.75} />
      <Puff left="28%" top="14%" w="42%" h="38%" blur={30} opacity={0.72} />
      <Puff left="40%" top="8%"  w="34%" h="32%" blur={26} opacity={0.74} />
      <Puff left="8%"  top="38%" w="34%" h="28%" blur={30} opacity={0.62} />
      <Puff left="52%" top="20%" w="28%" h="26%" blur={26} opacity={0.65} />
      <Puff left="30%" top="4%"  w="20%" h="22%" blur={18} opacity={0.80} />
      <Puff left="0%"  top="50%" w="25%" h="16%" blur={52} opacity={0.25} />
      <Puff left="62%" top="36%" w="22%" h="16%" blur={48} opacity={0.22} />
      <Puff left="10%" top="56%" w="56%" h="16%" blur={40} opacity={0.12} color="140,168,200" />
    </div>
  );
}

function Cloud5() {
  return (
    <div style={{ position:"absolute", right:"6%", top:"14%", width:"22%", height:"22%", pointerEvents:"none" }}>
      <Puff left="18%" top="30%" w="46%" h="40%" blur={32} opacity={0.70} />
      <Puff left="30%" top="16%" w="38%" h="34%" blur={28} opacity={0.68} />
      <Puff left="42%" top="10%" w="32%" h="30%" blur={24} opacity={0.70} />
      <Puff left="10%" top="38%" w="30%" h="25%" blur={28} opacity={0.55} />
      <Puff left="52%" top="22%" w="26%" h="24%" blur={24} opacity={0.58} />
      <Puff left="32%" top="6%"  w="18%" h="20%" blur={16} opacity={0.78} />
      <Puff left="0%"  top="52%" w="22%" h="14%" blur={50} opacity={0.20} />
      <Puff left="62%" top="38%" w="20%" h="14%" blur={46} opacity={0.18} />
      <Puff left="12%" top="58%" w="52%" h="14%" blur={38} opacity={0.10} color="140,168,200" />
    </div>
  );
}

function Cloud6() {
  return (
    <div style={{ position:"absolute", left:"18%", top:"2%", width:"55%", height:"16%", pointerEvents:"none" }}>
      <Puff left="0%"  top="20%" w="100%" h="60%" blur={55} opacity={0.30} />
      <Puff left="8%"  top="10%" w="80%"  h="55%" blur={48} opacity={0.25} />
      <Puff left="20%" top="0%"  w="60%"  h="50%" blur={42} opacity={0.28} />
      <Puff left="35%" top="5%"  w="40%"  h="44%" blur={38} opacity={0.22} />
    </div>
  );
}

function LiftOffLogo({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 210 58"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: 210, height: 58, display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id="wbRocketGrad" x1="16" y1="2" x2="16" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.72" />
        </linearGradient>
      </defs>
      <g transform="translate(0,4) scale(1.14)">
        <path d="M16 2 L21 9 L22 19 Q22 22 19 22 L13 22 Q10 22 10 19 L11 9 Z" fill="url(#wbRocketGrad)" />
        <circle cx="16" cy="13" r="3.5" fill="white" opacity="0.88" />
        <circle cx="16" cy="13" r="2.0" fill="#bde0ff" opacity="0.60" />
        <circle cx="17" cy="11.8" r="0.7" fill="white" />
        <path d="M10 18 L5 25 L11 21 Z" fill={color} opacity="0.82" />
        <path d="M22 18 L27 25 L21 21 Z" fill={color} opacity="0.82" />
        <path d="M12 22 Q14 30 16 27 Q18 30 20 22" fill={color} opacity="0.55" />
        <path d="M13.5 22 Q15 28 16 26 Q17 28 18.5 22" fill="white" opacity="0.35" />
      </g>
      <text
        x="36" y="42"
        fontFamily="'Helvetica Neue', Arial, system-ui, sans-serif"
        fontWeight="800"
        fontSize="36"
        letterSpacing="-1.2"
        fill={color}
      >
        LiftOff
      </text>
    </svg>
  );
}

const LOGO_W = 210;
const LOGO_H = 58;

function BouncingLogo({ accent }: { accent: AccentConfig }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 180, y: 120 });
  const velRef = useRef({ x: 1.5, y: 1.1 });
  const rafRef = useRef<number | null>(null);
  const [pos, setPos] = useState({ x: 180, y: 120 });
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const tick = () => {
      const containerRect = container.getBoundingClientRect();
      const scaleY = containerRect.height / (container.offsetHeight || containerRect.height || 1);
      const cw = container.offsetWidth || containerRect.width;
      const ch = container.offsetHeight || containerRect.height;
      const navBottom = Array.from(document.querySelectorAll<HTMLElement>("[data-liftoff-nav-boundary]"))
        .reduce((bottom, el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0 || rect.bottom <= containerRect.top) return bottom;
          return Math.max(bottom, (rect.bottom - containerRect.top) / (scaleY || 1));
        }, 0);
      const maxX = Math.max(0, cw - LOGO_W);
      const maxY = Math.max(0, ch - LOGO_H);
      const minY = Math.min(maxY, Math.max(0, navBottom));
      const p = posRef.current;
      const v = velRef.current;

      let nx = p.x + v.x;
      let ny = p.y + v.y;
      let hitX = false, hitY = false;

      if (nx <= 0) { nx = 0; v.x = Math.abs(v.x); hitX = true; }
      if (nx >= maxX) { nx = maxX; v.x = -Math.abs(v.x); hitX = true; }
      if (ny <= minY) { ny = minY; v.y = Math.abs(v.y); hitY = true; }
      if (ny >= maxY) { ny = maxY; v.y = -Math.abs(v.y); hitY = true; }

      if (hitX && hitY) {
        setFlash(true);
        setTimeout(() => setFlash(false), 400);
      }

      posRef.current = { x: nx, y: ny };
      setPos({ x: nx, y: ny });
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none" }}>
      {flash && (
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 80% 80% at 50% 50%, rgba(255,255,255,0.28) 0%, transparent 70%)",
        }} />
      )}
      <div style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        width: LOGO_W,
        height: LOGO_H,
        filter: `drop-shadow(0 2px 16px ${accent.glow}0.45)) drop-shadow(0 0 5px ${accent.glow}0.28))`,
      }}>
        <LiftOffLogo color={accent.primary} />
      </div>
    </div>
  );
}

export default function WebcoreBg({ accent }: Props) {
  return (
    <>
      <div style={{
        position: "fixed", inset: 0, zIndex: -2, pointerEvents: "none",
        background: "linear-gradient(180deg, #5c9dc8 0%, #7ab4d8 28%, #9ecae4 55%, #bddaf0 78%, #d4eaf8 100%)",
      }} />
      <div style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none", overflow: "hidden" }}>
        <Cloud6 />
        <Cloud1 />
        <Cloud2 />
        <Cloud3 />
        <Cloud4 />
        <Cloud5 />
      </div>
      <BouncingLogo accent={accent} />
    </>
  );
}
