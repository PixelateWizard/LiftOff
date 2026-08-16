import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

export type DeckCompatCategory = "unknown" | "unsupported" | "playable" | "verified";

export interface DeckCompatResult {
  category: DeckCompatCategory;
  fetchedAt: number;
}

export function useDeckCompat(appid: number | undefined, enabled: boolean) {
  const [result, setResult] = useState<DeckCompatResult | undefined>();

  useEffect(() => {
    setResult(undefined);
    if (!enabled || appid == null) return;

    let cancelled = false;
    invoke<DeckCompatResult | null>("get_steam_deck_compat", { appid })
      .then((response) => {
        if (!cancelled && response) setResult(response);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [appid, enabled]);

  return result;
}
