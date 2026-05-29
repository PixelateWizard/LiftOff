import { useState } from "react";

type UpdateStatus = "checking" | "up_to_date" | "available" | "error" | null;

interface UseUpdateCheckOptions {
  appVersion: string;
  githubRepo: string;
  channel?: "stable" | "prerelease";
}

export interface UpdateCheckData {
  updateStatus: UpdateStatus;
  updateInfo: string | null;
  checkForUpdates: () => void;
}

export function useUpdateCheck({
  appVersion,
  githubRepo,
  channel = "stable",
}: UseUpdateCheckOptions): UpdateCheckData {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>(null);
  const [updateInfo, setUpdateInfo] = useState<string | null>(null);

  const checkForUpdates = () => {
    setUpdateStatus("checking");

    const wantPrerelease = channel === "prerelease";
    const url = wantPrerelease
      ? `https://api.github.com/repos/${githubRepo}/releases?per_page=10`
      : `https://api.github.com/repos/${githubRepo}/releases/latest`;

    fetch(url)
      .then(r => r.json())
      .then(data => {
        let release: { tag_name?: string } | undefined;
        if (wantPrerelease) {
          const list = Array.isArray(data) ? data : [];
          release = list.find((rel: { draft?: boolean }) => !rel.draft);
        } else {
          release = data;
        }

        const latest = release?.tag_name?.replace(/^v/, "");
        if (!latest) {
          setUpdateStatus("error");
          return;
        }
        if (latest === appVersion) {
          setUpdateStatus("up_to_date");
        } else {
          setUpdateStatus("available");
          setUpdateInfo(latest);
        }
      })
      .catch(() => setUpdateStatus("error"));
  };

  return { updateStatus, updateInfo, checkForUpdates };
}
