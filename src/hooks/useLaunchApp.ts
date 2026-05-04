import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { useCallback } from "react";
import type { App } from "../types";

export function launchApp(app: App) {
  return invoke("launch_app", {
    path: app.launch_path,
    id: app.id,
    name: app.name,
    appType: app.app_type,
  }).catch((err) => {
    window.setTimeout(() => emit("launch-failed").catch(() => {}), 250);
    throw err;
  });
}

export function useLaunchApp() {
  return useCallback((app: App) => launchApp(app), []);
}
