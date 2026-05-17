import React from "react";
import type { AccentConfig } from "../../constants";

interface Props { accent: AccentConfig; }

const SKYLINE_PATH = `
  M0,280
  L0,220 L28,220 L28,210 L56,210 L56,220 L80,220
  L80,195 L100,195 L100,188 L112,188 L112,180 L124,180
  L124,188 L136,188 L136,195 L158,195 L158,185
  L170,185 L170,175 L185,175 L185,165 L200,165
  L200,155 L215,155 L215,145 L230,145 L230,135
  L230,132 L233,132 L233,128 L237,128 L237,125
  L240,125 L240,128 L244,128 L244,132 L247,132
  L247,135 L260,135 L260,155 L278,155 L278,148
  L290,148 L290,140 L304,140 L304,148 L318,148
  L318,162 L335,162 L335,155 L350,155 L350,168
  L368,168 L368,160 L382,160 L382,172 L400,172
  L400,162 L414,162 L414,152 L428,152 L428,140
  L442,140 L442,130 L456,130 L456,118
  L458,118 L458,110 L462,110 L462,105 L466,105
  L466,102 L470,102 L470,98 L474,98 L474,102
  L478,102 L478,105 L482,105 L482,110 L486,110
  L486,118 L488,118
  L488,108 L500,108 L500,96
  L502,96 L502,88 L506,88 L506,84 L510,84
  L510,80 L514,80 L514,76 L518,76 L518,72
  L520,72 L520,68 L524,68 L524,64 L528,64
  L528,62 L532,62 L532,58 L534,58
  L534,54 L536,54 L536,50 L538,50 L538,48
  L540,48 L540,50 L542,50 L542,54 L544,54
  L544,58 L546,58 L546,62 L550,62 L550,58
  L554,58 L554,64 L558,64 L558,70 L562,70
  L562,76 L566,76 L566,80 L570,80 L570,88
  L574,88 L574,96 L578,96 L578,108 L590,108
  L590,95 L604,95 L604,85 L618,85 L618,95
  L632,95 L632,105 L648,105 L648,118
  L662,118 L662,108 L678,108 L678,118
  L692,118 L692,128 L708,128 L708,138
  L722,138 L722,128 L736,128 L736,118
  L750,118 L750,108 L765,108 L765,100
  L768,100 L768,96 L772,96 L772,92 L776,92
  L776,88 L780,88 L780,84 L784,84 L784,80
  L786,80 L786,76 L790,76 L790,80 L794,80
  L794,84 L798,84 L798,88 L802,88 L802,92
  L806,92 L806,96 L810,96 L810,100
  L814,100 L814,112 L828,112 L828,122
  L844,122 L844,132 L858,132 L858,120
  L872,120 L872,132 L888,132 L888,142
  L904,142 L904,152 L918,152 L918,165
  L932,165 L932,152 L946,152 L946,142
  L960,142 L960,130 L974,130 L974,120
  L990,120 L990,112 L1004,112 L1004,122
  L1018,122 L1018,132 L1034,132 L1034,142
  L1050,142 L1050,152 L1064,152 L1064,165
  L1080,165 L1080,175 L1096,175 L1096,162
  L1112,162 L1112,155 L1128,155 L1128,165
  L1144,165 L1144,175 L1160,175 L1160,185
  L1175,185 L1175,195 L1192,195 L1192,185
  L1208,185 L1208,175 L1224,175 L1224,165
  L1240,165 L1240,155 L1254,155 L1254,148
  L1268,148 L1268,158 L1284,158 L1284,168
  L1300,168 L1300,158 L1314,158 L1314,168
  L1330,168 L1330,178 L1346,178 L1346,188
  L1362,188 L1362,195 L1378,195 L1378,205
  L1394,205 L1394,195 L1410,195 L1410,185
  L1426,185 L1426,178 L1442,178 L1442,188
  L1456,188 L1456,198 L1470,198 L1470,210
  L1486,210 L1486,220 L1504,220 L1504,212
  L1520,212 L1520,205 L1536,205 L1536,212
  L1552,212 L1552,220 L1570,220 L1570,228
  L1590,228 L1590,220 L1606,220 L1606,228
  L1622,228 L1622,238 L1640,238 L1640,228
  L1660,228 L1660,220 L1678,220 L1678,228
  L1696,228 L1696,235 L1714,235 L1714,228
  L1732,228 L1732,238 L1750,238 L1750,248
  L1770,248 L1770,238 L1788,238 L1788,248
  L1806,248 L1806,255 L1826,255 L1826,262
  L1848,262 L1848,268 L1870,268 L1870,262
  L1892,262 L1892,268 L1920,268
  L1920,280 Z
`;

const WINDOW_LIGHTS = [
  [88, 200, "#ffd080", 0.9], [95, 196, "#ffd080", 0.7], [104, 192, "#a0c8ff", 0.8],
  [115, 185, "#ffd080", 0.6], [128, 183, "#ffd080", 0.9], [172, 178, "#a0c8ff", 0.8],
  [180, 168, "#ffd080", 0.7], [188, 168, "#ffd080", 0.9], [196, 158, "#a0c8ff", 0.6],
  [204, 158, "#ffd080", 0.8], [212, 148, "#ffd080", 0.7], [220, 138, "#a0c8ff", 0.9],
  [264, 138, "#ffd080", 0.8], [272, 145, "#a0c8ff", 0.7], [280, 152, "#ffd080", 0.9],
  [292, 145, "#ffd080", 0.6], [306, 152, "#a0c8ff", 0.8], [340, 158, "#ffd080", 0.7],
  [354, 158, "#ffd080", 0.9], [370, 162, "#a0c8ff", 0.6], [384, 165, "#ffd080", 0.8],
  [402, 165, "#ffd080", 0.7], [416, 155, "#a0c8ff", 0.9], [424, 142, "#ffd080", 0.8],
  [432, 132, "#ffd080", 0.7], [440, 132, "#a0c8ff", 0.6], [448, 120, "#ffd080", 0.9],
  [456, 120, "#ffd080", 0.8], [496, 100, "#a0c8ff", 0.9], [504, 92, "#ffd080", 0.8],
  [512, 84, "#a0c8ff", 0.7], [520, 72, "#ffd080", 0.9], [512, 92, "#ffd080", 0.6],
  [504, 100, "#a0c8ff", 0.8], [496, 112, "#ffd080", 0.7], [596, 98, "#a0c8ff", 0.8],
  [606, 88, "#ffd080", 0.9], [620, 88, "#ffd080", 0.7], [634, 98, "#a0c8ff", 0.6],
  [650, 108, "#ffd080", 0.8], [664, 112, "#ffd080", 0.9], [680, 112, "#a0c8ff", 0.7],
  [770, 104, "#ffd080", 0.8], [778, 92, "#a0c8ff", 0.9], [786, 80, "#ffd080", 0.7],
  [794, 84, "#ffd080", 0.8], [802, 92, "#a0c8ff", 0.6], [810, 104, "#ffd080", 0.9],
  [862, 122, "#ffd080", 0.8], [874, 122, "#a0c8ff", 0.7], [892, 135, "#ffd080", 0.9],
  [906, 145, "#ffd080", 0.6], [920, 155, "#a0c8ff", 0.8], [962, 132, "#ffd080", 0.7],
  [978, 122, "#ffd080", 0.9], [994, 115, "#a0c8ff", 0.8], [1006, 125, "#ffd080", 0.7],
  [1100, 178, "#ffd080", 0.8], [1115, 165, "#a0c8ff", 0.7], [1130, 158, "#ffd080", 0.9],
  [1148, 168, "#ffd080", 0.6], [1164, 178, "#a0c8ff", 0.8], [1210, 178, "#ffd080", 0.7],
  [1226, 168, "#ffd080", 0.9], [1244, 158, "#a0c8ff", 0.8],
] as const;

export default function CyberpunkBg({ accent }: Props) {
  const edgeColor = accent.primary || "#d05090";

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: -2, pointerEvents: "none", background: "linear-gradient(180deg,#01030a,#020510,#030818,#010306)" }} />
      <div className="theme-cyberpunk-glow" style={{ position: "fixed", inset: "-12%", zIndex: -1, pointerEvents: "none", background: `radial-gradient(ellipse 50% 26% at 14% 82%, color-mix(in srgb, ${accent.primary} 55%, rgba(0,200,255,0.28) 45%) 0%, transparent 64%)`, filter: "blur(40px)", mixBlendMode: "screen", opacity: 0.48 }} />
      <div className="theme-cyberpunk-glow-2" style={{ position: "fixed", inset: "-12%", zIndex: -1, pointerEvents: "none", background: "radial-gradient(ellipse 44% 24% at 86% 78%, rgba(255,20,140,0.44) 0%, transparent 60%)", filter: "blur(44px)", mixBlendMode: "screen", opacity: 0.40 }} />
      <div className="theme-cyberpunk-horizon" style={{ position: "fixed", left: 0, right: 0, bottom: "20%", height: 3, zIndex: -1, pointerEvents: "none", background: `linear-gradient(90deg,transparent,rgba(255,20,160,0.72) 22%,color-mix(in srgb,${accent.primary} 80%,white 20%) 50%,rgba(255,20,160,0.72) 78%,transparent)`, filter: "blur(2px)" }} />

      <svg
        className="theme-skyline"
        viewBox="0 0 1920 280"
        preserveAspectRatio="xMidYMax meet"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ position: "fixed", left: 0, right: 0, bottom: "14%", width: "100%", height: "30%", minHeight: 180, zIndex: -1, pointerEvents: "none", overflow: "visible" }}
      >
        <defs>
          <linearGradient id="skylineGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={edgeColor} stopOpacity="0" />
            <stop offset="60%" stopColor={edgeColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={edgeColor} stopOpacity="0.38" />
          </linearGradient>
          <linearGradient id="bldgFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0e1428" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#080d1a" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="bldgEdge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={edgeColor} stopOpacity="0.45" />
            <stop offset="30%" stopColor={edgeColor} stopOpacity="0" />
          </linearGradient>
          <filter id="winGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="spireGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect x="0" y="180" width="1920" height="100" fill="url(#skylineGlow)" />
        <path fill="url(#bldgFill)" d={SKYLINE_PATH} />
        <path fill="url(#bldgEdge)" d={SKYLINE_PATH} />

        <g filter="url(#winGlow)" opacity="0.7">
          {WINDOW_LIGHTS.map(([x, y, fill, opacity], index) => (
            <rect key={`${x}-${y}-${index}`} x={x} y={y} width="3" height="2" fill={fill} opacity={opacity} />
          ))}
        </g>

        <g filter="url(#spireGlow)">
          <circle cx="538" cy="47" r="2.5" fill={edgeColor} opacity="0.9" />
          <circle cx="538" cy="47" r="5" fill={edgeColor} opacity="0.25" />
          <circle cx="788" cy="75" r="2" fill={edgeColor} opacity="0.7" />
          <circle cx="788" cy="75" r="4" fill={edgeColor} opacity="0.18" />
          <circle cx="462" cy="103" r="1.8" fill={edgeColor} opacity="0.6" />
        </g>
      </svg>

      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", backgroundImage: "repeating-linear-gradient(180deg,transparent 0px,transparent 3px,rgba(0,0,0,0.055) 3px,rgba(0,0,0,0.055) 4px)", opacity: 0.50 }} />
      <div className="theme-cyberpunk-flicker-1" style={{ position: "fixed", top: "11%", left: "5%", width: 2, height: 28, zIndex: 1, pointerEvents: "none", background: `linear-gradient(180deg,transparent,${accent.primary},transparent)`, filter: `blur(1px) drop-shadow(0 0 4px ${accent.primary})` }} />
      <div className="theme-cyberpunk-flicker-2" style={{ position: "fixed", top: "17%", right: "7%", width: 2, height: 20, zIndex: 1, pointerEvents: "none", background: "linear-gradient(180deg,transparent,rgba(255,20,160,0.9),transparent)", filter: "blur(1px) drop-shadow(0 0 4px rgba(255,20,160,0.9))" }} />
      <div id="cyberpunk-rain-container" style={{ position: "fixed", inset: 0, zIndex: 2, pointerEvents: "none", overflow: "hidden" }} />
    </>
  );
}
