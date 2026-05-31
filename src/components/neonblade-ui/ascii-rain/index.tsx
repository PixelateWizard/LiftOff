"use client";

import { useEffect, useRef, type CSSProperties } from "react";

// ---- Props -------------------------------------------------

export interface AsciiRainProps {
  /** Color of the falling glyphs. Any CSS color. @default "#00f3ff" */
  textColor?: string;
  /**
   * Trail/background fill painted each frame. Use a low-alpha dark color for the
   * classic fading matrix trail, or "transparent" to let whatever is behind show
   * through with no trail accumulation. @default "rgba(1,6,15,0.10)"
   */
  bgColor?: string;
  /** Glyph size in px (also the column width / row step). @default 16 */
  fontSize?: number;
  /** Fall speed multiplier. 0 freezes the animation. @default 1 */
  speed?: number;
  /** Character pool drawn at random. */
  characters?: string;
  /** Canvas opacity. @default 1 */
  opacity?: number;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_CHARS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF<>/\\|=+*:.";

// ---- Component ---------------------------------------------

/**
 * A futuristic falling ASCII matrix effect rendered to a single <canvas>.
 * Self-sizing via ResizeObserver; DPR-aware; one rAF loop with no per-prop
 * restart of the column state beyond what's necessary.
 */
export function AsciiRain({
  textColor = "#00f3ff",
  bgColor = "rgba(1,6,15,0.10)",
  fontSize = 16,
  speed = 1,
  characters = DEFAULT_CHARS,
  opacity = 1,
  className,
  style,
}: AsciiRainProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live prop mirrors so the rAF loop reads current values without restarting.
  const propsRef = useRef({ textColor, bgColor, fontSize, speed, characters });
  propsRef.current = { textColor, bgColor, fontSize, speed, characters };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    let cols = 0;
    let drops: number[] = [];

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const fs = propsRef.current.fontSize;
      const next = Math.max(1, Math.ceil(w / fs));
      // Preserve existing drop positions when possible; seed new columns randomly.
      drops = Array.from({ length: next }, (_, i) =>
        i < drops.length ? drops[i] : Math.random() * (h / fs),
      );
      cols = next;
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    const draw = () => {
      const { textColor: tc, bgColor: bg, fontSize: fs, speed: sp, characters: chars } = propsRef.current;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      // Trail fade: a translucent fill each frame leaves dimming tails behind heads.
      ctx.fillStyle = bg && bg !== "transparent" ? bg : "rgba(1,6,15,0.10)";
      ctx.fillRect(0, 0, w, h);

      ctx.font = `${fs}px "Cascadia Code", "Consolas", ui-monospace, monospace`;
      ctx.textBaseline = "top";

      for (let i = 0; i < cols; i++) {
        const ch = chars.charAt(Math.floor(Math.random() * chars.length)) || "0";
        const x = i * fs;
        const y = drops[i] * fs;
        // Bright leading glyph.
        ctx.fillStyle = tc;
        ctx.fillText(ch, x, y);

        if (y > h && Math.random() > 0.975) drops[i] = 0;
        drops[i] += (sp || 0) * 0.32;
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%", display: "block", opacity, ...style }}
      aria-hidden="true"
    />
  );
}

export default AsciiRain;
