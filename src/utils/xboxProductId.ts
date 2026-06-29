import type { App } from "../types";
import xcloudGames from "../data/xcloudGames.json";

interface XcloudGameSeed {
  name?: string;
  productId?: string;
}

const seed = xcloudGames as XcloudGameSeed[];

export function isMicrosoftStoreProductId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[A-Z0-9]{12}$/i.test(value.trim()) &&
    /[A-Z]/i.test(value.trim())
  );
}

function normalizeCatalogName(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(pc|windows|edition|standard|deluxe|ultimate|farewell|game preview)\b/g, " ")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function findSeedProductId(name: unknown) {
  const normalized = normalizeCatalogName(name);
  if (!normalized) return null;

  const exact = seed.find((game) => normalizeCatalogName(game.name) === normalized);
  if (isMicrosoftStoreProductId(exact?.productId)) return exact.productId.trim();

  const fuzzy = seed
    .filter((game) => {
      const candidate = normalizeCatalogName(game.name);
      return candidate && (normalized.startsWith(candidate) || candidate.startsWith(normalized));
    })
    .sort((a, b) => normalizeCatalogName(b.name).length - normalizeCatalogName(a.name).length)[0];
  return isMicrosoftStoreProductId(fuzzy?.productId) ? fuzzy.productId.trim() : null;
}

export function xboxProductIdFor(app: App | null | undefined) {
  if (!app || String(app.source ?? "").toLowerCase() !== "xbox") return null;
  if (isMicrosoftStoreProductId(app.xbox_product_id)) return app.xbox_product_id.trim();
  return findSeedProductId(app.name);
}

