"use client";

import { useEffect, useRef, useState } from "react";
import { readJsonResponse } from "@/lib/read-json-response";
import { PinKeypad } from "./PinKeypad";

type PinRecord = {
  id: string;
  label: string;
  pin?: string;
  createdAt: string;
};

type Props = {
  pins: PinRecord[];
  onRefresh: () => void;
};

export function AdminPinManager({ pins, onRefresh }: Props) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [entry, setEntry] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const firstPinRef = useRef("");
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function toggleReveal(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function removePin(id: string) {
    if (!confirm("Remove this admin PIN?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/pins?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Could not remove PIN");
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveNewPin(pin: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, label: "Admin" }),
      });
      const data = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Could not add PIN");
      setAdding(false);
      setEntry("");
      setFirstPin("");
      firstPinRef.current = "";
      setStep("enter");
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add failed");
      setEntry("");
      setFirstPin("");
      firstPinRef.current = "";
      setStep("enter");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!adding || entry.length !== 4 || busy) return;

    if (step === "enter") {
      firstPinRef.current = entry;
      setFirstPin(entry);
      setStep("confirm");
      setEntry("");
      return;
    }

    if (entry !== firstPinRef.current) {
      setError("PINs did not match");
      setStep("enter");
      firstPinRef.current = "";
      setFirstPin("");
      setEntry("");
      return;
    }

    void saveNewPin(entry);
  }, [adding, entry, step, busy]);

  return (
    <section className="admin-panel__section p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--ink)]">
          Admin PINs
        </h3>
        {!adding && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setAdding(true);
              setEntry("");
              setFirstPin("");
              firstPinRef.current = "";
              setStep("enter");
              setError("");
            }}
            className="rounded-full bg-[var(--lavender)] px-3 py-1.5 text-sm font-bold text-[var(--purple-deep)]"
          >
            Add PIN
          </button>
        )}
      </div>

      {adding ? (
        <div className="rounded-2xl bg-[var(--lavender)]/50 p-4">
          <p className="mb-3 text-center text-sm font-semibold text-[var(--ink)]">
            {step === "enter" ? "Enter new 4-digit PIN" : "Confirm PIN"}
          </p>
          <div className="mb-4 flex items-center justify-center gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <span
                key={i}
                className={`h-3 w-3 rounded-full ${i < entry.length ? "bg-[var(--purple-deep)]" : "bg-white"}`}
              />
            ))}
          </div>
          {error ? <p className="mb-2 text-center text-sm text-red-600">{error}</p> : null}
          <PinKeypad
            disabled={busy}
            onDigit={(digit) => setEntry((prev) => (prev.length >= 4 ? prev : prev + digit))}
            onDelete={() => setEntry((prev) => prev.slice(0, -1))}
          />
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="mt-3 w-full text-sm font-semibold text-[var(--ink-soft)]"
          >
            Cancel
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {pins.map((pin) => (
            <li
              key={pin.id}
              className="flex items-center gap-3 rounded-xl bg-[var(--lavender)]/40 px-3 py-2.5"
            >
              <button
                type="button"
                onClick={() => toggleReveal(pin.id)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="text-sm font-semibold text-[var(--ink)]">{pin.label}</p>
                <p className="font-mono text-base tracking-[0.35em] text-[var(--purple-deep)]">
                  {revealed.has(pin.id) ? pin.pin ?? "????" : "****"}
                </p>
              </button>
              <button
                type="button"
                disabled={busy || pins.length <= 1}
                onClick={() => void removePin(pin.id)}
                className="rounded-full px-2.5 py-1 text-xs font-bold text-red-600 disabled:opacity-40"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export type { PinRecord };
