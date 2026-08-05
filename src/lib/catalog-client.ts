import {
  buildCatalogQueryString,
  type CatalogFilters,
} from "@/lib/catalog-query";
import type { Toy } from "@/types/toy";

export async function fetchRandomCatalogToys(
  filters: CatalogFilters,
  count: number,
  seed: number,
): Promise<Toy[]> {
  const base = buildCatalogQueryString({ ...filters, offset: 0, limit: 1 });
  const response = await fetch(
    `/api/catalog?${base}&random=${count}&seed=${seed}`,
  );
  if (!response.ok) return [];
  const data = (await response.json()) as { toys?: Toy[] };
  return data.toys ?? [];
}
