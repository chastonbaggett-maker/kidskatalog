import { ShelfHeader } from "@/components/ShelfHeader";
import { ToyVideoFeed } from "@/components/ToyVideoFeed";
import { WatchPageShell } from "@/components/WatchPageShell";
import { getCatalogToys } from "@/lib/catalog-store";
import { filterCatalogToys } from "@/lib/catalog-query";
import { toKidToys } from "@/lib/kid-surface";
import type { Toy } from "@/types/toy";

export default async function WatchPage() {
  const all = await getCatalogToys();
  const toys = toKidToys(filterCatalogToys(all, { hasVideo: true })) as Toy[];

  return (
    <WatchPageShell>
      <ShelfHeader title="Watch" />
      <ToyVideoFeed toys={toys} />
    </WatchPageShell>
  );
}
