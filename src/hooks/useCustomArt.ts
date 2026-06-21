import { useCallback, useRef, useState } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import type { App } from "../types";

type ArtMap = Record<string, string>;

export function useCustomArt() {
  const [gameArt, setGameArt] = useState<ArtMap>({});
  const [heroStatic, setHeroStatic] = useState<ArtMap>({});
  const [heroAnimated, setHeroAnimated] = useState<ArtMap>({});
  const [customArt, setCustomArt] = useState<ArtMap>({});
  const [customHeroArt, setCustomHeroArt] = useState<ArtMap>({});

  const customArtRef = useRef<ArtMap>({});
  const customHeroArtRef = useRef<ArtMap>({});

  const toUrl = useCallback((pathOrUrl?: string | null) => {
    if (!pathOrUrl) return null;
    if (pathOrUrl.startsWith("http")) return pathOrUrl;
    return convertFileSrc(pathOrUrl);
  }, []);

  const loadCustomArt = useCallback(() => {
    invoke<Record<string, string>>("get_custom_art")
      .then(art => {
        const heroArt: ArtMap = {};
        const gridArt: ArtMap = {};
        for (const [k, v] of Object.entries(art)) {
          if (k.startsWith("hero:")) heroArt[k.slice(5)] = v;
          else gridArt[k] = v;
        }
        setCustomArt(gridArt);
        customArtRef.current = gridArt;
        setCustomHeroArt(heroArt);
        customHeroArtRef.current = heroArt;
      })
      .catch(() => {});
  }, []);

  const fetchGameArt = useCallback(async (
    games: App[],
    onProgress?: (done: number, total: number, lastName?: string) => void,
    options: { includeUninstalled?: boolean } = {}
  ) => {
    if (!games.length) return;

    try {
      const bulk = await invoke<Record<string, { grid?: string; hero_animated?: string; hero_static?: string }>>(
        "get_cached_art_bulk",
        { gameNames: games.map(g => g.name) }
      );
      const newGrid: ArtMap = {};
      const newAnimated: ArtMap = {};
      const newStatic: ArtMap = {};
      games.forEach(game => {
        const b = bulk[game.name];
        if (!b) return;
        newGrid[game.id] = toUrl(b.grid) ?? "";
        newAnimated[game.id] = toUrl(b.hero_animated) ?? "";
        newStatic[game.id] = toUrl(b.hero_static) ?? "";
      });
      if (Object.keys(newGrid).length) setGameArt(prev => ({ ...prev, ...newGrid }));
      if (Object.keys(newAnimated).length) setHeroAnimated(prev => ({ ...prev, ...newAnimated }));
      if (Object.keys(newStatic).length) setHeroStatic(prev => ({ ...prev, ...newStatic }));
    } catch {}

    const networkGames = options.includeUninstalled ? games : games.filter(game => game.installed !== false);
    let done = 0;
    const total = networkGames.length;
    if (!networkGames.length) return;
    const BATCH = 4;
    for (let i = 0; i < networkGames.length; i += BATCH) {
      const batchGrid: ArtMap = {};
      const batchAnimated: ArtMap = {};
      const batchStatic: ArtMap = {};
      await Promise.all(networkGames.slice(i, i + BATCH).map(game =>
        invoke<{ grid?: string; hero_animated?: string; hero_static?: string }>("fetch_game_art", {
          gameName: game.name,
          source: game.source ?? null,
          appid: game.steam_appid ?? null,
        })
          .then(bundle => {
            batchGrid[game.id] = toUrl(bundle.grid) ?? "";
            batchAnimated[game.id] = toUrl(bundle.hero_animated) ?? "";
            batchStatic[game.id] = toUrl(bundle.hero_static) ?? "";
            onProgress?.(++done, total, game.name);
          })
          .catch(() => {
            batchGrid[game.id] = "";
            batchAnimated[game.id] = "";
            batchStatic[game.id] = "";
            onProgress?.(++done, total, game.name);
          })
      ));
      if (Object.keys(batchGrid).length) setGameArt(prev => ({ ...prev, ...batchGrid }));
      if (Object.keys(batchAnimated).length) setHeroAnimated(prev => ({ ...prev, ...batchAnimated }));
      if (Object.keys(batchStatic).length) setHeroStatic(prev => ({ ...prev, ...batchStatic }));
    }
  }, [toUrl]);

  const clearGameArt = useCallback(() => {
    setGameArt({});
    setHeroAnimated({});
    setHeroStatic({});
  }, []);

  return {
    gameArt,
    setGameArt,
    heroStatic,
    setHeroStatic,
    heroAnimated,
    setHeroAnimated,
    customArt,
    setCustomArt,
    customHeroArt,
    setCustomHeroArt,
    customArtRef,
    customHeroArtRef,
    loadCustomArt,
    fetchGameArt,
    clearGameArt,
  };
}
