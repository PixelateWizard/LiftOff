import { useLayoutEffect, useRef, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useSettings } from "../../contexts/SettingsContext";

interface FocusRingProps {
  focused: boolean;
  /** "spin" = rotating arc; "h" = left-side pulse (legacy) */
  variant?: "spin" | "h";
  /** Border radius of the element being focused; ring radius = elementRadius + 3 */
  elementRadius?: number;
  /** Use a perimeter stroke for very wide rows so the conic ring does not stretch into bands. */
  wide?: boolean;
}

/** Onyx-theme animated focus ring. Renders null for any other theme or when not focused. */
export function FocusRing({ focused, variant = "spin", elementRadius = 12, wide = false }: FocusRingProps) {
  const { resolvedTheme } = useTheme();
  const { settings } = useSettings();
  const wideRef = useRef<HTMLDivElement | null>(null);
  const [wideSize, setWideSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!focused || resolvedTheme !== "onyx" || !wide || !wideRef.current) return;
    const node = wideRef.current;
    const update = () => {
      const rect = node.getBoundingClientRect();
      setWideSize({ width: rect.width, height: rect.height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [focused, resolvedTheme, wide]);

  if (!focused || resolvedTheme !== "onyx") return null;

  if (settings.stars_enabled === false) {
    return (
      <div
        className="onyx-focus-ring-static"
        style={{ top: -3, right: -3, bottom: -3, left: -3, borderRadius: elementRadius > 0 ? elementRadius + 3 : 0 }}
      />
    );
  }

  if (wide) {
    const width = Math.max(1, wideSize.width);
    const height = Math.max(1, wideSize.height);
    const inset = 2;
    const radius = Math.max(0, Math.min(elementRadius + 3, (height - inset * 2) / 2));
    const perimeter = width * 2 + height * 2;
    const dashLength = Math.min(86, Math.max(50, ((width + height * 2) / perimeter) * 100));
    return (
      <div
        ref={wideRef}
        className="onyx-focus-ring-stroke"
        style={{ top: -3, right: -3, bottom: -3, left: -3, borderRadius: elementRadius > 0 ? elementRadius + 3 : 0 }}
      >
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
          <rect
            className="onyx-ring-stroke-base"
            x={inset}
            y={inset}
            width={Math.max(1, width - inset * 2)}
            height={Math.max(1, height - inset * 2)}
            rx={radius}
            ry={radius}
            pathLength={100}
          />
          <rect
            className="onyx-ring-stroke-runner"
            x={inset}
            y={inset}
            width={Math.max(1, width - inset * 2)}
            height={Math.max(1, height - inset * 2)}
            rx={radius}
            ry={radius}
            pathLength={100}
            style={{ strokeDasharray: `${dashLength} ${100 - dashLength}` }}
          />
        </svg>
      </div>
    );
  }

  const innerClass = variant === "h" ? "onyx-ring-h" : "onyx-ring-spin";
  return (
    <div
      className="onyx-focus-ring"
      style={{ top: -3, right: -3, bottom: -3, left: -3, borderRadius: elementRadius > 0 ? elementRadius + 3 : 0 }}
    >
      <div className={innerClass} />
    </div>
  );
}
