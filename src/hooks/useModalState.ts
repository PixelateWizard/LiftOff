import { useEffect, useRef, useState } from "react";
import type { App } from "../types";

type ArtPickerMode = "grid" | "hero";
type FileBrowserMode = "file" | "folder" | null;

export interface ContextMenuState {
  x: number;
  y: number;
  app: App;
  focusedIdx: number;
}

export interface ModalState {
  showHideModal: boolean;
  showLibraryActions: boolean;
  showFileBrowser: FileBrowserMode;
  pendingFile: any;
  showColModal: boolean;
  colPickerApp: App | null;
  confirmDelete: App | null;
  showFolderManager: boolean;
  artPickerApp: App | null;
  artPickerMode: ArtPickerMode;
  contextMenu: ContextMenuState | null;
  editNameApp: App | null;
  showPowerModal: boolean;
  setShowHideModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowLibraryActions: React.Dispatch<React.SetStateAction<boolean>>;
  setShowFileBrowser: React.Dispatch<React.SetStateAction<FileBrowserMode>>;
  setPendingFile: React.Dispatch<React.SetStateAction<any>>;
  setShowColModal: React.Dispatch<React.SetStateAction<boolean>>;
  setColPickerApp: React.Dispatch<React.SetStateAction<App | null>>;
  setConfirmDelete: React.Dispatch<React.SetStateAction<App | null>>;
  setShowFolderManager: React.Dispatch<React.SetStateAction<boolean>>;
  setArtPickerApp: React.Dispatch<React.SetStateAction<App | null>>;
  setArtPickerMode: React.Dispatch<React.SetStateAction<ArtPickerMode>>;
  setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState | null>>;
  setEditNameApp: React.Dispatch<React.SetStateAction<App | null>>;
  setShowPowerModal: React.Dispatch<React.SetStateAction<boolean>>;
  showHideModalRef: React.MutableRefObject<boolean>;
  showLibraryActionsRef: React.MutableRefObject<boolean>;
  showFileBrowserRef: React.MutableRefObject<FileBrowserMode>;
  pendingFileRef: React.MutableRefObject<any>;
  showColModalRef: React.MutableRefObject<boolean>;
  colPickerAppRef: React.MutableRefObject<App | null>;
  confirmDeleteRef: React.MutableRefObject<App | null>;
  showFolderManagerRef: React.MutableRefObject<boolean>;
  artPickerAppRef: React.MutableRefObject<App | null>;
  artPickerModeRef: React.MutableRefObject<ArtPickerMode>;
  contextMenuRef: React.MutableRefObject<ContextMenuState | null>;
  editNameAppRef: React.MutableRefObject<App | null>;
  showPowerModalRef: React.MutableRefObject<boolean>;
}

export function useModalState(): ModalState {
  const [showHideModal, setShowHideModal] = useState(false);
  const [showLibraryActions, setShowLibraryActions] = useState(false);
  const [showFileBrowser, setShowFileBrowser] = useState<FileBrowserMode>(null);
  const [pendingFile, setPendingFile] = useState<any>(null);
  const [showColModal, setShowColModal] = useState(false);
  const [colPickerApp, setColPickerApp] = useState<App | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<App | null>(null);
  const [showFolderManager, setShowFolderManager] = useState(false);
  const [artPickerApp, setArtPickerApp] = useState<App | null>(null);
  const [artPickerMode, setArtPickerMode] = useState<ArtPickerMode>("grid");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [editNameApp, setEditNameApp] = useState<App | null>(null);
  const [showPowerModal, setShowPowerModal] = useState(false);

  const showHideModalRef = useRef(false);
  const showLibraryActionsRef = useRef(false);
  const showFileBrowserRef = useRef<FileBrowserMode>(null);
  const pendingFileRef = useRef<any>(null);
  const showColModalRef = useRef(false);
  const colPickerAppRef = useRef<App | null>(null);
  const confirmDeleteRef = useRef<App | null>(null);
  const showFolderManagerRef = useRef(false);
  const artPickerAppRef = useRef<App | null>(null);
  const artPickerModeRef = useRef<ArtPickerMode>("grid");
  const contextMenuRef = useRef<ContextMenuState | null>(null);
  const editNameAppRef = useRef<App | null>(null);
  const showPowerModalRef = useRef(false);

  useEffect(() => { showHideModalRef.current = showHideModal; }, [showHideModal]);
  useEffect(() => { showLibraryActionsRef.current = showLibraryActions; }, [showLibraryActions]);
  useEffect(() => { showFileBrowserRef.current = showFileBrowser; }, [showFileBrowser]);
  useEffect(() => { pendingFileRef.current = pendingFile; }, [pendingFile]);
  useEffect(() => { showColModalRef.current = showColModal; }, [showColModal]);
  useEffect(() => { colPickerAppRef.current = colPickerApp; }, [colPickerApp]);
  useEffect(() => { confirmDeleteRef.current = confirmDelete; }, [confirmDelete]);
  useEffect(() => { showFolderManagerRef.current = showFolderManager; }, [showFolderManager]);
  useEffect(() => { artPickerAppRef.current = artPickerApp; }, [artPickerApp]);
  useEffect(() => { artPickerModeRef.current = artPickerMode; }, [artPickerMode]);
  useEffect(() => { contextMenuRef.current = contextMenu; }, [contextMenu]);
  useEffect(() => { editNameAppRef.current = editNameApp; }, [editNameApp]);
  useEffect(() => { showPowerModalRef.current = showPowerModal; }, [showPowerModal]);

  return {
    showHideModal,
    showLibraryActions,
    showFileBrowser,
    pendingFile,
    showColModal,
    colPickerApp,
    confirmDelete,
    showFolderManager,
    artPickerApp,
    artPickerMode,
    contextMenu,
    editNameApp,
    showPowerModal,
    setShowHideModal,
    setShowLibraryActions,
    setShowFileBrowser,
    setPendingFile,
    setShowColModal,
    setColPickerApp,
    setConfirmDelete,
    setShowFolderManager,
    setArtPickerApp,
    setArtPickerMode,
    setContextMenu,
    setEditNameApp,
    setShowPowerModal,
    showHideModalRef,
    showLibraryActionsRef,
    showFileBrowserRef,
    pendingFileRef,
    showColModalRef,
    colPickerAppRef,
    confirmDeleteRef,
    showFolderManagerRef,
    artPickerAppRef,
    artPickerModeRef,
    contextMenuRef,
    editNameAppRef,
    showPowerModalRef,
  };
}
