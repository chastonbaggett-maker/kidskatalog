import { AppShell } from "@/components/AppShell";
import { BrowseFeed } from "@/components/BrowseFeed";
import { toys } from "@/data/toys";

export default function ShopPage() {
  return (
    <AppShell>
      <BrowseFeed toys={toys} />
    </AppShell>
  );
}
