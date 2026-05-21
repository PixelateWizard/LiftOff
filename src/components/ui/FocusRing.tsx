import { useTheme } from "../../contexts/ThemeContext";

interface FocusRingProps {
  focused: boolean;
  /** "spin" = rotating arc (square/vertical elements); "h" = left-side pulse (wide/horizontal) */
  variant?: "spin" | "h";
  /** Border radius of the element being focused — ring radius = elementRadius + 2 */
  elementRadius?: number;
}

/** Onyx-theme animated focus ring. Renders null for any other theme or when not focused. */
export function FocusRing({ focused, variant = "spin", elementRadius = 12 }: FocusRingProps) {
  const { resolvedTheme } = useTheme();
  if (!focused || resolvedTheme !== "onyx") return null;
  return (
    <div
      className="onyx-focus-ring"
      style={{ top: -2, right: -2, bottom: -2, left: -2, borderRadius: elementRadius + 2 }}
    >
      <div className={variant === "h" ? "onyx-ring-h" : "onyx-ring-spin"} />
    </div>
  );
}
