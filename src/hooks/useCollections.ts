import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface Collection {
  id: string;
  name: string;
  [key: string]: unknown;
}

type Memberships = Record<string, string[]>;

export interface CollectionsData {
  appCollections: Collection[];
  setAppCollections: React.Dispatch<React.SetStateAction<Collection[]>>;
  appCollectionsRef: React.MutableRefObject<Collection[]>;
  appMemberships: Memberships;
  setAppMemberships: React.Dispatch<React.SetStateAction<Memberships>>;
  appMembershipsRef: React.MutableRefObject<Memberships>;
  appCollectionTab: string;
  setAppCollectionTab: React.Dispatch<React.SetStateAction<string>>;
  appCollectionTabRef: React.MutableRefObject<string>;
  gameCollections: Collection[];
  setGameCollections: React.Dispatch<React.SetStateAction<Collection[]>>;
  gameCollectionsRef: React.MutableRefObject<Collection[]>;
  gameMemberships: Memberships;
  setGameMemberships: React.Dispatch<React.SetStateAction<Memberships>>;
  gameMembershipsRef: React.MutableRefObject<Memberships>;
}

export function useCollections(): CollectionsData {
  const [appCollections, setAppCollections] = useState<Collection[]>([]);
  const [appMemberships, setAppMemberships] = useState<Memberships>({});
  const [appCollectionTab, setAppCollectionTab] = useState("All");
  const [gameCollections, setGameCollections] = useState<Collection[]>([]);
  const [gameMemberships, setGameMemberships] = useState<Memberships>({});

  const appCollectionsRef = useRef<Collection[]>([]);
  const appMembershipsRef = useRef<Memberships>({});
  const appCollectionTabRef = useRef("All");
  const gameCollectionsRef = useRef<Collection[]>([]);
  const gameMembershipsRef = useRef<Memberships>({});

  useEffect(() => { appCollectionsRef.current = appCollections; }, [appCollections]);
  useEffect(() => { appMembershipsRef.current = appMemberships; }, [appMemberships]);
  useEffect(() => { appCollectionTabRef.current = appCollectionTab; }, [appCollectionTab]);
  useEffect(() => { gameCollectionsRef.current = gameCollections; }, [gameCollections]);
  useEffect(() => { gameMembershipsRef.current = gameMemberships; }, [gameMemberships]);

  useEffect(() => {
    invoke<Collection[]>("get_app_collections").then(cols => {
      setAppCollections(cols);
      appCollectionsRef.current = cols;
    }).catch(() => {});
    invoke<Memberships>("get_app_memberships").then(m => {
      setAppMemberships(m);
      appMembershipsRef.current = m;
    }).catch(() => {});
    invoke<Collection[]>("get_game_collections").then(cols => {
      setGameCollections(cols);
      gameCollectionsRef.current = cols;
    }).catch(() => {});
    invoke<Memberships>("get_game_memberships").then(m => {
      setGameMemberships(m);
      gameMembershipsRef.current = m;
    }).catch(() => {});
  }, []);

  return {
    appCollections,
    setAppCollections,
    appCollectionsRef,
    appMemberships,
    setAppMemberships,
    appMembershipsRef,
    appCollectionTab,
    setAppCollectionTab,
    appCollectionTabRef,
    gameCollections,
    setGameCollections,
    gameCollectionsRef,
    gameMemberships,
    setGameMemberships,
    gameMembershipsRef,
  };
}
