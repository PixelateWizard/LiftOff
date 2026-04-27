import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getBestGamepad, readGpState } from "../../utils/gamepad";
import ModalShell from "./ModalShell";

interface Props {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  glass: any;
  accent: any;
  theme: any;
  isDark: boolean;
}

export default function ConfirmModal({ message, confirmLabel, onConfirm, onCancel, glass, accent, theme, isDark }: Props) {
  const { t } = useTranslation();
  const label = confirmLabel ?? t("confirm.yes");

  useEffect(() => {
    const last: any = {};
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
      glass={glass} accent={accent} theme={theme} isDark={isDark}
      width={380}
      zIndex={2500}
    />
  );
}
