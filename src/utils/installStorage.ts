import type { DriveStorageInfo } from "../types";

export const XBOX_INSTALL_HEADROOM_BYTES = 500 * 1024 * 1024;

export type InstallSpaceVerdict = "unknown" | "enough" | "insufficient";

export function getInstallSpaceVerdict(
  installSizeBytes?: number | null,
  installTargetDrive?: DriveStorageInfo | null,
): InstallSpaceVerdict {
  const size = installSizeBytes ?? null;
  const free = installTargetDrive?.freeBytes ?? null;
  if (size == null || free == null) return "unknown";
  return free >= size + XBOX_INSTALL_HEADROOM_BYTES ? "enough" : "insufficient";
}
