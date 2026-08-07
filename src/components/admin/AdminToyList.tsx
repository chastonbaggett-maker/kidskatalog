"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { DraftToy, Toy } from "@/types/toy";

type Tab = "live" | "review";

type Props = {
  toys: Toy[];
  drafts: DraftToy[];
  onEdit: (toy: Toy, source: Tab) => void;
  onDelete: (id: string, source: Tab) => void;
  onGenerate: () => void;
  onPublish: (ids: string[]) => void;
  generating: boolean;
  publishing: boolean;
  busyId: string | null;
  editingId?: string | null;
};

export function AdminToyList({
  toys,
  drafts,
  onEdit,
  onDelete,
  onGenerate,
  onPublish,
  generating,
  publishing,
  busyId,
  editingId = null,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>("live");
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<string>>(
    () => new Set(),
  );

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

  useEffect(() => {
    setSelectedDraftIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (drafts.some((d) => d.id === id)) next.add(id);
      }
      return next;
    });
  }, [drafts]);

  const items = tab === "live" ? toys : drafts;

  function handleEdit(toy: Toy) {
    onEdit(toy, tab);
    requestAnimationFrame(() => {
      document
        .getElementById("admin-toy-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function toggleDraftSelected(id: string) {
    setSelectedDraftIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllDrafts() {
    setSelectedDraftIds(new Set(drafts.map((d) => d.id)));
  }

  if (toys.length === 0 && drafts.length === 0) {
    return (
      <section className="admin-panel__section p-4">
        <h3 className="mb-2 font-[family-name:var(--font-display)] text-lg font-bold text-[var(--ink)]">
          Manage toys
        </h3>
        <p className="mb-3 text-sm text-[var(--ink-soft)]">No toys in catalog yet.</p>
        <button
          type="button"
          disabled={generating}
          onClick={onGenerate}
          className="rounded-full bg-[var(--purple-deep)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {generating ? "Generating…" : "Generate 10 new listings"}
        </button>
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
          Manage toys
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={generating}
            onClick={onGenerate}
            className="rounded-full bg-[var(--purple-deep)] px-3.5 py-2 text-sm font-bold text-white transition disabled:opacity-50 active:scale-[0.98]"
          >
            {generating ? "Generating…" : "Generate 10 new listings"}
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="hidden rounded-full bg-[var(--lavender)] px-3.5 py-2 text-sm font-bold text-[var(--purple-deep)] transition active:scale-[0.98] lg:inline-flex"
            aria-expanded={expanded}
          >
            {expanded ? "Collapse grid" : "Expand grid"}
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full bg-[var(--lavender)]/50 p-1">
          <button
            type="button"
            onClick={() => setTab("live")}
            className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition ${
              tab === "live"
                ? "bg-white text-[var(--ink)] shadow-sm"
                : "text-[var(--ink-soft)]"
            }`}
          >
            Live ({toys.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("review")}
            className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition ${
              tab === "review"
                ? "bg-white text-[var(--ink)] shadow-sm"
                : "text-[var(--ink-soft)]"
            }`}
          >
            Review ({drafts.length})
          </button>
        </div>

        {tab === "review" && drafts.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={selectAllDrafts}
              className="rounded-full bg-[var(--lavender)] px-3 py-1.5 text-xs font-bold text-[var(--ink-soft)]"
            >
              Select all
            </button>
            <button
              type="button"
              disabled={publishing || selectedDraftIds.size === 0}
              onClick={() => onPublish([...selectedDraftIds])}
              className="rounded-full bg-[var(--mint)] px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-40"
            >
              {publishing
                ? "Publishing…"
                : `Publish selected (${selectedDraftIds.size})`}
            </button>
            <button
              type="button"
              disabled={publishing}
              onClick={() => onPublish(drafts.map((d) => d.id))}
              className="rounded-full bg-[var(--mint)]/85 px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-40"
            >
              Publish all
            </button>
          </div>
        ) : null}
      </div>

      {tab === "review" ? (
        <p className="mb-3 text-xs font-semibold text-[var(--ink-soft)]">
          Drafts stay off the shop until you publish. Edit or delete before going live.
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-xl bg-[var(--lavender)]/25 px-4 py-8 text-center text-sm text-[var(--ink-soft)]">
          {tab === "review"
            ? "No drafts yet — generate listings to review them here."
            : "No live toys."}
        </p>
      ) : (
        <>
          {/* Compact list — default / mobile */}
          <ul
            className={`flex flex-col gap-2 overflow-y-auto ${
              expanded ? "hidden" : "max-h-72"
            }`}
          >
            {items.map((toy) => {
              const selected = editingId === toy.id;
              const checked = selectedDraftIds.has(toy.id);
              return (
                <li
                  key={toy.id}
                  className={`flex items-center gap-3 rounded-xl p-2 ${
                    selected
                      ? "bg-[var(--lavender)] ring-2 ring-[var(--purple)]/35"
                      : "bg-[var(--lavender)]/35"
                  }`}
                >
                  {tab === "review" ? (
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDraftSelected(toy.id)}
                      className="h-4 w-4 shrink-0 accent-[var(--mint)]"
                      aria-label={`Select ${toy.name}`}
                    />
                  ) : null}
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
                      {toy.category} · ages {toy.ageMin}–{toy.ageMax} · {toy.blurb}
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
                      onClick={() => onDelete(toy.id, tab)}
                      className="rounded-full px-2.5 py-1 text-xs font-bold text-red-600 disabled:opacity-40"
                    >
                      {busyId === toy.id ? "…" : "Delete"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Desktop expandable grid */}
          <div
            className={`${expanded ? "block" : "hidden"} admin-toy-list__grid-host`}
          >
            <ul className="admin-toy-list__grid">
              {items.map((toy) => {
                const selected = editingId === toy.id;
                const checked = selectedDraftIds.has(toy.id);
                return (
                  <li
                    key={toy.id}
                    className={`admin-toy-list__card ${
                      selected ? "admin-toy-list__card--selected" : ""
                    }`}
                  >
                    {tab === "review" ? (
                      <label className="absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 shadow-sm ring-1 ring-black/5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDraftSelected(toy.id)}
                          className="h-3.5 w-3.5 accent-[var(--mint)]"
                          aria-label={`Select ${toy.name}`}
                        />
                      </label>
                    ) : null}
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
                        {toy.category} · {toy.ageMin}–{toy.ageMax} · {toy.audience}
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
                        onClick={() => onDelete(toy.id, tab)}
                        className="flex-1 rounded-full bg-red-50 py-2 text-xs font-bold text-red-600 ring-1 ring-red-100 transition disabled:opacity-40 active:scale-[0.98]"
                      >
                        {busyId === toy.id ? "…" : "Delete"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
