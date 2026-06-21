import { gunzipSync } from "node:zlib";

const res = await fetch("https://www.xbox.com/sitemap/pdp-en-US-sitemap-1.xml.gz");
console.log("Status:", res.status);

if (res.ok) {
  const buf = Buffer.from(await res.arrayBuffer());
  const xml = gunzipSync(buf).toString("utf8");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  console.log(`Found ${locs.length} URLs in this shard`);
  console.log("First 10:");
  for (const loc of locs.slice(0, 10)) console.log("-", loc);
}