import { IoMenu } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
import type { SpotifyController } from "../../hooks/useSpotify";
import type { SpotifyWebPlayerState } from "../../hooks/useSpotifyWebPlayer";

interface SpotifyMiniBarProps {
  spotify: SpotifyController;
  webPlayer?: SpotifyWebPlayerState;
  /** 0..1 charge level while MENU is held to open the Spotify overlay. */
  holdProgress?: number;
  onOpenPanel: () => void;
}

const formatTime = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

// The mini-bar is display-only: gamepad navigation cannot reach inline
// transport buttons here, so the whole bar is a single click target that
// opens the Spotify overlay where all controls live. Holding MENU on a
// gamepad charges the bar up (filling ring + glow) and opens the overlay too;
// the MENU badge stays visible as a hint for that gesture.
export function SpotifyMiniBar({ spotify, webPlayer, holdProgress = 0, onOpenPanel }: SpotifyMiniBarProps) {
  const { t } = useTranslation();
  const { accent, theme, isDark, surfaceStyle } = useTheme();
  const track = webPlayer?.track ?? spotify.track;
  if (!spotify.status.connected || !track) return null;

  const pct = track.durationMs > 0 ? Math.min(100, (track.progressMs / track.durationMs) * 100) : 0;
  const squared = surfaceStyle === "win9x" || surfaceStyle === "cyberpunk";
  const charge = Math.max(0, Math.min(1, holdProgress));
  const RING_R = 12.5;
  const RING_C = 2 * Math.PI * RING_R;

  return (
    <button
      type="button"
      data-spotify-minibar=""
      onClick={onOpenPanel}
      title={t("spotify.openOverlay")}
      style={{
        // Fixed width so the mini-bar reads as one consistent element instead
        // of stretching to whatever space the bottom bar hints leave over.
        width: 360,
        maxWidth: "100%",
        flex: "0 0 auto",
        display: "grid",
        gridTemplateColumns: "46px minmax(0, 1fr) 30px",
        alignItems: "center",
        gap: 10,
        padding: "0 2px",
        border: 0,
        background: "transparent",
        textAlign: "left",
        font: "inherit",
        color: "inherit",
        cursor: "pointer",
      }}
    >
      {track.image ? (
        <img src={track.image} alt="" style={{ width: 46, height: 46, objectFit: "cover", borderRadius: squared ? 0 : 7, display: "block" }} />
      ) : (
        <div style={{ width: 46, height: 46, borderRadius: squared ? 0 : 7, background: `${accent.glow}0.18)` }} />
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.title}</div>
        <div style={{ fontSize: 11, color: theme.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.artist}</div>
        <div style={{ marginTop: 5, display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 8 }}>
          <div style={{ height: 3, borderRadius: 999, background: isDark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.11)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: accent.primary }} />
          </div>
          <span style={{ fontSize: 10, color: theme.textFaint }}>{formatTime(track.progressMs)}</span>
        </div>
      </div>
      {/* MENU hold hint: always visible; the ring fills while MENU is held. */}
      <div aria-hidden="true" style={{ position: "relative", width: 30, height: 30, pointerEvents: "none" }}>
        <svg width={30} height={30} viewBox="0 0 30 30" style={{ position: "absolute", inset: 0, display: "block" }}>
          <circle
            cx={15}
            cy={15}
            r={RING_R}
            fill={charge > 0 ? (isDark ? "rgba(8,8,10,0.62)" : "rgba(255,255,255,0.78)") : "transparent"}
            stroke={isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.13)"}
            strokeWidth={2}
          />
          {charge > 0 && (
            <circle
              cx={15}
              cy={15}
              r={RING_R}
              fill="none"
              stroke={accent.primary}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={(1 - charge) * RING_C}
              transform="rotate(-90 15 15)"
            />
          )}
        </svg>
        <IoMenu
          size={14}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            color: charge > 0 ? theme.text : theme.textDim,
          }}
        />
      </div>
    </button>
  );
}
