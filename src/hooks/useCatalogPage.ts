"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Toy } from "@/types/toy";
import {
  buildCatalogQueryString,
  type CatalogFilters,
  type CatalogPageResult,
} from "@/lib/catalog-query";

const DEFAULT_LIMIT = 20;

type Options = CatalogFilters & {
  limit?: number;
  enabled?: boolean;
  initialPage?: CatalogPageResult;
};

function toysToMap(toys: Toy[]) {
  return new Map(toys.map((toy) => [toy.id, toy]));
}

export function useCatalogPage({
  limit = DEFAULT_LIMIT,
  enabled = true,
  initialPage,
  category,
  audience = "all",
  age = null,
  q,
  excludeId,
  excludeIds,
}: Options) {
  const filtersRef = useRef<CatalogFilters>({
    category,
    audience,
    age,
    q,
    excludeId,
    excludeIds,
  });
  filtersRef.current = { category, audience, age, q, excludeId, excludeIds };

  const filtersKey = [
    category ?? "",
    audience ?? "all",
    age ?? "",
    q ?? "",
    excludeId ?? "",
    (excludeIds ?? []).join(","),
    String(limit),
  ].join("\0");

  const [toyMap, setToyMap] = useState<Map<string, Toy>>(() =>
    toysToMap(initialPage?.toys ?? []),
  );
  const [displayIds, setDisplayIds] = useState<string[]>(
    () => initialPage?.toys.map((t) => t.id) ?? [],
  );
  const [total, setTotal] = useState(initialPage?.total ?? 0);
  const [hasMore, setHasMore] = useState(initialPage?.hasMore ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestRef = useRef(0);
  const seededKeyRef = useRef<string | null>(initialPage ? filtersKey : null);

  const mergeToys = useCallback((toys: Toy[]) => {
    if (toys.length === 0) return;
    setToyMap((prev) => {
      const next = new Map(prev);
      for (const toy of toys) {
        next.set(toy.id, toy);
      }
      return next;
    });
  }, []);

  const fetchPage = useCallback(
    async (offset: number, replace: boolean) => {
      if (!enabled) return null;

      const requestId = ++requestRef.current;
      setLoading(true);
      setError(null);

      try {
        const query = buildCatalogQueryString({
          ...filtersRef.current,
          offset,
          limit,
        });
        const response = await fetch(`/api/catalog?${query}`);
        if (!response.ok) throw new Error("Could not load toys");

        const data = (await response.json()) as CatalogPageResult;
        if (requestId !== requestRef.current) return null;

        mergeToys(data.toys);
        setTotal(data.total);
        setHasMore(data.hasMore);
        setDisplayIds((prev) =>
          replace ? data.toys.map((t) => t.id) : [...prev, ...data.toys.map((t) => t.id)],
        );

        return data;
      } catch (err) {
        if (requestId !== requestRef.current) return null;
        setError(err instanceof Error ? err.message : "Could not load toys");
        return null;
      } finally {
        if (requestId === requestRef.current) {
          setLoading(false);
        }
      }
    },
    [enabled, limit, mergeToys],
  );

  useEffect(() => {
    if (!enabled) return;

    if (seededKeyRef.current === filtersKey) {
      seededKeyRef.current = null;
      return;
    }

    setToyMap(new Map());
    setDisplayIds([]);
    setTotal(0);
    setHasMore(true);
    void fetchPage(0, true);
  }, [enabled, filtersKey, fetchPage]);

  const loadMore = useCallback(async () => {
    if (!enabled || loading || !hasMore) return;
    await fetchPage(displayIds.length, false);
  }, [displayIds.length, enabled, fetchPage, hasMore, loading]);

  const replaceDisplayIds = useCallback((ids: string[]) => {
    setDisplayIds(ids);
  }, []);

  const displayed = displayIds
    .map((id) => toyMap.get(id))
    .filter((toy): toy is Toy => toy != null);

  return {
    displayed,
    displayIds,
    replaceDisplayIds,
    toyMap,
    mergeToys,
    total,
    hasMore,
    loading,
    error,
    loadMore,
    refetch: () => fetchPage(0, true),
  };
}
