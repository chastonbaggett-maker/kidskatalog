"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ShelfHeader } from "@/components/ShelfHeader";
import {
  consumeParentAuthBypass,
  markParentAuthBypass,
} from "@/lib/parent-auth-bypass";
import { isAllowedParentBirthYear } from "@/lib/parent-birth-year";
import { parentSignInPath, parentSignUpPath } from "@/lib/parent-paths";

const ERROR_TEXT = "Enter a valid birth year.";

function isParentAuthRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === "/p/sign-in" ||
    pathname.startsWith("/p/sign-in/") ||
    pathname === "/p/sign-up" ||
    pathname.startsWith("/p/sign-up/")
  );
}

function takeFromAuthQuery(): boolean {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("fromAuth") !== "1") return false;
    url.searchParams.delete("fromAuth");
    const next = url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : "") + url.hash;
    window.history.replaceState({}, "", next);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parent Mode entry:
 * - Sign-in / sign-up routes pass through (auth is the check).
 * - Signed-out visitors get Log in / Sign up (no birth year).
 * - Already signed-in visitors get the birth-year gate, unless they just
 *   authenticated (bypass — no birth year right after sign-in/up).
 */
export function ParentBirthYearGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [auth, setAuth] = useState<"loading" | "out" | "in">("loading");
  const [unlocked, setUnlocked] = useState(false);
  const [year, setYear] = useState("");
  const [error, setError] = useState("");
  const [returnTo, setReturnTo] = useState("/p");

  useEffect(() => {
    const path = window.location.pathname + window.location.search;
    setReturnTo(path.startsWith("/p") ? path : "/p");
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    if (takeFromAuthQuery()) {
      markParentAuthBypass();
    }

    void fetch("/api/parent/auth/me")
      .then((res) => res.json())
      .then((data: { signedIn?: boolean }) => {
        if (cancelled) return;
        if (data.signedIn) {
          if (consumeParentAuthBypass()) {
            setUnlocked(true);
          }
          setAuth("in");
        } else {
          setAuth("out");
        }
      })
      .catch(() => {
        if (!cancelled) setAuth("out");
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  if (isParentAuthRoute(pathname)) {
    return <>{children}</>;
  }

  if (auth === "loading") {
    return (
      <div
        className="shelf-page star-field flex min-h-0 flex-1 flex-col overflow-hidden"
        data-testid="parent-entry-loading"
      >
        <ShelfHeader
          title="Parent Mode"
          subtitle="Grown-ups only"
          backToPrevious
          backHref="/shop"
          logoHref="/shop"
        />
        <div className="page-scroll star-field min-h-0 flex-1 px-4 py-4">
          <p className="text-center text-sm text-[var(--ink-soft)]">…</p>
        </div>
      </div>
    );
  }

  if (auth === "out") {
    return (
      <div
        className="shelf-page star-field flex min-h-0 flex-1 flex-col overflow-hidden"
        data-testid="parent-auth-gate"
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
            <div className="shelf-panel shelf-panel--soft">
              <div className="shelf-panel__surface flex flex-col gap-4 p-5">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--ink)]">
                    Log in to continue
                  </h2>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">
                    Sign in or create a parent account to open Parent Mode and
                    the wish list.
                  </p>
                </div>
                <Link
                  href={parentSignUpPath(returnTo)}
                  className="rounded-full bg-[var(--blue)] px-5 py-3.5 text-center text-base font-bold text-white shadow-md transition active:scale-[0.98]"
                  data-testid="parent-auth-gate-signup"
                >
                  Sign up
                </Link>
                <Link
                  href={parentSignInPath(returnTo)}
                  className="rounded-full bg-[var(--lavender)] px-5 py-3.5 text-center text-base font-bold text-[var(--purple-deep)] shadow-md transition active:scale-[0.98]"
                  data-testid="parent-auth-gate-login"
                >
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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
                    aria-describedby={
                      error ? "parent-birth-year-error" : undefined
                    }
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
