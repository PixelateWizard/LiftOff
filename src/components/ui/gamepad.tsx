import type { CSSProperties, ReactNode } from "react";
import { SiPlaystation } from "react-icons/si";
import { FaXbox } from "react-icons/fa6";
import { useGamepadIcons } from "../../contexts/GamepadContext";
import { useTheme } from "../../contexts/ThemeContext";

export type GamepadPlatform = "xbox" | "ps" | "switch";

export interface GamepadIconProps {
  size?: number;
  colored?: boolean;
  filled?: boolean;
  style?: CSSProperties;
}

const XBOX = { A: "#4CAF50", B: "#E53935", X: "#1E88E5", Y: "#F9A825", guide: "#107C10" };
const PS   = { cross: "#4F86C4", circle: "#C94D4D", square: "#9B66CC", triangle: "#5AAA78", home: "#003087" };
const SW   = { A: "#E4000F",  B: "#F5A800",  X: "#0AB9E6",  Y: "#00A652" };

const NEUTRAL_TEXT = "#1e1e2e"; // dark label on white-filled buttons

type SymbolFn = (iconColor: string) => ReactNode;

// ── Face button (circle) ─────────────────────────────────────────────────────

function makeFaceBtn(brandColor: string, symbol: SymbolFn) {
  return function FaceBtn({ size = 24, colored = false, filled = true, style }: GamepadIconProps) {
    const fg = colored ? brandColor : "white";
    const ic = filled ? (colored ? "white" : NEUTRAL_TEXT) : fg;
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        style={{ display: "inline-block", flexShrink: 0, verticalAlign: "middle", ...style }}>
        {filled
          ? <circle cx="12" cy="12" r="11" fill={fg} />
          : <circle cx="12" cy="12" r="10.25" stroke={fg} strokeWidth="1.5" />}
        {symbol(ic)}
      </svg>
    );
  };
}

// ── Bumper — rounded chamfer top corners, small rounded bottom corners (28×16) ─
// Top corners use a large-radius quarter-circle curve (Q control at corner apex)
// giving the chamfered silhouette but with smooth, well-rounded angles.
const BUMPER_PATH = "M3 15 L25 15 Q27 15 27 13 L27 6 Q27 1 22 1 L6 1 Q1 1 1 6 L1 13 Q1 15 3 15 Z";

function makeBumperBtn(label: string) {
  return function BumperBtn({ size = 16, colored: _c = false, filled = true, style }: GamepadIconProps) {
    const { themeColor } = useGamepadIcons();
    const fillColor    = themeColor ?? "white";
    const textColor    = themeColor ? "white" : NEUTRAL_TEXT;
    const outlineColor = themeColor ?? "white";
    const h = size;
    const w = Math.round(h * 28 / 16);
    return (
      <svg width={w} height={h} viewBox="0 0 28 16" fill="none"
        style={{ display: "inline-block", flexShrink: 0, verticalAlign: "middle", ...style }}>
        {filled
          ? <path d={BUMPER_PATH} fill={fillColor} />
          : <path d={BUMPER_PATH} stroke={outlineColor} strokeWidth="1.5" fill="none" />}
        <text x="14" y="8" textAnchor="middle" dy="0.35em" fontSize="7.5" fontWeight="700"
          fill={filled ? textColor : outlineColor}
          fontFamily="system-ui, -apple-system, sans-serif">{label}</text>
      </svg>
    );
  };
}

// ── Trigger — portrait rounded rect, clearly taller than wide (22×28) ────────

function makeTriggerBtn(label: string) {
  return function TriggerBtn({ size = 28, colored: _c = false, filled = true, style }: GamepadIconProps) {
    const { themeColor } = useGamepadIcons();
    const fillColor    = themeColor ?? "white";
    const textColor    = themeColor ? "white" : NEUTRAL_TEXT;
    const outlineColor = themeColor ?? "white";
    const h = size;
    const w = Math.round(h * 22 / 28);
    return (
      <svg width={w} height={h} viewBox="0 0 22 28" fill="none"
        style={{ display: "inline-block", flexShrink: 0, verticalAlign: "middle", ...style }}>
        {filled
          ? <rect x="1" y="1" width="20" height="26" rx="6" fill={fillColor} />
          : <rect x="1.5" y="1.5" width="19" height="25" rx="5.5" stroke={outlineColor} strokeWidth="1.5" fill="none" />}
        <text x="11" y="14" textAnchor="middle" dy="0.35em" fontSize="9" fontWeight="700"
          fill={filled ? textColor : outlineColor}
          fontFamily="system-ui, -apple-system, sans-serif">{label}</text>
      </svg>
    );
  };
}

// ── Small rounded square — Menu/Options/View/Create (20×20) ──────────────────

function makeSquareBtn(symbol: SymbolFn) {
  return function SquareBtn({ size = 20, colored: _c = false, filled = true, style }: GamepadIconProps) {
    const { themeColor } = useGamepadIcons();
    const fillColor    = themeColor ?? "white";
    const textColor    = themeColor ? "white" : NEUTRAL_TEXT;
    const outlineColor = themeColor ?? "white";
    const ic = filled ? textColor : outlineColor;
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none"
        style={{ display: "inline-block", flexShrink: 0, verticalAlign: "middle", ...style }}>
        {filled
          ? <rect x="1" y="1" width="18" height="18" rx="4" fill={fillColor} />
          : <rect x="1.5" y="1.5" width="17" height="17" rx="3.5" stroke={outlineColor} strokeWidth="1.5" fill="none" />}
        {symbol(ic)}
      </svg>
    );
  };
}

// ── Circle button with custom symbol ─────────────────────────────────────────

function makeCircleBtn(symbol: SymbolFn) {
  return function CircleBtn({ size = 24, colored: _c = false, filled = true, style }: GamepadIconProps) {
    const { themeColor } = useGamepadIcons();
    const fillColor    = themeColor ?? "white";
    const textColor    = themeColor ? "white" : NEUTRAL_TEXT;
    const outlineColor = themeColor ?? "white";
    const ic = filled ? textColor : outlineColor;
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        style={{ display: "inline-block", flexShrink: 0, verticalAlign: "middle", ...style }}>
        {filled
          ? <circle cx="12" cy="12" r="11" fill={fillColor} />
          : <circle cx="12" cy="12" r="10.25" stroke={outlineColor} strokeWidth="1.5" />}
        {symbol(ic)}
      </svg>
    );
  };
}

// ── Shared symbols ────────────────────────────────────────────────────────────

const letter = (l: string) => (ic: string) => (
  <text x="12" y="12" textAnchor="middle" dy="0.35em" fontSize="11" fontWeight="700" fill={ic}
    fontFamily="system-ui, -apple-system, sans-serif">{l}</text>
);

const symMenu = (ic: string) => (
  <>
    <line x1="5" y1="7"  x2="15" y2="7"  stroke={ic} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="5" y1="10" x2="15" y2="10" stroke={ic} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="5" y1="13" x2="15" y2="13" stroke={ic} strokeWidth="1.5" strokeLinecap="round"/>
  </>
);

const symView = (ic: string) => (
  <>
    <rect x="4"   y="5.5" width="7.5" height="5.5" rx="1" stroke={ic} strokeWidth="1.2" fill="none"/>
    <rect x="8.5" y="9"   width="7.5" height="5.5" rx="1" stroke={ic} strokeWidth="1.2" fill="none"/>
  </>
);

const symShare = (ic: string) => (
  <>
    <path d="M10 12.5V7.5M10 7.5L8 9.5M10 7.5L12 9.5"
      stroke={ic} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 11V15H13V11"
      stroke={ic} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </>
);

const symPlus    = (ic: string) => <path d="M12 7V17M7 12H17" stroke={ic} strokeWidth="2" strokeLinecap="round"/>;
const symMinus   = (ic: string) => <path d="M7 12H17" stroke={ic} strokeWidth="2" strokeLinecap="round"/>;
const symHome    = (ic: string) => <path d="M12 6.25L18.5 11.75V17.75H14.5V14.25H9.5V17.75H5.5V11.75L12 6.25Z" fill={ic}/>;
const symCapture = (ic: string) => (
  <>
    <circle cx="12" cy="12" r="4.5" stroke={ic} strokeWidth="1.5" fill="none"/>
    <circle cx="12" cy="12" r="1.5" fill={ic}/>
  </>
);

// ── Xbox buttons ──────────────────────────────────────────────────────────────

export const XboxA  = makeFaceBtn(XBOX.A, letter("A"));
export const XboxB  = makeFaceBtn(XBOX.B, letter("B"));
export const XboxX  = makeFaceBtn(XBOX.X, letter("X"));
export const XboxY  = makeFaceBtn(XBOX.Y, letter("Y"));
export const XboxLB = makeBumperBtn("LB");
export const XboxRB = makeBumperBtn("RB");
export const XboxLT = makeTriggerBtn("LT");
export const XboxRT = makeTriggerBtn("RT");
export const XboxMenu = makeSquareBtn(symMenu);
export const XboxView = makeSquareBtn(symView);

export function XboxGuide({ size = 24, colored = false, filled: _f = true, style }: GamepadIconProps) {
  const { themeColor } = useGamepadIcons();
  const color = colored ? XBOX.guide : (themeColor ?? "white");
  return <FaXbox size={size} color={color} style={{ display: "inline-block", flexShrink: 0, verticalAlign: "middle", ...style }} />;
}

// ── PlayStation buttons ───────────────────────────────────────────────────────

export const PsCross    = makeFaceBtn(PS.cross,    ic => <path d="M8.5 8.5L15.5 15.5M15.5 8.5L8.5 15.5" stroke={ic} strokeWidth="2.2" strokeLinecap="round" />);
export const PsCircle   = makeFaceBtn(PS.circle,   ic => <circle cx="12" cy="12" r="4.5" stroke={ic} strokeWidth="2" fill="none" />);
export const PsSquare   = makeFaceBtn(PS.square,   ic => <rect x="7.5" y="7.5" width="9" height="9" rx="0.5" stroke={ic} strokeWidth="2" fill="none" />);
export const PsTriangle = makeFaceBtn(PS.triangle, ic => <path d="M12 7.5L17.2 16.5H6.8Z" stroke={ic} strokeWidth="2" strokeLinejoin="round" fill="none" />);
export const PsL1 = makeBumperBtn("L1");
export const PsR1 = makeBumperBtn("R1");
export const PsL2 = makeTriggerBtn("L2");
export const PsR2 = makeTriggerBtn("R2");
export const PsOptions = makeSquareBtn(symMenu);
export const PsCreate  = makeSquareBtn(symShare);

export function PsHome({ size = 24, colored = false, filled: _f = true, style }: GamepadIconProps) {
  const { themeColor } = useGamepadIcons();
  const color = colored ? PS.home : (themeColor ?? "white");
  return <SiPlaystation size={size} color={color} style={{ display: "inline-block", flexShrink: 0, verticalAlign: "middle", ...style }} />;
}

// ── Nintendo Switch buttons ───────────────────────────────────────────────────

export const SwA  = makeFaceBtn(SW.A, letter("A"));
export const SwB  = makeFaceBtn(SW.B, letter("B"));
export const SwX  = makeFaceBtn(SW.X, letter("X"));
export const SwY  = makeFaceBtn(SW.Y, letter("Y"));
export const SwL  = makeBumperBtn("L");
export const SwR  = makeBumperBtn("R");
export const SwZL = makeTriggerBtn("ZL");
export const SwZR = makeTriggerBtn("ZR");
export const SwPlus    = makeCircleBtn(symPlus);
export const SwMinus   = makeCircleBtn(symMinus);
export const SwHome    = makeCircleBtn(symHome);
export const SwCapture = makeCircleBtn(symCapture);

export const PLATFORM_TRIGGER_LABELS: Record<GamepadPlatform, [string, string]> = {
  xbox:   ["LT", "RT"],
  ps:     ["L2", "R2"],
  switch: ["ZL", "ZR"],
};

// ── Settings preview panel ────────────────────────────────────────────────────

type BtnComponent = (props: GamepadIconProps) => React.JSX.Element;

const PLATFORM_BUTTONS: Record<GamepadPlatform, {
  face:     Array<{ label: string; Btn: BtnComponent }>;
  bumpers:  Array<{ label: string; Btn: BtnComponent }>;
  triggers: Array<{ label: string; Btn: BtnComponent }>;
  system:   Array<{ label: string; Btn: BtnComponent }>;
}> = {
  xbox: {
    face:     [{ label: "A", Btn: XboxA }, { label: "B", Btn: XboxB }, { label: "X", Btn: XboxX }, { label: "Y", Btn: XboxY }],
    bumpers:  [{ label: "LB", Btn: XboxLB }, { label: "RB", Btn: XboxRB }],
    triggers: [{ label: "LT", Btn: XboxLT }, { label: "RT", Btn: XboxRT }],
    system:   [{ label: "Guide", Btn: XboxGuide }, { label: "Menu", Btn: XboxMenu }, { label: "View", Btn: XboxView }],
  },
  ps: {
    face:     [{ label: "Cross", Btn: PsCross }, { label: "Circle", Btn: PsCircle }, { label: "Square", Btn: PsSquare }, { label: "Triangle", Btn: PsTriangle }],
    bumpers:  [{ label: "L1", Btn: PsL1 }, { label: "R1", Btn: PsR1 }],
    triggers: [{ label: "L2", Btn: PsL2 }, { label: "R2", Btn: PsR2 }],
    system:   [{ label: "PS", Btn: PsHome }, { label: "Options", Btn: PsOptions }, { label: "Create", Btn: PsCreate }],
  },
  switch: {
    face:     [{ label: "A", Btn: SwA }, { label: "B", Btn: SwB }, { label: "X", Btn: SwX }, { label: "Y", Btn: SwY }],
    bumpers:  [{ label: "L",  Btn: SwL  }, { label: "R",  Btn: SwR  }],
    triggers: [{ label: "ZL", Btn: SwZL }, { label: "ZR", Btn: SwZR }],
    system:   [{ label: "Home", Btn: SwHome }, { label: "START", Btn: SwPlus }, { label: "SELECT", Btn: SwMinus }, { label: "Capture", Btn: SwCapture }],
  },
};

function BtnCell({ label, Btn, colored, filled, textFaint }: {
  label: string; Btn: BtnComponent; colored: boolean; filled: boolean; textFaint: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "8px 10px" }}>
      <Btn size={28} colored={colored} filled={filled} />
      <span style={{ fontSize: 9, color: textFaint, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

function PreviewSection({ title, buttons, colored, filled, textFaint }: {
  title: string;
  buttons: Array<{ label: string; Btn: BtnComponent }>;
  colored: boolean; filled: boolean; textFaint: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, color: textFaint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
        {buttons.map(({ label, Btn }) => (
          <BtnCell key={label} label={label} Btn={Btn} colored={colored} filled={filled} textFaint={textFaint} />
        ))}
      </div>
    </div>
  );
}

export function GamepadIconPreview() {
  const { theme } = useTheme();
  const { platform, colored, filled } = useGamepadIcons();
  const set = PLATFORM_BUTTONS[platform];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PreviewSection title="Face buttons" buttons={set.face}     colored={colored} filled={filled} textFaint={theme.textFaint} />
      <PreviewSection title="Bumpers"      buttons={set.bumpers}  colored={colored} filled={filled} textFaint={theme.textFaint} />
      <PreviewSection title="Triggers"     buttons={set.triggers} colored={colored} filled={filled} textFaint={theme.textFaint} />
      <PreviewSection title="System"       buttons={set.system}   colored={colored} filled={filled} textFaint={theme.textFaint} />
    </div>
  );
}
