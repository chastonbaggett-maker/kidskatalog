"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ShelfHeader } from "@/components/ShelfHeader";
import { ToyPhoto } from "@/components/ToyPhoto";
import { ShareWishlistActions } from "@/components/ShareWishlistActions";
import { AssociatesDisclosure } from "@/components/parent/AssociatesDisclosure";
import { ParentAuthLinks } from "@/components/parent/ParentAuthLinks";
import { ParentBuyButton } from "@/components/parent/ParentBuyButton";
import { ParentFunnelPing } from "@/components/parent/ParentFunnelPing";
import { ParentSaveList } from "@/components/parent/ParentSaveList";
import { parentBuyPlaceholderPath, parentToyPath } from "@/lib/parent-paths";
import { useParentWishlistStore } from "@/lib/parent-wishlist-store";
import type { Toy } from "@/types/toy";

type Props = {
  initialToys: Toy[];
  buyUrls: Record<string, string>;
  buyPlaceholder?: boolean;
  savedListName?: string;
  returnTo?: string;
  /** Play scores from the kid Kart. Higher ranks first. */
  interest?: Record<string, number>;
};

export function ParentWishlistView({
  initialToys,
  buyUrls,
  buyPlaceholder = true,
  savedListName,
  returnTo = "/p",
  interest,
}: Props) {
  const storedIds = useParentWishlistStore((s) => s.ids);
  const importIds = useParentWishlistStore((s) => s.importIds);
  const remove = useParentWishlistStore((s) => s.remove);
  const clear = useParentWishlistStore((s) => s.clear);
  const [extraToys, setExtraToys] = useState<Toy[]>([]);
  const [resolvedBuyUrls, setResolvedBuyUrls] = useState<Record<string, string>>(buyUrls);

  useEffect(() => {
    if (initialToys.length === 0) return;
    importIds(initialToys.map((toy) => toy.id));
  }, [importIds, initialToys]);

  const initialById = useMemo(() => {
    const map = new Map(initialToys.map((toy) => [toy.id, toy]));
    return map;
  }, [initialToys]);

  const knownIds = useMemo(() => {
    const set = new Set(initialToys.map((toy) => toy.id));
    for (const id of storedIds) set.add(id);
    return [...set];
  }, [initialToys, storedIds]);

  useEffect(() => {
    const missing = knownIds.filter((id) => !initialById.has(id));
    if (missing.length === 0) {
      setExtraToys([]);
    } else {
      const query = encodeURIComponent(missing.join(","));
      void fetch(`/api/catalog?ids=${query}`)
        .then((r) => r.json())
        .then((data: { toys?: Toy[] }) => setExtraToys(data.toys ?? []))
        .catch(() => setExtraToys([]));
    }

    if (knownIds.length === 0) return;
    const buyQuery = encodeURIComponent(knownIds.join(","));
    void fetch(`/api/parent/buy-urls?ids=${buyQuery}`)
      .then((r) => r.json())
      .then((data: { urls?: Record<string, string> }) => {
        setResolvedBuyUrls((prev) => ({ ...prev, ...buyUrls, ...(data.urls ?? {}) }));
      })
      .catch(() => setResolvedBuyUrls((prev) => ({ ...prev, ...buyUrls })));
  }, [buyUrls, initialById, knownIds]);

  const toys = useMemo(() => {
    const extraById = new Map(extraToys.map((toy) => [toy.id, toy]));
    const listed = knownIds
      .map((id) => initialById.get(id) ?? extraById.get(id))
      .filter((toy): toy is Toy => Boolean(toy));
    if (!interest) return listed;
    return listed
      .map((toy, index) => ({ toy, index, score: interest[toy.id] ?? 0 }))
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .map((row) => row.toy);
  }, [extraToys, initialById, interest, knownIds]);
  const rankedForParents = Boolean(
    interest && Object.values(interest).some((score) => score > 0),
  );

  const sharedFromQuery = initialToys.length > 0;

  return (
    <div className="shelf-page star-field flex min-h-0 flex-1 flex-col overflow-hidden">
      {sharedFromQuery ? (
        <ParentFunnelPing
          event={{
            name: "parent_wishlist_view",
            toyCount: initialToys.length,
          }}
        />
      ) : null}
      <ShelfHeader
        title="Parent wish list"
        subtitle={
          toys.length === 0
            ? "Open a Kart link or a saved list"
            : savedListName
              ? `${savedListName} · ${toys.length} toy${toys.length === 1 ? "" : "s"}`
              : `${toys.length} toy${toys.length === 1 ? "" : "s"}`
        }
        backHref="/shop"
        logoHref="/p"
      />

      <div className="page-scroll star-field min-h-0 flex-1 space-y-4 px-4 py-4 scroll-pad-bottom">
        <div className="flex items-center justify-between gap-3">
          <ParentAuthLinks returnTo={returnTo} tone="page" />
          {toys.length > 0 ? (
            <button
              type="button"
              onClick={() => clear()}
              className="shrink-0 text-sm font-bold text-[var(--ink-soft)]"
            >
              Clear
            </button>
          ) : null}
        </div>

        {rankedForParents ? (
          <p className="text-sm font-semibold text-[var(--ink-soft)]">
            Most played with, first.
          </p>
        ) : null}

        {toys.length === 0 ? (
          <div className="shelf-panel">
            <div className="shelf-panel__surface px-6 py-14 text-center">
              <p className="mb-2 text-[var(--ink-soft)]">
                No toys on this list yet.
              </p>
              <p className="text-sm text-[var(--ink-soft)]">
                Kids send a Kart, open a shared /p?ids= link, or log in to a
                saved list. Grown-ups buy here.
              </p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {toys.map((toy) => {
              const buyUrl =
                resolvedBuyUrls[toy.id] ||
                buyUrls[toy.id] ||
                parentBuyPlaceholderPath(toy.id);
              return (
                <li key={toy.id} className="shelf-panel shelf-panel--soft">
                  <div className="shelf-panel__surface flex items-start gap-3 p-3">
                    <Link
                      href={parentToyPath(toy.id)}
                      prefetch={false}
                      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl"
                    >
                      <ToyPhoto
                        src={toy.image}
                        alt={toy.imageAlt}
                        loading="lazy"
                        decoding="async"
                        className="kart-row__photo absolute inset-0 h-full w-full object-contain p-1.5"
                      />
                    </Link>
                    <div className="flex w-[9.5rem] shrink-0 flex-col gap-2">
                      <ParentBuyButton
                        href={buyUrl}
                        toyId={toy.id}
                        mode={buyPlaceholder ? "placeholder" : "associates"}
                        className="w-full flex-none px-3"
                      />
                      <button
                        type="button"
                        onClick={() => remove(toy.id)}
                        className="rounded-full bg-[var(--lavender)] px-3 py-2 text-sm font-bold text-[var(--purple-deep)]"
                        aria-label={`Remove ${toy.name}`}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <Link href={parentToyPath(toy.id)} prefetch={false}>
                        <p className="font-[family-name:var(--font-display)] text-lg font-bold leading-tight text-[var(--ink)]">
                          {toy.name}
                        </p>
                      </Link>
                      <p className="mt-1 line-clamp-3 text-sm text-[var(--ink-soft)]">
                        {toy.blurb}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {toys.length > 0 ? (
          <>
            <ParentSaveList
              toyIds={toys.map((toy) => toy.id)}
              returnTo={returnTo}
            />
            <div className="shelf-panel shelf-panel--soft">
              <div className="shelf-panel__surface flex flex-col gap-3 p-5">
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--ink)]">
                  Share this list
                </h2>
                <p className="text-sm text-[var(--ink-soft)]">
                  Same /p?ids= link the Kart builds. Text it to another grown-up.
                  No PDF.
                </p>
                <ShareWishlistActions
                  ids={toys.map((toy) => toy.id)}
                  interest={interest}
                  showOpenLink={false}
                />
              </div>
            </div>
          </>
        ) : null}

        <div className="shelf-panel shelf-panel--soft">
          <div className="shelf-panel__surface p-5">
            <AssociatesDisclosure placeholder={buyPlaceholder} />
          </div>
        </div>
      </div>
    </div>
  );
}
