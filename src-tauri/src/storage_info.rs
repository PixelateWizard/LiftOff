// Device storage snapshot for the Settings storage row and install pre-checks.

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DriveStorageInfo {
    pub mount_point: String,
    pub label: String,
    pub total_bytes: u64,
    pub free_bytes: u64,
    // "fixed" or "removable"; other drive types are skipped.
    pub drive_kind: String,
    pub is_default_install_drive: bool,
}

#[cfg(windows)]
fn wide(value: &str) -> Vec<u16> {
    use std::os::windows::ffi::OsStrExt;
    std::ffi::OsStr::new(value)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect()
}

#[cfg(windows)]
fn normalize_mount(value: &str) -> String {
    let mut normalized = value.trim().to_ascii_uppercase();
    if !normalized.ends_with('\\') {
        normalized.push('\\');
    }
    normalized
}

#[cfg(windows)]
fn system_drive_mount() -> String {
    std::env::var("SystemDrive")
        .map(|drive| format!("{drive}\\"))
        .unwrap_or_else(|_| "C:\\".to_string())
}

// Store InstallControl installs to the Windows "where new content is saved"
// apps volume. Resolve it through the deployment PackageManager default
// package volume; fall back to the system drive when unavailable.
#[cfg(windows)]
fn default_install_mount_point() -> String {
    let resolved = (|| -> Option<String> {
        use windows::Management::Deployment::PackageManager;
        let manager = PackageManager::new().ok()?;
        let volume = manager.GetDefaultPackageVolume().ok()?;
        let mount = volume.MountPoint().ok()?.to_string();
        let trimmed = mount.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    })();
    resolved.unwrap_or_else(system_drive_mount)
}

#[cfg(windows)]
pub fn drive_storage_snapshot() -> Vec<DriveStorageInfo> {
    use windows::core::PCWSTR;
    use windows::Win32::Storage::FileSystem::{
        GetDiskFreeSpaceExW, GetDriveTypeW, GetLogicalDriveStringsW, GetVolumeInformationW,
    };

    const DRIVE_TYPE_REMOVABLE: u32 = 2;
    const DRIVE_TYPE_FIXED: u32 = 3;

    let mut buffer = vec![0u16; 512];
    let len = unsafe { GetLogicalDriveStringsW(Some(&mut buffer)) } as usize;
    if len == 0 || len > buffer.len() {
        return Vec::new();
    }

    let default_mount = normalize_mount(&default_install_mount_point());
    let system_mount = normalize_mount(&system_drive_mount());

    let mut drives = Vec::new();
    for root in buffer[..len]
        .split(|ch| *ch == 0)
        .filter(|part| !part.is_empty())
    {
        let root_string = String::from_utf16_lossy(root);
        let root_wide = wide(&root_string);

        let drive_type = unsafe { GetDriveTypeW(PCWSTR(root_wide.as_ptr())) };
        let drive_kind = match drive_type {
            DRIVE_TYPE_FIXED => "fixed",
            DRIVE_TYPE_REMOVABLE => "removable",
            _ => continue,
        };

        let mut free_to_caller = 0u64;
        let mut total = 0u64;
        let mut free_total = 0u64;
        let space_ok = unsafe {
            GetDiskFreeSpaceExW(
                PCWSTR(root_wide.as_ptr()),
                Some(&mut free_to_caller),
                Some(&mut total),
                Some(&mut free_total),
            )
        }
        .is_ok();
        if !space_ok || total == 0 {
            continue;
        }

        let mut label_buffer = vec![0u16; 261];
        let label_ok = unsafe {
            GetVolumeInformationW(
                PCWSTR(root_wide.as_ptr()),
                Some(&mut label_buffer),
                None,
                None,
                None,
                None,
            )
        }
        .is_ok();
        let label = if label_ok {
            let end = label_buffer
                .iter()
                .position(|ch| *ch == 0)
                .unwrap_or(label_buffer.len());
            String::from_utf16_lossy(&label_buffer[..end])
        } else {
            String::new()
        };

        let normalized = normalize_mount(&root_string);
        drives.push(DriveStorageInfo {
            mount_point: root_string,
            label,
            total_bytes: total,
            free_bytes: free_to_caller,
            drive_kind: drive_kind.to_string(),
            is_default_install_drive: normalized == default_mount,
        });
    }

    if !drives.iter().any(|drive| drive.is_default_install_drive) {
        if let Some(system) = drives
            .iter_mut()
            .find(|drive| normalize_mount(&drive.mount_point) == system_mount)
        {
            system.is_default_install_drive = true;
        }
    }

    drives
}

#[cfg(not(windows))]
pub fn drive_storage_snapshot() -> Vec<DriveStorageInfo> {
    Vec::new()
}

#[tauri::command]
pub fn get_storage_info() -> Vec<DriveStorageInfo> {
    drive_storage_snapshot()
}

#[cfg(all(test, windows))]
mod tests {
    use super::*;

    #[test]
    fn snapshot_returns_usable_fixed_or_removable_drives() {
        let drives = drive_storage_snapshot();
        assert!(!drives.is_empty());
        assert!(drives.iter().all(|drive| {
            drive.total_bytes > 0
                && drive.free_bytes <= drive.total_bytes
                && matches!(drive.drive_kind.as_str(), "fixed" | "removable")
        }));
        assert_eq!(
            drives
                .iter()
                .filter(|drive| drive.is_default_install_drive)
                .count(),
            1
        );
    }
}
