"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AdminMetrics, type MetricsSummary } from "./AdminMetrics";
import { AdminPinManager, type PinRecord } from "./AdminPinManager";
import { AdminToyForm } from "./AdminToyForm";
import { AdminToyList } from "./AdminToyList";
import type { GenerateListingsOptions } from "@/lib/generate-options";
import type { DraftToy, Toy } from "@/types/toy";

type Props = {
  open: boolean;
  onClose: () => void;
};

type EditSource = "live" | "review";

export function AdminPanel({ open, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [toys, setToys] = useState<Toy[]>([]);
  const [drafts, setDrafts] = useState<DraftToy[]>([]);
  const [pins, setPins] = useState<PinRecord[]>([]);
  const [editing, setEditing] = useState<Toy | null>(null);
  const [editSource, setEditSource] = useState<EditSource>("live");
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState<{
    current: number;
    total: number;
    message: string;
  } | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => setMounted(true), []);

  const refresh = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const [metricsRes, toysRes, draftsRes, pinsRes] = await Promise.all([
        fetch("/api/admin/metrics"),
        fetch("/api/admin/toys"),
        fetch("/api/admin/drafts"),
        fetch("/api/admin/pins"),
      ]);

      if (metricsRes.ok) {
        setMetrics((await metricsRes.json()) as MetricsSummary);
      }
      if (toysRes.ok) {
        const data = (await toysRes.json()) as { toys: Toy[] };
        setToys(data.toys);
      }
      if (draftsRes.ok) {
        const data = (await draftsRes.json()) as { drafts: DraftToy[] };
        setDrafts(data.drafts);
      }
      if (pinsRes.ok) {
        const data = (await pinsRes.json()) as { pins: PinRecord[] };
        setPins(data.pins);
      }
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open, refresh]);

  async function clearAdminSession() {
    await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
  }

  async function handleLock() {
    await clearAdminSession();
    onClose();
  }

  async function handleClose() {
    await clearAdminSession();
    onClose();
  }

  function handleEdit(toy: Toy, source: EditSource) {
    setEditSource(source);
    setEditing(toy);
  }

  async function handleDelete(id: string, source: EditSource) {
    const label = source === "review" ? "draft" : "toy from the catalog";
    if (!confirm(`Delete this ${label}?`)) return;
    setDeleteBusyId(id);
    try {
      const url =
        source === "review"
          ? `/api/admin/drafts?id=${encodeURIComponent(id)}`
          : `/api/admin/toys?id=${encodeURIComponent(id)}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      if (editing?.id === id) {
        setEditing(null);
        setEditSource("live");
      }
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteBusyId(null);
    }
  }

  async function handleGenerate(options: GenerateListingsOptions) {
    const total = options.count || 10;
    setGenerating(true);
    setGenerateProgress({
      current: 0,
      total,
      message: "Starting…",
    });

    let createdCount = 0;
    try {
      const res = await fetch("/api/admin/drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Generate failed");
      }
      if (!res.body) throw new Error("Generate stream unavailable");

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
            result?: { generated?: unknown[] };
          };
          try {
            event = JSON.parse(trimmed) as typeof event;
          } catch {
            continue;
          }

          if (event.type === "stage") {
            setGenerateProgress({
              current: event.current ?? 0,
              total: event.total ?? total,
              message: event.message || "Working…",
            });
          } else if (event.type === "item" && event.ok) {
            createdCount = event.current ?? createdCount + 1;
            setGenerateProgress({
              current: createdCount,
              total: event.total ?? total,
              message: event.name
                ? `Imported ${event.name}`
                : `Imported ${createdCount}/${event.total ?? total}`,
            });
          } else if (event.type === "done") {
            createdCount = Array.isArray(event.result?.generated)
              ? event.result.generated.length
              : createdCount;
            setGenerateProgress({
              current: createdCount,
              total,
              message: "Finishing…",
            });
          } else if (event.type === "error") {
            throw new Error(event.error || "Generate failed");
          }
        }
      }

      await refresh();
      alert(
        createdCount > 0
          ? `Created ${createdCount} draft listing${createdCount === 1 ? "" : "s"} in Review.`
          : "No new drafts were created. Amazon may have blocked the search — try again.",
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setGenerating(false);
      setGenerateProgress(null);
    }
  }

  async function handlePublish(ids: string[]) {
    if (ids.length === 0) return;
    if (
      !confirm(
        `Publish ${ids.length} draft${ids.length === 1 ? "" : "s"} to the live shop?`,
      )
    ) {
      return;
    }
    setPublishing(true);
    try {
      const res = await fetch("/api/admin/drafts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Publish failed");
      await refresh();
      const n = typeof data.count === "number" ? data.count : 0;
      const conflicts = Array.isArray(data.conflicts) ? data.conflicts.length : 0;
      alert(
        conflicts > 0
          ? `Published ${n}. ${conflicts} skipped (id conflict).`
          : `Published ${n} toy${n === 1 ? "" : "s"} to the live shop.`,
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div className="admin-panel fixed inset-0 z-[190] flex flex-col">
      <header className="flex shrink-0 items-end justify-between border-b border-black/5 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] min-h-[5.75rem] sm:min-h-0 sm:items-center sm:py-3 sm:pt-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
            Hidden admin
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--ink)]">
            KidsKatalog
          </h2>
        </div>
        <div className="flex gap-2 pb-0.5 sm:pb-0">
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
            className="rounded-full bg-[var(--lavender)] px-3 py-2 text-sm font-bold text-[var(--ink-soft)]"
          >
            Lock
          </button>
          <button
            type="button"
            onClick={() => void handleClose()}
            className="rounded-full bg-[var(--purple-deep)] px-3 py-2 text-sm font-bold text-white"
          >
            Close
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 pb-24">
        <AdminMetrics metrics={metrics} loading={metricsLoading} />
        <AdminToyForm
          editing={editing}
          editSource={editSource}
          onSaved={() => void refresh()}
          onCancelEdit={() => {
            setEditing(null);
            setEditSource("live");
          }}
        />
        <AdminToyList
          toys={toys}
          drafts={drafts}
          onEdit={handleEdit}
          onDelete={(id, source) => void handleDelete(id, source)}
          onGenerate={(options) => void handleGenerate(options)}
          onPublish={(ids) => void handlePublish(ids)}
          generating={generating}
          generateProgress={generateProgress}
          publishing={publishing}
          busyId={deleteBusyId}
          editingId={editing?.id ?? null}
        />
        <AdminPinManager pins={pins} onRefresh={() => void refresh()} />
      </div>
    </div>,
    document.body,
  );
}
