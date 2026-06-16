import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { CustomFolder } from "../types";

interface CustomAppData {
  source?: string;
}

interface CustomData {
  apps: CustomAppData[];
  folders: CustomFolder[];
}

export interface CustomSourcesData {
  customSources: string[];
  setCustomSources: React.Dispatch<React.SetStateAction<string[]>>;
  customSourcesRef: React.MutableRefObject<string[]>;
  customFolders: CustomFolder[];
  setCustomFolders: React.Dispatch<React.SetStateAction<CustomFolder[]>>;
  reloadCustomSources: () => void;
}

const BUILTIN_SOURCES = new Set([
  "Steam",
  "Xbox",
  "Battle.net",
  "GOG",
  "Epic",
  "Other",
  "steam",
  "xbox",
  "battlenet",
  "gog",
  "epic",
  "desktop",
  "uwp",
]);

function getCustomSources(data: CustomData): string[] {
  return [...new Set([
    ...data.apps.map(a => a.source),
    ...data.folders.map(f => f.source),
  ])].filter((source): source is string => !!source && !BUILTIN_SOURCES.has(source));
}

export function useCustomSources(): CustomSourcesData {
  const [customSources, setCustomSources] = useState<string[]>([]);
  const [customFolders, setCustomFolders] = useState<CustomFolder[]>([]);
  const customSourcesRef = useRef<string[]>([]);

  useEffect(() => { customSourcesRef.current = customSources; }, [customSources]);

  const reloadCustomSources = () => {
    invoke<CustomData>("get_custom_data").then(data => {
      const sources = getCustomSources(data);
      setCustomSources(sources);
      customSourcesRef.current = sources;
      setCustomFolders(data.folders || []);
    }).catch(() => {});
  };

  useEffect(() => {
    reloadCustomSources();
  }, []);

  return {
    customSources,
    setCustomSources,
    customSourcesRef,
    customFolders,
    setCustomFolders,
    reloadCustomSources,
  };
}
