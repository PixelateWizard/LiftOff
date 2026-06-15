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
  variant?: SpotifyMiniBarVariant;
  onOpenPanel: () => void;
}

type SpotifyMiniBarVariant = "bar" | "puck" | "heroChip";

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
export function SpotifyMiniBar({ spotify, webPlayer, holdProgress = 0, variant = "bar", onOpenPanel }: SpotifyMiniBarProps) {
  const { t } = useTranslation();
  const { accent, theme, isDark, surfaceStyle, surface, resolvedTheme } = useTheme();
  const track = webPlayer?.track ?? spotify.track;
  if (!spotify.status.connected || !track) return null;

  const pct = track.durationMs > 0 ? Math.min(100, (track.progressMs / track.durationMs) * 100) : 0;
  const isCyberpunk = resolvedTheme === "cyberpunk";
  const squared = surfaceStyle === "win9x" || surfaceStyle === "cyberpunk" || isCyberpunk;
  const charge = Math.max(0, Math.min(1, holdProgress));
  const renderMenuBadge = (size = 30, iconSize = 14, strokeWidth = 2) => {
    const ringR = (size / 2) - 2.5;
    const ringC = 2 * Math.PI * ringR;

    return (
      <div aria-hidden="true" style={{ position: "relative", width: size, height: size, pointerEvents: "none" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute", inset: 0, display: "block" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={ringR}
          fill={charge > 0 ? (isDark ? "rgba(8,8,10,0.62)" : "rgba(255,255,255,0.78)") : "transparent"}
          stroke={isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.13)"}
          strokeWidth={strokeWidth}
        />
        {charge > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={ringR}
            fill="none"
            stroke={accent.primary}
            strokeWidth={strokeWidth + 0.5}
            strokeLinecap="round"
            strokeDasharray={ringC}
            strokeDashoffset={(1 - charge) * ringC}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      <IoMenu
        size={iconSize}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          color: charge > 0 ? theme.text : theme.textDim,
        }}
      />
    </div>
    );
  };
  const menuBadge = renderMenuBadge();

  if (variant === "puck") {
    const ringTrack = isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.14)";
    const progressDeg = Math.max(0, Math.min(360, pct * 3.6));
    const radius = squared ? 0 : 18;

    return (
      <button
        type="button"
        data-spotify-minibar=""
        data-spotify-variant="puck"
        onClick={onOpenPanel}
        title={t("spotify.openOverlay")}
        style={{
          position: "relative",
          width: 64,
          height: 64,
          padding: 3,
          border: 0,
          borderRadius: radius,
          cursor: "pointer",
          background: `conic-gradient(${accent.primary} ${progressDeg}deg, ${ringTrack} 0deg)`,
          boxShadow: charge > 0
            ? `0 0 ${Math.round(10 + 22 * charge)}px ${accent.glow}${(0.22 + 0.38 * charge).toFixed(2)})`
            : surfaceStyle === "material"
              ? "var(--material-shadow-medium)"
              : "0 8px 24px rgba(0,0,0,0.34)",
          color: theme.text,
          font: "inherit",
          pointerEvents: "auto",
          transition: "box-shadow 0.16s ease, transform 0.16s ease",
          transform: charge > 0 ? "scale(1.04)" : "scale(1)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 3,
            borderRadius: squared ? 0 : 15,
            overflow: "hidden",
            background: isDark ? "rgba(0,0,0,0.72)" : "rgba(255,255,255,0.84)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.16)",
          }}
        >
          {track.image ? (
            <img
              src={track.image}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: `${accent.glow}0.18)`,
              }}
            />
          )}
        </div>

        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            right: -3,
            bottom: -3,
            width: 24,
            height: 24,
            borderRadius: squared ? 0 : 999,
            display: "grid",
            placeItems: "center",
            background: isDark ? "rgba(10,10,12,0.86)" : "rgba(255,255,255,0.92)",
            border: `1px solid ${charge > 0 ? accent.primary : isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.14)"}`,
            boxShadow: charge > 0 ? `0 0 12px ${accent.glow}0.45)` : "0 3px 10px rgba(0,0,0,0.28)",
          }}
        >
          <IoMenu size={13} color={charge > 0 ? accent.primary : theme.textDim} />
        </div>
      </button>
    );
  }

  if (variant === "heroChip") {
    const chipRadius = squared ? 0 : surfaceStyle === "material" ? 10 : 12;
    const chipClip = isCyberpunk ? "polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)" : undefined;

    return (
      <button
        type="button"
        data-spotify-minibar=""
        data-spotify-variant="heroChip"
        onClick={onOpenPanel}
        title={t("spotify.openOverlay")}
        style={{
          width: "min(360px, 100%)",
          minHeight: 46,
          display: "grid",
          gridTemplateColumns: "36px minmax(0, 1fr) 26px",
          alignItems: "center",
          gap: 8,
          padding: "6px 8px",
          borderRadius: chipRadius,
          clipPath: chipClip,
          WebkitClipPath: chipClip,
          border: `1px solid ${charge > 0
            ? accent.primary
            : isCyberpunk
              ? `${accent.glow}0.58)`
            : surfaceStyle === "material"
              ? "var(--material-border-subtle)"
              : isDark
                ? "rgba(255,255,255,0.12)"
                : "rgba(255,255,255,0.48)"}`,
          background: isCyberpunk
            ? `linear-gradient(135deg, rgba(12,8,12,0.88), ${accent.glow}0.12))`
            : surfaceStyle === "material"
            ? "var(--material-elevation-2)"
            : surfaceStyle === "win9x"
              ? surface.panelBg
              : surfaceStyle === "clear"
                ? isDark
                  ? "rgba(10,10,12,0.42)"
                  : "rgba(255,255,255,0.38)"
                : isDark
                  ? "rgba(12,12,14,0.54)"
                  : "rgba(255,255,255,0.52)",
          backdropFilter: surfaceStyle === "material" || surfaceStyle === "win9x" ? undefined : isCyberpunk ? "blur(10px) saturate(150%)" : "blur(14px) saturate(140%)",
          WebkitBackdropFilter: surfaceStyle === "material" || surfaceStyle === "win9x" ? undefined : isCyberpunk ? "blur(10px) saturate(150%)" : "blur(14px) saturate(140%)",
          boxShadow: charge > 0
            ? `0 0 18px ${accent.glow}0.35)`
            : isCyberpunk
              ? `inset 0 0 0 1px ${accent.glow}0.20), 0 8px 22px rgba(0,0,0,0.38), 0 0 16px ${accent.glow}0.12)`
            : surfaceStyle === "material"
              ? "var(--material-shadow-low)"
              : surfaceStyle === "win9x"
                ? surface.panelShadow
                : "0 8px 22px rgba(0,0,0,0.28)",
          textAlign: "left",
          font: "inherit",
          color: "inherit",
          cursor: "pointer",
          pointerEvents: "auto",
          transition: "border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease",
          transform: charge > 0 ? "scale(1.015)" : "scale(1)",
        }}
      >
        {track.image ? (
          <img
            src={track.image}
            alt=""
            style={{
              width: 36,
              height: 36,
              objectFit: "cover",
              borderRadius: squared ? 0 : 7,
              display: "block",
              clipPath: isCyberpunk ? "polygon(0 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%)" : undefined,
              WebkitClipPath: isCyberpunk ? "polygon(0 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%)" : undefined,
            }}
          />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: squared ? 0 : 7, background: `${accent.glow}0.18)` }} />
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: isCyberpunk ? "rgba(245,250,255,0.94)" : theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.15 }}>{track.title}</div>
          <div style={{ fontSize: 10, color: theme.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.15, marginTop: 1 }}>{track.artist}</div>
          <div style={{ marginTop: 5, height: 2, borderRadius: 999, background: isDark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.11)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: accent.primary }} />
          </div>
        </div>
        {/* MENU hold hint. The chip is display-only; controls live in SpotifyOverlay. */}
        {isCyberpunk ? (
          <div
            aria-hidden="true"
            style={{
              width: 26,
              height: 26,
              display: "grid",
              placeItems: "center",
              background: charge > 0 ? `${accent.glow}0.22)` : "rgba(0,0,0,0.24)",
              border: `1px solid ${charge > 0 ? accent.primary : `${accent.glow}0.45)`}`,
              boxShadow: charge > 0 ? `0 0 12px ${accent.glow}0.42)` : `inset 0 0 8px ${accent.glow}0.08)`,
              clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%)",
              WebkitClipPath: "polygon(0 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%)",
            }}
          >
            <IoMenu size={12} color={charge > 0 ? accent.primary : theme.textDim} />
          </div>
        ) : renderMenuBadge(26, 12, 1.8)}
      </button>
    );
  }

  return (
    <button
      type="button"
      data-spotify-minibar=""
      onClick={onOpenPanel}
      title={t("spotify.openOverlay")}
      style={{
        // Fixed max width so the mini-bar reads as one consistent element instead
        // of stretching to whatever space the bottom bar hints leave over.
        width: "min(360px, 32vw)",
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
      {menuBadge}
    </button>
  );
}
