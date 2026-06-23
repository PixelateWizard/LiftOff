// Minimal reader for Steam's appcache/appinfo.vdf. Estimates the install/download
// size of a not-installed app by summing maxsize from public Windows depots.
// Format reference: SteamDatabase/SteamAppInfo versions 39-41. Any unexpected
// byte returns None so a future format bump hides the UI row instead of breaking.

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::SystemTime;

static SIZE_CACHE: Mutex<Option<(SystemTime, HashMap<u32, Option<u64>>)>> = Mutex::new(None);

fn appinfo_path() -> Option<std::path::PathBuf> {
    let steam = crate::get_steam_install_path()?;
    let path = std::path::Path::new(&steam)
        .join("appcache")
        .join("appinfo.vdf");
    if path.exists() {
        Some(path)
    } else {
        None
    }
}

fn u32le(bytes: &[u8], pos: &mut usize) -> Option<u32> {
    let slice = bytes.get(*pos..(*pos).checked_add(4)?)?;
    *pos += 4;
    Some(u32::from_le_bytes(slice.try_into().ok()?))
}

fn i64le(bytes: &[u8], pos: &mut usize) -> Option<i64> {
    let slice = bytes.get(*pos..(*pos).checked_add(8)?)?;
    *pos += 8;
    Some(i64::from_le_bytes(slice.try_into().ok()?))
}

fn cstr(bytes: &[u8], pos: &mut usize) -> Option<String> {
    let start = *pos;
    while *bytes.get(*pos)? != 0 {
        *pos += 1;
    }
    let value = String::from_utf8_lossy(&bytes[start..*pos]).into_owned();
    *pos += 1;
    Some(value)
}

#[derive(Debug)]
enum Val {
    Str(String),
    Num(i64),
    Obj(Vec<(String, Val)>),
}

fn read_key(bytes: &[u8], pos: &mut usize, strings: &[String]) -> Option<String> {
    if strings.is_empty() {
        cstr(bytes, pos)
    } else {
        let index = u32le(bytes, pos)? as usize;
        strings.get(index).cloned()
    }
}

fn read_obj(bytes: &[u8], pos: &mut usize, strings: &[String]) -> Option<Vec<(String, Val)>> {
    let mut out = Vec::new();
    loop {
        let kind = *bytes.get(*pos)?;
        *pos += 1;
        match kind {
            0x08 => break,
            0x00 => {
                let key = read_key(bytes, pos, strings)?;
                out.push((key, Val::Obj(read_obj(bytes, pos, strings)?)));
            }
            0x01 => {
                let key = read_key(bytes, pos, strings)?;
                out.push((key, Val::Str(cstr(bytes, pos)?)));
            }
            0x02 => {
                let key = read_key(bytes, pos, strings)?;
                let value = u32le(bytes, pos)? as i32 as i64;
                out.push((key, Val::Num(value)));
            }
            0x07 => {
                let key = read_key(bytes, pos, strings)?;
                let lo = u32le(bytes, pos)? as u64;
                let hi = u32le(bytes, pos)? as u64;
                out.push((key, Val::Num(((hi << 32) | lo) as i64)));
            }
            0x0a => {
                let key = read_key(bytes, pos, strings)?;
                out.push((key, Val::Num(i64le(bytes, pos)?)));
            }
            0x03 | 0x04 | 0x06 => {
                let _key = read_key(bytes, pos, strings)?;
                let _ = u32le(bytes, pos)?;
            }
            _ => return None,
        }
    }
    Some(out)
}

fn get<'a>(object: &'a [(String, Val)], key: &str) -> Option<&'a Val> {
    object
        .iter()
        .find(|(candidate, _)| candidate.eq_ignore_ascii_case(key))
        .map(|(_, value)| value)
}

fn positive_u64(value: &Val) -> Option<u64> {
    match value {
        Val::Str(raw) => raw.trim().parse::<u64>().ok().filter(|value| *value > 0),
        Val::Num(value) if *value > 0 => Some(*value as u64),
        _ => None,
    }
}

fn sum_install_size(sections: &[(String, Val)]) -> Option<u64> {
    let Val::Obj(depots) = get(sections, "depots")? else {
        return None;
    };

    let mut total = 0u64;
    let mut any = false;
    for (key, value) in depots {
        if key.is_empty() || !key.bytes().all(|byte| byte.is_ascii_digit()) {
            continue;
        }

        let Val::Obj(depot) = value else {
            continue;
        };

        if get(depot, "dlcappid").is_some() {
            continue;
        }

        let Some(public_manifest) = get(depot, "manifests")
            .and_then(|value| match value {
                Val::Obj(manifests) => get(manifests, "public"),
                _ => None,
            })
            .and_then(|value| match value {
                Val::Obj(public) => Some(public),
                _ => None,
            })
        else {
            continue;
        };

        if let Some(Val::Obj(config)) = get(depot, "config") {
            if let Some(Val::Str(oslist)) = get(config, "oslist") {
                if !oslist.is_empty() && !oslist.to_ascii_lowercase().contains("windows") {
                    continue;
                }
            }
        }

        if let Some(size) = get(public_manifest, "size")
            .and_then(positive_u64)
            .or_else(|| get(depot, "maxsize").and_then(positive_u64))
            .or_else(|| get(public_manifest, "download").and_then(positive_u64))
        {
            total = total.saturating_add(size);
            any = true;
        }
    }

    if any {
        Some(total)
    } else {
        None
    }
}

fn compute_size(bytes: &[u8], target: u32) -> Option<u64> {
    let mut pos = 0usize;
    let magic = u32le(bytes, &mut pos)?;
    let version = magic & 0xff;
    if (magic >> 8) != 0x07_56_44 {
        return None;
    }
    if !(39..=41).contains(&version) {
        return None;
    }

    let _universe = u32le(bytes, &mut pos)?;

    let mut strings = Vec::new();
    if version >= 41 {
        let offset = i64le(bytes, &mut pos)?;
        if offset < 0 {
            return None;
        }
        let mut string_pos = offset as usize;
        let count = u32le(bytes, &mut string_pos)?;
        strings.reserve(count as usize);
        for _ in 0..count {
            strings.push(cstr(bytes, &mut string_pos)?);
        }
    }

    let fixed_len = if version >= 40 { 60usize } else { 40usize };
    loop {
        let appid = u32le(bytes, &mut pos)?;
        if appid == 0 {
            break;
        }

        let size = u32le(bytes, &mut pos)? as usize;
        let entry_start = pos;
        let data_start = entry_start.checked_add(fixed_len)?;
        let entry_end = entry_start.checked_add(size)?;
        if entry_end > bytes.len() || data_start > entry_end {
            return None;
        }

        if appid == target {
            let data = bytes.get(data_start..entry_end)?;
            let mut data_pos = 0usize;
            let root = read_obj(data, &mut data_pos, &strings)?;
            let sections = match root.first() {
                Some((_, Val::Obj(inner))) => inner.as_slice(),
                _ => root.as_slice(),
            };
            return sum_install_size(sections);
        }

        pos = entry_end;
    }

    None
}

pub fn steam_download_size(appid: u32) -> Option<u64> {
    let path = appinfo_path()?;
    let modified = std::fs::metadata(&path).ok()?.modified().ok()?;

    {
        let guard = SIZE_CACHE.lock().ok()?;
        if let Some((cached_modified, map)) = guard.as_ref() {
            if *cached_modified == modified {
                if let Some(hit) = map.get(&appid) {
                    return *hit;
                }
            }
        }
    }

    let bytes = std::fs::read(&path).ok()?;
    let result = compute_size(&bytes, appid);
    drop(bytes);

    if let Ok(mut guard) = SIZE_CACHE.lock() {
        match guard.as_mut() {
            Some((cached_modified, map)) if *cached_modified == modified => {
                map.insert(appid, result);
            }
            _ => {
                let mut map = HashMap::new();
                map.insert(appid, result);
                *guard = Some((modified, map));
            }
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::{sum_install_size, Val};

    fn obj(items: Vec<(&str, Val)>) -> Val {
        Val::Obj(
            items
                .into_iter()
                .map(|(key, value)| (key.to_string(), value))
                .collect(),
        )
    }

    #[test]
    fn sums_public_windows_non_dlc_depots() {
        let sections = vec![(
            "depots".to_string(),
            obj(vec![
                (
                    "100",
                    obj(vec![
                        ("manifests", obj(vec![("public", obj(vec![]))])),
                        ("config", obj(vec![("oslist", Val::Str("windows".into()))])),
                        ("maxsize", Val::Str("1024".into())),
                    ]),
                ),
                (
                    "101",
                    obj(vec![
                        ("manifests", obj(vec![("public", obj(vec![]))])),
                        ("maxsize", Val::Num(2048)),
                    ]),
                ),
                (
                    "102",
                    obj(vec![
                        ("manifests", obj(vec![("public", obj(vec![]))])),
                        ("config", obj(vec![("oslist", Val::Str("linux".into()))])),
                        ("maxsize", Val::Str("4096".into())),
                    ]),
                ),
                ("branches", obj(vec![])),
            ]),
        )];

        assert_eq!(sum_install_size(&sections), Some(3072));
    }

    #[test]
    fn skips_dlc_and_private_depots() {
        let sections = vec![(
            "depots".to_string(),
            obj(vec![
                (
                    "200",
                    obj(vec![
                        ("manifests", obj(vec![("public", obj(vec![]))])),
                        ("dlcappid", Val::Num(123)),
                        ("maxsize", Val::Str("1024".into())),
                    ]),
                ),
                ("201", obj(vec![("maxsize", Val::Str("2048".into()))])),
            ]),
        )];

        assert_eq!(sum_install_size(&sections), None);
    }

    #[test]
    fn reads_public_manifest_size_schema() {
        let sections = vec![(
            "depots".to_string(),
            obj(vec![(
                "300",
                obj(vec![
                    (
                        "manifests",
                        obj(vec![(
                            "public",
                            obj(vec![
                                ("size", Val::Str("4096".into())),
                                ("download", Val::Str("2048".into())),
                            ]),
                        )]),
                    ),
                    ("maxsize", Val::Str("1024".into())),
                ]),
            )]),
        )];

        assert_eq!(sum_install_size(&sections), Some(4096));
    }
}
