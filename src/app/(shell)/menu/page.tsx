import { ShelfHeader } from "@/components/ShelfHeader";
import { ToyVideoFeed } from "@/components/ToyVideoFeed";
import { WatchPageShell } from "@/components/WatchPageShell";
import { getCatalogToys } from "@/lib/catalog-store";
import { filterCatalogToys } from "@/lib/catalog-query";

/** Watch — every catalog toy clip as a browsable video card. */
export default async function WatchPage() {
  const all = await getCatalogToys();
  // Full library: no audience/category filter — every product-page video.
  const toys = filterCatalogToys(all, { hasVideo: true, audience: "all" });

  return (
    <WatchPageShell>
      <ShelfHeader title="Watch" />
      <ToyVideoFeed toys={toys} />
    </WatchPageShell>
  );
}
