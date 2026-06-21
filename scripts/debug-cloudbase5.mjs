import { readFile } from "node:fs/promises";

const html = await readFile("debug-cp77-cloudbase.html", "utf8");

const allMatches = [...html.matchAll(/xbox\.com[^\s"'<>]*/gi)];
console.log(`Total 'xbox.com' occurrences anywhere in the page: ${allMatches.length}`);
for (const m of allMatches) {
  const start = Math.max(0, m.index - 60);
  console.log("...", html.slice(start, m.index + m[0].length + 20).replace(/\s+/g, " "), "...");
}