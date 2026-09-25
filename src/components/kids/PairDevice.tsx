"use client";

import { useState } from "react";
import { KID_TRY_AGAIN, readKidJson } from "@/lib/kid-fetch";
import { useKartStore } from "@/lib/kart-store";

export function PairDevice({ token }: { token: string }) {
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function connect() {
    setStatus("saving");
    setMessage("");
    try {
      const res = await fetch("/api/kids/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const parsed = await readKidJson<{ paired?: boolean }>(res);
      if (!parsed.ok || !parsed.data.paired) {
        setStatus("error");
        setMessage(KID_TRY_AGAIN);
        return;
      }
      const ids = useKartStore.getState().ids;
      const kart = await fetch("/api/kids/kart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toyIds: ids }),
      });
      await readKidJson(kart);
      setStatus("done");
    } catch {
      setStatus("error");
      setMessage(KID_TRY_AGAIN);
    }
  }

  return (
    <div className="shelf-page star-field flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="page-scroll star-field min-h-0 flex-1 px-4 py-8">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--ink)]">
            Connect this device
          </h1>
          <p className="text-base text-[var(--ink-soft)]">
            Toys you add or remove will show up on a grown-up&apos;s list. We
            don&apos;t ask for a name or email.
          </p>
          {status === "done" ? (
            <p className="text-base font-bold text-[var(--ink)]" data-testid="pair-done">
              This device is connected.
            </p>
          ) : (
            <button
              type="button"
              data-testid="pair-connect"
              onClick={() => void connect()}
              disabled={status === "saving"}
              className="inline-flex items-center justify-center rounded-full bg-[var(--blue)] px-5 py-3.5 text-base font-bold text-white"
            >
              {status === "saving" ? "Connecting…" : "Connect"}
            </button>
          )}
          {message ? (
            <p className="text-sm font-medium text-red-600" role="alert">
              {message}
            </p>
          ) : null}
          <a href="/shop" className="text-sm font-bold text-[var(--blue-deep)]">
            Back to toys
          </a>
        </div>
      </div>
    </div>
  );
}
