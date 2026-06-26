import { useEffect, useRef } from "react";
import { getRawBestGamepad } from "../utils/gamepad";
import { summonLiftoff } from "./useFseSession";
import type { FseReturnShortcut } from "../types";

const SUMMON_HOLD_MS = 600;
const BTN_LB = 4;
const BTN_RB = 5;
const BTN_VIEW = 8;
const BTN_MENU = 9;
const BTN_L3 = 10;
const BTN_R3 = 11;

function shortcutPressed(pad: Gamepad, shortcut: FseReturnShortcut): boolean {
  if (shortcut === "view_menu") {
    return !!pad.buttons[BTN_VIEW]?.pressed && !!pad.buttons[BTN_MENU]?.pressed;
  }
  if (shortcut === "lb_rb") {
    return !!pad.buttons[BTN_LB]?.pressed && !!pad.buttons[BTN_RB]?.pressed;
  }
  return !!pad.buttons[BTN_L3]?.pressed && !!pad.buttons[BTN_R3]?.pressed;
}

export function useSummonCombo(active: boolean, shortcut: FseReturnShortcut = "l3_r3") {
  const rafRef = useRef<number | null>(null);
  const holdStartRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!active) {
      holdStartRef.current = null;
      firedRef.current = false;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    const tick = () => {
      const pad = getRawBestGamepad();
      if (pad) {
        const pressed = shortcutPressed(pad, shortcut);
        const now = performance.now();

        if (pressed) {
          if (holdStartRef.current == null) holdStartRef.current = now;
          if (!firedRef.current && now - holdStartRef.current >= SUMMON_HOLD_MS) {
            firedRef.current = true;
            summonLiftoff().catch(() => {});
          }
        } else {
          holdStartRef.current = null;
          firedRef.current = false;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [active, shortcut]);
}
