"use client";

import Image from "next/image";
import type { Toy } from "@/types/toy";

type Props = {
  toys: Toy[];
  onEdit: (toy: Toy) => void;
  onDelete: (id: string) => void;
  busyId: string | null;
};

export function AdminToyList({ toys, onEdit, onDelete, busyId }: Props) {
  if (toys.length === 0) {
    return (
      <section className="admin-panel__section p-4">
        <h3 className="mb-2 font-[family-name:var(--font-display)] text-lg font-bold text-[var(--ink)]">
          Manage toys
        </h3>
        <p className="text-sm text-[var(--ink-soft)]">No toys in catalog yet.</p>
      </section>
    );
  }

  return (
    <section className="admin-panel__section p-4">
      <h3 className="mb-3 font-[family-name:var(--font-display)] text-lg font-bold text-[var(--ink)]">
        Manage toys ({toys.length})
      </h3>
      <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
        {toys.map((toy) => (
          <li
            key={toy.id}
            className="flex items-center gap-3 rounded-xl bg-[var(--lavender)]/35 p-2"
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
              <Image
                src={toy.image}
                alt={toy.imageAlt}
                fill
                className="object-cover"
                sizes="56px"
              />
            </div>
            <button
              type="button"
              onClick={() => onEdit(toy)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate font-semibold text-[var(--ink)]">{toy.name}</p>
              <p className="truncate text-xs text-[var(--ink-soft)]">
                {toy.category} · {toy.blurb}
              </p>
            </button>
            <button
              type="button"
              disabled={busyId === toy.id}
              onClick={() => onDelete(toy.id)}
              className="rounded-full px-2.5 py-1 text-xs font-bold text-red-600 disabled:opacity-40"
            >
              {busyId === toy.id ? "…" : "Delete"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
