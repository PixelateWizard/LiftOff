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
  productId: string | undefined,
  enabled: boolean,
): StoreMetaState {
  const [state, setState] = useState<StoreMetaState>({ data: null, loading: false, error: null });
  const reqId = useRef(0);

  useEffect(() => {
    const normalizedSource = source?.toLowerCase();
    const metadataId = normalizedSource === "steam" ? appId : normalizedSource === "xbox" ? productId : undefined;
    if (!enabled || !metadataId || !["steam", "xbox"].includes(normalizedSource ?? "")) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    const key = `${normalizedSource}:${metadataId}`;
    const cached = memCache.get(key);
    if (cached) {
      setState({ data: cached, loading: false, error: null });
      return;
    }

    const myReq = ++reqId.current;
    setState({ data: null, loading: true, error: null });
    const request = normalizedSource === "xbox"
      ? invoke<StoreMetadata>("fetch_xbox_store_metadata", { productId: metadataId })
      : invoke<StoreMetadata>("fetch_store_metadata", { source: normalizedSource, appId: metadataId });
    request
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
  }, [source, appId, productId, enabled]);

  return state;
}
