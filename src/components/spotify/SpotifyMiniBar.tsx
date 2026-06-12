import { IoExpandOutline, IoPause, IoPlay, IoPlayBack, IoPlayForward } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
import type { SpotifyController } from "../../hooks/useSpotify";
import type { SpotifyWebPlayerState } from "../../hooks/useSpotifyWebPlayer";

interface SpotifyMiniBarProps {
  spotify: SpotifyController;
  webPlayer?: SpotifyWebPlayerState;
  onOpenPanel: () => void;
}

const formatTime = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

export function SpotifyMiniBar({ spotify, webPlayer, onOpenPanel }: SpotifyMiniBarProps) {
  const { t } = useTranslation();
  const { accent, theme, isDark, surfaceStyle } = useTheme();
  const track = webPlayer?.track ?? spotify.track;
  if (!spotify.status.connected || !track) return null;

  const pct = track.durationMs > 0 ? Math.min(100, (track.progressMs / track.durationMs) * 100) : 0;
  const disabled = spotify.requiresPremium;
  const runPremium = async (action: (deviceId?: string | null) => void) => {
    await webPlayer?.activate();
    action(webPlayer?.ready ? webPlayer.deviceId : null);
  };
  const iconButtonStyle = {
    width: 30,
    height: 30,
    borderRadius: surfaceStyle === "win9x" || surfaceStyle === "cyberpunk" ? 0 : 8,
    border: `1px solid ${isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.10)"}`,
    background: isDark ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.045)",
    color: disabled ? theme.textFaint : accent.primary,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    opacity: disabled ? 0.58 : 1,
  } as const;

  return (
    <div
      style={{
        minWidth: 0,
        flex: "1 1 360px",
        maxWidth: 560,
        display: "grid",
        gridTemplateColumns: "46px minmax(0, 1fr) auto",
        alignItems: "center",
        gap: 10,
        padding: "0 2px",
      }}
    >
      <button type="button" onClick={onOpenPanel} style={{ padding: 0, border: 0, background: "transparent", cursor: "pointer" }} title={t("spotify.openOverlay")}>
        {track.image ? (
          <img src={track.image} alt="" style={{ width: 46, height: 46, objectFit: "cover", borderRadius: surfaceStyle === "win9x" || surfaceStyle === "cyberpunk" ? 0 : 7, display: "block" }} />
        ) : (
          <div style={{ width: 46, height: 46, borderRadius: surfaceStyle === "win9x" || surfaceStyle === "cyberpunk" ? 0 : 7, background: `${accent.glow}0.18)` }} />
        )}
      </button>
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
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button type="button" title={t("spotify.previous")} onClick={() => runPremium(spotify.previous)} style={iconButtonStyle}>
          <IoPlayBack size={15} />
        </button>
        <button type="button" title={track.isPlaying ? t("spotify.pause") : t("spotify.play")} onClick={() => runPremium((deviceId) => track.isPlaying ? spotify.pause() : spotify.play(deviceId))} style={{ ...iconButtonStyle, color: disabled ? theme.textFaint : (accent.darkText ? "#161616" : "#fff"), background: disabled ? iconButtonStyle.background : accent.primary }}>
          {track.isPlaying ? <IoPause size={16} /> : <IoPlay size={16} />}
        </button>
        <button type="button" title={t("spotify.next")} onClick={() => runPremium(spotify.next)} style={iconButtonStyle}>
          <IoPlayForward size={15} />
        </button>
        <button type="button" title={t("spotify.openOverlay")} onClick={onOpenPanel} style={iconButtonStyle}>
          <IoExpandOutline size={16} />
        </button>
      </div>
    </div>
  );
}
