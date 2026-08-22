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
const MAX_DISCOVERY_PAGES = 100;
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

async function discoverAllGames(baseUrl) {
  const bySlug = new Map();
  for (let page = 1; page <= MAX_DISCOVERY_PAGES; page++) {
    const url = page === 1 ? baseUrl : `${baseUrl}page/${page}/`;
    let html;
    try {
      html = await fetchText(url);
    } catch (error) {
      console.log(`Discovery page ${page} failed (${error.message}) - stopping`);
      break;
    }

    const games = discoverGames(html);
    let added = 0;
    for (const game of games) {
      if (bySlug.has(game.slug)) continue;
      bySlug.set(game.slug, game);
      added++;
    }
    console.log(`Discovered page ${page}: ${games.length} games, ${added} new (total: ${bySlug.size})`);
    if (games.length === 0 || added === 0) break;
    await sleep(DELAY_MS);
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

const CATALOG_API = "https://displaycatalog.mp.microsoft.com/v7.0/products";
const ART_BATCH_SIZE = 20;
const ART_DELAY_MS = 400;

async function fetchArtBatch(productIds) {
  const bigIds = productIds.join(",");
  const url = `${CATALOG_API}?bigIds=${bigIds}&market=US&languages=en-US&MS-CV=DGU1mcuYo0WMMp`;
  let response;
  try {
    response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  } catch (error) {
    console.log(`  art batch fetch error: ${error.message}`);
    return {};
  }
  if (!response.ok) {
    console.log(`  art batch HTTP ${response.status}`);
    return {};
  }

  let json;
  try {
    json = await response.json();
  } catch {
    console.log("  art batch: invalid JSON");
    return {};
  }

  const urlsByProduct = {};
  for (const product of json.Products ?? []) {
    const images = product.LocalizedProperties?.[0]?.Images ?? [];
    const image =
      images.find((candidate) => candidate.ImagePurpose === "Poster") ??
      images.find((candidate) => candidate.ImagePurpose === "BoxArt") ??
      images.find((candidate) => candidate.ImagePurpose === "Logo");
    if (!image?.Uri) continue;
    urlsByProduct[product.ProductId] = image.Uri.startsWith("//")
      ? `https:${image.Uri}`
      : image.Uri;
  }
  return urlsByProduct;
}

const existing = await readExisting();
const rowsByProduct = new Map(existing.map((row) => [row.productId, row]));

console.log("Building Xbox product index from sitemap...");
const xboxIndex = await buildXboxIndex();

const games = await discoverAllGames(SOURCE_URL);
console.log(`\nDiscovered ${games.length} Cloudbase game pages from ${SOURCE_URL}`);

for (const game of games) {
  const productId = xboxIndex.get(game.slug);
  if (!productId) {
    console.log(`skip: ${game.name} (${game.slug}) - not found in Xbox product index`);
    continue;
  }
  const prior = rowsByProduct.get(productId);
  const row = {
    name: game.name,
    slug: game.slug,
    productId,
    boxArtUrl: prior?.boxArtUrl ?? null,
  };
  rowsByProduct.set(productId, row);
  console.log(`ok: ${row.name} -> ${row.slug}/${row.productId}`);
}

const refreshArt = process.argv.includes("--refresh-art");
const needsArt = [...rowsByProduct.values()].filter((row) => refreshArt || !row.boxArtUrl);
console.log(
  `\nFetching art for ${needsArt.length} products (${refreshArt ? "force refresh" : "missing only"})...`
);

for (let i = 0; i < needsArt.length; i += ART_BATCH_SIZE) {
  const batch = needsArt.slice(i, i + ART_BATCH_SIZE);
  const productIds = batch.map((row) => row.productId);
  process.stdout.write(
    `  batch ${Math.floor(i / ART_BATCH_SIZE) + 1}/${Math.ceil(needsArt.length / ART_BATCH_SIZE)} (${productIds[0]}…) `
  );
  const urlsByProduct = await fetchArtBatch(productIds);
  let resolved = 0;
  for (const row of batch) {
    const boxArtUrl = urlsByProduct[row.productId];
    if (!boxArtUrl) continue;
    rowsByProduct.get(row.productId).boxArtUrl = boxArtUrl;
    resolved++;
  }
  console.log(`-> ${resolved}/${batch.length} resolved`);
  if (i + ART_BATCH_SIZE < needsArt.length) await sleep(ART_DELAY_MS);
}

const noArt = [...rowsByProduct.values()].filter((row) => !row.boxArtUrl);
if (noArt.length > 0) {
  console.log(`\nWarning: ${noArt.length} products have no art URL`);
}

const rows = [...rowsByProduct.values()]
  .map(({ name, slug, productId, boxArtUrl }) => ({
    name,
    slug,
    productId,
    ...(boxArtUrl ? { boxArtUrl } : {}),
  }))
  .sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
  );
await writeFile(OUT_PATH, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
console.log(`\nWrote ${rows.length} rows to ${path.relative(ROOT, OUT_PATH)}`);
