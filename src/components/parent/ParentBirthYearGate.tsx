"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { ShelfHeader } from "@/components/ShelfHeader";
import { isAllowedParentBirthYear } from "@/lib/parent-birth-year";

const ERROR_TEXT = "Enter a valid birth year.";

export function ParentBirthYearGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [year, setYear] = useState("");
  const [error, setError] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAllowedParentBirthYear(year)) {
      setError(ERROR_TEXT);
      return;
    }
    setError("");
    setYear("");
    setUnlocked(true);
  }

  if (!unlocked) {
    return (
      <div
        className="shelf-page star-field flex min-h-0 flex-1 flex-col overflow-hidden"
        data-testid="parent-birth-year-gate"
      >
        <ShelfHeader
          title="Parent Mode"
          subtitle="Grown-ups only"
          backToPrevious
          backHref="/shop"
          logoHref="/shop"
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
                    Enter parents birth year to continue
                  </p>
                </div>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-[var(--ink)]">
                    Birth year
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="bday-year"
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

  return <>{children}</>;
}
