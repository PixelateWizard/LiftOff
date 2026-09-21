import type { App } from "../types";

/** Prefer the install folder; fall back to the launch target. */
export function appLocation(app: Pick<App, "install_dir" | "launch_path">): string | null {
  const dir = typeof app.install_dir === "string" ? app.install_dir.trim() : "";
  if (dir) return dir;
  const path = typeof app.launch_path === "string" ? app.launch_path.trim() : "";
  return path || null;
}

export function isHttpLaunchPath(path: string | null | undefined): boolean {
  const value = String(path ?? "");
  return value.startsWith("http://") || value.startsWith("https://");
}
