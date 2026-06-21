import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { useCallback } from "react";
import { getRunAsAdmin } from "../constants";
import type { App } from "../types";

interface LaunchAppResult {
  launchMode: string;
  childPid?: number | null;
  detail?: string | null;
  fallbackReason?: string | null;
}

export function launchApp(app: App) {
  return invoke<LaunchAppResult>("launch_app", {
    path: app.launch_path,
    id: app.id,
    name: app.name,
    appType: app.app_type,
    source: app.source ?? "",
    runAsAdmin: getRunAsAdmin(app.id),
  }).then((result) => {
    console.warn("launch_app result", {
      name: app.name,
      source: app.source ?? "",
      path: app.launch_path,
      ...result,
    });
    return result;
  }).catch((err) => {
    window.setTimeout(() => emit("launch-failed").catch(() => {}), 250);
    throw err;
  });
}

export function useLaunchApp() {
  return useCallback((app: App) => launchApp(app), []);
}
