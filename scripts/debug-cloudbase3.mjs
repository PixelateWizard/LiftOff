import { writeFile } from "node:fs/promises";

const res = await fetch("https://www.xbox.com/en-US/games/halo-infinite", {
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  },
});

const html = await res.text();
await writeFile("debug-halo-marketing.html", html, "utf8");

console.log("Status:", res.status);
console.log("Bytes received:", html.length);

const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)]
  .map((m) => m[1])
  .filter((href) => /play\/games|games\/store/i.test(href));

console.log(`Found ${hrefs.length} candidate href(s):`);
for (const href of hrefs) {
  console.log("-", href);
}