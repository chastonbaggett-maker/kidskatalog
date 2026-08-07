"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AdminMetrics, type MetricsSummary } from "./AdminMetrics";
import { AdminPinManager, type PinRecord } from "./AdminPinManager";
import { AdminToyForm } from "./AdminToyForm";
import { AdminToyList } from "./AdminToyList";
import type { Toy } from "@/types/toy";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AdminPanel({ open, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [toys, setToys] = useState<Toy[]>([]);
  const [pins, setPins] = useState<PinRecord[]>([]);
  const [editing, setEditing] = useState<Toy | null>(null);
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  const refresh = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const [metricsRes, toysRes, pinsRes] = await Promise.all([
        fetch("/api/admin/metrics"),
        fetch("/api/admin/toys"),
        fetch("/api/admin/pins"),
      ]);

      if (metricsRes.ok) {
        setMetrics((await metricsRes.json()) as MetricsSummary);
      }
      if (toysRes.ok) {
        const data = (await toysRes.json()) as { toys: Toy[] };
        setToys(data.toys);
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

  async function handleDelete(id: string) {
    if (!confirm("Delete this toy from the catalog?")) return;
    setDeleteBusyId(id);
    try {
      const res = await fetch(`/api/admin/toys?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      if (editing?.id === id) setEditing(null);
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteBusyId(null);
    }
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div className="admin-panel fixed inset-0 z-[190] flex flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-black/5 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
            Hidden admin
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--ink)]">
            KidsKatalog
          </h2>
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
          onSaved={() => void refresh()}
          onCancelEdit={() => setEditing(null)}
        />
        <AdminToyList
          toys={toys}
          onEdit={setEditing}
          onDelete={(id) => void handleDelete(id)}
          busyId={deleteBusyId}
          editingId={editing?.id ?? null}
        />
        <AdminPinManager pins={pins} onRefresh={() => void refresh()} />
      </div>
    </div>,
    document.body,
  );
}
