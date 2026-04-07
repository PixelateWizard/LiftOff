fn main() {
    // Load SGDB_API_KEY from src-tauri/.env if present, then fall back to the
    // actual environment. This keeps the key out of source control.
    let env_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join(".env");
    if env_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&env_path) {
            for line in content.lines() {
                let line = line.trim();
                if line.starts_with('#') || line.is_empty() { continue; }
                if let Some((k, v)) = line.split_once('=') {
                    let k = k.trim();
                    let v = v.trim().trim_matches('"');
                    println!("cargo:rustc-env={}={}", k, v);
                }
            }
        }
    }
    tauri_build::build()
}
