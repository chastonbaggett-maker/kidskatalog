"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PinKeypad } from "./PinKeypad";

type Mode = "setup" | "confirm" | "unlock";

type Props = {
  open: boolean;
  onClose: () => void;
  onUnlocked: () => void;
};

export function AdminPinGate({ open, onClose, onUnlocked }: Props) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<Mode>("unlock");
  const [pinsExist, setPinsExist] = useState(true);
  const [entry, setEntry] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setEntry("");
    setFirstPin("");
    setError("");
    fetch("/api/admin/auth")
      .then((r) => r.json())
      .then((data: { pinsExist?: boolean; authenticated?: boolean }) => {
        const exists = Boolean(data.pinsExist);
        setPinsExist(exists);
        setMode(exists ? "unlock" : "setup");
        if (data.authenticated) onUnlocked();
      })
      .catch(() => setMode("unlock"));
    // Only re-check auth when the gate opens — not when parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fail = useCallback((message: string) => {
    setError(message);
    setShake(true);
    setEntry("");
    window.setTimeout(() => setShake(false), 450);
  }, []);

  const submitPin = useCallback(
    async (pin: string) => {
      setBusy(true);
      setError("");
      try {
        if (mode === "setup") {
          setFirstPin(pin);
          setMode("confirm");
          setEntry("");
          return;
        }

        if (mode === "confirm") {
          if (pin !== firstPin) {
            fail("PINs did not match. Try again.");
            setMode("setup");
            setFirstPin("");
            return;
          }
          const res = await fetch("/api/admin/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "setup", pin }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Setup failed");
          onUnlocked();
          return;
        }

        const res = await fetch("/api/admin/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "verify", pin }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Incorrect PIN");
        onUnlocked();
      } catch (e) {
        fail(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setBusy(false);
      }
    },
    [mode, firstPin, fail, onUnlocked],
  );

  useEffect(() => {
    if (entry.length === 4 && !busy) {
      void submitPin(entry);
    }
  }, [entry, busy, submitPin]);

  if (!open || !mounted) return null;

  const title =
    mode === "setup"
      ? "Create Admin PIN"
      : mode === "confirm"
        ? "Re-enter PIN"
        : "Enter Admin PIN";

  const subtitle =
    mode === "setup"
      ? "Choose a 4-digit PIN"
      : mode === "confirm"
        ? "Confirm your PIN"
        : pinsExist
          ? "Admin access"
          : "Set up your first PIN";

  return createPortal(
    <div className="admin-gate fixed inset-0 z-[200] flex items-center justify-center px-4">
      <button
        type="button"
        className="admin-gate__backdrop absolute inset-0"
        aria-label="Close admin PIN"
        onClick={onClose}
      />
      <div className={`admin-gate__panel relative w-full max-w-sm px-6 py-8 ${shake ? "admin-gate__panel--shake" : ""}`}>
        <p className="mb-1 text-center text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
          KidsKatalog
        </p>
        <h2 className="mb-6 text-center font-[family-name:var(--font-display)] text-2xl font-bold text-white">
          {title}
        </h2>
        <p className="mb-5 text-center text-sm text-white/75">{subtitle}</p>

        <div className="mb-8 flex items-center justify-center gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className={`admin-pin-dot h-3.5 w-3.5 rounded-full ${i < entry.length ? "admin-pin-dot--filled" : ""}`}
            />
          ))}
        </div>

        {error ? (
          <p className="mb-4 text-center text-sm font-semibold text-[#ffb4b4]">{error}</p>
        ) : null}

        <PinKeypad
          disabled={busy}
          onDigit={(digit) => setEntry((prev) => (prev.length >= 4 ? prev : prev + digit))}
          onDelete={() => setEntry((prev) => prev.slice(0, -1))}
        />

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-full py-2.5 text-sm font-semibold text-white/70 transition hover:text-white"
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body,
  );
}
