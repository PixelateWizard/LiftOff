import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  setGamepadInputSuspended,
  stopAllRumble,
  suspendGamepadInputUntilButtonsReleased,
} from "../utils/gamepad";

export function useFseSession() {
  const [sessionActive, setSessionActiveState] = useState(false);
  const sessionActiveRef = useRef(false);

  const setSessionActive = (active: boolean, waitForRelease = false) => {
    sessionActiveRef.current = active;
    if (active) {
      setGamepadInputSuspended(true);
      stopAllRumble();
    } else if (waitForRelease) {
      suspendGamepadInputUntilButtonsReleased();
    } else {
      setGamepadInputSuspended(false);
    }
    setSessionActiveState(active);
  };

  useEffect(() => {
    const unlisteners: Array<() => void> = [];
    let disposed = false;

    const addListener = async (event: string, active: boolean, waitForRelease = false) => {
      const unlisten = await listen(event, () => setSessionActive(active, waitForRelease));
      if (disposed) unlisten();
      else unlisteners.push(unlisten);
    };

    addListener("fse:watch-started", true).catch(() => {});
    addListener("fse:hidden", true).catch(() => {});
    addListener("fse:restored", false, true).catch(() => {});
    addListener("fse:gpu-suspended", true).catch(() => {});
    addListener("fse:gpu-resumed", false, true).catch(() => {});
    addListener("fse:no-foreground", false).catch(() => {});

    return () => {
      disposed = true;
      setSessionActive(false);
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, []);

  return { sessionActive, sessionActiveRef };
}

export function summonLiftoff() {
  return invoke("show_liftoff");
}
