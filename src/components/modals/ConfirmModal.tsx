import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getBestGamepad, readGpState, type GpState } from "../../utils/gamepad";
import ModalShell from "./ModalShell";
import { useTheme } from "../../contexts/ThemeContext";

interface Props {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ message, confirmLabel, onConfirm, onCancel }: Props) {
  const { glass, accent, theme, isDark } = useTheme();
  const { t } = useTranslation();
  const label = confirmLabel ?? t("confirm.yes");

  useEffect(() => {
    const last: Partial<GpState> = {};
    let rafId: number;
    let suppressFrames = 20;
    const poll = () => {
      if (suppressFrames > 0) { suppressFrames--; rafId = requestAnimationFrame(poll); return; }
      const gp = getBestGamepad();
      if (gp) {
        const state = readGpState(gp);
        if (state.Enter  && !last.Enter)  { onConfirm(); }
        if (state.Escape && !last.Escape) { onCancel(); }
        Object.assign(last, state);
      }
      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const shortcuts = [
    { btn: "A", label },
    { btn: "B", label: t("common.cancel") },
  ];

  return (
    <ModalShell
      title={message}
      shortcuts={shortcuts}
      width={380}
      zIndex={2500}
    />
  );
}
