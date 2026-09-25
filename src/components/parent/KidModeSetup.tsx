"use client";

import { useEffect, useState } from "react";

type Device = {
  id: string;
  pairedAt: string;
  listId: string;
};

type Setup = {
  url: string;
  svg: string;
  token: string;
};

export function KidModeSetup() {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function refresh() {
    const res = await fetch("/api/parent/devices");
    if (!res.ok) return;
    const data = (await res.json()) as { devices?: Device[] };
    setDevices(data.devices ?? []);
  }

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 4000);
    return () => window.clearInterval(timer);
  }, []);

  async function createLink() {
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/parent/pair-token", { method: "POST" });
      const data = (await res.json()) as Setup & { error?: string; devices?: Device[] };
      if (!res.ok || !data.url || !data.svg) {
        throw new Error(data.error || "Could not create a Kid Mode link");
      }
      setSetup({ url: data.url, svg: data.svg, token: data.token });
      if (data.devices) setDevices(data.devices);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create a Kid Mode link");
    } finally {
      setPending(false);
    }
  }

  async function unpair(id: string) {
    const res = await fetch("/api/parent/devices", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { devices?: Device[] };
    setDevices(data.devices ?? []);
  }

  return (
    <section className="shelf-panel shelf-panel--soft" data-testid="kid-mode-setup">
      <div className="shelf-panel__surface flex flex-col gap-4 p-5">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--ink)]">
            Kid Mode
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            Kid Mode is a separate site with no prices or buy buttons. Open the
            link on the child&apos;s device to pair it. We don&apos;t collect a
            child&apos;s name or email.
          </p>
        </div>
        <button
          type="button"
          data-testid="setup-kid-mode"
          onClick={() => void createLink()}
          disabled={pending}
          className="inline-flex w-fit items-center justify-center rounded-full bg-[var(--blue)] px-5 py-3 text-sm font-bold text-white"
        >
          {pending ? "Creating…" : "Set up Kid Mode"}
        </button>
        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
        {setup ? (
          <div className="flex flex-col items-start gap-3" data-testid="pair-setup">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt=""
              width={180}
              height={180}
              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(setup.svg)}`}
            />
            <a
              href={setup.url}
              data-testid="pair-link"
              className="break-all text-sm font-bold text-[var(--blue-deep)]"
            >
              {setup.url}
            </a>
          </div>
        ) : null}
        {devices.length > 0 ? (
          <ul className="flex flex-col gap-2" data-testid="paired-devices">
            {devices.map((device) => (
              <li key={device.id} className="flex items-center justify-between gap-3">
                <span className="text-sm text-[var(--ink-soft)]">
                  Paired device {device.id.slice(-4)}
                </span>
                <button
                  type="button"
                  className="rounded-full bg-[var(--lavender)] px-3 py-2 text-sm font-bold text-[var(--purple-deep)]"
                  onClick={() => void unpair(device.id)}
                >
                  Unpair
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--ink-soft)]">No paired devices yet.</p>
        )}
      </div>
    </section>
  );
}
