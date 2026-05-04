import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AccentColors, ThemeColors } from "../../types";

export interface SgdbArtResult {
  url: string;
  thumb: string;
  is_animated: boolean;
  author?: string;
  upvotes?: number;
}

interface ThumbnailCardProps extends React.HTMLAttributes<HTMLDivElement> {
  result: SgdbArtResult;
  selected: boolean;
  isSelected: boolean;
  accent: AccentColors;
  theme: ThemeColors;
  thumbW: number;
  aspect: string;
  onClick: () => void;
}

let activeThumbVideo: HTMLVideoElement | null = null;

export function ThumbnailCard({ result, selected, isSelected, accent, theme: _theme, thumbW, aspect, onClick, ...rest }: ThumbnailCardProps) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const active = isSelected || hovered;
  const hasStaticThumb = result.thumb !== result.url;
  const urlLower = result.url.toLowerCase();
  const isVideoFormat = /\.(webm|mp4)$/i.test(urlLower);
  const isGifOrWebp = /\.(gif|webp)$/i.test(urlLower);

  useEffect(() => {
    if (active && !videoSrc) setVideoSrc(result.url);
  }, [active, result.url, videoSrc]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoSrc) return;
    if (active) {
      if (activeThumbVideo && activeThumbVideo !== v) {
        activeThumbVideo.pause();
        activeThumbVideo.currentTime = 0;
      }
      activeThumbVideo = v;
      v.play().catch(() => {});
    } else {
      if (activeThumbVideo === v) activeThumbVideo = null;
      v.pause();
      v.currentTime = 0;
    }
  }, [active, videoSrc]);

  useEffect(() => {
    return () => {
      const v = videoRef.current;
      if (v && activeThumbVideo === v) activeThumbVideo = null;
    };
  }, []);

  const fillStyle = { position: "absolute" as const, top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" as const, display: "block" };

  return (
    <div
      style={{
        position: "relative", width: thumbW, aspectRatio: aspect, cursor: "pointer",
        borderRadius: 8, overflow: "hidden",
        outline: selected ? `2px solid ${accent.primary}` : "2px solid transparent",
        outlineOffset: -2, transition: "outline 0.1s", flexShrink: 0,
        transform: "translateZ(0)", willChange: "opacity",
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...rest}
    >
      {hasStaticThumb
        ? <img src={result.thumb} alt="" style={fillStyle} />
        : !active && (
          <div style={{
            ...fillStyle,
            background: "linear-gradient(135deg, rgba(30,15,8,0.95) 0%, rgba(50,25,10,0.9) 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {t("sgdb.hoverToPreview")}
            </span>
          </div>
        )
      }

      {result.is_animated && (
        isVideoFormat ? (
          <video
            ref={videoRef}
            src={videoSrc || undefined}
            muted
            loop
            playsInline
            preload="none"
            style={{ ...fillStyle, opacity: active ? 1 : 0, transition: "opacity 0.15s" }}
          />
        ) : isGifOrWebp ? (
          <img
            src={active ? result.url : undefined}
            alt=""
            style={{ ...fillStyle, opacity: active ? 1 : 0, transition: "opacity 0.15s" }}
          />
        ) : null
      )}

      {result.is_animated && hasStaticThumb && (
        <div style={{
          position: "absolute", top: 5, left: 5, padding: "2px 5px", borderRadius: 4,
          background: accent.primary, color: accent.darkText ? "#1a1a1a" : "white", fontSize: 8, fontWeight: 700, letterSpacing: "0.05em",
        }}>
          ANIM
        </div>
      )}

      {active && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, padding: "4px 6px",
          background: "rgba(0,0,0,0.72)", display: "flex", gap: 6, alignItems: "center",
        }}>
          {result.author && (
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              {result.author}
            </span>
          )}
          {(result.upvotes ?? 0) > 0 && (
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", flexShrink: 0 }}>▲{result.upvotes}</span>
          )}
        </div>
      )}
    </div>
  );
}
