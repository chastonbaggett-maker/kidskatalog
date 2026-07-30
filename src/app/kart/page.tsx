"use client";

import Image from "next/image";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { SendToParentForm } from "@/components/SendToParentForm";
import { ShelfHeader } from "@/components/ShelfHeader";
import { getToysByIds } from "@/data/toys";
import { useKartStore } from "@/lib/kart-store";

export default function KartPage() {
  const ids = useKartStore((s) => s.ids);
  const remove = useKartStore((s) => s.remove);
  const clear = useKartStore((s) => s.clear);
  const toys = getToysByIds(ids);

  return (
    <AppShell>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ShelfHeader
          title="My Kart"
          subtitle={
            toys.length === 0
              ? "Empty — go find toys!"
              : `${toys.length} favorite${toys.length === 1 ? "" : "s"}`
          }
        />

        <div className="page-scroll star-field min-h-0 flex-1 space-y-4 px-4 py-4 scroll-pad-bottom">
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
          <div className="rounded-[2rem] bg-white px-6 py-14 text-center shadow-sm">
            <p className="mb-4 text-[var(--ink-soft)]">Your Kart is waiting.</p>
            <Link
              href="/shop"
              className="inline-flex rounded-full bg-[var(--blue)] px-6 py-3 font-bold text-white"
            >
              Browse toys
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {toys.map((toy) => (
              <li
                key={toy.id}
                className="flex items-center gap-3 rounded-[1.5rem] bg-white p-3 shadow-sm"
              >
                <Link
                  href={`/toy/${toy.id}`}
                  className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl"
                >
                  <Image
                    src={toy.image}
                    alt={toy.imageAlt}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/toy/${toy.id}`}
                    className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--ink)]"
                  >
                    {toy.name}
                  </Link>
                  <p className="truncate text-sm text-[var(--ink-soft)]">
                    {toy.blurb}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(toy.id)}
                  className="rounded-full bg-[var(--lavender)] px-3 py-2 text-sm font-bold text-[var(--purple-deep)]"
                  aria-label={`Remove ${toy.name}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <SendToParentForm toys={toys} />
        </div>
      </div>
    </AppShell>
  );
}
