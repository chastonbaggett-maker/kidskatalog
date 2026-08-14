import { notFound } from "next/navigation";
import { BrowseFeed } from "@/components/BrowseFeed";
import { getCategory } from "@/data/categories";
import { queryCatalogPage } from "@/lib/catalog-page";
import type { CategoryId } from "@/types/toy";

type Props = {
  params: Promise<{ category: string }>;
};

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const cat = getCategory(category);
  if (!cat) notFound();

  const initialPage = await queryCatalogPage({
    category: cat.id as CategoryId,
    offset: 0,
    limit: 20,
  });

  return <BrowseFeed category={cat.id as CategoryId} initialPage={initialPage} />;
}
