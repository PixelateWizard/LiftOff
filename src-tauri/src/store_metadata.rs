// Store-page metadata for library games.
// Source-agnostic layer; Steam and Xbox providers share the same cache shape.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const CACHE_TTL_SECS: u64 = 60 * 60 * 24 * 14;
const CACHE_SCHEMA_VERSION: u32 = 4;

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
    if let Some(rest) = value.strip_prefix("//") {
        format!("https://{rest}")
    } else if let Some(rest) = value.strip_prefix("http://") {
        format!("https://{rest}")
    } else {
        value.to_string()
    }
}

fn is_direct_video_url(value: &str) -> bool {
    let lower = value
        .split('?')
        .next()
        .unwrap_or(value)
        .to_ascii_lowercase();
    lower.ends_with(".mp4") || lower.ends_with(".webm") || lower.ends_with(".m3u8")
}

fn xml_attr_value(tag: &str, attr: &str) -> Option<String> {
    let needle = format!("{attr}=\"");
    let start = tag.find(&needle)? + needle.len();
    let end = tag[start..].find('"')? + start;
    Some(tag[start..end].to_string())
}

fn xml_text_after_tag(value: &str, tag_start: usize, tag: &str) -> Option<String> {
    let open_end = value[tag_start..].find('>')? + tag_start + 1;
    let close = format!("</{tag}>");
    let close_start = value[open_end..].find(&close)? + open_end;
    Some(value[open_end..close_start].trim().to_string()).filter(|text| !text.is_empty())
}

fn best_dash_base_url(manifest: &str) -> Option<String> {
    let mut best: Option<(u64, String)> = None;
    let mut pos = 0;
    while let Some(rel_start) = manifest[pos..].find("<Representation") {
        let start = pos + rel_start;
        let tag_end = manifest[start..].find('>')? + start;
        let tag = &manifest[start..=tag_end];
        let bandwidth = xml_attr_value(tag, "bandwidth")
            .and_then(|value| value.parse::<u64>().ok())
            .unwrap_or(0);
        let Some(rel_base_start) = manifest[tag_end..].find("<BaseURL>") else {
            pos = tag_end + 1;
            continue;
        };
        let base_start = tag_end + rel_base_start;
        if let Some(base_url) = xml_text_after_tag(manifest, base_start, "BaseURL") {
            let base_url = base_url.replace("&amp;", "&");
            if is_direct_video_url(&base_url)
                && best
                    .as_ref()
                    .map(|(best_bandwidth, _)| bandwidth > *best_bandwidth)
                    .unwrap_or(true)
            {
                best = Some((bandwidth, normalize_store_media_url(&base_url)));
            }
        }
        pos = tag_end + 1;
    }
    best.map(|(_, url)| url)
}

fn hls_url_for_dash_url(url: &str) -> Option<String> {
    let (path, suffix) = url.split_once('?').unwrap_or((url, ""));
    if !path.to_ascii_lowercase().ends_with(".mpd") {
        return None;
    }
    let mut hls_url = format!("{}.m3u8", &path[..path.len().saturating_sub(4)]);
    if !suffix.is_empty() {
        hls_url.push('?');
        hls_url.push_str(suffix);
    }
    Some(hls_url)
}

async fn verified_hls_url(client: &reqwest::Client, dash_url: &str) -> Option<String> {
    let hls_url = hls_url_for_dash_url(dash_url)?;
    match client.head(&hls_url).send().await {
        Ok(resp) if resp.status().is_success() => Some(hls_url),
        _ => None,
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

async fn resolve_xbox_video_url(
    client: &reqwest::Client,
    raw_url: &str,
) -> (Option<String>, Option<String>, Option<String>) {
    let url = normalize_store_media_url(raw_url);
    let lower = url.split('?').next().unwrap_or(&url).to_ascii_lowercase();
    if is_direct_video_url(&url) {
        return (Some(url), None, None);
    }
    if lower.ends_with(".mpd") {
        let dash_url = url.clone();
        let hls_url = verified_hls_url(client, &dash_url).await;
        let mp4_url = match client.get(&dash_url).send().await {
            Ok(resp) if resp.status().is_success() => resp
                .text()
                .await
                .ok()
                .and_then(|text| best_dash_base_url(&text)),
            _ => None,
        };
        return (
            if hls_url.is_some() { None } else { mp4_url },
            hls_url,
            Some(dash_url),
        );
    }
    (None, None, None)
}

fn json_text(value: &serde_json::Value, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(|value| value.as_str())
        .filter(|value| !value.trim().is_empty())
        .map(|value| value.to_string())
}

fn product_from_ms_store_response(body: &serde_json::Value) -> Option<&serde_json::Value> {
    body.pointer("/Payload/Products/0")
        .or_else(|| body.get("Payload"))
        .or_else(|| body.pointer("/Products/0"))
}

fn localized_ms_store_product(product: &serde_json::Value) -> &serde_json::Value {
    product.pointer("/LocalizedProperties/0").unwrap_or(product)
}

async fn fetch_xbox(client: &reqwest::Client, product_id: &str) -> Result<StoreMetadata, String> {
    let url = format!(
        "https://storeedgefd.dsx.mp.microsoft.com/v9.0/products/{product_id}?market=US&locale=en-US&deviceFamily=Windows.Desktop"
    );

    let resp = client
        .get(&url)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|error| format!("request failed: {error}"))?;

    if !resp.status().is_success() {
        return Err(format!("microsoft store returned status {}", resp.status()));
    }

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|error| format!("invalid json: {error}"))?;

    let product = product_from_ms_store_response(&body)
        .ok_or_else(|| "product missing in microsoft store response".to_string())?;
    let localized = localized_ms_store_product(product);

    let images = product
        .get("Images")
        .and_then(|value| value.as_array())
        .or_else(|| localized.get("Images").and_then(|value| value.as_array()));
    let screenshots = images
        .map(|images| {
            images
                .iter()
                .filter(|image| {
                    let kind = json_text(image, "ImageType")
                        .or_else(|| json_text(image, "ImagePurpose"))
                        .unwrap_or_default()
                        .to_ascii_lowercase();
                    kind == "screenshot"
                })
                .filter_map(|image| {
                    let url = json_text(image, "Url").or_else(|| json_text(image, "Uri"))?;
                    let url = normalize_store_media_url(&url);
                    Some(StoreScreenshot {
                        thumb: format!("{url}?w=480"),
                        full: url,
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    let videos = product
        .get("Trailers")
        .and_then(|value| value.as_array())
        .or_else(|| localized.get("Videos").and_then(|value| value.as_array()));
    let mut movies = Vec::new();
    if let Some(videos) = videos {
        for (index, video) in videos.iter().enumerate() {
            let Some(url) = json_text(video, "Url").or_else(|| json_text(video, "Uri")) else {
                continue;
            };
            let thumbnail = video
                .pointer("/Image/Url")
                .and_then(|value| value.as_str())
                .or_else(|| {
                    video
                        .pointer("/PreviewImage/Uri")
                        .and_then(|value| value.as_str())
                })
                .map(normalize_store_media_url)
                .unwrap_or_default();
            let name = json_text(video, "Title")
                .or_else(|| json_text(video, "Name"))
                .or_else(|| {
                    video
                        .get("SortOrder")
                        .and_then(|value| value.as_u64())
                        .map(|sort| format!("Trailer {sort}"))
                })
                .unwrap_or_else(|| "Trailer".to_string());
            let (mp4, hls_h264, dash_h264) = resolve_xbox_video_url(client, &url).await;
            movies.push(StoreMovie {
                id: format!("xbox-trailer-{index}"),
                name,
                thumbnail,
                mp4,
                webm: None,
                hls_h264,
                dash_h264,
                dash_av1: None,
            });
        }
    }

    let release_date = json_text(product, "ReleaseDateUtc").or_else(|| {
        product
            .pointer("/MarketProperties/0/OriginalReleaseDate")
            .and_then(|value| value.as_str())
            .map(|value| value.to_string())
    });

    Ok(StoreMetadata {
        cache_version: CACHE_SCHEMA_VERSION,
        source: "xbox".to_string(),
        app_id: product_id.to_string(),
        short_description: json_text(product, "ShortDescription")
            .or_else(|| json_text(localized, "ShortDescription"))
            .unwrap_or_default(),
        about_html: json_text(product, "Description")
            .or_else(|| json_text(localized, "ProductDescription"))
            .unwrap_or_default(),
        developers: json_text(product, "DeveloperName")
            .map(|value| vec![value])
            .unwrap_or_default(),
        publishers: json_text(product, "PublisherName")
            .map(|value| vec![value])
            .unwrap_or_default(),
        genres: product
            .get("Categories")
            .and_then(|value| value.as_array())
            .map(|values| {
                values
                    .iter()
                    .filter_map(|value| {
                        value
                            .as_str()
                            .map(|text| text.to_string())
                            .or_else(|| json_text(value, "Name"))
                    })
                    .collect()
            })
            .unwrap_or_default(),
        release_date,
        header_image: product
            .get("Images")
            .and_then(|value| value.as_array())
            .and_then(|images| {
                images.iter().find_map(|image| {
                    let kind = json_text(image, "ImageType")
                        .or_else(|| json_text(image, "ImagePurpose"))
                        .unwrap_or_default()
                        .to_ascii_lowercase();
                    if kind == "hero" {
                        json_text(image, "Url").or_else(|| json_text(image, "Uri"))
                    } else {
                        None
                    }
                })
            })
            .map(|value| normalize_store_media_url(&value)),
        background: None,
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
        "xbox" => fetch_xbox(client, app_id).await?,
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
    if !matches!(source.as_str(), "steam" | "xbox") {
        return Err(format!(
            "store metadata not supported for source '{source}' yet"
        ));
    }
    if source == "steam" && (app_id.is_empty() || !app_id.bytes().all(|byte| byte.is_ascii_digit()))
    {
        return Err("steam store metadata requires a numeric appid".to_string());
    }
    if source == "xbox"
        && (app_id.is_empty() || !app_id.bytes().all(|byte| byte.is_ascii_alphanumeric()))
    {
        return Err("xbox store metadata requires a productId".to_string());
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

#[tauri::command]
pub async fn fetch_xbox_store_metadata(
    product_id: String,
    force: Option<bool>,
) -> Result<StoreMetadata, String> {
    fetch_store_metadata("xbox".to_string(), product_id, force).await
}
