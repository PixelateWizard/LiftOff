import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getBestGamepad, readGpState } from "../../utils/gamepad";
import ConfirmModal from "./ConfirmModal";
import ModalShell from "./ModalShell";

interface Folder {
  id: string;
  path: string;
  source: string;
  app_type: string;
  enabled?: boolean;
}

interface Props {
  customFolders: Folder[];
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  glass: any;
  accent: any;
  theme: any;
  isDark: boolean;
  onClose: () => void;
}

export default function FolderManagerModal({ customFolders, onToggle, onDelete, glass, accent, theme, isDark, onClose }: Props) {
  const { t } = useTranslation();
  const [focusIdx, setFocusIdx]           = useState(0);
  const [confirmFolder, setConfirmFolder] = useState<Folder | null>(null);
  const focusIdxRef = useRef(0);
  const confirmRef  = useRef<Folder | null>(null);

  const gameFolders = customFolders.filter(f => f.app_type === "game");
  const appFolders  = customFolders.filter(f => f.app_type !== "game");
  const allFolders  = [...gameFolders, ...appFolders];

  const allFoldersRef = useRef(allFolders);
  useEffect(() => { allFoldersRef.current = allFolders; });

  useEffect(() => {
    const last: any = {};
    let rafId: number;
    let suppressFrames = 20;
    const poll = () => {
      if (suppressFrames > 0) { suppressFrames--; rafId = requestAnimationFrame(poll); return; }
      if (confirmRef.current) { rafId = requestAnimationFrame(poll); return; }
      const gp = getBestGamepad();
      if (gp) {
        const state = readGpState(gp);
        if (state.Escape && !last.Escape) { onClose(); }
        if (state.ArrowDown && !last.ArrowDown) {
          const next = Math.min(focusIdxRef.current + 1, allFoldersRef.current.length - 1);
          setFocusIdx(next); focusIdxRef.current = next;
        }
        if (state.ArrowUp && !last.ArrowUp) {
          const next = Math.max(focusIdxRef.current - 1, 0);
          setFocusIdx(next); focusIdxRef.current = next;
        }
        if (state.Enter && !last.Enter) {
          const folder = allFoldersRef.current[focusIdxRef.current];
          if (folder) onToggle(folder.id, folder.enabled !== false ? false : true);
        }
        if (state.ButtonX && !last.ButtonX) {
          const folder = allFoldersRef.current[focusIdxRef.current];
          if (folder) { setConfirmFolder(folder); confirmRef.current = folder; }
        }
        Object.assign(last, state);
      }
      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const shortcuts = [
    { btn: "A",  label: t("shortcuts.toggle") },
    { btn: "X",  label: t("common.delete") },
    { btn: "B",  label: t("common.close") },
  ];

  const renderGroup = (folders: Folder[], label: string, startIdx: number) => {
    if (folders.length === 0) return null;
    return (
      <div key={label}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: theme.textFaint,
          textTransform: "uppercase", letterSpacing: "0.1em",
          padding: "10px 20px 4px",
        }}>
          {label}
        </div>
        {folders.map((folder, i) => {
          const globalIdx = startIdx + i;
          const focused = focusIdx === globalIdx;
          return (
            <div key={folder.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 20px",
              background: focused ? `${accent.glow}0.15)` : "transparent",
              borderLeft: `3px solid ${focused ? accent.primary : "transparent"}`,
              transition: "background 0.1s",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12,
                  color: folder.enabled !== false ? theme.text : theme.textFaint,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {folder.path}
                </div>
                <div style={{ fontSize: 10, color: theme.textFaint, marginTop: 1 }}>{folder.source}</div>
              </div>
              <div
                onClick={() => onToggle(folder.id, folder.enabled !== false ? false : true)}
                style={{
                  width: 36, height: 20, borderRadius: 10,
                  background: folder.enabled !== false ? accent.primary : (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"),
                  position: "relative", cursor: "pointer", flexShrink: 0,
                }}>
                <div style={{
                  width: 14, height: 14, borderRadius: "50%", background: "white",
                  position: "absolute", top: 3,
                  left: folder.enabled !== false ? 19 : 3,
                  transition: "left 0.2s",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <ModalShell
        title={t("settings.customFolders")}
        shortcuts={shortcuts}
        glass={glass} accent={accent} theme={theme} isDark={isDark}
        width={560}
        maxHeight="70vh"
        zIndex={2000}
      >
        {allFolders.length === 0 && (
          <div style={{ padding: "32px 24px", textAlign: "center", color: theme.textFaint, fontSize: 13, fontStyle: "italic" }}>
            {t("settings.noCustomFolders")}
          </div>
        )}
        {renderGroup(gameFolders, t("tabs.games").toUpperCase(), 0)}
        {renderGroup(appFolders,  t("tabs.apps").toUpperCase(),  gameFolders.length)}
      </ModalShell>

      {confirmFolder && (
        <ConfirmModal
          message={t("confirm.deleteFolder")}
          onConfirm={() => { onDelete(confirmFolder!.id); setConfirmFolder(null); confirmRef.current = null; }}
          onCancel={() => { setConfirmFolder(null); confirmRef.current = null; }}
          glass={glass} accent={accent} theme={theme} isDark={isDark}
        />
      )}
    </>
  );
}
