import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getBestGamepad, readGpState, rumble, shouldHandleDirectionRepeat, type GpState } from "../../utils/gamepad";
import { formatBytes } from "../../utils/formatBytes";
import { appLocation } from "../../utils/appDetails";
import { useTheme } from "../../contexts/ThemeContext";
import ModalShell from "./ModalShell";
import type { App } from "../../types";

type SizeBytes = number | "loading" | undefined;

interface DetailAction {
  key: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  checked?: boolean;
}

interface AppDetailsModalProps {
  app: App;
  coverArt?: string;
  sizeBytes?: SizeBytes;
  running?: boolean;
  hapticEnabled?: boolean;
  isPinned: boolean;
  isHidden: boolean;
  onOpen: () => void;
  onClose: () => void;
  onTogglePin: () => void;
  onToggleHidden: () => void;
  onChangeArt: () => void;
  onCollections: () => void;
  onRename: () => void;
  onMoveToGames: () => void;
  onResetCategory?: () => void;
  onDelete?: () => void;
  onCloseApp?: () => void;
}

export function AppDetailsModal({
  app,
  coverArt,
  sizeBytes,
  running = false,
  hapticEnabled = true,
  isPinned,
  isHidden,
  onOpen,
  onClose,
  onTogglePin,
  onToggleHidden,
  onChangeArt,
  onCollections,
  onRename,
  onMoveToGames,
  onResetCategory,
  onDelete,
  onCloseApp,
}: AppDetailsModalProps) {
  const { t } = useTranslation();
  const { accent, theme, isDark } = useTheme();
  const [focusIdx, setFocusIdx] = useState(0);
  const focusIdxRef = useRef(0);
  const focusRefs = useRef<Array<HTMLElement | null>>([]);
  const actionsRef = useRef<DetailAction[]>([]);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const hapticEnabledRef = useRef(hapticEnabled);
  onOpenRef.current = onOpen;
  onCloseRef.current = onClose;
  hapticEnabledRef.current = hapticEnabled;

  const location = appLocation(app);
  const sizeLabel = sizeBytes === "loading"
    ? "…"
    : typeof sizeBytes === "number"
      ? formatBytes(sizeBytes)
      : t("install.sizeUnknown");

  const actions = useMemo<DetailAction[]>(() => [
    ...(running && onCloseApp ? [{ key: "close", label: t("home.close"), onClick: onCloseApp, danger: true }] : []),
    { key: "pin", label: t(isPinned ? "contextMenu.unpin" : "contextMenu.pin"), onClick: onTogglePin, checked: isPinned },
    { key: "hide", label: t(isHidden ? "contextMenu.show" : "contextMenu.hide"), onClick: onToggleHidden, checked: isHidden },
    { key: "art", label: t("contextMenu.changeArt"), onClick: onChangeArt },
    { key: "collections", label: t("contextMenu.collections"), onClick: onCollections },
    { key: "rename", label: t("contextMenu.rename"), onClick: onRename },
    { key: "move", label: t("contextMenu.moveToGames"), onClick: onMoveToGames },
    ...(onResetCategory ? [{ key: "reset", label: t("contextMenu.resetCategory"), onClick: onResetCategory }] : []),
    ...(onDelete ? [{ key: "delete", label: t("contextMenu.delete"), onClick: onDelete, danger: true }] : []),
  ], [
    running, onCloseApp, isPinned, isHidden, onTogglePin, onToggleHidden, onChangeArt,
    onCollections, onRename, onMoveToGames, onResetCategory, onDelete, t,
  ]);

  const focusCount = 1 + actions.length;
  actionsRef.current = actions;

  const setFocusedIndex = (index: number) => {
    const bounded = Math.max(0, Math.min(focusCount - 1, index));
    setFocusIdx(bounded);
    focusIdxRef.current = bounded;
  };

  useEffect(() => {
    setFocusedIndex(Math.min(focusIdxRef.current, focusCount - 1));
  }, [focusCount]);

  useEffect(() => {
    focusRefs.current[focusIdx]?.scrollIntoView?.({ block: "nearest" });
  }, [focusIdx]);

  useEffect(() => {
    const last: Partial<GpState> = {};
    const pressTime: Record<string, number> = {};
    const repeating: Record<string, boolean> = {};
    let rafId = 0;
    let suppressFrames = 20;
    const poll = (now: number) => {
      const gp = getBestGamepad();
      if (gp) {
        const state = readGpState(gp);
        if (suppressFrames > 0) {
          suppressFrames -= 1;
          Object.assign(last, state);
        } else {
          if (shouldHandleDirectionRepeat("ArrowDown", state, last, now, pressTime, repeating)) {
            const next = Math.min(focusIdxRef.current + 1, actionsRef.current.length);
            setFocusIdx(next);
            focusIdxRef.current = next;
          }
          if (shouldHandleDirectionRepeat("ArrowUp", state, last, now, pressTime, repeating)) {
            const next = Math.max(focusIdxRef.current - 1, 0);
            setFocusIdx(next);
            focusIdxRef.current = next;
          }
          if (state.Enter && !last.Enter) {
            if (focusIdxRef.current === 0) {
              rumble("confirm", hapticEnabledRef.current);
              onOpenRef.current();
            } else {
              rumble("confirm", hapticEnabledRef.current);
              actionsRef.current[focusIdxRef.current - 1]?.onClick();
            }
          }
          if (state.Escape && !last.Escape) onCloseRef.current();
          Object.assign(last, state);
        }
      }
      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const shortcuts = [
    { btn: "A", label: running ? t("home.resume") : t("contextMenu.open") },
    { btn: "B", label: t("common.close") },
  ];

  return (
    <ModalShell
      title={app.name}
      shortcuts={shortcuts}
      width={440}
      maxHeight="85vh"
      zIndex={9000}
      onOverlayClick={onClose}
      motion="drill"
    >
      <div data-modal="app-details" style={{ padding: "18px 22px 10px" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
          {coverArt ? (
            <img src={coverArt} alt="" style={{ width: 72, height: 72, borderRadius: 16, objectFit: "cover", flexShrink: 0 }} />
          ) : app.icon_base64 ? (
            <img
              src={`data:image/png;base64,${app.icon_base64}`}
              alt=""
              style={{ width: 72, height: 72, borderRadius: 16, objectFit: "contain", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: 16, flexShrink: 0,
              background: `${accent.glow}0.16)`, color: accent.primary,
              display: "grid", placeItems: "center", fontSize: 28, fontWeight: 700,
            }}>
              {app.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 750, color: theme.text, lineHeight: 1.2 }}>{app.name}</div>
            <div style={{ marginTop: 8, display: "grid", gap: 4, fontSize: 12, color: theme.textDim }}>
              <div><span style={{ color: theme.textFaint }}>{t("details.sizeOnDisk")}</span> · {sizeLabel}</div>
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={location ?? undefined}>
                <span style={{ color: theme.textFaint }}>{t("details.location")}</span>
                {" · "}
                {location || t("details.locationUnknown")}
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          ref={(node) => { focusRefs.current[0] = node; }}
          onClick={onOpen}
          onMouseEnter={() => setFocusedIndex(0)}
          style={{
            width: "100%",
            minHeight: 48,
            borderRadius: 12,
            border: focusIdx === 0 ? `2px solid ${accent.primary}` : `1px solid ${isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)"}`,
            background: focusIdx === 0 ? `${accent.glow}0.22)` : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"),
            color: theme.text,
            fontWeight: 750,
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          {running ? t("home.resume") : t("contextMenu.open")}
        </button>

        <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
          {actions.map((action, idx) => {
            const focused = focusIdx === idx + 1;
            return (
              <button
                key={action.key}
                type="button"
                ref={(node) => { focusRefs.current[idx + 1] = node; }}
                onClick={action.onClick}
                onMouseEnter={() => setFocusedIndex(idx + 1)}
                style={{
                  minHeight: 44,
                  borderRadius: 10,
                  border: focused ? `2px solid ${action.danger ? "#e85a5a" : accent.primary}` : "1px solid transparent",
                  background: focused
                    ? (action.danger ? "rgba(232,90,90,0.16)" : `${accent.glow}0.16)`)
                    : "transparent",
                  color: action.danger ? "#e85a5a" : theme.text,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  textAlign: "left",
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontWeight: 650,
                  fontSize: 13,
                }}
              >
                <span>{action.label}</span>
                {typeof action.checked === "boolean" && (
                  <span
                    aria-hidden
                    style={{
                      width: 34, height: 18, borderRadius: 999, flexShrink: 0, padding: 2, boxSizing: "border-box",
                      display: "inline-flex", alignItems: "center",
                      background: action.checked ? accent.primary : (isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.14)"),
                    }}
                  >
                    <span style={{
                      display: "block", width: 14, height: 14, borderRadius: "50%",
                      background: action.checked ? "#fff" : "rgba(255,255,255,0.88)",
                      transform: action.checked ? "translateX(14px)" : "translateX(0)",
                    }} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </ModalShell>
  );
}
