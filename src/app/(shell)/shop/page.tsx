import { BrowseFeed } from "@/components/BrowseFeed";
import { queryCatalogPage } from "@/lib/catalog-page";

export default async function ShopPage() {
  const initialPage = await queryCatalogPage({ offset: 0, limit: 20 });

  return <BrowseFeed initialPage={initialPage} />;
}
