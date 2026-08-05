import { BrowseFeed } from "@/components/BrowseFeed";
import { getCatalogToys } from "@/lib/catalog-store";

export default async function ShopPage() {
  const toys = await getCatalogToys();
  return <BrowseFeed toys={toys} />;
}
