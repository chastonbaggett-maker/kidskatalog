"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ShelfHeader } from "@/components/ShelfHeader";
import {
  isAllowedParentBirthYear,
  persistParentGateUnlock,
  readParentGateUnlocked,
} from "@/lib/parent-birth-year";
import { persistParentMode } from "@/lib/site-mode";

const ERROR_TEXT = "Enter the year you were born.";

export function ParentBirthYearGate({
  children,
  returnTo = "/shop",
  afterUnlock = "redirect",
}: {
  children?: ReactNode;
  returnTo?: string;
  afterUnlock?: "redirect" | "children";
}) {
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [year, setYear] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setUnlocked(readParentGateUnlocked());
    setReady(true);
  }, []);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAllowedParentBirthYear(year)) {
      setError(ERROR_TEXT);
      return;
    }
    persistParentGateUnlock();
    if (afterUnlock === "redirect") persistParentMode();
    setError("");
    setYear("");
    setUnlocked(true);
    if (afterUnlock === "redirect") window.location.assign(returnTo);
  }

  if (!ready || !unlocked) {
    return (
      <div
        className="shelf-page star-field flex min-h-0 flex-1 flex-col overflow-hidden"
        data-testid="parent-birth-year-gate"
      >
        <ShelfHeader
          title="Grown-ups only"
          subtitle="Birth year stays on this screen"
          backHref="/shop"
          logoHref="/shop"
          trailing={null}
        />
        <div className="page-scroll star-field min-h-0 flex-1 px-4 py-4 scroll-pad-bottom">
          <div className="mx-auto w-full max-w-md">
            <form
              onSubmit={onSubmit}
              className="shelf-panel shelf-panel--soft"
              data-testid="parent-birth-year-form"
            >
              <div className="shelf-panel__surface flex flex-col gap-4 p-5">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--ink)]">
                    What&apos;s your birth year?
                  </h2>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">
                    Type the year you were born. Kids stay on shop and Watch.
                  </p>
                </div>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-[var(--ink)]">
                    Birth year
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    name="parent-gate"
                    maxLength={4}
                    value={year}
                    onChange={(event) => {
                      setYear(event.target.value);
                      setError("");
                    }}
                    className="rounded-full border-0 bg-[var(--lavender)] px-4 py-3 text-base text-[var(--ink)] outline-none ring-2 ring-transparent transition focus:ring-[var(--purple)]"
                    data-testid="parent-birth-year"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? "parent-birth-year-error" : undefined}
                  />
                </label>

                <button
                  type="submit"
                  className="rounded-full bg-[var(--blue)] px-5 py-3.5 text-base font-bold text-white shadow-md transition active:scale-[0.98]"
                  data-testid="parent-birth-year-submit"
                >
                  Continue
                </button>

                {error ? (
                  <p
                    id="parent-birth-year-error"
                    className="text-sm font-medium text-red-600"
                    role="alert"
                    data-testid="parent-birth-year-error"
                  >
                    {error}
                  </p>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
