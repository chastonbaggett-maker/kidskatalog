import type { Toy } from "@/types/toy";

export type ToyMediaKind = "image" | "video";

export type ToyMediaItem = {
  kind: ToyMediaKind;
  src: string;
};

/** Bundled demo clips under /videos/ — never treat as real catalog media. */
function isStockDemoVideo(src: string): boolean {
  return /^\/videos\//i.test(src.trim());
}

/** True when the toy has at least one playable imported/uploaded clip. */
export function toyHasVideo(toy: Pick<Toy, "videos">): boolean {
  return getToyVideos(toy).length > 0;
}

export function getToyVideos(toy: Pick<Toy, "videos">): string[] {
  return (toy.videos ?? [])
    .map((src) => src.trim())
    .filter((src) => Boolean(src) && !isStockDemoVideo(src));
}

/**
 * Detail gallery selector order: main image first, primary video second,
 * then the rest of the photos (and any extra clips).
 */
export function buildToyGalleryMedia(
  toy: Pick<Toy, "image" | "images" | "videos">,
): ToyMediaItem[] {
  const photos = (
    toy.images && toy.images.length > 0 ? toy.images : [toy.image]
  )
    .map((src) => src.trim())
    .filter(Boolean);
  const videos = getToyVideos(toy);

  if (photos.length === 0) {
    return videos.map((src) => ({ kind: "video" as const, src }));
  }

  const items: ToyMediaItem[] = [{ kind: "image", src: photos[0]! }];
  if (videos[0]) {
    items.push({ kind: "video", src: videos[0] });
  }
  for (const src of photos.slice(1)) {
    items.push({ kind: "image", src });
  }
  for (const src of videos.slice(1)) {
    items.push({ kind: "video", src });
  }
  return items;
}
