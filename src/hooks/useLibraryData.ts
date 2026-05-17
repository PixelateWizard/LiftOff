import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { App } from "../types";

type LibraryRefreshStatus = "scanning" | "done" | null;

interface IconColor {
  r: number;
  g: number;
  b: number;
}

interface UseLibraryDataOptions {
  fetchGameArt: (apps: App[]) => Promise<void> | void;
  onLoaded?: (visibleApps: App[]) => void;
  onLoadError?: () => void;
}

export interface LibraryData {
  apps: App[];
  setApps: React.Dispatch<React.SetStateAction<App[]>>;
  appsRef: React.MutableRefObject<App[]>;
  allAppsRef: React.MutableRefObject<App[]>;
  recent: App[];
  setRecent: React.Dispatch<React.SetStateAction<App[]>>;
  recentRef: React.MutableRefObject<App[]>;
  recentGames: App[];
  setRecentGames: React.Dispatch<React.SetStateAction<App[]>>;
  recentGamesRef: React.MutableRefObject<App[]>;
  pins: string[];
  setPins: React.Dispatch<React.SetStateAction<string[]>>;
  pinsRef: React.MutableRefObject<string[]>;
  hidden: string[];
  setHidden: React.Dispatch<React.SetStateAction<string[]>>;
  hiddenRef: React.MutableRefObject<string[]>;
  iconColors: Record<string, IconColor>;
  libraryRefreshStatus: LibraryRefreshStatus;
  togglePin: (app: App) => void;
  toggleHidden: (appId: string) => void;
  refreshLibrary: () => void;
}

async function sampleIconColor(base64: string): Promise<IconColor | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext("2d");
    const timer = setTimeout(() => resolve(null), 3000);
    img.onload = () => {
      clearTimeout(timer);
      try {
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] > 30) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
          }
        }
        resolve(count > 0 ? { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) } : null);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = `data:image/png;base64,${base64}`;
  });
}

export function useLibraryData({ fetchGameArt, onLoaded, onLoadError }: UseLibraryDataOptions): LibraryData {
  const [apps, setApps] = useState<App[]>([]);
  const [recent, setRecent] = useState<App[]>([]);
  const [recentGames, setRecentGames] = useState<App[]>([]);
  const [pins, setPins] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [iconColors, setIconColors] = useState<Record<string, IconColor>>({});
  const [libraryRefreshStatus, setLibraryRefreshStatus] = useState<LibraryRefreshStatus>(null);

  const appsRef = useRef<App[]>([]);
  const allAppsRef = useRef<App[]>([]);
  const recentRef = useRef<App[]>([]);
  const recentGamesRef = useRef<App[]>([]);
  const pinsRef = useRef<string[]>([]);
  const hiddenRef = useRef<string[]>([]);
  const libraryRefreshStatusRef = useRef<LibraryRefreshStatus>(null);

  const sampleVisibleIconColors = (visible: App[]) => {
    visible.filter(a => a.app_type !== "game" && typeof a.icon_base64 === "string").forEach(a => {
      sampleIconColor(a.icon_base64 as string).then(color => {
        if (color) setIconColors(prev => ({ ...prev, [a.id]: color }));
      });
    });
  };

  const togglePin = (app: App) => {
    invoke<string[]>("toggle_pin", { appId: app.id }).then((updatedPins) => {
      setPins(updatedPins);
      pinsRef.current = updatedPins;
    }).catch(console.error);
  };

  const toggleHidden = (appId: string) => {
    invoke<string[]>("toggle_hidden", { appId }).then((updatedHidden) => {
      setHidden(updatedHidden);
      hiddenRef.current = updatedHidden;
      setApps(prev => {
        const isNowHidden = updatedHidden.includes(appId);
        const next = isNowHidden
          ? prev.filter(a => a.id !== appId)
          : [...prev, allAppsRef.current.find(a => a.id === appId)].filter(Boolean) as App[];
        appsRef.current = next;
        return next;
      });
    }).catch(console.error);
  };

  const refreshLibrary = () => {
    if (libraryRefreshStatusRef.current === "scanning") return;
    setLibraryRefreshStatus("scanning");
    libraryRefreshStatusRef.current = "scanning";
    Promise.all([invoke<App[]>("get_all_apps"), invoke<string[]>("get_hidden")]).then(([all, loadedHidden]) => {
      allAppsRef.current = all;
      setHidden(loadedHidden);
      hiddenRef.current = loadedHidden;
      const visible = all.filter(a => !loadedHidden.includes(a.id));
      setApps(visible);
      appsRef.current = visible;
      sampleVisibleIconColors(visible);
      fetchGameArt(visible.filter(a => a.app_type === "game"));
      setLibraryRefreshStatus("done");
      libraryRefreshStatusRef.current = "done";
      setTimeout(() => {
        setLibraryRefreshStatus(null);
        libraryRefreshStatusRef.current = null;
      }, 2500);
    }).catch(() => {
      setLibraryRefreshStatus(null);
      libraryRefreshStatusRef.current = null;
    });
  };

  useEffect(() => {
    invoke<App[]>("get_recents").then(recents => {
      if (recents.length > 0) {
        setRecent(recents);
        recentRef.current = recents;
      }
    });
    invoke<App[]>("get_recent_games").then(games => {
      if (games.length > 0) {
        setRecentGames(games);
        recentGamesRef.current = games;
      }
    });
    invoke<string[]>("get_pins").then(loadedPins => {
      setPins(loadedPins);
      pinsRef.current = loadedPins;
    });
    Promise.all([invoke<App[]>("get_all_apps"), invoke<string[]>("get_hidden")]).then(([all, loadedHidden]) => {
      allAppsRef.current = all;
      setHidden(loadedHidden);
      hiddenRef.current = loadedHidden;
      const visible = all.filter(a => !loadedHidden.includes(a.id));
      setApps(visible);
      appsRef.current = visible;
      sampleVisibleIconColors(visible);
      invoke<App[]>("get_recents").then(recents => {
        if (recents.length === 0) {
          const fallback = visible.slice(0, 10);
          setRecent(fallback);
          recentRef.current = fallback;
        }
      });
      if (recentGamesRef.current.length === 0) {
        const gamesFallback = visible.filter(a => a.app_type === "game").slice(0, 6);
        setRecentGames(gamesFallback);
        recentGamesRef.current = gamesFallback;
      }
      fetchGameArt(visible.filter(a => a.app_type === "game"));
      onLoaded?.(visible);
    }).catch((e) => {
      console.error("Failed to load apps:", e);
      onLoadError?.();
    });
  }, []);

  return {
    apps,
    setApps,
    appsRef,
    allAppsRef,
    recent,
    setRecent,
    recentRef,
    recentGames,
    setRecentGames,
    recentGamesRef,
    pins,
    setPins,
    pinsRef,
    hidden,
    setHidden,
    hiddenRef,
    iconColors,
    libraryRefreshStatus,
    togglePin,
    toggleHidden,
    refreshLibrary,
  };
}
