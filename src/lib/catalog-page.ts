import {
  paginateCatalogToys,
  type CatalogPageRequest,
  type CatalogPageResult,
} from "@/lib/catalog-query";
import { getCatalogToys } from "@/lib/catalog-store";
import { toKidCatalogPage } from "@/lib/kid-surface";

export async function queryCatalogPage(
  request: CatalogPageRequest,
): Promise<CatalogPageResult> {
  const toys = await getCatalogToys();
  return toKidCatalogPage(paginateCatalogToys(toys, request));
}

export type { CatalogPageResult };
