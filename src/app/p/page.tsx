import { ParentWishlistView } from "@/components/parent/ParentWishlistView";
import { isAssociatesLive, resolveParentBuyUrls } from "@/lib/associates";
import { getCatalogToysByIds } from "@/lib/catalog-store";
import { toKidToys } from "@/lib/kid-surface";
import { parseWishlistIds } from "@/lib/parent-paths";
import type { Toy } from "@/types/toy";

type Props = {
  searchParams: Promise<{ ids?: string | string[] }>;
};

export default async function ParentWishlistPage({ searchParams }: Props) {
  const params = await searchParams;
  const ids = parseWishlistIds(params.ids);
  const toys = ids.length > 0 ? await getCatalogToysByIds(ids) : [];

  return (
    <ParentWishlistView
      initialToys={toKidToys(toys) as Toy[]}
      buyUrls={resolveParentBuyUrls(toys)}
      buyPlaceholder={!isAssociatesLive()}
    />
  );
}
