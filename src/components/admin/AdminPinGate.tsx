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
  const [ready, setReady] = useState(false);
  const [entry, setEntry] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setReady(false);
      return;
    }

    setEntry("");
    setFirstPin("");
    setError("");
    setShake(false);
    setMode("unlock");
    setReady(false);

    void (async () => {
      // Always require a fresh PIN — clear any existing admin session first.
      await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });

      const res = await fetch("/api/admin/auth");
      const data = (await res.json()) as { pinsExist?: boolean };
      const exists = Boolean(data.pinsExist);
      setPinsExist(exists);
      setMode(exists ? "unlock" : "setup");
      setReady(true);
    })().catch(() => {
      setMode("unlock");
      setReady(true);
    });
  }, [open]);

  const startSetup = useCallback(() => {
    setMode("setup");
    setEntry("");
    setFirstPin("");
    setError("");
    setShake(false);
  }, []);

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
    if (!ready || entry.length !== 4 || busy) return;
    void submitPin(entry);
  }, [entry, busy, ready, submitPin]);

  if (!open || !mounted) return null;

  const title =
    mode === "setup"
      ? "Create Passcode"
      : mode === "confirm"
        ? "Re-enter Passcode"
        : "Enter Passcode";

  return createPortal(
    <div className="admin-gate fixed inset-0 z-[200] flex flex-col">
      <button
        type="button"
        className="admin-gate__backdrop absolute inset-0"
        aria-label="Close admin PIN"
        onClick={onClose}
      />

      <div className="admin-gate__content relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div
          className={`admin-gate__head mb-10 w-full max-w-sm text-center ${shake ? "admin-gate__head--shake" : ""}`}
        >
          <h2 className="admin-gate__title">{title}</h2>

          <div className="admin-gate__dots mt-8 flex items-center justify-center gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <span
                key={i}
                className={`admin-pin-dot ${i < entry.length ? "admin-pin-dot--filled" : ""}`}
              />
            ))}
          </div>

          {error ? (
            <p className="admin-gate__error mt-5 text-sm font-medium">{error}</p>
          ) : (
            <p className="admin-gate__error mt-5 text-sm font-medium" aria-hidden>
              &nbsp;
            </p>
          )}
        </div>

        <PinKeypad
          disabled={busy || !ready}
          onDigit={(digit) => setEntry((prev) => (prev.length >= 4 ? prev : prev + digit))}
          onDelete={() => setEntry((prev) => prev.slice(0, -1))}
        />

        <button
          type="button"
          onClick={startSetup}
          disabled={busy}
          className="admin-gate__setup mt-8 text-base font-medium transition active:opacity-70 disabled:opacity-40"
        >
          Setup Admin
        </button>

        <button
          type="button"
          onClick={onClose}
          className="admin-gate__cancel mt-3 text-base font-medium transition active:opacity-70"
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body,
  );
}
