import { useState } from "react";

type UpdateStatus = "checking" | "up_to_date" | "available" | "error" | null;

interface UseUpdateCheckOptions {
  appVersion: string;
  githubRepo: string;
}

export interface UpdateCheckData {
  updateStatus: UpdateStatus;
  updateInfo: string | null;
  checkForUpdates: () => void;
}

export function useUpdateCheck({
  appVersion,
  githubRepo,
}: UseUpdateCheckOptions): UpdateCheckData {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>(null);
  const [updateInfo, setUpdateInfo] = useState<string | null>(null);

  const checkForUpdates = () => {
    setUpdateStatus("checking");
    fetch(`https://api.github.com/repos/${githubRepo}/releases/latest`)
      .then(r => r.json())
      .then(data => {
        const latest = data.tag_name?.replace(/^v/, "");
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
