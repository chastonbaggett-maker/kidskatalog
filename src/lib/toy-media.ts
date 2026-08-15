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

/** Detail gallery: all photos first, then videos at the end. */
export function buildToyGalleryMedia(
  toy: Pick<Toy, "image" | "images" | "videos">,
): ToyMediaItem[] {
  const photos = (
    toy.images && toy.images.length > 0 ? toy.images : [toy.image]
  )
    .map((src) => src.trim())
    .filter(Boolean)
    .map((src) => ({ kind: "image" as const, src }));
  const videos = getToyVideos(toy).map((src) => ({
    kind: "video" as const,
    src,
  }));
  return [...photos, ...videos];
}

/** One Watch feed card per playable clip across the catalog. */
export type WatchVideoEntry = {
  key: string;
  toy: Toy;
  src: string;
  clipIndex: number;
};

export function buildWatchVideoEntries(
  toys: readonly Toy[],
): WatchVideoEntry[] {
  const entries: WatchVideoEntry[] = [];
  for (const toy of toys) {
    const clips = getToyVideos(toy);
    clips.forEach((src, clipIndex) => {
      entries.push({
        key: `${toy.id}::${clipIndex}`,
        toy,
        src,
        clipIndex,
      });
    });
  }
  return entries;
}
