use std::path::{Path, PathBuf};

pub const LOFI_MEDIA_FILES: &[&str] = &[
    "cozy_moonlit_study_night_scene.mp4",
    "lofi_dog.mp4",
    "lofi_desk.mp4",
    "lofi_cat.mp4",
    "rainy_japanese_street.mp4",
    "pixel_rainy_night.mp4",
    "mondamusic-lofi-lofi-girl-lofi-music-529555.mp3",
];

pub fn is_allowed_lofi_media(name: &str) -> bool {
    LOFI_MEDIA_FILES.contains(&name)
        && !name.contains('/')
        && !name.contains('\\')
        && !name.contains("..")
}

pub fn ensure_lofi_media_file(
    dest_root: &Path,
    source_dirs: &[PathBuf],
    name: &str,
) -> Result<PathBuf, String> {
    if !is_allowed_lofi_media(name) {
        return Err("unknown lo-fi media".into());
    }
    let dest_dir = dest_root.join("media").join("lofi");
    let dest = dest_dir.join(name);
    let src = source_dirs
        .iter()
        .map(|dir| dir.join(name))
        .find(|path| path.is_file())
        .ok_or_else(|| format!("missing bundled lo-fi media: {name}"))?;
    if dest.is_file() {
        if let (Ok(copied), Ok(source)) = (dest.metadata(), src.metadata()) {
            if copied.len() == source.len() {
                return Ok(dest);
            }
        }
    }
    std::fs::create_dir_all(&dest_dir)
        .map_err(|e| format!("failed to create lo-fi media dir: {e}"))?;
    let tmp = dest_dir.join(format!("{name}.tmp"));
    std::fs::copy(&src, &tmp).map_err(|e| format!("failed to copy lo-fi media: {e}"))?;
    if dest.exists() {
        std::fs::remove_file(&dest).map_err(|e| format!("failed to replace lo-fi media: {e}"))?;
    }
    std::fs::rename(&tmp, &dest).map_err(|e| format!("failed to store lo-fi media: {e}"))?;
    Ok(dest)
}

#[cfg(test)]
mod tests {
    use super::{ensure_lofi_media_file, is_allowed_lofi_media};
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir(label: &str) -> std::path::PathBuf {
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("liftoff-lofi-{label}-{stamp}"))
    }

    #[test]
    fn rejects_unknown_or_nested_names() {
        assert!(!is_allowed_lofi_media("nope.mp4"));
        assert!(!is_allowed_lofi_media("../lofi_dog.mp4"));
        assert!(is_allowed_lofi_media("lofi_dog.mp4"));
    }

    #[test]
    fn copies_allowed_media_into_app_data() {
        let src_dir = temp_dir("src");
        let dest_root = temp_dir("dest");
        std::fs::create_dir_all(&src_dir).unwrap();
        let src = src_dir.join("lofi_dog.mp4");
        std::fs::write(&src, b"video-bytes").unwrap();
        let copied =
            ensure_lofi_media_file(&dest_root, &[src_dir.clone()], "lofi_dog.mp4").unwrap();
        assert_eq!(
            copied,
            dest_root.join("media").join("lofi").join("lofi_dog.mp4")
        );
        assert_eq!(std::fs::read(&copied).unwrap(), b"video-bytes");
        let again = ensure_lofi_media_file(&dest_root, &[src_dir], "lofi_dog.mp4").unwrap();
        assert_eq!(again, copied);
        let _ = std::fs::remove_dir_all(&dest_root);
    }
}
