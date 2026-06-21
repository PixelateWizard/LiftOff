import { writeFile } from "node:fs/promises";

const USER_AGENT = "LiftOff xCloud seed builder/1.0 (+manual maintenance by app owner)";

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  return res.text();
}

const cloudbaseHtml = await fetchText("https://cloudbase.gg/g/cyberpunk-2077/");
await writeFile("debug-cp77-cloudbase.html", cloudbaseHtml, "utf8");

const marketingHrefs = [...cloudbaseHtml.matchAll(/href=["']([^"']+)["']/gi)]
  .map((m) => m[1])
  .filter((href) => /xbox\.com/i.test(href));

console.log("xbox.com hrefs found on cloudbase page:");
for (const href of marketingHrefs) console.log("-", href);

const marketingLink = marketingHrefs.find((h) => /\/games\/[^/]+\/?$/i.test(h));
console.log("\nDetected marketing link:", marketingLink ?? "NONE");

if (marketingLink) {
  const marketingHtml = await fetchText(marketingLink);
  await writeFile("debug-cp77-marketing.html", marketingHtml, "utf8");
  const storeHrefs = [...marketingHtml.matchAll(/href=["']([^"']+)["']/gi)]
    .map((m) => m[1])
    .filter((href) => /games\/store|play\/games/i.test(href));
  console.log("\nStore/play links found on marketing page:");
  for (const href of storeHrefs) console.log("-", href);
}