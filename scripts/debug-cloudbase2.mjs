import { readFile } from "node:fs/promises";

const html = await readFile("debug-halo.html", "utf8");

const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)]
  .map((m) => m[1])
  .filter((href) => /xbox\.com/i.test(href));

console.log(`Found ${hrefs.length} href(s) containing 'xbox.com':`);
for (const href of hrefs) {
  console.log("-", href);
}