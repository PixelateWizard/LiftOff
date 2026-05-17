import { useRef, useState } from "react";

export interface SearchState {
  searchOpen: boolean;
  searchQuery: string;
  searchMode: string;
  searchFocusIndex: number;
  kbRow: number;
  kbCol: number;
  kbNumMode: boolean;
  setSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setSearchMode: React.Dispatch<React.SetStateAction<string>>;
  setSearchFocusIndex: React.Dispatch<React.SetStateAction<number>>;
  setKbRow: React.Dispatch<React.SetStateAction<number>>;
  setKbCol: React.Dispatch<React.SetStateAction<number>>;
  setKbNumMode: React.Dispatch<React.SetStateAction<boolean>>;
  searchOpenRef: React.MutableRefObject<boolean>;
  searchQueryRef: React.MutableRefObject<string>;
  searchModeRef: React.MutableRefObject<string>;
  searchFocusIndexRef: React.MutableRefObject<number>;
  kbRowRef: React.MutableRefObject<number>;
  kbColRef: React.MutableRefObject<number>;
  kbNumModeRef: React.MutableRefObject<boolean>;
  openSearch: () => void;
  closeSearch: () => void;
  switchSearchMode: (mode: string) => void;
  kbDelete: () => void;
  kbSpace: () => void;
  kbToggleNum: () => void;
  fireKey: (key: string) => void;
}

export function useSearchState(): SearchState {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState("keyboard");
  const [searchFocusIndex, setSearchFocusIndex] = useState(0);
  const [kbRow, setKbRow] = useState(0);
  const [kbCol, setKbCol] = useState(0);
  const [kbNumMode, setKbNumMode] = useState(false);

  const searchOpenRef = useRef(false);
  const searchQueryRef = useRef("");
  const searchModeRef = useRef("keyboard");
  const searchFocusIndexRef = useRef(0);
  const kbRowRef = useRef(0);
  const kbColRef = useRef(0);
  const kbNumModeRef = useRef(false);

  const openSearch = () => {
    setSearchOpen(true);       searchOpenRef.current = true;
    setSearchQuery("");        searchQueryRef.current = "";
    setSearchMode("keyboard"); searchModeRef.current = "keyboard";
    setSearchFocusIndex(0);    searchFocusIndexRef.current = 0;
    setKbRow(0);               kbRowRef.current = 0;
    setKbCol(0);               kbColRef.current = 0;
    setKbNumMode(false);       kbNumModeRef.current = false;
  };

  const closeSearch = () => {
    setSearchOpen(false);      searchOpenRef.current = false;
    setSearchQuery("");        searchQueryRef.current = "";
    setSearchMode("keyboard"); searchModeRef.current = "keyboard";
    setSearchFocusIndex(0);    searchFocusIndexRef.current = 0;
    setKbRow(0);               kbRowRef.current = 0;
    setKbCol(0);               kbColRef.current = 0;
    setKbNumMode(false);       kbNumModeRef.current = false;
  };

  const switchSearchMode = (mode: string) => {
    setSearchMode(mode);
    searchModeRef.current = mode;
    if (mode === "results") {
      setSearchFocusIndex(0);
      searchFocusIndexRef.current = 0;
    }
    if (mode === "keyboard") {
      setKbRow(0);
      kbRowRef.current = 0;
      setKbCol(0);
      kbColRef.current = 0;
    }
  };

  const kbDelete = () => {
    const next = searchQueryRef.current.slice(0, -1);
    setSearchQuery(next);
    searchQueryRef.current = next;
    setSearchFocusIndex(0);
    searchFocusIndexRef.current = 0;
  };

  const kbSpace = () => {
    const next = searchQueryRef.current + " ";
    setSearchQuery(next);
    searchQueryRef.current = next;
    setSearchFocusIndex(0);
    searchFocusIndexRef.current = 0;
  };

  const kbToggleNum = () => {
    const next = !kbNumModeRef.current;
    setKbNumMode(next);
    kbNumModeRef.current = next;
    setKbRow(0);
    kbRowRef.current = 0;
    setKbCol(0);
    kbColRef.current = 0;
  };

  const fireKey = (key: string) => {
    const next = searchQueryRef.current + key;
    setSearchQuery(next);
    searchQueryRef.current = next;
    setSearchFocusIndex(0);
    searchFocusIndexRef.current = 0;
  };

  return {
    searchOpen,
    searchQuery,
    searchMode,
    searchFocusIndex,
    kbRow,
    kbCol,
    kbNumMode,
    setSearchOpen,
    setSearchQuery,
    setSearchMode,
    setSearchFocusIndex,
    setKbRow,
    setKbCol,
    setKbNumMode,
    searchOpenRef,
    searchQueryRef,
    searchModeRef,
    searchFocusIndexRef,
    kbRowRef,
    kbColRef,
    kbNumModeRef,
    openSearch,
    closeSearch,
    switchSearchMode,
    kbDelete,
    kbSpace,
    kbToggleNum,
    fireKey,
  };
}
