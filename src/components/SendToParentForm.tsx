"use client";

import { useState, type FormEvent } from "react";
import type { Toy } from "@/types/toy";
import { downloadKartPdf } from "@/lib/pdf";
import { pingMetrics } from "@/lib/metrics-client";

type Props = {
  toys: Toy[];
  onSent?: () => void;
};

export function SendToParentForm({ toys, onSent }: Props) {
  const [kidName, setKidName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (toys.length === 0) return;

    setStatus("sending");
    setMessage("");

    try {
      const res = await fetch("/api/send-kart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kidName,
          parentEmail,
          toyIds: toys.map((t) => t.id),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        demo?: boolean;
      };

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not send");
      }

      downloadKartPdf(toys, kidName);
      pingMetrics("kart_email");
      setStatus("ok");
      setMessage(
        data.demo
          ? "PDF saved! Email needs RESEND_API_KEY to go out for real."
          : "Sent! Mom or Dad will get the PDF by email.",
      );
      onSent?.();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="shelf-panel shelf-panel--soft"
    >
      <div className="shelf-panel__surface flex flex-col gap-4 p-5">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--ink)]">
          Send to Mom or Dad
        </h2>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">
          They get a PDF with every toy and buy links.
        </p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-[var(--ink)]">Your name</span>
        <input
          required
          value={kidName}
          onChange={(e) => setKidName(e.target.value)}
          placeholder="Alex"
          className="rounded-full border-0 bg-[var(--lavender)] px-4 py-3 text-base text-[var(--ink)] outline-none ring-2 ring-transparent transition focus:ring-[var(--purple)]"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-[var(--ink)]">
          Parent email
        </span>
        <input
          required
          type="email"
          inputMode="email"
          autoComplete="email"
          value={parentEmail}
          onChange={(e) => setParentEmail(e.target.value)}
          placeholder="parent@email.com"
          className="rounded-full border-0 bg-[var(--lavender)] px-4 py-3 text-base text-[var(--ink)] outline-none ring-2 ring-transparent transition focus:ring-[var(--purple)]"
        />
      </label>

      <button
        type="submit"
        disabled={status === "sending" || toys.length === 0}
        className="rounded-full bg-[image:var(--header-grad-alt)] px-5 py-3.5 text-base font-bold text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
      >
        {status === "sending" ? "Sending…" : "Send Kart PDF"}
      </button>

      {message && (
        <p
          className={`text-sm font-medium ${
            status === "error" ? "text-red-600" : "text-[var(--blue-deep)]"
          }`}
          role="status"
        >
          {message}
        </p>
      )}
      </div>
    </form>
  );
}
