import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { BrowseFeed } from "@/components/BrowseFeed";
import { getCategory } from "@/data/categories";
import { getCatalogToysByCategory } from "@/lib/catalog-store";

type Props = {
  params: Promise<{ category: string }>;
};

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const cat = getCategory(category);
  if (!cat) notFound();

  const list = await getCatalogToysByCategory(cat.id);

  return (
    <AppShell>
      <BrowseFeed toys={list} />
    </AppShell>
  );
}
