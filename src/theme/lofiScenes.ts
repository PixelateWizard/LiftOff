import type { LofiScene } from "../types";
import { LOFI_SCENE_OPTIONS } from "../constants";
import lofiBgCozy from "../assets/themes/lofi/cozy_moonlit_study_night_scene.mp4";
import lofiBgDog from "../assets/themes/lofi/lofi_dog.mp4";
import lofiBgDesk from "../assets/themes/lofi/lofi_desk.mp4";
import lofiBgCat from "../assets/themes/lofi/lofi_cat.mp4";
import lofiBgRainyStreet from "../assets/themes/lofi/rainy_japanese_street.mp4";
import lofiBgPixelShop from "../assets/themes/lofi/pixel_rainy_night.mp4";
import lofiPosterCozy from "../assets/themes/lofi/scene-cozy.webp";
import lofiPosterDog from "../assets/themes/lofi/scene-dog.webp";
import lofiPosterDesk from "../assets/themes/lofi/scene-desk.webp";
import lofiPosterCat from "../assets/themes/lofi/scene-cat.webp";
import lofiPosterRainyStreet from "../assets/themes/lofi/scene-rainy_street.webp";
import lofiPosterPixelShop from "../assets/themes/lofi/scene-pixel_shop.webp";

const LEGACY_LOFI_SCENES: Record<string, LofiScene> = {
  study: "cozy",
};

export const LOFI_SCENE_VIDEOS: Record<LofiScene, string> = {
  cozy: lofiBgCozy,
  dog: lofiBgDog,
  desk: lofiBgDesk,
  cat: lofiBgCat,
  rainy_street: lofiBgRainyStreet,
  pixel_shop: lofiBgPixelShop,
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

export function lofiSceneVideo(value?: string | null): string {
  return LOFI_SCENE_VIDEOS[resolveLofiScene(value)];
}
