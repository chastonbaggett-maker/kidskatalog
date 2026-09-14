import { ParentWishlistView } from "@/components/parent/ParentWishlistView";
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
  const buyUrls: Record<string, string> = {};
  for (const toy of toys) {
    if (toy.affiliateUrl) buyUrls[toy.id] = toy.affiliateUrl;
  }

  return (
    <ParentWishlistView initialToys={toKidToys(toys) as Toy[]} buyUrls={buyUrls} />
  );
}
