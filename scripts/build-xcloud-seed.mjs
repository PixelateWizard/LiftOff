#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = path.join(ROOT, "src", "data", "xcloudGames.json");
const SOURCE_URL = process.argv.includes("--new")
  ? "https://cloudbase.gg/new-xbox-cloud-games/"
  : "https://cloudbase.gg/xbox-cloud-games/";
const USER_AGENT = "LiftOff xCloud seed builder/1.0 (+manual maintenance by app owner)";
const DELAY_MS = 750;
const SITEMAP_BASE = "https://www.xbox.com/sitemap/pdp-en-US-sitemap-";
const MAX_SITEMAP_SHARDS = 20; // safety cap; loop stops as soon as a shard 404s

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function decodeHtml(value) {
  return value
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value) {
  return decodeHtml(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.text();
}

function discoverGames(html) {
  const bySlug = new Map();
  const linkRe = /<a\b[^>]*href=["']([^"']*\/g\/([^/"'#?]+)\/?[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(linkRe)) {
    const slug = decodeURIComponent(match[2]);
    const name = stripTags(match[3]);
    if (!slug || !name || name.length > 120) continue;
    if (!bySlug.has(slug)) bySlug.set(slug, { name, slug });
  }
  return [...bySlug.values()];
}

// Pull every PDP (Product Detail Page) sitemap shard and build a local
// slug -> productId index covering essentially the full Xbox store catalog.
// Published by Microsoft specifically for crawler consumption — no scraping
// of individual game pages required.
async function buildXboxIndex() {
  const index = new Map();
  for (let n = 1; n <= MAX_SITEMAP_SHARDS; n++) {
    const url = `${SITEMAP_BASE}${n}.xml.gz`;
    let res;
    try {
      res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    } catch (error) {
      console.log(`Sitemap shard ${n} failed to fetch (${error.message}) - stopping`);
      break;
    }
    if (!res.ok) {
      console.log(`Sitemap shard ${n} returned ${res.status} - stopping (${n - 1} shard(s) loaded)`);
      break;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const xml = gunzipSync(buf).toString("utf8");
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

    let added = 0;
    for (const loc of locs) {
      let parsed;
      try {
        parsed = new URL(loc);
      } catch {
        continue;
      }
      const match = decodeURIComponent(parsed.pathname).match(
        /\/games\/store\/([^/]+)\/([A-Za-z0-9]{8,})/i
      );
      if (!match) continue;
      index.set(match[1].toLowerCase(), match[2].toUpperCase());
      added++;
    }
    console.log(`Loaded sitemap shard ${n}: ${locs.length} URLs, ${added} game entries (index size: ${index.size})`);
    await sleep(DELAY_MS);
  }
  return index;
}

async function readExisting() {
  try {
    return JSON.parse(await readFile(OUT_PATH, "utf8"));
  } catch {
    return [];
  }
}

const existing = await readExisting();
const rowsByProduct = new Map(existing.map((row) => [row.productId, row]));

console.log("Building Xbox product index from sitemap...");
const xboxIndex = await buildXboxIndex();

const indexHtml = await fetchText(SOURCE_URL);
const games = discoverGames(indexHtml);
console.log(`\nDiscovered ${games.length} Cloudbase game pages from ${SOURCE_URL}`);

for (const game of games) {
  const productId = xboxIndex.get(game.slug);
  if (!productId) {
    console.log(`skip: ${game.name} (${game.slug}) - not found in Xbox product index`);
    continue;
  }
  const row = { name: game.name, slug: game.slug, productId };
  rowsByProduct.set(row.productId, row);
  console.log(`ok: ${row.name} -> ${row.slug}/${row.productId}`);
}

const rows = [...rowsByProduct.values()].sort((a, b) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
);
await writeFile(OUT_PATH, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
console.log(`\nWrote ${rows.length} rows to ${path.relative(ROOT, OUT_PATH)}`);