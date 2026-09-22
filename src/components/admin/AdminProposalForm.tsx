"use client";

import { useId, useState } from "react";
import { categories } from "@/data/categories";
import type { CategoryId } from "@/types/toy";

type Props = {
  onIngested: () => void;
};

export function AdminProposalForm({ onIngested }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const [name, setName] = useState("");
  const [blurb, setBlurb] = useState("");
  const [category, setCategory] = useState<CategoryId | "">("");
  const [age, setAge] = useState("3-13");
  const [images, setImages] = useState("");
  const [amazon, setAmazon] = useState("");
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [sourceNotes, setSourceNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/toy-proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "admin-form",
          name,
          blurb,
          category: category || undefined,
          age,
          images,
          amazon_url: amazon,
          affiliate_url: affiliateUrl,
          notes: sourceNotes,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        errors?: Array<{ error: string }>;
        count?: number;
      };
      if (!res.ok) {
        throw new Error(
          data.error || data.errors?.[0]?.error || "Ingest failed",
        );
      }
      setName("");
      setBlurb("");
      setImages("");
      setAmazon("");
      setAffiliateUrl("");
      setSourceNotes("");
      onIngested();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ingest failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-panel__section p-4">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--ink)]">
          Ingest proposal
        </h3>
        <span
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--lavender)] text-[var(--ink-soft)] transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      {open ? (
        <div id={panelId}>
          <p className="mb-3 mt-1 text-xs font-semibold text-[var(--ink-soft)]">
            Drops a card into the queue as pending. Approve stages it. Submit
            Approval is the only publish.
          </p>
          <form className="flex flex-col gap-2.5" onSubmit={(e) => void handleSubmit(e)}>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="rounded-full bg-[var(--lavender)] px-4 py-2.5 text-sm outline-none"
        />
        <input
          value={blurb}
          onChange={(e) => setBlurb(e.target.value)}
          placeholder="Blurb"
          className="rounded-full bg-[var(--lavender)] px-4 py-2.5 text-sm outline-none"
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CategoryId | "")}
            className="admin-select text-sm font-semibold"
          >
            <option value="">Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
          <input
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="Age (8-12)"
            className="min-w-[8rem] flex-1 rounded-full bg-[var(--lavender)] px-4 py-2.5 text-sm outline-none"
          />
        </div>
        <input
          required
          value={amazon}
          onChange={(e) => setAmazon(e.target.value)}
          placeholder="Amazon ASIN or URL"
          className="rounded-full bg-[var(--lavender)] px-4 py-2.5 text-sm outline-none"
        />
        <input
          value={affiliateUrl}
          onChange={(e) => setAffiliateUrl(e.target.value)}
          placeholder="Proposed affiliate link (optional)"
          className="rounded-full bg-[var(--lavender)] px-4 py-2.5 text-sm outline-none"
        />
        <textarea
          value={images}
          onChange={(e) => setImages(e.target.value)}
          placeholder="Image URLs, one per line"
          rows={3}
          className="rounded-2xl bg-[var(--lavender)] px-4 py-2.5 text-sm outline-none"
        />
        <textarea
          value={sourceNotes}
          onChange={(e) => setSourceNotes(e.target.value)}
          placeholder="Source notes"
          rows={2}
          className="rounded-2xl bg-[var(--lavender)] px-4 py-2.5 text-sm outline-none"
        />
        {error ? (
          <p className="text-xs font-semibold text-red-600">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={busy || !name.trim() || !amazon.trim()}
          className="rounded-full bg-[var(--purple-deep)] py-2.5 text-sm font-bold text-white disabled:opacity-40"
        >
          {busy ? "Dropping…" : "Drop in queue"}
          </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
