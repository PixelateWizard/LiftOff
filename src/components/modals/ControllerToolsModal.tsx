import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ControllerTestWidget } from "../ControllerTestWidget";
import { GamepadIconPreview } from "../ui";
import { getBestGamepad, readGpState, type GpState } from "../../utils/gamepad";
import ModalShell from "./ModalShell";

export type ControllerToolsMode = "icons" | "test";

interface ControllerToolsModalProps {
  mode: ControllerToolsMode;
  onClose: () => void;
}

export default function ControllerToolsModal({ mode, onClose }: ControllerToolsModalProps) {
  const { t } = useTranslation();
  const closedRef = useRef(false);
  const closeWithBack = mode === "test";

  useEffect(() => {
    closedRef.current = false;
    const close = () => {
      if (closedRef.current) return;
      closedRef.current = true;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      close();
    };
    window.addEventListener("keydown", onKey, true);

    let raf = 0;
    const last: Partial<GpState> = {};
    let closeBtnReleased = false;
    const poll = () => {
      if (closedRef.current) return;
      const gp = getBestGamepad();
      if (gp) {
        const state = readGpState(gp);
        const closePressed = closeWithBack ? state.Select : state.Escape;
        const wasClosePressed = closeWithBack ? last.Select : last.Escape;
        if (!closePressed) closeBtnReleased = true;
        if (closeBtnReleased && closePressed && !wasClosePressed) close();
        Object.assign(last, state);
      }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => {
      closedRef.current = true;
      window.removeEventListener("keydown", onKey, true);
      cancelAnimationFrame(raf);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ModalShell
      title={mode === "icons" ? t("settings.gamepadIconPreview") : t("settings.controllerTest")}
      shortcuts={[{ btn: closeWithBack ? "BACK" : "B", label: t("common.close") }]}
      width={mode === "icons" ? 560 : 720}
      maxHeight="82vh"
      zIndex={9200}
      onOverlayClick={onClose}
    >
      <div style={{ padding: 20 }}>
        {mode === "icons" ? <GamepadIconPreview /> : <ControllerTestWidget />}
      </div>
    </ModalShell>
  );
}
