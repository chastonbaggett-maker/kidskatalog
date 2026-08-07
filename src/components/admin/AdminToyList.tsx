"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { Toy } from "@/types/toy";

type Props = {
  toys: Toy[];
  onEdit: (toy: Toy) => void;
  onDelete: (id: string) => void;
  busyId: string | null;
  editingId?: string | null;
};

const AGES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;

function toyMatchesAge(toy: Toy, age: number | null) {
  if (age == null) return true;
  return toy.ageMin <= age && age <= toy.ageMax;
}

export function AdminToyList({
  toys,
  onEdit,
  onDelete,
  busyId,
  editingId = null,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [ageFilter, setAgeFilter] = useState<number | null>(null);

  // Desktop grid is the useful expanded view; collapse if viewport shrinks.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (!mq.matches) setExpanded(false);
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const filteredToys = useMemo(
    () => toys.filter((toy) => toyMatchesAge(toy, ageFilter)),
    [toys, ageFilter],
  );

  function handleEdit(toy: Toy) {
    onEdit(toy);
    requestAnimationFrame(() => {
      document
        .getElementById("admin-toy-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

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
    <section
      className={`admin-panel__section p-4${
        expanded ? " admin-toy-list--expanded" : ""
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--ink)]">
          Manage toys ({filteredToys.length}
          {ageFilter != null ? ` of ${toys.length}` : ""})
        </h3>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="hidden rounded-full bg-[var(--lavender)] px-3.5 py-2 text-sm font-bold text-[var(--purple-deep)] transition active:scale-[0.98] lg:inline-flex"
          aria-expanded={expanded}
        >
          {expanded ? "Collapse grid" : "Expand grid"}
        </button>
      </div>

      <div
        className="mb-3 flex items-center gap-2 overflow-x-auto pb-0.5"
        role="group"
        aria-label="Filter by age"
      >
        <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
          Age
        </span>
        <button
          type="button"
          onClick={() => setAgeFilter(null)}
          aria-pressed={ageFilter == null}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition active:scale-[0.98] ${
            ageFilter == null
              ? "bg-[var(--mint)] text-white shadow-sm"
              : "bg-[var(--lavender)]/60 text-[var(--ink-soft)]"
          }`}
        >
          All
        </button>
        {AGES.map((age) => {
          const selected = ageFilter === age;
          return (
            <button
              key={age}
              type="button"
              onClick={() => setAgeFilter(selected ? null : age)}
              aria-pressed={selected}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition active:scale-[0.98] ${
                selected
                  ? "bg-[var(--mint)] text-white shadow-sm"
                  : "bg-[var(--lavender)]/60 text-[var(--ink)]"
              }`}
            >
              {age}
            </button>
          );
        })}
      </div>

      {/* Compact list — default / mobile */}
      <ul
        className={`flex flex-col gap-2 overflow-y-auto ${
          expanded ? "hidden" : "max-h-72"
        }`}
      >
        {filteredToys.length === 0 ? (
          <li className="rounded-xl bg-[var(--lavender)]/25 px-4 py-8 text-center text-sm text-[var(--ink-soft)]">
            No toys for age {ageFilter}.
          </li>
        ) : (
          filteredToys.map((toy) => {
            const selected = editingId === toy.id;
            return (
              <li
                key={toy.id}
                className={`flex items-center gap-3 rounded-xl p-2 ${
                  selected
                    ? "bg-[var(--lavender)] ring-2 ring-[var(--purple)]/35"
                    : "bg-[var(--lavender)]/35"
                }`}
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white">
                  <Image
                    src={toy.image}
                    alt={toy.imageAlt}
                    fill
                    className="object-contain"
                    sizes="56px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[var(--ink)]">{toy.name}</p>
                  <p className="truncate text-xs text-[var(--ink-soft)]">
                    ages {toy.ageMin}–{toy.ageMax} · {toy.category} · {toy.blurb}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleEdit(toy)}
                    className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[var(--purple-deep)] shadow-sm ring-1 ring-black/5"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={busyId === toy.id}
                    onClick={() => onDelete(toy.id)}
                    className="rounded-full px-2.5 py-1 text-xs font-bold text-red-600 disabled:opacity-40"
                  >
                    {busyId === toy.id ? "…" : "Delete"}
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>

      {/* Desktop expandable grid */}
      <div
        className={`${expanded ? "block" : "hidden"} admin-toy-list__grid-host`}
      >
        {filteredToys.length === 0 ? (
          <p className="px-2 py-10 text-center text-sm text-[var(--ink-soft)]">
            No toys for age {ageFilter}.
          </p>
        ) : (
          <ul className="admin-toy-list__grid">
            {filteredToys.map((toy) => {
              const selected = editingId === toy.id;
              return (
                <li
                  key={toy.id}
                  className={`admin-toy-list__card ${
                    selected ? "admin-toy-list__card--selected" : ""
                  }`}
                >
                  <div className="admin-toy-list__card-media">
                    <Image
                      src={toy.image}
                      alt={toy.imageAlt}
                      fill
                      className="object-contain"
                      sizes="160px"
                    />
                  </div>
                  <div className="min-w-0 flex-1 px-3 pb-2 pt-2.5">
                    <p className="truncate font-[family-name:var(--font-display)] text-base font-bold text-[var(--ink)]">
                      {toy.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
                      ages {toy.ageMin}–{toy.ageMax} · {toy.category}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--ink-soft)]">
                      {toy.blurb}
                    </p>
                  </div>
                  <div className="mt-auto flex gap-2 border-t border-black/[0.04] px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => handleEdit(toy)}
                      className="flex-1 rounded-full bg-[var(--purple-deep)] py-2 text-xs font-bold text-white transition active:scale-[0.98]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busyId === toy.id}
                      onClick={() => onDelete(toy.id)}
                      className="flex-1 rounded-full bg-red-50 py-2 text-xs font-bold text-red-600 ring-1 ring-red-100 transition disabled:opacity-40 active:scale-[0.98]"
                    >
                      {busyId === toy.id ? "…" : "Delete"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
