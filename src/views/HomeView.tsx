import { useEffect, useMemo, useState, type RefObject } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTheme } from "../contexts/ThemeContext";
import { PAPER_GRAIN_DARK, PAPER_GRAIN_LIGHT } from "../theme/surfaces";
import { AppListItem, FocusRing } from "../components/ui";

interface HomeViewProps {
  active: boolean;
  cinematicHome: boolean;
  semiHome?: boolean;
  scrollRef: RefObject<HTMLDivElement>;
  [key: string]: any;
}

const mediaBase = (url?: string | null) => (url || "").split("?")[0].toLowerCase();
const isHeroVideoUrl = (url?: string | null) => /\.(webm|mp4)$/i.test(mediaBase(url));
const isAnimatedImageUrl = (url?: string | null) => /\.(gif|webp)$/i.test(mediaBase(url));
const isAnimatedMediaUrl = (url?: string | null) => isHeroVideoUrl(url) || isAnimatedImageUrl(url);

export function HomeView(props: HomeViewProps) {
  const {
    active,
    cinematicHome,
    semiHome = false,
    scrollRef,
    recent,
    pins,
    apps,
    recentGames,
    heroIndex,
    focusSection,
    focusIndex,
    customArt,
    gameArt,
    settings,
    heroCustomType,
    heroAnimated,
    heroStatic,
    customHeroArt,
    surfaceStyle,
    isDark,
    theme,
    accent,
    appBg,
    materialRaisedShadow,
    activeTextColor,
    pinnedShelfRef,
    focusedCardRef,
    setFocusSection,
    focusSectionRef,
    setFocusIndex,
    focusIndexRef,
    triggerLaunch,
    recentRef,
    t,
    AppIcon,
    materialFocusShadow,
    allAppsRef,
    PinBadge,
    glass,
    cardBackdropFilter,
    gameCollections,
    gameMemberships,
    appCollections,
    appMemberships,
    homeHiddenCollections,
    homeColFocusRow,
    focusedRowRef,
    homeColFocusCol,
    setHomeColFocusRow,
    homeColFocusRowRef,
    setHomeColFocusCol,
    homeColFocusColRef,
    glassEnabled,
    drawerScrollRef,
    recentShelfRef,
    heroVideoRefs,
    appPaused,
    setHeroIndex,
    heroIndexRef,
    iconColors,
  } = props;
  const { surface, resolvedTheme } = useTheme();
  const [heroMediaPaused, setHeroMediaPaused] = useState(false);
  const heroGames = useMemo(() => {
    const filteredRecentGames = recentGames.filter(g => apps.some(a => a.id === g.id));
    return filteredRecentGames.length > 0 ? filteredRecentGames : apps.filter(a => a.app_type === "game").slice(0, 6);
  }, [apps, recentGames]);
  const heroIdx = Math.min(heroIndex, Math.max(0, heroGames.length - 1));
  const activeHeroGame = heroGames[heroIdx];
  const activeHeroType = activeHeroGame
    ? settings.animated_heroes === "static"
      ? "static"
      : settings.animated_heroes === "animated"
        ? "animated"
        : heroCustomType[activeHeroGame.id] || "static"
    : "none";
  const activeHeroAnimatedUrl = activeHeroGame && activeHeroType === "animated"
    ? heroAnimated[activeHeroGame.id] || null
    : null;
  const activeHeroStaticUrl = activeHeroGame
    ? customHeroArt[activeHeroGame.id] || heroStatic[activeHeroGame.id] || null
    : null;

  useEffect(() => {
    if (!appPaused && !heroMediaPaused) return;
    Object.values(heroVideoRefs.current).forEach((video: HTMLVideoElement | null) => {
      if (video) video.pause();
    });
  }, [appPaused, heroMediaPaused, heroVideoRefs]);

  useEffect(() => {
    let cancelled = false;
    let unlistenFocus: (() => void) | undefined;
    const pauseHeroMedia = () => {
      Object.values(heroVideoRefs.current).forEach((video: HTMLVideoElement | null) => {
        if (video) video.pause();
      });
      setHeroMediaPaused(true);
    };
    const resumeHeroMedia = () => setHeroMediaPaused(false);
    const onVisibilityChange = () => {
      if (document.hidden) pauseHeroMedia();
      else resumeHeroMedia();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Alt" || event.altKey) pauseHeroMedia();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Alt" && document.hasFocus()) resumeHeroMedia();
    };

    window.addEventListener("blur", pauseHeroMedia);
    window.addEventListener("focus", resumeHeroMedia);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    document.addEventListener("visibilitychange", onVisibilityChange);
    getCurrentWindow().onFocusChanged(({ payload: focused }) => {
      if (focused) resumeHeroMedia();
      else pauseHeroMedia();
    }).then((unlisten) => {
      if (cancelled) unlisten();
      else unlistenFocus = unlisten;
    }).catch(() => {});

    return () => {
      cancelled = true;
      unlistenFocus?.();
      window.removeEventListener("blur", pauseHeroMedia);
      window.removeEventListener("focus", resumeHeroMedia);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [heroVideoRefs]);

  useEffect(() => {
    const shouldPlayHero = active && !appPaused && !heroMediaPaused;
    if (!shouldPlayHero) {
      Object.values(heroVideoRefs.current).forEach((video: HTMLVideoElement | null) => {
        if (video) video.pause();
      });
      return;
    }

    const rafId = requestAnimationFrame(() => {
      const activeGame = heroGames[heroIdx];
      Object.entries(heroVideoRefs.current as Record<string, HTMLVideoElement | null>).forEach(([id, video]) => {
        if (!video) return;
        if (activeGame && activeGame.id === id) video.play().catch(() => {});
        else video.pause();
      });
      [heroIdx + 1, heroIdx + 2, heroIdx - 1, heroIdx - 2].forEach(i => {
        const game = heroGames[i];
        if (!game) return;
        const video = heroVideoRefs.current[game.id];
        if (video && video.readyState < 3) video.load();
      });
    });

    return () => cancelAnimationFrame(rafId);
  }, [active, appPaused, heroGames, heroIdx, heroMediaPaused, heroVideoRefs]);

  const homeFilteredRecent = recent.filter((a: any) => !settings.show_recent_games_only || a.app_type === "game").slice(0, 8);
  const homePinnedApps = pins.map((id: string) => apps.find((a: any) => a.id === id)).filter(Boolean);

  const content = (() => {
    const focusSec = focusSection;
    const focusIdx = focusIndex;
    const heroGame   = activeHeroGame;
    const heroArt    = heroGame ? (customArt[heroGame.id] || gameArt[heroGame.id]) : null;
    const resolveHeroType = (id) => {
      if (settings.animated_heroes === "static")   return "static";
      if (settings.animated_heroes === "animated") return "animated";
      return heroCustomType[id] || "static";
    };
    const heroBanner = heroGame
      ? (resolveHeroType(heroGame.id) === "animated"
          ? (heroAnimated[heroGame.id] || heroStatic[heroGame.id])
          : heroStatic[heroGame.id])
      : null;
    const sectionTitleFontSize = settings.home_section_title_size === "large" ? 15 : settings.home_section_title_size === "medium" ? 12 : 10;
    const pinnedAtTop = settings.home_pinned_pos === "top";
    const isOnyx = resolvedTheme === "onyx";
    const showHeroArtwork = !settings.cinematic_home || settings.show_immersive_hero_art !== false;
    const visibleHeroBanner = showHeroArtwork ? heroBanner : null;
    const heroFocused = focusSec === "hero";
    const webcoreHero = surfaceStyle === "win9x";
    const materialHero = surfaceStyle === "material" || webcoreHero;
    const materialHeroText = isDark ? "#fffefd" : "#18110b";
    const materialHeroDimText = isDark ? "rgba(255,250,245,0.72)" : "rgba(24,17,11,0.66)";
    const materialCinematicHero = materialHero && settings.cinematic_home;
    const surfaceCardRadius = webcoreHero ? 0 : surfaceStyle === "material" ? 8 : 16;
    const modalSurfaceRadius = webcoreHero ? 0 : surfaceStyle === "material" ? 16 : 24;
    const launchRadius = webcoreHero ? 0 : surfaceStyle === "material" ? 8 : 999;
    const heroTextColor = isDark ? theme.text : "rgba(34,24,18,0.96)";
    const heroSubtextColor = isDark ? theme.textDim : "rgba(48,34,25,0.68)";
    const heroLabelColor = isDark ? accent.primary : (accent.lightPrimary || accent.primary);
    const heroTextShadow = isDark ? "0 2px 14px rgba(0,0,0,0.42)" : "0 1px 0 rgba(255,255,255,0.45)";
    const heroReadabilityOverlayStyle = (() => {
      if (isDark) {
        return {
          background: "linear-gradient(90deg, rgba(5,4,8,0.68) 0%, rgba(5,4,8,0.46) 34%, rgba(5,4,8,0.16) 58%, rgba(5,4,8,0) 78%)",
        };
      }
      if (surfaceStyle === "material") {
        return {
          background: "transparent",
        };
      }
      if (surfaceStyle === "aero") {
        return {
          background: "linear-gradient(90deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.18) 30%, rgba(255,255,255,0.06) 48%, rgba(255,255,255,0) 68%)",
          backdropFilter: "blur(0.6px) saturate(1.02)",
          WebkitBackdropFilter: "blur(0.6px) saturate(1.02)",
        };
      }
      if (surfaceStyle === "glass") {
        return {
          background: "linear-gradient(90deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.14) 30%, rgba(255,255,255,0.05) 48%, rgba(255,255,255,0) 68%)",
          backdropFilter: "blur(0.8px) saturate(1.04)",
          WebkitBackdropFilter: "blur(0.8px) saturate(1.04)",
        };
      }
      return {
        background: "linear-gradient(90deg, rgba(255,250,244,0.72) 0%, rgba(255,250,244,0.48) 32%, rgba(255,250,244,0.18) 58%, rgba(255,250,244,0) 82%)",
      };
    })();
    const heroCopySurfaceStyle = (() => {
      if (isDark) return {};
      if (surfaceStyle === "material") {
        return {
          background: "var(--material-elevation-3)",
          border: "1px solid rgba(80,48,28,0.10)",
          borderRadius: 16,
          padding: "14px 18px",
          boxShadow: "0 8px 22px rgba(39,27,18,0.12), 0 18px 42px rgba(39,27,18,0.08)",
        };
      }
      if (surfaceStyle === "aero") {
        return {
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.22)",
          backdropFilter: "blur(8px) saturate(1.04)",
          WebkitBackdropFilter: "blur(8px) saturate(1.04)",
          borderRadius: 16,
          padding: "14px 18px",
        };
      }
      if (surfaceStyle === "glass") {
        return {
          background: "rgba(255,255,255,0.11)",
          border: "1px solid rgba(255,255,255,0.20)",
          backdropFilter: "blur(9px) saturate(1.05)",
          WebkitBackdropFilter: "blur(9px) saturate(1.05)",
          borderRadius: 16,
          padding: "14px 18px",
        };
      }
      return {};
    })();
    const getHeroPinnedIdleStyle = () => {
      if (isDark) {
        return {
          background: "rgba(8,4,2,0.55)",
          border: "rgba(255,255,255,0.14)",
          color: theme.text,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14)",
        };
      }
      if (surfaceStyle === "material") {
        return {
          background: "rgba(250,241,230,0.88)",
          border: "rgba(80,48,28,0.14)",
          color: heroTextColor,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.42)",
        };
      }
      if (surfaceStyle === "clear") {
        return {
          background: "rgba(255,255,255,0.46)",
          border: "rgba(80,48,28,0.10)",
          color: heroTextColor,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55)",
        };
      }
      return {
        background: surfaceStyle === "aero" ? "linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.44) 100%)" : "linear-gradient(180deg, rgba(255,255,255,0.64) 0%, rgba(255,255,255,0.38) 100%)",
        border: "rgba(255,255,255,0.58)",
        color: heroTextColor,
        boxShadow: surfaceStyle === "aero"
          ? "inset 0 1px 0 rgba(255,255,255,0.96), inset 0 -1px 0 rgba(0,0,0,0.07)"
          : "inset 0 1px 0 rgba(255,255,255,0.78), inset 0 -1px 0 rgba(0,0,0,0.08)",
      };
    };
    const cinematicBottomLaneFree = settings.cinematic_home && settings.hide_bottom_bar && !settings.show_home_collections;
    const cinematicPinnedVisible = (settings.home_pinned_pos ?? "bottom") !== "none" && homePinnedApps.length > 0;
    const cinematicPinnedAtBottom = cinematicBottomLaneFree && cinematicPinnedVisible && !pinnedAtTop;
    const cinematicHeroAtBottom = cinematicBottomLaneFree && !cinematicPinnedVisible;
    const cinematicHeroNearChevron = settings.cinematic_home && settings.hide_bottom_bar && settings.show_home_collections && !cinematicPinnedVisible;
    const cinematicHeroBottom = cinematicHeroAtBottom ? 24 : cinematicPinnedAtBottom ? 88 : cinematicHeroNearChevron ? 72 : 122;
    const heroSideOverlay = !showHeroArtwork
      ? "transparent"
      : materialCinematicHero
      ? "transparent"
      : materialHero
      ? (isDark
          ? (visibleHeroBanner
              ? "linear-gradient(to right, rgba(8,6,5,0.78) 0%, rgba(8,6,5,0.44) 34%, rgba(8,6,5,0.07) 70%, transparent 100%)"
              : "linear-gradient(to right, rgba(8,6,5,0.84) 0%, rgba(8,6,5,0.48) 38%, rgba(8,6,5,0.10) 76%, transparent 100%)")
          : (visibleHeroBanner
              ? `linear-gradient(to right, color-mix(in srgb, ${accent.lightBg} 52%, transparent 48%) 0%, color-mix(in srgb, ${accent.lightBg} 24%, transparent 76%) 42%, transparent 100%)`
              : `linear-gradient(to right, color-mix(in srgb, ${accent.lightBg} 58%, transparent 42%) 0%, color-mix(in srgb, ${accent.lightBg} 30%, transparent 70%) 46%, transparent 100%)`))
      : visibleHeroBanner
        ? (isDark
            ? "linear-gradient(to right, rgba(6,3,1,0.82) 0%, rgba(6,3,1,0.55) 45%, rgba(6,3,1,0.18) 100%)"
            : `linear-gradient(to right, ${appBg}cc 0%, ${appBg}55 40%, transparent 100%)`)
        : (isDark
            ? "linear-gradient(to right, rgba(8,4,2,0.88) 0%, rgba(8,4,2,0.5) 50%, rgba(8,4,2,0.2) 100%)"
            : `linear-gradient(to right, ${appBg}dd 0%, ${appBg}66 45%, transparent 100%)`);
    const heroBottomOverlay = !showHeroArtwork
      ? "transparent"
      : materialCinematicHero
      ? "transparent"
      : materialHero
      ? (isDark
          ? "linear-gradient(to bottom, transparent 0%, rgba(10,8,7,0.48) 100%)"
          : `linear-gradient(to bottom, transparent 0%, color-mix(in srgb, ${accent.lightBg} 34%, transparent 66%) 100%)`)
      : isDark
        ? "linear-gradient(to bottom, transparent, rgba(6,3,1,0.95))"
        : `linear-gradient(to bottom, transparent, ${appBg}bb)`;
    const heroTextAnchorOverlay = !showHeroArtwork
      ? "transparent"
      : materialCinematicHero
      ? "transparent"
      : materialHero
      ? (isDark
          ? "radial-gradient(ellipse 46% 42% at 16% 72%, rgba(0,0,0,0.34) 0%, rgba(0,0,0,0.18) 34%, transparent 68%)"
          : "radial-gradient(ellipse 46% 42% at 16% 72%, rgba(39,27,18,0.18) 0%, rgba(39,27,18,0.09) 34%, transparent 68%)")
      : "transparent";

    return (
      <div style={{ display: "flex", flexDirection: "column", padding: settings.cinematic_home ? "0" : semiHome ? "0" : "16px 24px 0", ...(settings.wide_layout || settings.cinematic_home || semiHome ? {} : { maxWidth: 1400, margin: "0 auto" }), width: "100%", boxSizing: "border-box",
        ...(settings.cinematic_home ? { position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none" } : { minHeight: "100%" }) }}>
        {/* ── HERO ── */}
        <div style={{
          ...(settings.cinematic_home
            ? { position: "fixed", inset: 0, zIndex: 0 }
            : semiHome
            ? { position: "relative", height: "clamp(260px, 50vh, 580px)", borderRadius: surfaceCardRadius, flexShrink: 0 }
            : { position: "relative", height: "clamp(280px, 44vh, 460px)", borderRadius: surfaceCardRadius, flexShrink: 0 }),
          overflow: "hidden", display: "flex", flexDirection: "column",
          border: settings.cinematic_home ? "none" : heroFocused ? `1px solid ${surfaceStyle === "material" ? accent.primary : accent.glow + "0.5)"}` : `1px solid ${surfaceStyle === "material" ? "var(--material-border-subtle)" : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
          boxShadow: settings.cinematic_home ? "none" : heroFocused ? (surfaceStyle === "material" ? materialRaisedShadow : `0 0 0 1px ${accent.glow}0.2), 0 8px 40px ${accent.glow}0.15)`) : (surfaceStyle === "material" ? "var(--material-shadow-medium)" : "0 4px 24px rgba(0,0,0,0.15)"),
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          background: settings.cinematic_home && !showHeroArtwork ? "transparent" : materialHero ? appBg : isDark ? "#0a0502" : appBg,
        }}>
          <div style={{ position: "absolute", inset: 0, zIndex: 0, borderRadius: settings.cinematic_home ? 0 : surfaceCardRadius, overflow: "hidden" }}>
            {heroGames.map((game, idx) => {
              const isActive = idx === heroIdx;
              const isNearby = Math.abs(idx - heroIdx) <= 1;

              const rawStaticBanner = customHeroArt[game.id] || heroStatic[game.id];
              const fallback = customArt[game.id] || gameArt[game.id];
              const animatedUrl = resolveHeroType(game.id) === "animated"
                ? heroAnimated[game.id] : null;
              const primaryHeroMedia = animatedUrl || rawStaticBanner;
              const showVideo = isHeroVideoUrl(primaryHeroMedia);
              const showAnimatedImage = isAnimatedImageUrl(primaryHeroMedia);
              const staticBanner = showVideo || showAnimatedImage ? null : rawStaticBanner;
              const mediaPaused = appPaused || heroMediaPaused;

              const coverStyle: any = { width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" };
              return (
                <div key={game.id} style={{ position: "absolute", inset: 0, opacity: isActive ? 1 : 0.001, transition: "opacity 0.35s ease", zIndex: isActive ? 1 : 0, pointerEvents: isActive ? "auto" : "none" }}>
                  {/* Base layer: render images only for active ±1 to reduce GPU texture pressure */}
                  {isNearby && showHeroArtwork
                    ? (staticBanner
                        ? <img src={staticBanner} alt="" decoding="async" loading="eager" fetchPriority={isActive ? "high" : "low"} style={{ ...coverStyle, transform: "translateZ(0)" }} />
                        : fallback
                          ? <img src={fallback} alt="" decoding="async" loading="eager" style={{ ...coverStyle, filter: materialHero ? `blur(10px) brightness(${isDark ? "0.56" : "0.98"}) saturate(${isDark ? "1.12" : "1.02"})` : `blur(18px) brightness(${isDark ? "0.42" : "0.92"}) saturate(${isDark ? "1.3" : "0.9"})`, transform: materialHero ? "scale(1.045)" : "scale(1.08)" }} />
                          : <img src={`/assets/liftoff_hero_${settings.accent}.svg`} alt="" style={{ ...coverStyle }} />)
                    : <div style={{ width: "100%", height: "100%" }} />
                  }
                  {showHeroArtwork && showAnimatedImage && !mediaPaused && (
                    <img
                      src={primaryHeroMedia}
                      alt=""
                      decoding="async"
                      loading="eager"
                      style={{ ...coverStyle, position: "absolute", top: 0, left: 0, transform: "translateZ(0)", willChange: "opacity" }}
                    />
                  )}
                  {showHeroArtwork && showVideo && (
                    <video
                      ref={el => {
                        if (el) {
                          heroVideoRefs.current[game.id] = el;
                        } else {
                          delete heroVideoRefs.current[game.id];
                        }
                      }}
                      src={primaryHeroMedia}
                      loop muted playsInline preload="auto"
                      style={{
                        position: "absolute",
                        top: 0, left: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "center top",
                        transform: "translateZ(0)",
                        willChange: "opacity",
                        visibility: mediaPaused ? "hidden" : "visible",
                      }}
                    />
                  )}
                </div>
              );
            })}
            <div style={{ position: "absolute", inset: 0, zIndex: 2, background: heroSideOverlay }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: materialHero ? "42%" : "55%", zIndex: 2, background: heroBottomOverlay }} />
            {materialHero && <div style={{ position: "absolute", inset: 0, zIndex: 2, background: heroTextAnchorOverlay }} />}
          </div>
          {!settings.cinematic_home && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                zIndex: 1,
                ...(homePinnedApps.length > 0 && (settings.home_pinned_pos ?? "bottom") !== "none"
                  ? {
                      WebkitMaskImage: "linear-gradient(to bottom, transparent 0px, transparent 86px, black 132px)",
                      maskImage: "linear-gradient(to bottom, transparent 0px, transparent 86px, black 132px)",
                    }
                  : {}),
                ...heroReadabilityOverlayStyle,
              }}
            />
          )}

          {/* Pinned bar — hidden in cinematic mode, shown separately below hero */}
          {!settings.cinematic_home && (settings.home_pinned_pos ?? "bottom") !== "none" && <div style={pinnedAtTop
            ? { position: "relative", zIndex: 2, padding: "16px 20px 0", flexShrink: 0, order: 0 }
            : { position: "relative", zIndex: 2, padding: "0 20px 20px", flexShrink: 0, order: 2 }}>
            {homePinnedApps.length > 0 ? (
              <div ref={pinnedShelfRef} style={{ display: "flex", gap: 8, overflowX: "auto", padding: "10px 14px 14px", margin: "-6px -14px -10px" }}>
                {homePinnedApps.map((app, i) => {
                  const focused = focusSec === "pinned" && focusIdx === i;
                  const art = app.app_type === "game" ? (customArt[app.id] || gameArt[app.id]) : null;
                  const idlePinned = getHeroPinnedIdleStyle();
                  return (
                    <AppListItem
                      key={app.id}
                      ref={focused ? focusedCardRef : null}
                      variant="pill"
                      name={app.name}
                      icon={art
                        ? <img src={art} alt={app.name} style={{ width: 24, height: 24, borderRadius: 4, objectFit: "cover" }} />
                        : <AppIcon app={app} size={24} />}
                      focused={focused}
                      idleBackground={idlePinned.background}
                      idleBorder={idlePinned.border}
                      idleBoxShadow={idlePinned.boxShadow}
                      idleColor={idlePinned.color}
                      activeTextColor={activeTextColor}
                      onClick={() => { setFocusSection("pinned"); focusSectionRef.current = "pinned"; setFocusIndex(i); focusIndexRef.current = i; }}
                      onDoubleClick={() => triggerLaunch(app, recentRef.current)}
                    />
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: 10, color: "rgba(245,237,232,0.25)", letterSpacing: "0.1em" }}>{t('home.pinHint')}</div>
            )}
          </div>}

          {/* Hero content */}
          <div style={materialCinematicHero
            ? {
                position: "absolute",
                bottom: cinematicHeroBottom,
                left: 24,
                zIndex: 4,
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 20,
                padding: webcoreHero ? "44px 24px 20px 20px" : "20px 24px 20px 20px",
                borderRadius: surfaceCardRadius,
                background: webcoreHero
                  ? surface.panelBg
                  : `url("${isDark ? PAPER_GRAIN_DARK : PAPER_GRAIN_LIGHT}") repeat, ${isDark ? "var(--material-elevation-2)" : "var(--material-elevation-3)"}`,
                border: webcoreHero ? "2px solid" : "1px solid var(--material-border-subtle)",
                borderColor: webcoreHero ? surface.borderRaisedSoft : undefined,
                boxShadow: webcoreHero ? `${surface.bevelRaised}, 0 14px 32px rgba(0,0,0,${isDark ? "0.38" : "0.24"})` : "var(--material-shadow-high)",
                maxWidth: 480,
                pointerEvents: "auto",
              }
            : settings.cinematic_home
            ? { position: "fixed", left: 0, right: 0, bottom: cinematicHeroAtBottom ? 0 : cinematicPinnedAtBottom ? "84px" : cinematicHeroNearChevron ? "68px" : "120px", zIndex: 2, pointerEvents: "auto", display: "flex", alignItems: "flex-end", padding: "0 32px 20px" }
            : { position: "relative", zIndex: 1, flex: 1, display: "flex",
                alignItems: "flex-end",
                padding: "0 20px 20px",
                order: 1 }}>
            {webcoreHero && materialCinematicHero && (
              <div style={{ position: "absolute", left: 2, right: 2, top: 2, height: 22, background: surface.titleBarBg, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 5px 0 7px", boxSizing: "border-box" }}>
                <span style={{ color: "white", fontSize: 11, fontFamily: "Tahoma, Arial, sans-serif", fontWeight: 700 }}>{heroGame?.name || "LiftOff"}</span>
                <span style={{ width: 14, height: 14, background: surface.buttonBg, border: "1px solid", borderColor: surface.buttonBorder, boxShadow: surface.buttonShadow, color: surface.buttonText, fontSize: 10, lineHeight: "12px", textAlign: "center", fontFamily: "monospace", fontWeight: 700 }}>x</span>
              </div>
            )}
            {settings.show_hero_cover !== false && (
              <div style={materialCinematicHero
                ? { flexShrink: 0, width: 90, height: 135 }
                : { flexShrink: 0, width: "clamp(80px, 10vw, 150px)", aspectRatio: "2/3", marginRight: 20 }}>
                {heroArt
                  ? <img key={heroGame?.id} src={heroArt} alt={heroGame?.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: webcoreHero ? 0 : 8, boxShadow: materialCinematicHero ? (webcoreHero ? surface.coverShadow : isDark ? "var(--material-shadow-medium)" : "0 4px 14px rgba(39,27,18,0.18), 0 10px 28px rgba(39,27,18,0.10)") : "0 8px 32px rgba(0,0,0,0.7)", animation: "heroArtFade 0.3s ease forwards" }} />
                  : heroGame
                    ? <img src={`/assets/liftoff_cover_${settings.accent}.svg`} alt={heroGame.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: webcoreHero ? 0 : 8, boxShadow: materialCinematicHero ? (webcoreHero ? surface.coverShadow : isDark ? "var(--material-shadow-medium)" : "0 4px 14px rgba(39,27,18,0.18), 0 10px 28px rgba(39,27,18,0.10)") : "0 8px 32px rgba(0,0,0,0.7)" }} />
                    : <div style={{ width: "100%", height: "100%", borderRadius: webcoreHero ? 0 : 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
                }
              </div>
            )}
            {heroGame ? (
              <div style={materialCinematicHero ? { display: "flex", flexDirection: "column", gap: 6, minWidth: 0 } : { flex: settings.cinematic_home ? 1 : "0 1 auto", minWidth: 0, maxWidth: settings.cinematic_home ? undefined : "min(780px, 100%)", alignSelf: settings.cinematic_home ? undefined : "flex-end", ...(!settings.cinematic_home ? heroCopySurfaceStyle : {}), ...(!settings.cinematic_home && settings.show_hero_cover !== false ? { minHeight: "clamp(120px, 15vw, 225px)", boxSizing: "border-box", justifyContent: "center", display: "flex", flexDirection: "column" } : {}) }}>
                {/* Title label and name */}
                {<>
                  <div style={{ fontSize: materialCinematicHero ? 11 : 10, letterSpacing: materialCinematicHero ? "0.10em" : "0.2em", textTransform: "uppercase", color: materialCinematicHero ? accent.primary : settings.cinematic_home ? accent.primary : heroLabelColor, marginBottom: materialCinematicHero ? 0 : 6, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, textShadow: materialCinematicHero || settings.cinematic_home ? undefined : heroTextShadow }}>
                    {heroIdx === 0 ? t('home.resumePlaying') : t('home.recentlyPlayed')}
                  </div>
                  <div style={{ fontSize: materialCinematicHero ? 28 : "clamp(22px, 3.2vw, 48px)", fontWeight: 700, color: materialCinematicHero ? (isDark ? "rgba(255,250,245,0.95)" : "rgba(28,20,14,0.92)") : settings.cinematic_home ? (materialHero ? materialHeroText : theme.text) : heroTextColor, marginBottom: materialCinematicHero ? 0 : 4, lineHeight: materialCinematicHero ? 1.1 : 1.05, textShadow: materialCinematicHero ? "none" : settings.cinematic_home ? (materialHero ? (isDark ? "0 2px 14px rgba(0,0,0,0.64)" : "0 1px 0 rgba(255,255,255,0.32), 0 2px 10px rgba(39,27,18,0.12)") : isDark ? "0 2px 20px rgba(0,0,0,0.8)" : "none") : heroTextShadow }}>{heroGame.name}</div>
                  <div style={{ fontSize: materialCinematicHero ? 12 : 11, color: materialCinematicHero ? (isDark ? "rgba(255,250,245,0.45)" : "rgba(28,20,14,0.42)") : settings.cinematic_home ? (materialHero ? materialHeroDimText : theme.textDim) : heroSubtextColor, marginBottom: materialCinematicHero ? 4 : 16, textShadow: materialCinematicHero || settings.cinematic_home ? undefined : heroTextShadow }}>{t('home.game')}</div>
                </>}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div onClick={() => triggerLaunch(heroGame, recentRef.current)}
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, minWidth: materialCinematicHero ? 130 : undefined, padding: materialCinematicHero ? "10px 20px" : "10px 24px", borderRadius: launchRadius, cursor: "pointer", transition: "all 0.15s ease", fontWeight: 600, fontSize: 14,
                      background: settings.cinematic_home
                        ? (heroFocused ? accent.primary : surfaceStyle === "material" ? "var(--material-elevation-3)" : surfaceStyle === "aero" ? (isDark ? "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.11) 100%)" : "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.72) 100%)") : glassEnabled ? (isDark ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.55)") : isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.07)")
                        : heroFocused
                          ? accent.primary
                          : isDark
                            ? "rgba(255,255,255,0.12)"
                            : surfaceStyle === "material"
                              ? "rgba(250,241,230,0.72)"
                              : surfaceStyle === "clear"
                                ? "rgba(255,255,255,0.34)"
                                : "rgba(255,255,255,0.28)",
                      color: heroFocused ? activeTextColor : settings.cinematic_home ? (materialHero ? materialHeroText : theme.text) : heroTextColor,
                      border: settings.cinematic_home
                        ? `1px solid ${heroFocused ? accent.primary : surfaceStyle === "material" ? (isDark ? "rgba(255,255,255,0.05)" : "rgba(43,31,20,0.05)") : surfaceStyle === "aero" ? (isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.88)") : glassEnabled ? (isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.70)") : isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)"}`
                        : `1px solid ${heroFocused ? accent.primary : isDark ? "rgba(255,255,255,0.2)" : surfaceStyle === "material" ? "rgba(80,48,28,0.14)" : "rgba(255,255,255,0.34)"}`,
                      backdropFilter: surfaceStyle === "material" ? undefined : glassEnabled ? (surfaceStyle === "aero" ? "blur(10px) saturate(140%)" : "blur(14px) saturate(150%)") : "blur(8px)", WebkitBackdropFilter: surfaceStyle === "material" ? undefined : glassEnabled ? (surfaceStyle === "aero" ? "blur(10px) saturate(140%)" : "blur(14px) saturate(150%)") : "blur(8px)",
                      boxShadow: settings.cinematic_home
                        ? (heroFocused ? (surfaceStyle === "aero" ? `inset 0 1px 0 rgba(255,255,255,0.62), inset 0 2px 8px rgba(255,255,255,0.20), inset 0 -1px 0 rgba(0,0,0,0.20), 0 4px 24px ${accent.glow}0.55)` : surfaceStyle === "material" ? "var(--material-shadow-high)" : `0 4px 24px ${accent.glow}0.5)`) : surfaceStyle === "aero" ? (isDark ? `inset 0 1px 0 rgba(255,255,255,0.48), inset 0 -1px 0 rgba(0,0,0,0.12), 0 0 0 1px ${accent.glow}0.12)` : `inset 0 1px 0 rgba(255,255,255,0.99), inset 0 -1px 0 rgba(0,0,0,0.06), 0 0 0 1px ${accent.glow}0.10)`) : surfaceStyle === "material" ? (isDark ? "0 8px 22px rgba(0,0,0,0.36), 0 20px 46px rgba(0,0,0,0.24)" : "0 8px 22px rgba(39,27,18,0.16), 0 18px 44px rgba(39,27,18,0.10)") : glassEnabled ? (isDark ? "inset 0 1px 0 rgba(255,255,255,0.14)" : "inset 0 1px 0 rgba(255,255,255,0.95)") : "none")
                        : heroFocused ? (surfaceStyle === "aero" ? `inset 0 1px 0 rgba(255,255,255,0.62), inset 0 2px 8px rgba(255,255,255,0.20), inset 0 -1px 0 rgba(0,0,0,0.20), 0 4px 24px ${accent.glow}0.55)` : surfaceStyle === "material" ? "var(--material-shadow-high)" : `0 4px 24px ${accent.glow}0.5)`) : "none",
                    }}>
                    <svg width="11" height="11" viewBox="0 0 10 10" fill="currentColor"><path d="M2 1.5l7 3.5-7 3.5z"/></svg>
                    {t('home.launch')}
                  </div>
                  {heroGames.length > 1 && (
                    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                      {heroGames.slice(0, 6).map((_, i) => (
                        <div key={i} onClick={() => { setHeroIndex(i); heroIndexRef.current = i; }}
                          style={{ width: i === heroIdx ? 20 : 6, height: 6, borderRadius: 3, cursor: "pointer", transition: "all 0.2s ease",
                            background: i === heroIdx ? accent.primary : settings.cinematic_home ? (materialCinematicHero ? (isDark ? "rgba(255,250,245,0.20)" : "rgba(28,20,14,0.18)") : isDark ? "rgba(245,237,232,0.25)" : "rgba(0,0,0,0.2)") : isDark ? "rgba(245,237,232,0.25)" : "rgba(48,32,24,0.22)" }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 14, color: theme.textFaint }}>{t('home.noGames')}</div>
            )}
          </div>
          {heroFocused && !settings.cinematic_home && !semiHome && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: surfaceStyle === "material" ? accent.primary : `linear-gradient(to right, ${accent.primary}, ${accent.glow}0))`, pointerEvents: "none", zIndex: 3 }} />}
        </div>


        {/* ── CINEMATIC PINNED SHELF — fixed overlay, position driven by home_pinned_pos ── */}
        {settings.cinematic_home && cinematicPinnedVisible && (
          <div ref={pinnedShelfRef} style={{
            position: "fixed", left: 0, right: 0, zIndex: 2, display: "flex", gap: 8, overflowX: "auto", pointerEvents: "auto",
            ...(pinnedAtTop
              ? { top: 72, padding: "12px 24px 0" }
              : { bottom: cinematicPinnedAtBottom ? 0 : "60px", padding: cinematicPinnedAtBottom ? "0 24px 14px" : "0 24px 12px" }),
          }}>
              {homePinnedApps.map((app, i) => {
                const focused = focusSec === "pinned" && focusIdx === i;
                const art = app.app_type === "game" ? (customArt[app.id] || gameArt[app.id]) : null;
                return (
                  <div key={app.id} ref={focused ? focusedCardRef : null}
                    onClick={() => { setFocusSection("pinned"); focusSectionRef.current = "pinned"; setFocusIndex(i); focusIndexRef.current = i; }}
                    onDoubleClick={() => triggerLaunch(app, recentRef.current)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "7px 12px",
                      flexShrink: 0, cursor: "pointer", borderRadius: surfaceCardRadius, transition: "all 0.15s ease",
                      background: focused ? accent.primary : surfaceStyle === "material" ? "var(--material-elevation-2)" : surfaceStyle === "aero" ? (isDark ? "linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.10) 100%)" : "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.70) 100%)") : glassEnabled ? (isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.55)") : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.18)",
                      backdropFilter: surfaceStyle === "material" ? undefined : glassEnabled ? (surfaceStyle === "aero" ? "blur(10px) saturate(140%)" : "blur(14px) saturate(150%)") : undefined, WebkitBackdropFilter: surfaceStyle === "material" ? undefined : glassEnabled ? (surfaceStyle === "aero" ? "blur(10px) saturate(140%)" : "blur(14px) saturate(150%)") : undefined,
                      border: `1px solid ${focused ? accent.primary : surfaceStyle === "material" ? (isDark ? "rgba(255,255,255,0.05)" : "rgba(43,31,20,0.05)") : surfaceStyle === "aero" ? (isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.88)") : glassEnabled ? (isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.70)") : isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.22)"}`,
                      boxShadow: focused ? (surfaceStyle === "aero" ? `inset 0 1px 0 rgba(255,255,255,0.62), inset 0 2px 8px rgba(255,255,255,0.20), inset 0 -1px 0 rgba(0,0,0,0.20), 0 3px 14px ${accent.glow}0.55)` : surfaceStyle === "material" ? "var(--material-shadow-medium)" : `0 2px 12px ${accent.glow}0.5)`) : surfaceStyle === "aero" ? (isDark ? `inset 0 1px 0 rgba(255,255,255,0.42), inset 0 -1px 0 rgba(0,0,0,0.10), 0 0 0 1px ${accent.glow}0.12)` : `inset 0 1px 0 rgba(255,255,255,0.99), inset 0 -1px 0 rgba(0,0,0,0.06), 0 0 0 1px ${accent.glow}0.10)`) : surfaceStyle === "material" ? "var(--material-shadow-low)" : glassEnabled ? (isDark ? "inset 0 1px 0 rgba(255,255,255,0.14)" : "inset 0 1px 0 rgba(255,255,255,0.95)") : "none",
                    }}>
                    {art
                      ? <img src={art} alt={app.name} style={{ width: 24, height: 24, borderRadius: 4, objectFit: "cover" }} />
                      : <AppIcon app={app} size={24} />}
                    <div style={{ fontSize: 12, fontWeight: 500, color: focused ? activeTextColor : isDark ? "rgba(245,237,232,0.9)" : "rgba(0,0,0,0.85)", whiteSpace: "nowrap", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis" }}>{app.name}</div>
                  </div>
                );
              })}
          </div>
        )}

        {/* ── RECENTS ── */}
        {!settings.cinematic_home && settings.show_home_recents !== false && <div style={{ paddingTop: 0, ...(semiHome ? { padding: "0 24px" } : {}) }}>
          <div style={{ paddingTop: 14 }} />
          {homeFilteredRecent.length === 0 ? (
            <div style={{ fontSize: 13, color: theme.textFaint, paddingBottom: settings.show_home_collections ? 16 : 100 }}>{t('home.noRecents')}</div>
          ) : (
            <div
              ref={recentShelfRef}
              style={{
                display: "flex",
                gap: 10,
                overflowX: "auto",
                paddingTop: 16,
                paddingBottom: settings.show_home_collections ? 32 : 120,
                paddingLeft: 18,
                paddingRight: 18,
                marginTop: -16,
                marginLeft: -18,
                marginRight: -18,
                scrollPaddingLeft: 18,
                scrollPaddingRight: 18,
              }}
            >
              {homeFilteredRecent.map((app, i) => {
                const focused = focusSec === "recent" && focusIdx === i;
                const isPinned = pins.includes(app.id);
                const art = app.app_type === "game" ? (customArt[app.id] || gameArt[app.id]) : (customArt[app.id] || null);
                const fullApp = allAppsRef.current.find(a => a.id === app.id) || app;
                const homeBase = Math.round(110 * (settings.home_cover_scale ?? 1.0));
                const CARD_W = `${homeBase}px`;
                const CARD_H = `${Math.round(homeBase * 1.5)}px`;
                if (app.app_type === "game") {
                  return (
                    // Outer wrapper — no overflow:hidden so ring can extend with gap
                    <div key={app.id} ref={focused ? focusedCardRef : null}
                      onClick={() => { setFocusSection("recent"); focusSectionRef.current = "recent"; setFocusIndex(i); focusIndexRef.current = i; }}
                      onDoubleClick={() => triggerLaunch(app, recentRef.current)}
                      style={{ flexShrink: 0, width: CARD_W, height: CARD_H, borderRadius: surfaceCardRadius, cursor: "pointer", position: "relative", transition: "transform 0.15s ease",
                        transform: focused ? "scale(1.05) translateY(-3px)" : "scale(1)" }}>
                      {/* Inner content — overflow:hidden clips the art */}
                      <div style={{ position: "absolute", inset: 0, borderRadius: surfaceCardRadius, overflow: "hidden", transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                        border: `1px solid ${focused && !isOnyx ? (surfaceStyle === "material" ? accent.primary : accent.glow + "0.6)") : (surfaceStyle === "material" ? "var(--material-border-subtle)" : "rgba(255,255,255,0.08)")}`,
                        boxShadow: focused && !isOnyx ? (surfaceStyle === "material" ? materialFocusShadow : `0 0 0 1px ${accent.glow}0.3), 0 0 24px ${accent.glow}0.2)`) : (surfaceStyle === "material" ? "var(--material-shadow-low)" : "none"),
                      }}>
                        {art
                          ? <img src={art} alt={app.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <div style={{ width: "100%", height: "100%", background: surfaceStyle === "material" ? "var(--material-elevation-1)" : `${accent.glow}0.08)`, display: "flex", alignItems: "center", justifyContent: "center" }}><AppIcon app={fullApp} size={36} /></div>
                        }
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 8px 7px", background: "linear-gradient(transparent, rgba(0,0,0,0.85))" }}>
                          <div style={{ fontSize: 9, fontWeight: 600, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fullApp.name}</div>
                        </div>
                        <PinBadge isPinned={isPinned} small />
                        {focused && !isOnyx && <div style={{ position: "absolute", inset: 0, border: `2px solid ${surfaceStyle === "material" ? accent.primary : accent.glow + "0.6)"}`, borderRadius: surfaceCardRadius, pointerEvents: "none" }} />}
                      </div>
                      <FocusRing focused={focused} variant="spin" elementRadius={surfaceCardRadius} />
                    </div>
                  );
                }
                const color = iconColors[app.id];
                const tintBg = color ? `rgba(${color.r},${color.g},${color.b},0.18)` : glass.background;
                const tintBorder = color ? `rgba(${color.r},${color.g},${color.b},0.18)` : "rgba(255,255,255,0.08)";
                if (art) {
                  return (
                    <div key={app.id} ref={focused ? focusedCardRef : null}
                      onClick={() => { setFocusSection("recent"); focusSectionRef.current = "recent"; setFocusIndex(i); focusIndexRef.current = i; }}
                      onDoubleClick={() => triggerLaunch(app, recentRef.current)}
                      style={{ flexShrink: 0, width: CARD_W, height: CARD_H, borderRadius: surfaceCardRadius, cursor: "pointer", position: "relative", transition: "transform 0.15s ease",
                        transform: focused ? "scale(1.05) translateY(-3px)" : "scale(1)" }}>
                      <div style={{ position: "absolute", inset: 0, borderRadius: surfaceCardRadius, overflow: "hidden", transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                        border: `1px solid ${focused && !isOnyx ? (surfaceStyle === "material" ? accent.primary : accent.glow + "0.6)") : (surfaceStyle === "material" ? "var(--material-border-subtle)" : "rgba(255,255,255,0.08)")}`,
                        boxShadow: focused && !isOnyx ? (surfaceStyle === "material" ? materialFocusShadow : `0 0 0 1px ${accent.glow}0.3), 0 0 24px ${accent.glow}0.2)`) : (surfaceStyle === "material" ? "var(--material-shadow-low)" : "none"),
                      }}>
                        <img src={art} alt={fullApp.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 8px 7px", background: "linear-gradient(transparent, rgba(0,0,0,0.85))" }}>
                          <div style={{ fontSize: 9, fontWeight: 600, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fullApp.name}</div>
                        </div>
                        <PinBadge isPinned={isPinned} small />
                        {focused && !isOnyx && <div style={{ position: "absolute", inset: 0, border: `2px solid ${surfaceStyle === "material" ? accent.primary : accent.glow + "0.6)"}`, borderRadius: surfaceCardRadius, pointerEvents: "none" }} />}
                      </div>
                      <FocusRing focused={focused} variant="spin" elementRadius={surfaceCardRadius} />
                    </div>
                  );
                }
                return (
                  <div key={app.id} ref={focused ? focusedCardRef : null}
                    onClick={() => { setFocusSection("recent"); focusSectionRef.current = "recent"; setFocusIndex(i); focusIndexRef.current = i; }}
                    onDoubleClick={() => triggerLaunch(app, recentRef.current)}
                    style={{ ...glass, background: surfaceStyle === "material" ? "var(--material-elevation-2)" : surfaceStyle === "obsidian" ? glass.background : isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.52)", backdropFilter: cardBackdropFilter, WebkitBackdropFilter: cardBackdropFilter,
                      border: focused && !isOnyx ? `1px solid ${surfaceStyle === "material" ? accent.primary : accent.glow + "0.6)"}` : `1px solid ${surfaceStyle === "material" ? (isDark ? "rgba(255,255,255,0.05)" : "rgba(43,31,20,0.05)") : tintBorder}`,
                      flexShrink: 0, borderRadius: surfaceCardRadius, cursor: "pointer", transition: "all 0.15s ease",
                      width: CARD_W, height: CARD_H, boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 6px", position: "relative",
                      ...(focused ? { background: surfaceStyle === "material" ? "var(--material-elevation-3)" : isDark ? `${accent.glow}0.1)` : `${accent.glow}0.07)`, boxShadow: !isOnyx ? (surfaceStyle === "material" ? materialFocusShadow : `0 0 0 1px ${accent.glow}0.3), 0 0 20px ${accent.glow}0.1)`) : undefined, transform: "scale(1.05) translateY(-3px)" } : {}) }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", position: "relative", zIndex: 1 }}>
                      <AppIcon app={fullApp} size={40} />
                      <div style={{ fontSize: 8, fontWeight: 500, color: theme.textDim, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{fullApp.name}</div>
                    </div>
                    <PinBadge isPinned={isPinned} small />
                    <FocusRing focused={focused} variant="spin" elementRadius={surfaceCardRadius} />
                  </div>
                );
              })}
            </div>
          )}
        </div>}

        {/* ── HOME COLLECTIONS ── */}
        {settings.show_home_collections && (() => {
          const homeBase = Math.round(110 * (settings.home_cover_scale ?? 1.0));
          const CARD_W = `${homeBase}px`;
          const CARD_H = `${Math.round(homeBase * 1.5)}px`;
          const allCols = [
            ...gameCollections.map(col => ({
              id: col.id, name: col.name, type: "game",
              items: apps.filter(a => a.app_type === "game" && (gameMemberships[a.id] || []).includes(col.id)).slice(0, 20),
            })),
            ...appCollections.map(col => ({
              id: col.id, name: col.name, type: "app",
              items: apps.filter(a => a.app_type === "app" && (appMemberships[a.id] || []).includes(col.id)).slice(0, 20),
            })),
          ].filter(c => c.items.length > 0 && !homeHiddenCollections.includes(c.name));
          if (allCols.length === 0) return null;
          const colsFocused = focusSec === "home_collections";

          const collectionRows = allCols.map((col, rowIdx) => {
            const rowFocused = colsFocused && homeColFocusRow === rowIdx;
            return (
            <div key={col.id} ref={rowFocused ? focusedRowRef : null} style={{ marginBottom: 24 }}>
              {settings.show_home_collection_names && (
                <div style={{ fontSize: sectionTitleFontSize, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: theme.textFaint, paddingBottom: 10, paddingLeft: 4 }}>
                  {col.name}
                </div>
              )}
              <div style={{ display: "flex", gap: 10, overflowX: "auto", padding: "16px 18px 28px", margin: "-16px -18px -20px", scrollPaddingLeft: 18, scrollPaddingRight: 18 }}>
                {col.items.map((app, colIdx) => {
                  const fullApp = allAppsRef.current.find(a => a.id === app.id) || app;
                  const art = customArt[app.id] || (app.app_type === "game" ? gameArt[app.id] : null);
                  const focused = colsFocused && homeColFocusRow === rowIdx && homeColFocusCol === colIdx;
                  if (app.app_type === "game") {
                    return (
                      <div key={app.id}
                        ref={focused ? focusedCardRef : null}
                        onClick={() => { setFocusSection("home_collections"); focusSectionRef.current = "home_collections"; setHomeColFocusRow(rowIdx); homeColFocusRowRef.current = rowIdx; setHomeColFocusCol(colIdx); homeColFocusColRef.current = colIdx; }}
                        onDoubleClick={() => triggerLaunch(app, recentRef.current)}
                        style={{ flexShrink: 0, width: CARD_W, height: CARD_H, borderRadius: surfaceCardRadius, cursor: "pointer", position: "relative",
                          scrollMarginTop: "120px",
                        }}>
                        <div style={{ position: "absolute", inset: 0, borderRadius: surfaceCardRadius, overflow: "hidden", transition: "box-shadow 0.15s ease",
                          outline: (focused && !isOnyx) ? `2px solid ${accent.primary}` : "2px solid transparent",
                          outlineOffset: "2px",
                          border: "1px solid rgba(255,255,255,0.08)",
                          boxShadow: focused && !isOnyx ? (surfaceStyle === "material" ? materialFocusShadow : `0 0 0 1px ${accent.glow}0.3), 0 4px 20px ${accent.glow}0.3)`) : (surfaceStyle === "material" ? "var(--material-shadow-low)" : "none"),
                        }}>
                          {art
                          ? <img src={art} alt={app.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <div style={{ width: "100%", height: "100%", background: surfaceStyle === "material" ? "var(--material-elevation-1)" : `${accent.glow}0.08)`, display: "flex", alignItems: "center", justifyContent: "center" }}><AppIcon app={fullApp} size={36} /></div>
                          }
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 8px 7px", background: "linear-gradient(transparent, rgba(0,0,0,0.85))" }}>
                            <div style={{ fontSize: 9, fontWeight: 600, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.name}</div>
                          </div>
                        </div>
                        <FocusRing focused={focused} variant="spin" elementRadius={surfaceCardRadius} />
                      </div>
                    );
                  }
                  return (
                    <div key={app.id}
                      ref={focused ? focusedCardRef : null}
                      onClick={() => { setFocusSection("home_collections"); focusSectionRef.current = "home_collections"; setHomeColFocusRow(rowIdx); homeColFocusRowRef.current = rowIdx; setHomeColFocusCol(colIdx); homeColFocusColRef.current = colIdx; }}
                      onDoubleClick={() => triggerLaunch(app, recentRef.current)}
                      style={{ ...glass, flexShrink: 0, width: CARD_W, height: CARD_H, borderRadius: surfaceCardRadius, cursor: "pointer", position: "relative",
                        outline: focused && !isOnyx ? `2px solid ${accent.primary}` : "2px solid transparent",
                        outlineOffset: "2px",
                        ...(focused && !isOnyx ? { border: `1px solid ${surfaceStyle === "material" ? accent.primary : accent.glow + "0.4)"}`, boxShadow: surfaceStyle === "material" ? materialFocusShadow : `0 0 0 1px ${accent.glow}0.3), 0 4px 20px ${accent.glow}0.3)` } : {}),
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 6px",
                        transition: "box-shadow 0.15s ease, outline 0.15s ease",
                        scrollMarginTop: "120px",
                      }}>
                      <AppIcon app={fullApp} size={40} />
                      <div style={{ fontSize: 8, fontWeight: 500, color: theme.textDim, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{fullApp.name}</div>
                      <FocusRing focused={focused} variant="spin" elementRadius={surfaceCardRadius} />
                    </div>
                  );
                })}
              </div>
            </div>
            );
          });

          if (settings.cinematic_home) {
            // ── CINEMATIC: chevron hint + slide-up full-screen panel ──
            const panelOpen = colsFocused || focusSec === "recent";
            return (
              <>
                {/* Chevron — clickable for mouse/keyboard users to open drawer */}
                <div
                  onClick={() => { setFocusSection("recent"); focusSectionRef.current = "recent"; setFocusIndex(0); focusIndexRef.current = 0; }}
                  style={{
                    position: "fixed", left: 0, right: 0, bottom: "16px", zIndex: 3,
                    display: "flex", justifyContent: "center", pointerEvents: panelOpen ? "none" : "auto",
                    opacity: panelOpen ? 0 : 1,
                    cursor: "pointer",
                    transition: "opacity 0.3s ease",
                    animation: panelOpen ? "none" : "colChevronBob 1.6s ease-in-out infinite",
                    padding: "8px 0",
                  }}>
                  <svg width="22" height="12" viewBox="0 0 22 12" fill="none">
                    <path d="M2 2L11 10L20 2" stroke={isDark ? "white" : "rgba(0,0,0,0.7)"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                {/* Slide-up drawer panel */}
                <div style={{
                  position: "fixed", left: 0, right: 0, bottom: 0, top: "72px", zIndex: 4,
                  ...(webcoreHero ? {
                    background: surface.panelBg,
                    backdropFilter: undefined,
                    WebkitBackdropFilter: undefined,
                    borderTop: `2px solid ${surface.raisedLight}`,
                    borderLeft: `2px solid ${surface.raisedLight}`,
                    borderRight: `2px solid ${surface.darkEdge}`,
                    boxShadow: `${surface.bevelRaisedSoft}, 0 -10px 24px rgba(0,0,0,${isDark ? "0.42" : "0.20"})`,
                  } : surfaceStyle === "material" ? {
                    background: "var(--material-elevation-3)",
                    borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(43,31,20,0.05)"}`,
                    boxShadow: isDark ? "0 -18px 48px rgba(0,0,0,0.48)" : "0 -18px 42px rgba(43,31,20,0.18)",
                  } : glassEnabled ? {
                    background: isDark
                      ? (surfaceStyle === "aero"
                          ? "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.08) 100%)"
                          : "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)")
                      : surfaceStyle === "aero"
                        ? "linear-gradient(180deg, rgba(255,255,255,0.74) 0%, rgba(255,255,255,0.52) 100%)"
                        : "linear-gradient(180deg, rgba(255,255,255,0.58) 0%, rgba(255,255,255,0.38) 100%)",
                    backdropFilter: isDark
                      ? (surfaceStyle === "aero" ? "blur(18px) saturate(130%) brightness(0.88)" : "blur(32px) saturate(140%) brightness(0.85)")
                      : surfaceStyle === "aero"
                        ? "blur(18px) saturate(145%) brightness(1.04)"
                        : "blur(32px) saturate(150%) brightness(1.02)",
                    WebkitBackdropFilter: isDark
                      ? (surfaceStyle === "aero" ? "blur(18px) saturate(130%) brightness(0.88)" : "blur(32px) saturate(140%) brightness(0.85)")
                      : surfaceStyle === "aero"
                        ? "blur(18px) saturate(145%) brightness(1.04)"
                        : "blur(32px) saturate(150%) brightness(1.02)",
                    borderTop: `1px solid ${isDark ? (surfaceStyle === "aero" ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.14)") : surfaceStyle === "aero" ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.58)"}`,
                    boxShadow: isDark
                      ? (surfaceStyle === "aero" ? "0 -6px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.22)" : "0 -8px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)")
                      : surfaceStyle === "aero"
                        ? "0 -8px 34px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(0,0,0,0.04)"
                        : "0 -8px 40px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.72)",
                  } : {
                    background: isDark ? appBg : "rgba(255,250,244,0.88)",
                    backdropFilter: isDark ? "blur(24px)" : "blur(10px)",
                    WebkitBackdropFilter: isDark ? "blur(24px)" : "blur(10px)",
                    borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                    boxShadow: isDark ? "0 -8px 40px rgba(0,0,0,0.4)" : "0 -8px 32px rgba(43,31,20,0.12)",
                  }),
                  transform: panelOpen ? "translateY(0)" : "translateY(100%)",
                  transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
                  display: "flex", flexDirection: "column",
                  pointerEvents: panelOpen ? "auto" : "none",
                }}>
                  {webcoreHero && (
                    <div style={{
                      height: 24,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0 6px 0 8px",
                      boxSizing: "border-box",
                      background: surface.titleBarBg,
                      borderBottom: surface.titleBarBorder,
                    }}>
                      <span style={{ color: "white", fontSize: 11, fontFamily: "Tahoma, Arial, sans-serif", fontWeight: 700 }}>Library</span>
                      <span style={{ width: 14, height: 14, background: surface.buttonBg, border: "1px solid", borderColor: surface.buttonBorder, boxShadow: surface.buttonShadow, color: surface.buttonText, fontSize: 10, lineHeight: "12px", textAlign: "center", fontFamily: "monospace", fontWeight: 700 }}>x</span>
                    </div>
                  )}
                  {/* Up chevron — sticky outside scroll, always visible */}
                  <div
                    onClick={() => { setFocusSection("pinned"); focusSectionRef.current = "pinned"; setFocusIndex(0); focusIndexRef.current = 0; }}
                    style={{ display: "flex", justifyContent: "center", padding: webcoreHero ? "12px 0 10px" : "16px 0 16px", flexShrink: 0, cursor: "pointer" }}>
                    <svg width="18" height="10" viewBox="0 0 22 12" fill="none" style={{ opacity: 0.4 }}>
                      <path d="M20 10L11 2L2 10" stroke={isDark ? "white" : "rgba(0,0,0,0.7)"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>

                  {/* Scrollable content */}
                  <div ref={drawerScrollRef} style={{ flex: 1, overflowY: "auto", padding: "8px 0 0" }}>
                    {/* Recents row — fully navigable */}
                    {homeFilteredRecent.length > 0 && (
                    <div style={{ marginBottom: 24, padding: "0 24px" }}>
                      <div style={{ fontSize: sectionTitleFontSize, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: theme.textFaint, paddingBottom: 10, paddingLeft: 4, paddingTop: 8 }}>
                        {t('home.recentlyPlayed').replace('▶ ', '')}
                      </div>
                      <div ref={recentShelfRef} style={{ display: "flex", gap: 10, overflowX: "auto", padding: "16px 18px 28px", margin: "-16px -18px -20px", scrollPaddingLeft: 18, scrollPaddingRight: 18 }}>
                        {homeFilteredRecent.map((app, i) => {
                          const recFocused = focusSec === "recent" && focusIdx === i;
                          const fullApp = allAppsRef.current.find(a => a.id === app.id) || app;
                          const art = app.app_type === "game" ? (customArt[app.id] || gameArt[app.id]) : (customArt[app.id] || null);
                          return (
                            <div key={app.id}
                              ref={recFocused ? focusedCardRef : null}
                              onClick={() => { setFocusSection("recent"); focusSectionRef.current = "recent"; setFocusIndex(i); focusIndexRef.current = i; }}
                              onDoubleClick={() => triggerLaunch(app, recentRef.current)}
                              style={{ flexShrink: 0, width: CARD_W, height: CARD_H, borderRadius: surfaceCardRadius, overflow: "hidden", cursor: "pointer", position: "relative",
                                border: surfaceStyle === "material" ? "1px solid var(--material-border-subtle)" : "1px solid rgba(255,255,255,0.08)",
                                outline: recFocused ? `2px solid ${accent.primary}` : "2px solid transparent",
                                outlineOffset: "2px",
                                boxShadow: recFocused ? (surfaceStyle === "material" ? materialFocusShadow : `0 4px 20px ${accent.glow}0.3)`) : (surfaceStyle === "material" ? "var(--material-shadow-low)" : "none"),
                                transition: "outline-color 0.15s ease, box-shadow 0.15s ease",
                              }}>
                              {art
                                ? <img src={art} alt={app.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                : <div style={{ width: "100%", height: "100%", background: surfaceStyle === "material" ? "var(--material-elevation-1)" : `${accent.glow}0.08)`, display: "flex", alignItems: "center", justifyContent: "center" }}><AppIcon app={fullApp} size={36} /></div>
                              }
                              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 8px 7px", background: "linear-gradient(transparent, rgba(0,0,0,0.85))" }}>
                                <div style={{ fontSize: 9, fontWeight: 600, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fullApp.name}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    )}
                    {/* Collection rows */}
                    <div style={{ padding: "0 24px 100px" }}>
                      {collectionRows}
                    </div>
                  </div>
                </div>
              </>
            );
          }

          // ── NORMAL / SEMI MODE: inline below recents ──
          return (
            <div style={{ paddingBottom: 100, ...(semiHome ? { padding: "0 24px 100px" } : {}) }}>
              {collectionRows}
            </div>
          );
        })()}
      </div>
    );
  })();

  return (
    <div
      ref={scrollRef}
      style={{
        position: "absolute",
        inset: 0,
        overflowY: cinematicHome ? "visible" : "auto",
        zIndex: 2,
        pointerEvents: active ? "auto" : "none",
        contentVisibility: active ? "visible" : "hidden",
      }}
    >
      {content}
    </div>
  );
}
