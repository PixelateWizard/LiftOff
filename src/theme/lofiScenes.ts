import type { LofiScene } from "../types";
import { LOFI_SCENE_OPTIONS } from "../constants";
import lofiPosterCozy from "../assets/themes/lofi/scene-cozy.webp?inline";
import lofiPosterDog from "../assets/themes/lofi/scene-dog.webp?inline";
import lofiPosterDesk from "../assets/themes/lofi/scene-desk.webp?inline";
import lofiPosterCat from "../assets/themes/lofi/scene-cat.webp?inline";
import lofiPosterRainyStreet from "../assets/themes/lofi/scene-rainy_street.webp?inline";
import lofiPosterPixelShop from "../assets/themes/lofi/scene-pixel_shop.webp?inline";

export const LOFI_MUSIC_FILE = "mondamusic-lofi-lofi-girl-lofi-music-529555.mp3";

export const LOFI_SCENE_FILES: Record<LofiScene, string> = {
  cozy: "cozy_moonlit_study_night_scene.mp4",
  dog: "lofi_dog.mp4",
  desk: "lofi_desk.mp4",
  cat: "lofi_cat.mp4",
  rainy_street: "rainy_japanese_street.mp4",
  pixel_shop: "pixel_rainy_night.mp4",
};

const LEGACY_LOFI_SCENES: Record<string, LofiScene> = {
  study: "cozy",
};

export const LOFI_SCENE_POSTERS: Record<LofiScene, string> = {
  cozy: lofiPosterCozy,
  dog: lofiPosterDog,
  desk: lofiPosterDesk,
  cat: lofiPosterCat,
  rainy_street: lofiPosterRainyStreet,
  pixel_shop: lofiPosterPixelShop,
};

export function resolveLofiScene(value?: string | null): LofiScene {
  const aliased = LEGACY_LOFI_SCENES[value ?? ""] ?? value;
  return (LOFI_SCENE_OPTIONS as readonly string[]).includes(aliased ?? "")
    ? (aliased as LofiScene)
    : "cozy";
}

export function lofiSceneFile(value?: string | null): string {
  return LOFI_SCENE_FILES[resolveLofiScene(value)];
}

export function lofiScenePoster(value?: string | null): string {
  return LOFI_SCENE_POSTERS[resolveLofiScene(value)];
}
