import { convertFileSrc, invoke } from "@tauri-apps/api/core";

const urlCache = new Map<string, string>();

/**
 * First-run WebView2 after a factory-reset cache wipe 404s hashed `/assets/...`
 * media. Copy bundled Lo-fi files into `%LOCALAPPDATA%/LiftOff/media/lofi/` and
 * load them through the same asset protocol as custom art.
 */
export async function resolveLofiMediaUrl(file: string, signal?: AbortSignal): Promise<string> {
  if (!file || file.startsWith("data:") || file.startsWith("blob:")) return file;
  const cached = urlCache.get(file);
  if (cached) return cached;
  if (signal?.aborted) return "";
  const path = await invoke<string>("ensure_lofi_media", { name: file });
  if (signal?.aborted) return "";
  const url = convertFileSrc(path);
  urlCache.set(file, url);
  return url;
}
