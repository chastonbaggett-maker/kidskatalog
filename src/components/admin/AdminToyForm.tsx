"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { categories } from "@/data/categories";
import { slugify } from "@/lib/slugify";
import {
  FEATURED_TIER_OPTIONS,
  normalizeFeaturedTier,
  resolveFeaturedTier,
  type FeaturedTier,
} from "@/lib/featured-tier";
import type { Audience, CategoryId, Toy } from "@/types/toy";

type ImportPreview = {
  asin: string;
  id?: string;
  affiliateUrl: string;
  name: string;
  blurb: string;
  category: CategoryId;
  audience: Audience;
  ageMin: number;
  ageMax: number;
  image: string;
  images: string[];
  videos?: string[];
  imageAlt: string;
  imageUrl?: string;
  color?: string;
  manualFieldsRequired: boolean;
  usedGrok?: boolean;
  grokWarning?: string;
};

type Props = {
  editing: Toy | null;
  /** Where an edit should be saved — live catalog or review drafts. */
  editSource?: "live" | "review";
  onSaved: () => void;
  onCancelEdit: () => void;
  /** Called after bulk add finishes so the panel can refresh Review drafts. */
  onBulkComplete?: () => void;
};

const emptyForm = {
  name: "",
  blurb: "",
  category: "plush" as CategoryId,
  audience: "all" as Audience,
  ageMin: 3,
  ageMax: 12,
  featuredTier: 0 as FeaturedTier,
  affiliateUrl: "",
  image: "",
  imageAlt: "",
  imageUrl: "",
  /** One video URL/path per line (shown in gallery + Watch feed). */
  videosText: "",
};

const MAX_BULK = 100;

function countUniqueBulkUrls(text: string): number {
  const tokens = text
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  for (const token of tokens) {
    const bare = /^[A-Z0-9]{10}$/i.test(token) ? token.toUpperCase() : null;
    if (bare) {
      seen.add(bare);
      continue;
    }
    try {
      const u = new URL(token);
      const m = u.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
      if (m?.[1]) seen.add(m[1].toUpperCase());
      else {
        const asin = u.searchParams.get("asin");
        if (asin && /^[A-Z0-9]{10}$/i.test(asin)) seen.add(asin.toUpperCase());
      }
    } catch {
      const embedded = token.match(
        /(?:\/(?:dp|gp\/product)\/|asin=)([A-Z0-9]{10})/i,
      );
      if (embedded?.[1]) seen.add(embedded[1].toUpperCase());
    }
  }
  return Math.min(seen.size, MAX_BULK);
}

export function AdminToyForm({
  editing,
  editSource = "live",
  onSaved,
  onCancelEdit,
  onBulkComplete,
}: Props) {
  const [addMode, setAddMode] = useState<"single" | "bulk">("single");
  const [amazonUrl, setAmazonUrl] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [bulkProgress, setBulkProgress] = useState<{
    current: number;
    total: number;
    message: string;
  } | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importedImages, setImportedImages] = useState<string[]>([]);
  const [importedId, setImportedId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [importing, setImporting] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [galleryIndex, setGalleryIndex] = useState(0);

  const bulkCount = useMemo(() => countUniqueBulkUrls(bulkText), [bulkText]);

  useEffect(() => {
    if (editing) {
      setPreview(null);
      setImportedImages([]);
      setImportedId(null);
      setAmazonUrl("");
      setBulkText("");
      setAddMode("single");
      setForm({
        name: editing.name,
        blurb: editing.blurb,
        category: editing.category,
        audience: editing.audience,
        ageMin: editing.ageMin,
        ageMax: editing.ageMax,
        featuredTier: resolveFeaturedTier(editing),
        affiliateUrl: editing.affiliateUrl,
        image: editing.image,
        imageAlt: editing.imageAlt,
        imageUrl: "",
        videosText: (editing.videos ?? []).slice(0, 1).join("\n"),
      });
      setGalleryIndex(0);
    } else {
      setForm(emptyForm);
      setPreview(null);
      setImportedImages([]);
      setImportedId(null);
      setAmazonUrl("");
    }
    setGalleryIndex(0);
    setError("");
  }, [editing]);

  async function handleImport() {
    if (!amazonUrl.trim()) return;
    setImporting(true);
    setError("");
    setGalleryIndex(0);
    try {
      const res = await fetch("/api/admin/amazon-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: amazonUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      const p = data.preview as ImportPreview;
      const gallery =
        Array.isArray(p.images) && p.images.length > 0
          ? p.images
          : p.image
            ? [p.image]
            : [];
      const importedVideos = Array.isArray(p.videos)
        ? p.videos.map((src) => src.trim()).filter(Boolean).slice(0, 1)
        : [];
      const mainImage = (p.image || gallery[0] || "").trim();
      const orderedGallery = mainImage
        ? [mainImage, ...gallery.filter((src) => src !== mainImage)]
        : gallery;
      setPreview(p);
      setImportedImages(orderedGallery);
      setImportedId(p.id ?? null);
      setGalleryIndex(0);
      setForm({
        name: p.name,
        blurb: p.blurb,
        category: p.category || "plush",
        audience: p.audience || "all",
        ageMin: typeof p.ageMin === "number" ? p.ageMin : 3,
        ageMax: typeof p.ageMax === "number" ? p.ageMax : 12,
        featuredTier: 0,
        affiliateUrl: p.affiliateUrl,
        image: mainImage || orderedGallery[0] || "",
        imageAlt: p.imageAlt || p.name,
        // Local gallery paths are already downloaded — no remote imageUrl needed.
        imageUrl: "",
        videosText: importedVideos[0] ?? "",
      });
      if (p.grokWarning) {
        setError(p.grokWarning);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  async function handleBulkAdd() {
    if (!bulkText.trim() || bulkCount === 0) return;
    setBulkBusy(true);
    setError("");
    setBulkProgress({
      current: 0,
      total: bulkCount,
      message: "Starting bulk add…",
    });

    let createdCount = 0;
    let grokNote = "";

    try {
      const res = await fetch("/api/admin/drafts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: bulkText }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Bulk add failed");
      }
      if (!res.body) throw new Error("Bulk stream unavailable");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          let event: {
            type: string;
            current?: number;
            total?: number;
            message?: string;
            name?: string;
            ok?: boolean;
            error?: string;
            result?: {
              generated?: unknown[];
              usedGrok?: boolean;
              grokWarning?: string;
              skippedExisting?: number;
              failed?: number;
            };
          };
          try {
            event = JSON.parse(trimmed) as typeof event;
          } catch {
            continue;
          }

          if (event.type === "stage") {
            setBulkProgress({
              current: event.current ?? 0,
              total: event.total ?? bulkCount,
              message: event.message || "Working…",
            });
          } else if (event.type === "item" && event.ok) {
            createdCount = event.current ?? createdCount + 1;
            setBulkProgress({
              current: createdCount,
              total: event.total ?? bulkCount,
              message: event.name
                ? `Drafted ${event.name}`
                : `Drafted ${createdCount}/${event.total ?? bulkCount}`,
            });
          } else if (event.type === "bulk-done" || event.type === "done") {
            createdCount = Array.isArray(event.result?.generated)
              ? event.result.generated.length
              : createdCount;
            if (event.result?.grokWarning) {
              grokNote = event.result.grokWarning;
            }
            setBulkProgress({
              current: createdCount,
              total: bulkCount,
              message: "Finishing…",
            });
          } else if (event.type === "error") {
            throw new Error(event.error || "Bulk add failed");
          }
        }
      }

      onBulkComplete?.();
      setBulkText("");
      const extra = grokNote ? `\n\n${grokNote}` : "";
      alert(
        createdCount > 0
          ? `Added ${createdCount} draft${createdCount === 1 ? "" : "s"} to Review.${extra}`
          : `No new drafts were created. Amazon may have blocked the pages, or those URLs are already live.${extra}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk add failed");
    } finally {
      setBulkBusy(false);
      setBulkProgress(null);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const cat = categories.find((c) => c.id === form.category);
    const primaryImage = form.image.trim() || "/categories/plush.svg";
    const galleryForSave = (() => {
      if (editing?.images && editing.images.length > 0) {
        return [
          primaryImage,
          ...editing.images.filter((src) => src !== primaryImage),
        ];
      }
      if (!editing && importedImages.length > 0) {
        return [
          primaryImage,
          ...importedImages.filter((src) => src !== primaryImage),
        ];
      }
      if (editing) return [primaryImage];
      return importedImages.length > 0 ? importedImages : [primaryImage];
    })();

    const videos = form.videosText
      .split(/[\n,]+/)
      .map((src) => src.trim())
      .filter(Boolean)
      .slice(0, 1);

    const toy: Toy & { imageUrl?: string } = {
      id:
        editing?.id ??
        importedId ??
        (slugify(form.name) || `toy-${Date.now()}`),
      name: form.name.trim(),
      blurb: form.blurb.trim(),
      category: form.category,
      audience: form.audience,
      ageMin: form.ageMin,
      ageMax: form.ageMax,
      featuredTier: form.featuredTier,
      featured: form.featuredTier > 0,
      affiliateUrl: form.affiliateUrl.trim(),
      image: primaryImage,
      images: galleryForSave,
      imageAlt: form.imageAlt.trim() || form.name.trim(),
      color: preview?.color || cat?.hue || "#B19CD9",
      videos,
    };

    if (form.imageUrl) {
      toy.imageUrl = form.imageUrl;
    }

    try {
      const savingDraft = Boolean(editing && editSource === "review");
      const res = await fetch(
        savingDraft ? "/api/admin/drafts" : "/api/admin/toys",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editing ? { id: editing.id, patch: toy } : toy,
          ),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      setForm(emptyForm);
      setPreview(null);
      setImportedImages([]);
      setImportedId(null);
      setAmazonUrl("");
      onSaved();
      if (editing) onCancelEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const galleryImages = (() => {
    const pool = [
      form.image,
      ...(editing?.images ?? []),
      ...importedImages,
      preview?.image,
      editing?.image,
    ]
      .map((src) => (typeof src === "string" ? src.trim() : ""))
      .filter(Boolean);
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const src of pool) {
      if (seen.has(src)) continue;
      seen.add(src);
      unique.push(src);
    }
    const main = form.image.trim();
    if (!main) return unique;
    return [main, ...unique.filter((src) => src !== main)];
  })();

  const activeImage =
    galleryImages[Math.min(galleryIndex, Math.max(galleryImages.length - 1, 0))] ??
    "";
  const mainImage = form.image.trim();
  const activeIsMain = Boolean(mainImage && activeImage === mainImage);

  return (
    <section id="admin-toy-form" className="admin-panel__section scroll-mt-4 p-4">
      <h3 className="mb-3 font-[family-name:var(--font-display)] text-lg font-bold text-[var(--ink)]">
        {editing
          ? editSource === "review"
            ? "Edit draft"
            : "Edit toy"
          : "Add toy"}
      </h3>

      {!editing && (
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setAddMode("single")}
            aria-pressed={addMode === "single"}
            className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${
              addMode === "single"
                ? "bg-[var(--purple-deep)] text-white"
                : "bg-[var(--lavender)] text-[var(--ink-soft)]"
            }`}
          >
            Single
          </button>
          <button
            type="button"
            onClick={() => setAddMode("bulk")}
            aria-pressed={addMode === "bulk"}
            className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${
              addMode === "bulk"
                ? "bg-[var(--purple-deep)] text-white"
                : "bg-[var(--lavender)] text-[var(--ink-soft)]"
            }`}
          >
            Bulk add
          </button>
        </div>
      )}

      {!editing && addMode === "single" && (
        <div className="mb-4 flex flex-col gap-2">
          <label className="text-sm font-semibold text-[var(--ink)]">
            Amazon affiliate URL
          </label>
          <div className="flex gap-2">
            <input
              value={amazonUrl}
              onChange={(e) => setAmazonUrl(e.target.value)}
              placeholder="https://www.amazon.com/dp/..."
              className="min-w-0 flex-1 rounded-full bg-[var(--lavender)] px-4 py-2.5 text-sm outline-none ring-2 ring-transparent focus:ring-[var(--purple)]"
            />
            <button
              type="button"
              disabled={importing || !amazonUrl.trim()}
              onClick={() => void handleImport()}
              className="shrink-0 rounded-full bg-[var(--purple-deep)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {importing ? "Importing…" : "Import"}
            </button>
          </div>
          <p className="text-xs text-[var(--ink-soft)]">
            Pulls the full photo gallery and fills short name, blurb, category,
            audience, and ages (same style as live products).
          </p>
          {preview?.manualFieldsRequired ? (
            <p className="text-xs text-amber-700">
              Amazon blocked metadata — fill in name and image manually.
            </p>
          ) : null}
          {preview && !preview.manualFieldsRequired ? (
            <p className="text-xs text-[var(--ink-soft)]">
              {importedImages.length} image
              {importedImages.length === 1 ? "" : "s"} ready
              {preview.usedGrok ? " · drafted with Grok" : ""}.
            </p>
          ) : null}
        </div>
      )}

      {!editing && addMode === "bulk" && (
        <div className="mb-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-[var(--ink)]">
              Paste Amazon URLs (up to {MAX_BULK} unique)
            </span>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={8}
              disabled={bulkBusy}
              placeholder={
                "https://www.amazon.com/dp/B0...\nhttps://www.amazon.com/dp/B0...\n(or bare ASINs, one per line)"
              }
              className="rounded-2xl bg-[var(--lavender)] px-4 py-3 text-sm outline-none ring-2 ring-transparent focus:ring-[var(--purple)] disabled:opacity-60"
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[var(--ink-soft)]">
              {bulkCount} unique URL{bulkCount === 1 ? "" : "s"} ready
              {bulkCount >= MAX_BULK ? " (max reached)" : ""}. Grok drafts
              name, blurb, category, audience, and ages per catalog guidelines;
              results land in Review.
            </p>
            <button
              type="button"
              disabled={bulkBusy || bulkCount === 0}
              onClick={() => void handleBulkAdd()}
              className="shrink-0 rounded-full bg-[var(--purple-deep)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {bulkBusy
                ? bulkProgress
                  ? `${bulkProgress.current}/${bulkProgress.total}`
                  : "Working…"
                : `Bulk add${bulkCount > 0 ? ` (${bulkCount})` : ""}`}
            </button>
          </div>
          {bulkProgress ? (
            <div className="rounded-xl bg-[var(--lavender)]/50 px-3 py-2 text-xs font-medium text-[var(--ink-soft)]">
              {bulkProgress.message}
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/70">
                <div
                  className="h-full rounded-full bg-[var(--purple-deep)] transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (bulkProgress.current /
                        Math.max(bulkProgress.total, 1)) *
                        100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>
      )}

      {(preview || editing) && galleryImages.length > 0 ? (
        <div className="mb-4 rounded-xl bg-[var(--lavender)]/40 p-3">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-[var(--ink)]">
                {form.name || "Preview"}
              </p>
              <p className="truncate text-xs text-[var(--ink-soft)]">{form.blurb}</p>
            </div>
            <p className="shrink-0 text-xs font-bold text-[var(--ink-soft)]">
              {galleryIndex + 1}/{galleryImages.length}
            </p>
          </div>

          <div className="relative mb-2 aspect-[4/5] w-full max-w-[16rem] overflow-hidden rounded-xl bg-white sm:max-w-[18rem]">
            <Image
              src={activeImage}
              alt={form.imageAlt || form.name || "Toy image"}
              fill
              className="object-contain"
              sizes="288px"
              unoptimized={activeImage.startsWith("http")}
            />
            {activeIsMain ? (
              <span className="absolute left-2 top-2 rounded-full bg-[var(--purple-deep)] px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-white shadow">
                Main image
              </span>
            ) : null}
          </div>

          {!activeIsMain && activeImage ? (
            <button
              type="button"
              onClick={() => {
                setForm((f) => ({
                  ...f,
                  image: activeImage,
                  imageUrl: activeImage.startsWith("http") ? activeImage : "",
                }));
                setGalleryIndex(0);
              }}
              className="mb-3 rounded-full bg-[var(--purple-deep)] px-3 py-1.5 text-xs font-bold text-white"
            >
              Use as main image
            </button>
          ) : (
            <p className="mb-3 text-xs font-medium text-[var(--ink-soft)]">
              Main product image is first in the gallery. Tap another thumb to
              change it.
            </p>
          )}

          <ul className="flex gap-2 overflow-x-auto pb-1">
            {galleryImages.map((src, index) => {
              const selected = index === galleryIndex;
              const isMain = Boolean(mainImage && src === mainImage);
              return (
                <li key={`${src}-${index}`} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setGalleryIndex(index);
                    }}
                    onDoubleClick={() => {
                      setForm((f) => ({
                        ...f,
                        image: src,
                        imageUrl: src.startsWith("http") ? src : "",
                      }));
                      setGalleryIndex(0);
                    }}
                    aria-label={
                      isMain
                        ? `Main image ${index + 1}`
                        : `Show image ${index + 1}`
                    }
                    aria-pressed={selected}
                    className={`relative h-16 w-16 overflow-hidden rounded-lg bg-white ring-2 transition ${
                      selected
                        ? "ring-[var(--purple)]"
                        : "ring-transparent hover:ring-[var(--purple)]/35"
                    }`}
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      className="object-contain"
                      sizes="64px"
                      unoptimized={src.startsWith("http")}
                    />
                  </button>
                  {isMain ? (
                    <span className="pointer-events-none absolute -bottom-0.5 left-1/2 z-[1] -translate-x-1/2 rounded-full bg-[var(--purple-deep)] px-1.5 py-0.5 text-[0.55rem] font-bold uppercase text-white">
                      Main
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {addMode === "single" || editing ? (
        <form onSubmit={(e) => void handleSave(e)} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Name</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="rounded-full bg-[var(--lavender)] px-4 py-2.5 text-sm outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Blurb (~8 words)</span>
            <input
              required
              value={form.blurb}
              onChange={(e) => setForm((f) => ({ ...f, blurb: e.target.value }))}
              className="rounded-full bg-[var(--lavender)] px-4 py-2.5 text-sm outline-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Category</span>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value as CategoryId }))
                }
                className="admin-select"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Audience</span>
              <select
                value={form.audience}
                onChange={(e) =>
                  setForm((f) => ({ ...f, audience: e.target.value as Audience }))
                }
                className="admin-select"
              >
                <option value="all">All</option>
                <option value="boys">Boys</option>
                <option value="girls">Girls</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Age min</span>
              <input
                type="number"
                min={0}
                max={18}
                value={form.ageMin}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ageMin: Number(e.target.value) }))
                }
                className="rounded-full bg-[var(--lavender)] px-4 py-2.5 text-sm outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Age max</span>
              <input
                type="number"
                min={0}
                max={18}
                value={form.ageMax}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ageMax: Number(e.target.value) }))
                }
                className="rounded-full bg-[var(--lavender)] px-4 py-2.5 text-sm outline-none"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Featured tier</span>
            <select
              value={form.featuredTier}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  featuredTier: normalizeFeaturedTier(Number(e.target.value)),
                }))
              }
              className="admin-select"
            >
              {FEATURED_TIER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — {opt.hint}
                </option>
              ))}
            </select>
            <span className="text-xs text-[var(--ink-soft)]">
              Higher tiers are shuffled into view more often in browse and pile.
            </span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Affiliate URL</span>
            <input
              required
              value={form.affiliateUrl}
              onChange={(e) => setForm((f) => ({ ...f, affiliateUrl: e.target.value }))}
              className="rounded-full bg-[var(--lavender)] px-4 py-2.5 text-sm outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Image URL or path</span>
            <input
              value={form.imageUrl || form.image}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  image: e.target.value,
                  imageUrl: e.target.value.startsWith("http") ? e.target.value : "",
                }))
              }
              placeholder="/toys/my-toy.jpg or https://..."
              className="rounded-full bg-[var(--lavender)] px-4 py-2.5 text-sm outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Video link</span>
            <input
              value={form.videosText}
              onChange={(e) =>
                setForm((f) => ({ ...f, videosText: e.target.value }))
              }
              placeholder="https://…/clip.mp4 or /videos/clip.mp4"
              className="rounded-full bg-[var(--lavender)] px-4 py-2.5 text-sm outline-none"
            />
            <span className="text-xs text-[var(--ink-soft)]">
              One primary video. Amazon import fills this when the listing has
              gallery video. Shown in the toy selector and Watch feed.
            </span>
          </label>

          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

          <div className="flex gap-2">
            {editing ? (
              <button
                type="button"
                onClick={onCancelEdit}
                className="flex-1 rounded-full bg-[var(--lavender)] py-3 text-sm font-bold text-[var(--ink-soft)]"
              >
                Cancel edit
              </button>
            ) : null}
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-full bg-[image:var(--header-grad-alt)] py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving
                ? "Saving…"
                : editing
                  ? editSource === "review"
                    ? "Update draft"
                    : "Update toy"
                  : "Save toy"}
            </button>
          </div>
        </form>
      ) : error ? (
        <p className="text-sm font-medium text-red-600">{error}</p>
      ) : null}
    </section>
  );
}
