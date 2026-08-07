"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { categories } from "@/data/categories";
import { slugify } from "@/lib/slugify";
import type { Audience, CategoryId, Toy } from "@/types/toy";

type ImportPreview = {
  asin: string;
  affiliateUrl: string;
  name: string;
  blurb: string;
  image: string;
  imageAlt: string;
  imageUrl?: string;
  manualFieldsRequired: boolean;
};

type Props = {
  editing: Toy | null;
  onSaved: () => void;
  onCancelEdit: () => void;
};

const emptyForm = {
  name: "",
  blurb: "",
  category: "plush" as CategoryId,
  audience: "all" as Audience,
  ageMin: 3,
  ageMax: 12,
  affiliateUrl: "",
  image: "",
  imageAlt: "",
  imageUrl: "",
};

export function AdminToyForm({ editing, onSaved, onCancelEdit }: Props) {
  const [amazonUrl, setAmazonUrl] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editing) {
      setPreview(null);
      setAmazonUrl("");
      setForm({
        name: editing.name,
        blurb: editing.blurb,
        category: editing.category,
        audience: editing.audience,
        ageMin: editing.ageMin,
        ageMax: editing.ageMax,
        affiliateUrl: editing.affiliateUrl,
        image: editing.image,
        imageAlt: editing.imageAlt,
        imageUrl: "",
      });
    } else {
      setForm(emptyForm);
      setPreview(null);
      setAmazonUrl("");
    }
    setError("");
  }, [editing]);

  async function handleImport() {
    if (!amazonUrl.trim()) return;
    setImporting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/amazon-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: amazonUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      const p = data.preview as ImportPreview;
      setPreview(p);
      setForm((f) => ({
        ...f,
        name: p.name,
        blurb: p.blurb,
        affiliateUrl: p.affiliateUrl,
        image: p.image,
        imageAlt: p.imageAlt,
        imageUrl: p.imageUrl ?? "",
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const cat = categories.find((c) => c.id === form.category);
    const toy: Toy & { imageUrl?: string } = {
      id: editing?.id ?? (slugify(form.name) || `toy-${Date.now()}`),
      name: form.name.trim(),
      blurb: form.blurb.trim(),
      category: form.category,
      audience: form.audience,
      ageMin: form.ageMin,
      ageMax: form.ageMax,
      affiliateUrl: form.affiliateUrl.trim(),
      image: form.image.trim() || "/categories/plush.svg",
      imageAlt: form.imageAlt.trim() || form.name.trim(),
      color: cat?.hue ?? "#B19CD9",
    };

    if (form.imageUrl) {
      toy.imageUrl = form.imageUrl;
    }

    try {
      const res = await fetch("/api/admin/toys", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editing ? { id: editing.id, patch: toy } : toy,
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      setForm(emptyForm);
      setPreview(null);
      setAmazonUrl("");
      onSaved();
      if (editing) onCancelEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const previewImage = form.image || preview?.image;

  return (
    <section id="admin-toy-form" className="admin-panel__section scroll-mt-4 p-4">
      <h3 className="mb-3 font-[family-name:var(--font-display)] text-lg font-bold text-[var(--ink)]">
        {editing ? "Edit toy" : "Add toy"}
      </h3>

      {!editing && (
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
              {importing ? "…" : "Import"}
            </button>
          </div>
          {preview?.manualFieldsRequired ? (
            <p className="text-xs text-amber-700">
              Amazon blocked metadata — fill in name and image manually.
            </p>
          ) : null}
        </div>
      )}

      {(preview || editing) && previewImage ? (
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-[var(--lavender)]/40 p-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
            <Image
              src={previewImage}
              alt={form.imageAlt || form.name}
              fill
              className="object-cover"
              sizes="64px"
              unoptimized={previewImage.startsWith("http")}
            />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-[var(--ink)]">
              {form.name || "Preview"}
            </p>
            <p className="truncate text-xs text-[var(--ink-soft)]">{form.blurb}</p>
          </div>
        </div>
      ) : null}

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
              className="rounded-full bg-[var(--lavender)] px-3 py-2.5 text-sm outline-none"
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
              className="rounded-full bg-[var(--lavender)] px-3 py-2.5 text-sm outline-none"
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
            {saving ? "Saving…" : editing ? "Update toy" : "Save toy"}
          </button>
        </div>
      </form>
    </section>
  );
}
