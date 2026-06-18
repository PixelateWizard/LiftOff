import { FaBattleNet, FaSteam, FaXbox } from "react-icons/fa6";
import { SiEpicgames, SiGogdotcom } from "react-icons/si";
import { useSettings } from "../../contexts/SettingsContext";
import { useTheme } from "../../contexts/ThemeContext";

const STORE_ICONS = {
  steam: FaSteam,
  xbox: FaXbox,
  battlenet: FaBattleNet,
  gog: SiGogdotcom,
  epic: SiEpicgames,
};

const STORE_LABELS: Record<string, string> = {
  steam: "Steam",
  xbox: "Xbox",
  battlenet: "Battle.net",
  gog: "GOG",
  epic: "Epic Games",
};

interface StoreBadgeProps {
  source?: string;
  small?: boolean;
  inline?: boolean;
}

export function StoreBadge({ source, small = false, inline = false }: StoreBadgeProps) {
  const { settings } = useSettings();
  const { surfaceStyle, resolvedTheme } = useTheme();
  if (settings.show_store_badges === false || !source) return null;

  const Icon = STORE_ICONS[source as keyof typeof STORE_ICONS];
  if (!Icon) return null;

  const glyph = small ? 13 : 15;
  const pad = small ? 5 : 6;
  const offset = small ? 6 : 8;
  const square = surfaceStyle === "win9x" || resolvedTheme === "cyberpunk";
  const label = STORE_LABELS[source] || source;

  return (
    <div
      title={label}
      aria-label={label}
      style={{
        position: inline ? "relative" : "absolute",
        right: inline ? undefined : offset,
        bottom: inline ? undefined : offset,
        zIndex: 3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: glyph + pad * 2,
        height: glyph + pad * 2,
        borderRadius: square ? 0 : 8,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        boxShadow: surfaceStyle === "material"
          ? "0 2px 6px rgba(0,0,0,0.25)"
          : "0 1px 4px rgba(0,0,0,0.45)",
        color: "rgba(255,255,255,0.94)",
        pointerEvents: "none",
        flexShrink: 0,
      }}
    >
      <Icon size={glyph} />
    </div>
  );
}

