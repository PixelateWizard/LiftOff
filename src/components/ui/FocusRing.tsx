import { useTheme } from "../../contexts/ThemeContext";

interface FocusRingProps {
  focused: boolean;
  /** "spin" = rotating arc; "h" = left-side pulse (legacy) */
  variant?: "spin" | "h";
  /** Border radius of the element being focused — ring radius = elementRadius + 3 */
  elementRadius?: number;
  /** Use narrow arc for wide/horizontal elements (settings rows) */
  wide?: boolean;
}

/** Onyx-theme animated focus ring. Renders null for any other theme or when not focused. */
export function FocusRing({ focused, variant = "spin", elementRadius = 12, wide = false }: FocusRingProps) {
  const { resolvedTheme } = useTheme();
  if (!focused || resolvedTheme !== "onyx") return null;

  // Wide/flat variant: direct bordered element — conic-gradient doesn't work on 10:1 aspect ratios
  if (wide) {
    return (
      <div
        className="onyx-ring-flat"
        style={{ top: -2, right: -2, bottom: -2, left: -2, borderRadius: elementRadius > 0 ? elementRadius + 2 : 0 }}
      />
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
