import type { CSSProperties, ReactNode } from "react";

interface CyberpunkCardProps {
  enabled: boolean;
  focused?: boolean;
  accent: { primary: string; glow: string };
  style?: CSSProperties;
  children: ReactNode;
}

export const CYBER_CORNER = 14; // diagonal cut depth (px)
export const CYBER_CLIP = `polygon(0 0, 100% 0, 100% calc(100% - ${CYBER_CORNER}px), calc(100% - ${CYBER_CORNER}px) 100%, 0 100%)`;

/** A really dark, near-black tint of the chosen accent — the HUD panel fill. */
export function darkAccentFill(accent: { primary: string }): string {
  return `linear-gradient(180deg, color-mix(in srgb, ${accent.primary} 16%, #05080f 84%) 0%, color-mix(in srgb, ${accent.primary} 9%, #03050b 91%) 100%)`;
}

/**
 * Cyberpunk corner-cut panel.
 *
 * Two clipped layers (NO filters — filters tank performance when many cards
 * recomposite over the animated background): an outer frame painted the neon
 * edge color + an inner content layer inset by the border width. Because both
 * are clipped to the same polygon, the edge wraps the whole shape including the
 * diagonal cut. The caller's layout is preserved — only positioning moves to the
 * outer frame, everything else (display/flex/padding/size) stays on the content.
 */
export function CyberpunkCard({ enabled, focused, accent, style, children }: CyberpunkCardProps) {
  if (!enabled) return <div style={style}>{children}</div>;

  const s = { ...((style || {}) as Record<string, unknown>) };
  // Appearance we replace.
  delete s.background; delete s.backgroundColor; delete s.border; delete s.borderColor;
  delete s.boxShadow; delete s.backdropFilter; delete s.WebkitBackdropFilter; delete s.borderRadius;

  // Positioning moves to the outer frame; everything else stays on the content.
  const { position, inset, top, left, right, bottom, transform, transition, cursor, flexShrink, zIndex, margin, ...inner } = s;
  const callerPos = position as string | undefined;
  const isAbs = callerPos === "absolute" || callerPos === "fixed";
  const bw = focused ? 2.5 : 1;

  const outerStyle: CSSProperties = {
    position: (callerPos as CSSProperties["position"]) ?? "relative",
    ...(inset !== undefined ? { inset: inset as CSSProperties["inset"] } : {}),
    ...(top !== undefined ? { top: top as CSSProperties["top"] } : {}),
    ...(left !== undefined ? { left: left as CSSProperties["left"] } : {}),
    ...(right !== undefined ? { right: right as CSSProperties["right"] } : {}),
    ...(bottom !== undefined ? { bottom: bottom as CSSProperties["bottom"] } : {}),
    transform: transform as CSSProperties["transform"],
    transition: transition as CSSProperties["transition"],
    cursor: cursor as CSSProperties["cursor"],
    flexShrink: flexShrink as CSSProperties["flexShrink"],
    zIndex: zIndex as CSSProperties["zIndex"],
    margin: margin as CSSProperties["margin"],
    display: isAbs ? "block" : callerPos === "relative" ? "block" : "inline-block",
    boxSizing: "border-box",
    padding: bw,
    clipPath: CYBER_CLIP,
    WebkitClipPath: CYBER_CLIP,
    background: focused ? accent.primary : `${accent.glow}0.50)`,
  };

  const innerStyle: CSSProperties = {
    ...(inner as CSSProperties),
    ...(isAbs ? { position: "absolute", inset: bw } : { position: "relative" }),
    clipPath: CYBER_CLIP,
    WebkitClipPath: CYBER_CLIP,
    background: darkAccentFill(accent),
    overflow: (inner.overflow as CSSProperties["overflow"]) ?? "hidden",
  };

  return (
    <div data-cyberpunk-card-frame="" style={outerStyle}>
      <div style={innerStyle}>{children}</div>
    </div>
  );
}
