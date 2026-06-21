import { writeFile } from "node:fs/promises";

const res = await fetch("https://cloudbase.gg/g/halo-infinite/", {
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  },
});

const html = await res.text();
await writeFile("debug-halo.html", html, "utf8");

console.log("Status:", res.status);
console.log("Bytes received:", html.length);
console.log("Contains 'xbox.com':", html.includes("xbox.com"));
console.log("Contains 'Xbox Cloud':", html.includes("Xbox Cloud"));