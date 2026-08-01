import { AppShell } from "@/components/AppShell";
import { BrowseFeed } from "@/components/BrowseFeed";
import { getCatalogToys } from "@/lib/catalog-store";

export default async function ShopPage() {
  const toys = await getCatalogToys();
  return (
    <AppShell>
      <BrowseFeed toys={toys} />
    </AppShell>
  );
}
