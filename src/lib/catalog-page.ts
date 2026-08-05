import {
  paginateCatalogToys,
  type CatalogPageRequest,
  type CatalogPageResult,
} from "@/lib/catalog-query";
import { getCatalogToys } from "@/lib/catalog-store";

export async function queryCatalogPage(
  request: CatalogPageRequest,
): Promise<CatalogPageResult> {
  const toys = await getCatalogToys();
  return paginateCatalogToys(toys, request);
}

export type { CatalogPageResult };
