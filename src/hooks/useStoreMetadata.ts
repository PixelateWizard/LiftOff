import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
import type { StoreMetadata } from "../types";

interface StoreMetaState {
  data: StoreMetadata | null;
  loading: boolean;
  error: string | null;
}

const memCache = new Map<string, StoreMetadata>();

export function useStoreMetadata(
  source: string | undefined,
  appId: string | undefined,
  enabled: boolean,
): StoreMetaState {
  const [state, setState] = useState<StoreMetaState>({ data: null, loading: false, error: null });
  const reqId = useRef(0);

  useEffect(() => {
    const normalizedSource = source?.toLowerCase();
    if (!enabled || normalizedSource !== "steam" || !appId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    const key = `${normalizedSource}:${appId}`;
    const cached = memCache.get(key);
    if (cached) {
      setState({ data: cached, loading: false, error: null });
      return;
    }

    const myReq = ++reqId.current;
    setState({ data: null, loading: true, error: null });
    invoke<StoreMetadata>("fetch_store_metadata", { source: normalizedSource, appId })
      .then((meta) => {
        memCache.set(key, meta);
        if (reqId.current === myReq) {
          setState({ data: meta, loading: false, error: null });
        }
      })
      .catch((err) => {
        if (reqId.current === myReq) {
          setState({ data: null, loading: false, error: String(err) });
        }
      });
  }, [source, appId, enabled]);

  return state;
}
