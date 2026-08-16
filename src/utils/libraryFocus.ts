import type { App } from "../types";

interface LibraryEntryFocusOptions {
  tab: string;
  apps: App[];
  pinnedIds: string[];
  gameSourceTab?: string;
  appCollectionTab?: string;
  showUninstalledGames?: boolean;
  installFilter?: string;
}

export function getLibraryEntryFocusSection({
  tab,
  apps,
  pinnedIds,
  gameSourceTab = "All",
  appCollectionTab = "All",
  showUninstalledGames = true,
  installFilter = "all",
}: LibraryEntryFocusOptions): "pinned" | "grid" {
  if (tab === "Games" && gameSourceTab !== "All") return "grid";
  if (tab === "Apps" && appCollectionTab !== "All") return "grid";
  if (tab !== "Games" && tab !== "Apps") return "grid";

  const appType = tab === "Games" ? "game" : "app";
  const hasVisiblePin = pinnedIds.some((id) => {
    const app = apps.find((entry) => entry.id === id);
    if (!app || app.app_type !== appType) return false;
    if (tab !== "Games") return true;
    const installed = app.installed !== false;
    if (!showUninstalledGames && !installed) return false;
    if (installFilter === "installed") return installed;
    if (installFilter === "notInstalled") return !installed;
    return true;
  });

  return hasVisiblePin ? "pinned" : "grid";
}
