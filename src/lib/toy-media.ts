import type { Toy } from "@/types/toy";

export type ToyMediaKind = "image" | "video";

export type ToyMediaItem = {
  kind: ToyMediaKind;
  src: string;
};

/** True when the toy has at least one playable video clip. */
export function toyHasVideo(toy: Pick<Toy, "videos">): boolean {
  return Boolean(toy.videos?.some((src) => Boolean(src?.trim())));
}

export function getToyVideos(toy: Pick<Toy, "videos">): string[] {
  return (toy.videos ?? []).map((src) => src.trim()).filter(Boolean);
}

/** Detail gallery: photos first, then any videos (for the thumb selector). */
export function buildToyGalleryMedia(
  toy: Pick<Toy, "image" | "images" | "videos">,
): ToyMediaItem[] {
  const photos =
    toy.images && toy.images.length > 0 ? toy.images : [toy.image];
  const images = photos
    .map((src) => src.trim())
    .filter(Boolean)
    .map((src) => ({ kind: "image" as const, src }));
  const videos = getToyVideos(toy).map((src) => ({
    kind: "video" as const,
    src,
  }));
  return [...images, ...videos];
}
