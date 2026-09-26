import type { AccentColors } from "../../types";

interface BookshelfBgProps {
  accent: AccentColors;
  shelf?: string;
  effectsEnabled?: boolean;
  /** Theme picker thumbnail: adds a few sample shelves so the card reads as Bookshelf. */
  preview?: boolean;
}

export function bookshelfWallColor(shelf: string | undefined, accent: AccentColors): string {
  if (shelf === "painted") return `color-mix(in oklab, ${accent.primary} 9%, #1c1a19)`;
  if (shelf === "glass") return "#1c1a1a";
  if (shelf === "oak") return "#221c18";
  return "#1f1d1c";
}

const PREVIEW_SPINES = ["#4a3a52", "#2f4a58", "#6b3a2a", "#38503a", "#5a4a2a", "#2a3550", "#603040", "#3a3a3a"];

export function BookshelfBg({ accent, shelf = "steel", effectsEnabled = true, preview = false }: BookshelfBgProps) {
  const wall = bookshelfWallColor(shelf, accent);
  return (
    <div style={{ position: preview ? "absolute" : "fixed", inset: 0, zIndex: preview ? 0 : -1, pointerEvents: "none", background: wall }}>
      {effectsEnabled && (
        <div style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 58% 50% at 50% -12%, rgba(255,196,130,0.13), transparent 70%), linear-gradient(180deg, transparent 78%, rgba(0,0,0,0.5))",
        }} />
      )}
      {preview && [120, 360, 600].map((top, row) => (
        <div key={top} style={{ position: "absolute", left: 80, right: 80, top }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 180, display: "flex", alignItems: "flex-end", gap: 4, paddingLeft: 24 }}>
            {Array.from({ length: 22 }, (_, i) => (
              <div key={i} style={{
                width: 40,
                height: 150 + ((i * 7 + row * 5) % 26),
                background: PREVIEW_SPINES[(i + row * 3) % PREVIEW_SPINES.length],
                borderTop: `12px solid ${accent.primary}`,
                boxShadow: "inset 1px 0 0 rgba(255,255,255,0.12), inset -1px 0 0 rgba(0,0,0,0.45)",
              }} />
            ))}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 180, height: 18, background: shelf === "oak" ? "#8d6240" : "#2c2b2d", boxShadow: "0 16px 24px -8px rgba(0,0,0,0.7)" }} />
        </div>
      ))}
    </div>
  );
}

export default BookshelfBg;
