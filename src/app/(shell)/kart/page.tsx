"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SendToParentForm } from "@/components/SendToParentForm";
import { ShelfHeader } from "@/components/ShelfHeader";
import { ToyPhoto } from "@/components/ToyPhoto";
import {
  useCrazyModeStore,
  crazyModeRootClass,
  crazyModeScrollClass,
} from "@/lib/crazy-mode-store";
import { useKartStore } from "@/lib/kart-store";
import { readLastKidArea } from "@/lib/last-kid-area";
import { interestScore, rankIdsByInterest } from "@/lib/toy-interest";
import { useToyInterestStore } from "@/lib/toy-interest-store";
import type { Toy } from "@/types/toy";

const KART_PREVIEW_COUNT = 4;

export default function KartPage() {
  const router = useRouter();
  const ids = useKartStore((s) => s.ids);
  const remove = useKartStore((s) => s.remove);
  const clear = useKartStore((s) => s.clear);
  const crazyMode = useCrazyModeStore((s) => s.crazyMode);
  const [toys, setToys] = useState<Toy[]>([]);
  const [showAll, setShowAll] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const interestById = useToyInterestStore((s) => s.byId);

  const goBack = useCallback(() => {
    router.push(readLastKidArea());
  }, [router]);
  const rankedIds = useMemo(
    () => rankIdsByInterest(ids, (id) => interestScore(interestById[id])),
    [ids, interestById],
  );
  const interest = useMemo(() => {
    const scores: Record<string, number> = {};
    for (const id of rankedIds) {
      const score = interestScore(interestById[id]);
      if (score > 0) scores[id] = score;
    }
    return scores;
  }, [interestById, rankedIds]);
  const rankedToys = useMemo(() => {
    const byId = new Map(toys.map((toy) => [toy.id, toy]));
    return rankedIds
      .map((id) => byId.get(id))
      .filter((toy): toy is Toy => Boolean(toy));
  }, [rankedIds, toys]);
  const canFold = rankedToys.length > KART_PREVIEW_COUNT;
  const hasInterest = Object.keys(interest).length > 0;

  const collapseList = () => {
    setShowAll(false);
    requestAnimationFrame(() => {
      const scroller = listRef.current?.closest(".page-scroll");
      if (scroller instanceof HTMLElement) {
        scroller.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };
  const visibleToys =
    showAll || rankedToys.length <= KART_PREVIEW_COUNT
      ? rankedToys
      : rankedToys.slice(0, KART_PREVIEW_COUNT);
  const hiddenCount = Math.max(0, rankedToys.length - visibleToys.length);

  useEffect(() => {
    if (ids.length === 0) {
      setToys([]);
      return;
    }
    const query = encodeURIComponent(ids.join(","));
    void fetch(`/api/catalog?ids=${query}`)
      .then((r) => r.json())
      .then((data: { toys?: Toy[] }) => {
        const byId = new Map((data.toys ?? []).map((t) => [t.id, t]));
        setToys(ids.map((id) => byId.get(id)).filter((t): t is Toy => Boolean(t)));
      })
      .catch(() => setToys([]));
  }, [ids]);

  return (
    <div
      className={`shelf-page star-field flex min-h-0 flex-1 flex-col overflow-hidden ${crazyModeRootClass(crazyMode)}`}
    >
      <ShelfHeader
        title="My Kart"
        subtitle={
          toys.length === 0
            ? "Empty — go find toys!"
            : `${toys.length} favorite${toys.length === 1 ? "" : "s"}`
        }
        onBack={goBack}
      />

      <div
        className={`page-scroll star-field min-h-0 flex-1 space-y-4 px-4 py-4 scroll-pad-bottom ${crazyModeScrollClass(crazyMode)}`}
      >
        {toys.length > 0 && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => clear()}
              className="text-sm font-bold text-[var(--ink-soft)]"
            >
              Clear
            </button>
          </div>
        )}

        {toys.length === 0 ? (
          <div className="shelf-panel">
            <div className="shelf-panel__surface px-6 py-14 text-center">
              <p className="mb-4 text-[var(--ink-soft)]">Your Kart is waiting.</p>
              <Link
                href="/shop"
                className="inline-flex rounded-full bg-[var(--blue)] px-6 py-3 font-bold text-white"
              >
                Browse toys
              </Link>
            </div>
          </div>
        ) : (
          <>
          {hasInterest ? (
            <p className="text-sm font-semibold text-[var(--ink-soft)]">
              Played with most, first.
            </p>
          ) : null}
          {showAll && canFold ? (
            <div
              className={`!sticky !top-0 !z-20 -mx-4 -mt-4 px-4 pb-1 pt-4 ${crazyMode ? "bg-[#18181f]" : "bg-[var(--bg)]"}`}
            >
              <button
                type="button"
                onClick={collapseList}
                className="w-full rounded-full bg-[var(--lavender)] px-6 py-3 text-base font-bold text-[var(--purple-deep)] shadow-md"
              >
                Collapse
              </button>
            </div>
          ) : null}
          <ul ref={listRef} className="flex flex-col gap-3">
            {visibleToys.map((toy) => (
              <li key={toy.id} className="shelf-panel shelf-panel--soft">
                <div className="shelf-panel__surface flex items-center gap-3 p-3">
                  <Link
                    href={`/toy/${toy.id}`}
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
                  <div className="min-w-0 flex-1">
                    <Link href={`/toy/${toy.id}`} prefetch={false}>
                      <p className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--ink)]">
                        {toy.name}
                      </p>
                    </Link>
                    <p className="truncate text-sm text-[var(--ink-soft)]">{toy.blurb}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(toy.id)}
                    className="rounded-full bg-[var(--lavender)] px-3 py-2 text-sm font-bold text-[var(--purple-deep)]"
                    aria-label={`Remove ${toy.name}`}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
          </>
        )}

        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="w-full rounded-full bg-[var(--mint)] px-6 py-3 text-base font-bold text-white shadow-md"
          >
            See whole list
          </button>
        )}

        <SendToParentForm toys={rankedToys} wishlistIds={rankedIds} interest={interest} />
      </div>
    </div>
  );
}
