"use client";

import { useState } from "react";
import { useKartStore } from "@/lib/kart-store";

type Handoff = {
  code: string;
  url: string;
  svg: string;
};

export function GrownupHandoff() {
  const ids = useKartStore((s) => s.ids);
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function showGrownup() {
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/kids/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toyIds: ids }),
      });
      const data = (await res.json()) as Handoff & { error?: string };
      if (!res.ok || !data.code || !data.url || !data.svg) {
        throw new Error(data.error || "Could not make a code");
      }
      setHandoff({ code: data.code, url: data.url, svg: data.svg });
    } catch (err) {
      setHandoff(null);
      setError(err instanceof Error ? err.message : "Could not make a code");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="shelf-panel shelf-panel--soft" data-testid="grownup-handoff">
      <div className="shelf-panel__surface flex flex-col gap-4 p-5">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--ink)]">
            Show a grown-up
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            A short code for a grown-up. Your Kart stays on this device.
          </p>
        </div>
        <button
          type="button"
          data-testid="show-grownup"
          onClick={() => void showGrownup()}
          disabled={pending || ids.length === 0}
          className="inline-flex items-center justify-center rounded-full bg-[var(--blue)] px-5 py-3.5 text-base font-bold text-white shadow-md transition active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? "Making a code…" : "Show a grown-up"}
        </button>
        {error ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {handoff ? (
          <div className="flex flex-col items-center gap-3" data-testid="handoff-result">
            <p
              className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-[0.2em] text-[var(--ink)]"
              data-testid="handoff-code"
            >
              {handoff.code}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt=""
              width={220}
              height={220}
              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(handoff.svg)}`}
            />
            <a
              href={handoff.url}
              data-testid="handoff-link"
              className="break-all text-center text-sm font-bold text-[var(--blue-deep)]"
            >
              {handoff.url}
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
