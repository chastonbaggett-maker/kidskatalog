"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AdminProposalForm } from "@/components/admin/AdminProposalForm";
import {
  isActiveQueueDraft,
  normalizeQueueStatus,
  type QueueStatus,
} from "@/lib/queue-status";
import type { DraftToy } from "@/types/toy";

const TABS: Array<{ id: QueueStatus; label: string }> = [
  { id: "pending", label: "Pending" },
  { id: "staged", label: "Staged" },
  { id: "published", label: "Published" },
  { id: "rejected", label: "Rejected" },
];

type ProposalRow = DraftToy & {
  status?: QueueStatus;
  notes?: string;
  source?: string;
  source_ref?: string;
};

export function AdminToysClient() {
  const router = useRouter();
  const [tab, setTab] = useState<QueueStatus>("pending");
  const [all, setAll] = useState<ProposalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/toy-proposals");
      if (res.status === 401) {
        router.replace("/admin?next=/admin/toys");
        return;
      }
      if (!res.ok) throw new Error("Could not load proposals");
      const data = (await res.json()) as { proposals?: ProposalRow[] };
      setAll(Array.isArray(data.proposals) ? data.proposals : []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load proposals");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const counts = {
    pending: all.filter((d) => normalizeQueueStatus(d.reviewStatus) === "pending").length,
    staged: all.filter((d) => normalizeQueueStatus(d.reviewStatus) === "staged").length,
    published: all.filter((d) => normalizeQueueStatus(d.reviewStatus) === "published").length,
    rejected: all.filter((d) => normalizeQueueStatus(d.reviewStatus) === "rejected").length,
  };
  const items = all.filter((d) => normalizeQueueStatus(d.reviewStatus) === tab);
  const stagedCount = counts.staged;

  async function handleApprove(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(
        `/api/admin/toy-proposals/${encodeURIComponent(id)}/approve`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approve failed");
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    if (!confirm("Reject this proposal? It is dropped from the queue and kept in Rejected.")) {
      return;
    }
    setBusyId(id);
    try {
      const res = await fetch(
        `/api/admin/toy-proposals/${encodeURIComponent(id)}/reject`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reject failed");
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSubmitApproval() {
    if (stagedCount === 0) {
      alert("Approve at least one card first. Submit Approval publishes staged cards only.");
      return;
    }
    if (
      !confirm(
        `Submit Approval for ${stagedCount} staged card${stagedCount === 1 ? "" : "s"}? This publishes to the live shop and Parent Mode.`,
      )
    ) {
      return;
    }
    setPublishing(true);
    try {
      const res = await fetch("/api/admin/toy-proposals/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submit Approval failed");
      await refresh();
      const n = typeof data.count === "number" ? data.count : 0;
      const skipped = Array.isArray(data.skipped) ? data.skipped.length : 0;
      alert(
        skipped > 0
          ? `Published ${n}. ${skipped} skipped.`
          : `Published ${n} toy${n === 1 ? "" : "s"} to the live shop.`,
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Submit Approval failed");
    } finally {
      setPublishing(false);
    }
  }

  async function handleLock() {
    await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.replace("/admin");
  }

  return (
    <div className="admin-panel flex min-h-0 flex-1 flex-col bg-white">
      <header className="flex shrink-0 items-end justify-between border-b border-black/5 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
            Toy approval queue
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--ink)]">
            /admin/toys
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-full bg-[var(--lavender)] px-3 py-2 text-sm font-bold text-[var(--purple-deep)]"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void handleLock()}
            className="rounded-full bg-[var(--purple-deep)] px-3 py-2 text-sm font-bold text-white"
          >
            Lock
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 pb-28">
        <p className="text-sm font-semibold text-[var(--ink-soft)]">
          Approve stages. Reject drops (kept in Rejected). Submit Approval is the
          only publish.
        </p>
        <AdminProposalForm onIngested={() => void refresh()} />

        <div
          className="inline-flex flex-wrap rounded-full bg-[var(--lavender)]/50 p-1"
          role="tablist"
          aria-label="Proposal status"
        >
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition ${
                tab === item.id
                  ? "bg-white text-[var(--ink)] shadow-sm"
                  : "text-[var(--ink-soft)]"
              }`}
            >
              {item.label} ({counts[item.id]})
            </button>
          ))}
        </div>

        {error ? (
          <p className="text-sm font-semibold text-red-600">{error}</p>
        ) : null}

        {loading ? (
          <p className="text-sm font-semibold text-[var(--ink-soft)]">Loading…</p>
        ) : items.length === 0 ? (
          <p className="rounded-xl bg-[var(--lavender)]/25 px-4 py-8 text-center text-sm text-[var(--ink-soft)]">
            No {tab} cards.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((toy) => {
              const status = normalizeQueueStatus(toy.reviewStatus);
              const pending = status === "pending";
              const active = isActiveQueueDraft(toy);
              return (
                <li
                  key={toy.id}
                  className="flex items-center gap-3 rounded-xl bg-[var(--lavender)]/35 p-2"
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
                      {status} · {toy.category} · ages {toy.ageMin}–{toy.ageMax}
                      {toy.asin ? ` · ${toy.asin}` : ""}
                      {toy.source ? ` · ${toy.source}` : ""}
                    </p>
                    {toy.notes ? (
                      <p className="truncate text-xs text-[var(--ink-soft)]">{toy.notes}</p>
                    ) : null}
                  </div>
                  {active ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        disabled={!pending || busyId === toy.id}
                        onClick={() => void handleApprove(toy.id)}
                        className="rounded-full bg-[var(--mint)] px-2.5 py-1 text-xs font-bold text-white disabled:opacity-40"
                      >
                        {status === "staged"
                          ? "Staged"
                          : busyId === toy.id
                            ? "…"
                            : "Approve"}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === toy.id}
                        onClick={() => void handleReject(toy.id)}
                        className="rounded-full px-2.5 py-1 text-xs font-bold text-red-600 disabled:opacity-40"
                      >
                        {busyId === toy.id ? "…" : "Reject"}
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="sticky bottom-0 z-10 shrink-0 border-t border-black/5 bg-white/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          disabled={publishing || stagedCount === 0}
          onClick={() => void handleSubmitApproval()}
          data-testid="submit-approval"
          className="w-full rounded-full bg-[var(--mint)] px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
        >
          {publishing ? "Submitting…" : `Submit Approval (${stagedCount})`}
        </button>
      </div>
    </div>
  );
}
