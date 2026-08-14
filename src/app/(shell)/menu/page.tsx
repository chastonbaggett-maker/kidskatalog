import { ShelfHeader } from "@/components/ShelfHeader";
import { ToyVideoFeed } from "@/components/ToyVideoFeed";
import { WatchPageShell } from "@/components/WatchPageShell";
import { getCatalogToys } from "@/lib/catalog-store";
import { filterCatalogToys } from "@/lib/catalog-query";

export default async function WatchPage() {
  const all = await getCatalogToys();
  const toys = filterCatalogToys(all, { hasVideo: true });

  return (
    <WatchPageShell>
      <ShelfHeader title="Watch" subtitle="Toy videos from the catalog" />
      <ToyVideoFeed toys={toys} />
    </WatchPageShell>
  );
}
