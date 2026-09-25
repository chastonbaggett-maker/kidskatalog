import {
  paginateCatalogToys,
  type CatalogPageRequest,
  type CatalogPageResult,
} from "@/lib/catalog-query";
import { getCatalogToys } from "@/lib/catalog-store";
import { toKidCatalogPage, toKidToys } from "@/lib/kid-surface";
import type { Toy } from "@/types/toy";

export async function queryCatalogPage(
  request: CatalogPageRequest,
): Promise<CatalogPageResult> {
  const toys = toKidToys(await getCatalogToys()) as Toy[];
  return toKidCatalogPage(paginateCatalogToys(toys, request));
}

export type { CatalogPageResult };
