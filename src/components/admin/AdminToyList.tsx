"use client";

import { useEffect, useId, useState } from "react";
import Image from "next/image";
import { categories } from "@/data/categories";
import {
  AGE_PRESETS,
  DEFAULT_GENERATE_OPTIONS,
  type GenerateListingsOptions,
} from "@/lib/generate-options";
import {
  featuredTierLabel,
  resolveFeaturedTier,
} from "@/lib/featured-tier";
import type { Audience, CategoryId, DraftToy, Toy } from "@/types/toy";

type Tab = "live" | "review";
type ViewMode = "list" | "grid";

type Props = {
  toys: Toy[];
  drafts: DraftToy[];
  onEdit: (toy: Toy, source: Tab) => void;
  onDelete: (id: string, source: Tab) => void;
  onGenerate: (options: GenerateListingsOptions) => void;
  onPublish: (ids: string[]) => void;
  generating: boolean;
  generateProgress?: {
    current: number;
    total: number;
    message: string;
  } | null;
  publishing: boolean;
  busyId: string | null;
  editingId?: string | null;
};

function ListViewIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 3.5h12M2 8h12M2 12.5h12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GridViewIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2" y="2" width="5" height="5" rx="1.2" fill="currentColor" />
      <rect x="9" y="2" width="5" height="5" rx="1.2" fill="currentColor" />
      <rect x="2" y="9" width="5" height="5" rx="1.2" fill="currentColor" />
      <rect x="9" y="9" width="5" height="5" rx="1.2" fill="currentColor" />
    </svg>
  );
}

function GenerateListingsButton({
  generating,
  generateProgress,
  onGenerate,
  className = "",
}: {
  generating: boolean;
  generateProgress?: {
    current: number;
    total: number;
    message: string;
  } | null;
  onGenerate: (options: GenerateListingsOptions) => void;
  className?: string;
}) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<GenerateListingsOptions>(
    DEFAULT_GENERATE_OPTIONS,
  );

  const total = generateProgress?.total || options.count || 10;
  const current = Math.min(generateProgress?.current ?? 0, total);
  const pct = generating ? Math.max(4, Math.round((current / total) * 100)) : 0;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function startGenerate() {
    setOpen(false);
    onGenerate(options);
  }

  return (
    <div className={`relative flex min-w-[12.5rem] flex-col gap-1.5 ${className}`}>
      <button
        type="button"
        disabled={generating}
        onClick={() => setOpen(true)}
        className="relative overflow-hidden rounded-full bg-[var(--purple-deep)] px-3.5 py-2 text-sm font-bold text-white transition disabled:opacity-100 active:scale-[0.98]"
        aria-busy={generating}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {generating ? (
          <span
            className="absolute inset-y-0 left-0 bg-white/20 transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
            aria-hidden
          />
        ) : null}
        <span className="relative z-[1] inline-flex items-center justify-center gap-2">
          {generating ? (
            <span
              className="admin-generate-spinner h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white/35 border-t-white"
              aria-hidden
            />
          ) : null}
          {generating
            ? `Generating ${current}/${total}`
            : "Generate 10 new listings"}
        </span>
      </button>
      {generating && generateProgress ? (
        <p className="max-w-[18rem] truncate px-1 text-[11px] font-semibold text-[var(--ink-soft)]">
          {generateProgress.message}
        </p>
      ) : null}

      {open && !generating ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 px-4 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-md rounded-[1.5rem] bg-white p-4 shadow-[0_18px_50px_-18px_rgba(80,60,140,0.55)] ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h4
                  id={titleId}
                  className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--ink)]"
                >
                  Target listings
                </h4>
                <p className="text-xs font-semibold text-[var(--ink-soft)]">
                  Defaults search general toys for ages 3–13.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f3f4f8] text-[var(--ink-soft)]"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                  Age
                </span>
                <select
                  value={options.agePreset}
                  onChange={(e) =>
                    setOptions((o) => ({
                      ...o,
                      agePreset: e.target.value as GenerateListingsOptions["agePreset"],
                    }))
                  }
                  className="admin-select text-sm font-semibold"
                >
                  {AGE_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset>
                <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                  Gender
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ["any", "Any"],
                      ["all", "Unisex"],
                      ["boys", "Boys"],
                      ["girls", "Girls"],
                    ] as const
                  ).map(([value, label]) => {
                    const selected = options.audience === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setOptions((o) => ({
                            ...o,
                            audience: value as Audience | "any",
                          }))
                        }
                        className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                          selected
                            ? "bg-[var(--mint)] text-white"
                            : "bg-[var(--lavender)]/70 text-[var(--ink)]"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                  Toy type
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOptions((o) => ({ ...o, category: "any" }))}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      options.category === "any"
                        ? "bg-[var(--mint)] text-white"
                        : "bg-[var(--lavender)]/70 text-[var(--ink)]"
                    }`}
                  >
                    Any type
                  </button>
                  {categories.map((cat) => {
                    const selected = options.category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() =>
                          setOptions((o) => ({
                            ...o,
                            category: cat.id as CategoryId,
                          }))
                        }
                        className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                          selected
                            ? "bg-[var(--mint)] text-white"
                            : "bg-[var(--lavender)]/70 text-[var(--ink)]"
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setOptions(DEFAULT_GENERATE_OPTIONS);
                }}
                className="rounded-full bg-[var(--lavender)] px-3 py-2.5 text-sm font-bold text-[var(--ink-soft)]"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={startGenerate}
                className="flex-1 rounded-full bg-[var(--purple-deep)] py-2.5 text-sm font-bold text-white"
              >
                Generate 10
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AdminToyList({
  toys,
  drafts,
  onEdit,
  onDelete,
  onGenerate,
  onPublish,
  generating,
  generateProgress = null,
  publishing,
  busyId,
  editingId = null,
}: Props) {
  const [tab, setTab] = useState<Tab>("live");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<string>>(
    () => new Set(),
  );

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
  const isGrid = viewMode === "grid";

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
        <GenerateListingsButton
          generating={generating}
          generateProgress={generateProgress}
          onGenerate={onGenerate}
        />
      </section>
    );
  }

  return (
    <section
      className={`admin-panel__section p-4${
        isGrid ? " admin-toy-list--grid" : ""
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--ink)]">
          Manage toys
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <GenerateListingsButton
            generating={generating}
            generateProgress={generateProgress}
            onGenerate={onGenerate}
          />
          <div
            className="inline-flex rounded-full bg-[var(--lavender)]/50 p-1"
            role="group"
            aria-label="Toy layout"
          >
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                viewMode === "list"
                  ? "bg-white text-[var(--ink)] shadow-sm"
                  : "text-[var(--ink-soft)]"
              }`}
              aria-pressed={viewMode === "list"}
            >
              <ListViewIcon />
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                viewMode === "grid"
                  ? "bg-white text-[var(--ink)] shadow-sm"
                  : "text-[var(--ink-soft)]"
              }`}
              aria-pressed={viewMode === "grid"}
            >
              <GridViewIcon />
              Grid
            </button>
          </div>
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
      ) : isGrid ? (
        <div className="admin-toy-list__grid-host">
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
                      {" · "}
                      {featuredTierLabel(resolveFeaturedTier(toy))}
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
      ) : (
        <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
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
                    {toy.category} · ages {toy.ageMin}–{toy.ageMax} ·{" "}
                    {featuredTierLabel(resolveFeaturedTier(toy))} · {toy.blurb}
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
      )}
    </section>
  );
}
