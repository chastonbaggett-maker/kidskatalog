"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Toy } from "@/types/toy";
import {
  buildCatalogQueryString,
  type CatalogFilters,
  type CatalogPageResult,
} from "@/lib/catalog-query";
import { isKartEffectBlocked } from "@/lib/kart-effect-guard";

const DEFAULT_LIMIT = 20;

type Options = CatalogFilters & {
  limit?: number;
  enabled?: boolean;
  initialPage?: CatalogPageResult;
};

function toysToMap(toys: Toy[]) {
  return new Map(toys.map((toy) => [toy.id, toy]));
}

function freshSeed() {
  return Date.now() >>> 0;
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

  const seedRef = useRef<number>((initialPage?.seed ?? freshSeed()) >>> 0);

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
  const loadingRef = useRef(false);
  const displayIdsRef = useRef<string[]>(
    initialPage?.toys.map((t) => t.id) ?? [],
  );
  const seededKeyRef = useRef<string | null>(initialPage ? filtersKey : null);

  useEffect(() => {
    displayIdsRef.current = displayIds;
  }, [displayIds]);

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
      // Synchronous guard — React `loading` state is too late to stop races.
      if (loadingRef.current) return null;
      loadingRef.current = true;

      const requestId = ++requestRef.current;
      setLoading(true);
      setError(null);

      try {
        const query = buildCatalogQueryString({
          ...filtersRef.current,
          offset,
          limit,
          seed: seedRef.current,
        });
        const response = await fetch(`/api/catalog?${query}`);
        if (!response.ok) throw new Error("Could not load toys");

        const data = (await response.json()) as CatalogPageResult;
        if (requestId !== requestRef.current) return null;
        if (isKartEffectBlocked()) return null;

        if (typeof data.seed === "number" && Number.isFinite(data.seed)) {
          seedRef.current = data.seed >>> 0;
        }

        mergeToys(data.toys);
        setTotal(data.total);
        setHasMore(data.hasMore);
        setDisplayIds((prev) => {
          const incoming = data.toys.map((t) => t.id);
          if (replace) {
            displayIdsRef.current = incoming;
            return incoming;
          }
          // Dedupe in case two loads overlapped before the guard landed.
          const seen = new Set(prev);
          const merged = [...prev];
          for (const id of incoming) {
            if (seen.has(id)) continue;
            seen.add(id);
            merged.push(id);
          }
          displayIdsRef.current = merged;
          return merged;
        });

        return data;
      } catch (err) {
        if (requestId !== requestRef.current) return null;
        setError(err instanceof Error ? err.message : "Could not load toys");
        return null;
      } finally {
        if (requestId === requestRef.current) {
          loadingRef.current = false;
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

    // New filter set => new shuffle order for this visit.
    seedRef.current = freshSeed();
    loadingRef.current = false;
    setToyMap(new Map());
    displayIdsRef.current = [];
    setDisplayIds([]);
    setTotal(0);
    setHasMore(true);
    void fetchPage(0, true);
  }, [enabled, filtersKey, fetchPage]);

  const loadMore = useCallback(async () => {
    if (!enabled || loadingRef.current || !hasMore) return;
    await fetchPage(displayIdsRef.current.length, false);
  }, [enabled, fetchPage, hasMore]);

  const replaceDisplayIds = useCallback((ids: string[]) => {
    // Randomize / crazy reshuffles should not reintroduce duplicates.
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      unique.push(id);
    }
    displayIdsRef.current = unique;
    setDisplayIds(unique);
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
