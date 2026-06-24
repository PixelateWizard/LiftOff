// Store-page metadata for library games.
// Source-agnostic layer; v1 implements the Steam provider only.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const CACHE_TTL_SECS: u64 = 60 * 60 * 24 * 14;
const CACHE_SCHEMA_VERSION: u32 = 2;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoreScreenshot {
    pub thumb: String,
    pub full: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoreMovie {
    pub id: String,
    pub name: String,
    pub thumbnail: String,
    #[serde(default)]
    pub mp4: Option<String>,
    #[serde(default)]
    pub webm: Option<String>,
    #[serde(default, rename = "hlsH264", alias = "hls_h264")]
    pub hls_h264: Option<String>,
    #[serde(default, rename = "dashH264", alias = "dash_h264")]
    pub dash_h264: Option<String>,
    #[serde(default, rename = "dashAv1", alias = "dash_av1")]
    pub dash_av1: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoreMetadata {
    #[serde(default)]
    pub cache_version: u32,
    pub source: String,
    pub app_id: String,
    #[serde(default)]
    pub short_description: String,
    #[serde(default)]
    pub about_html: String,
    #[serde(default)]
    pub developers: Vec<String>,
    #[serde(default)]
    pub publishers: Vec<String>,
    #[serde(default)]
    pub genres: Vec<String>,
    #[serde(default)]
    pub release_date: Option<String>,
    #[serde(default)]
    pub header_image: Option<String>,
    #[serde(default)]
    pub background: Option<String>,
    #[serde(default)]
    pub screenshots: Vec<StoreScreenshot>,
    #[serde(default)]
    pub movies: Vec<StoreMovie>,
    pub fetched_at: u64,
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0)
}

fn cache_path(cache_root: &Path, source: &str, app_id: &str) -> PathBuf {
    cache_root
        .join("store_metadata")
        .join(source)
        .join(format!("{app_id}.json"))
}

fn read_cache(path: &Path) -> Option<StoreMetadata> {
    let bytes = std::fs::read(path).ok()?;
    let meta: StoreMetadata = serde_json::from_slice(&bytes).ok()?;
    if meta.cache_version == CACHE_SCHEMA_VERSION
        && now_secs().saturating_sub(meta.fetched_at) <= CACHE_TTL_SECS
    {
        Some(meta)
    } else {
        None
    }
}

fn write_cache(path: &Path, meta: &StoreMetadata) {
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(bytes) = serde_json::to_vec_pretty(meta) {
        let _ = std::fs::write(path, bytes);
    }
}

fn normalize_store_media_url(value: &str) -> String {
    if let Some(rest) = value.strip_prefix("http://") {
        format!("https://{rest}")
    } else {
        value.to_string()
    }
}

async fn fetch_steam(client: &reqwest::Client, app_id: &str) -> Result<StoreMetadata, String> {
    let url =
        format!("https://store.steampowered.com/api/appdetails?appids={app_id}&l=english&cc=us");

    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|error| format!("request failed: {error}"))?;

    if !resp.status().is_success() {
        return Err(format!("steam returned status {}", resp.status()));
    }

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|error| format!("invalid json: {error}"))?;

    let entry = body
        .get(app_id)
        .ok_or_else(|| "appid missing in response".to_string())?;

    let success = entry
        .get("success")
        .and_then(|value| value.as_bool())
        .unwrap_or(false);
    if !success {
        return Err("steam reported no store data for this appid".to_string());
    }

    let data = entry
        .get("data")
        .ok_or_else(|| "data missing in response".to_string())?;

    let screenshots = data
        .get("screenshots")
        .and_then(|value| value.as_array())
        .map(|screenshots| {
            screenshots
                .iter()
                .filter_map(|screenshot| {
                    Some(StoreScreenshot {
                        thumb: screenshot.get("path_thumbnail")?.as_str()?.to_string(),
                        full: screenshot.get("path_full")?.as_str()?.to_string(),
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    let movies = data
        .get("movies")
        .and_then(|value| value.as_array())
        .map(|movies| {
            movies
                .iter()
                .map(|movie| {
                    let movie_object_url = |key: &str| -> Option<String> {
                        let value = movie.get(key)?;
                        if let Some(text) = value.as_str() {
                            return Some(normalize_store_media_url(text));
                        }
                        value
                            .get("max")
                            .or_else(|| value.get("480"))
                            .and_then(|value| value.as_str())
                            .map(normalize_store_media_url)
                    };
                    let id = movie
                        .get("id")
                        .map(|value| value.to_string())
                        .unwrap_or_default()
                        .trim_matches('"')
                        .to_string();
                    let name = movie
                        .get("name")
                        .and_then(|value| value.as_str())
                        .unwrap_or("")
                        .to_string();
                    let thumbnail = movie
                        .get("thumbnail")
                        .and_then(|value| value.as_str())
                        .unwrap_or("")
                        .to_string();
                    let mp4 = movie_object_url("mp4");
                    let webm = movie_object_url("webm");
                    let hls_h264 = movie_object_url("hls_h264");
                    let dash_h264 = movie_object_url("dash_h264");
                    let dash_av1 = movie_object_url("dash_av1");
                    StoreMovie {
                        id,
                        name,
                        thumbnail,
                        mp4,
                        webm,
                        hls_h264,
                        dash_h264,
                        dash_av1,
                    }
                })
                .collect()
        })
        .unwrap_or_default();

    let str_list = |key: &str| -> Vec<String> {
        data.get(key)
            .and_then(|value| value.as_array())
            .map(|values| {
                values
                    .iter()
                    .filter_map(|value| value.as_str().map(|text| text.to_string()))
                    .collect()
            })
            .unwrap_or_default()
    };

    let genres = data
        .get("genres")
        .and_then(|value| value.as_array())
        .map(|genres| {
            genres
                .iter()
                .filter_map(|genre| {
                    genre
                        .get("description")
                        .and_then(|description| description.as_str())
                        .map(|description| description.to_string())
                })
                .collect()
        })
        .unwrap_or_default();

    let release_date = data
        .get("release_date")
        .and_then(|value| value.get("date"))
        .and_then(|value| value.as_str())
        .filter(|value| !value.is_empty())
        .map(|value| value.to_string());

    Ok(StoreMetadata {
        cache_version: CACHE_SCHEMA_VERSION,
        source: "steam".to_string(),
        app_id: app_id.to_string(),
        short_description: data
            .get("short_description")
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .to_string(),
        about_html: data
            .get("about_the_game")
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .to_string(),
        developers: str_list("developers"),
        publishers: str_list("publishers"),
        genres,
        release_date,
        header_image: data
            .get("header_image")
            .and_then(|value| value.as_str())
            .map(|value| value.to_string()),
        background: data
            .get("background_raw")
            .and_then(|value| value.as_str())
            .map(|value| value.to_string()),
        screenshots,
        movies,
        fetched_at: now_secs(),
    })
}

pub async fn get_store_metadata(
    client: &reqwest::Client,
    cache_root: &Path,
    source: &str,
    app_id: &str,
    force: bool,
) -> Result<StoreMetadata, String> {
    let path = cache_path(cache_root, source, app_id);

    if !force {
        if let Some(cached) = read_cache(&path) {
            return Ok(cached);
        }
    }

    let fetched = match source {
        "steam" => fetch_steam(client, app_id).await?,
        other => {
            return Err(format!(
                "store metadata not supported for source '{other}' yet"
            ))
        }
    };

    write_cache(&path, &fetched);
    Ok(fetched)
}

#[tauri::command]
pub async fn fetch_store_metadata(
    source: String,
    app_id: String,
    force: Option<bool>,
) -> Result<StoreMetadata, String> {
    if !crate::load_settings_inner().fetch_store_metadata {
        return Err("store metadata fetching is disabled in settings".to_string());
    }

    let source = source.trim().to_ascii_lowercase();
    let app_id = app_id.trim().to_string();
    if source != "steam" {
        return Err(format!(
            "store metadata not supported for source '{source}' yet"
        ));
    }
    if app_id.is_empty() || !app_id.bytes().all(|byte| byte.is_ascii_digit()) {
        return Err("steam store metadata requires a numeric appid".to_string());
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .user_agent("LiftOff store metadata/1.0")
        .build()
        .map_err(|error| format!("could not build http client: {error}"))?;

    get_store_metadata(
        &client,
        &crate::liftoff_dir(),
        &source,
        &app_id,
        force.unwrap_or(false),
    )
    .await
}
