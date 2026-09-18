"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type Mode = "signin" | "signup";

export function ParentAuthForm({
  mode,
  returnTo = "/p",
}: {
  mode: Mode;
  returnTo?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  const signup = mode === "signup";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      const res = await fetch(
        signup ? "/api/parent/auth/signup" : "/api/parent/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Could not continue");
      }
      const { markParentAuthBypass } = await import("@/lib/parent-auth-bypass");
      markParentAuthBypass();
      window.location.assign(returnTo.startsWith("/p") ? returnTo : "/p");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not continue");
    }
  }

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="shelf-panel shelf-panel--soft"
      data-testid={signup ? "parent-signup-form" : "parent-login-form"}
    >
      <div className="shelf-panel__surface flex flex-col gap-4 p-5">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--ink)]">
            {signup ? "Create a parent account" : "Parent log in"}
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            Save wish lists and open them later. Kids keep browsing without an
            account.
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-[var(--ink)]">Email</span>
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-full border-0 bg-[var(--lavender)] px-4 py-3 text-base text-[var(--ink)] outline-none ring-2 ring-transparent transition focus:ring-[var(--purple)]"
            data-testid="parent-email"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-[var(--ink)]">
            Password
          </span>
          <input
            required
            type="password"
            minLength={8}
            autoComplete={signup ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-full border-0 bg-[var(--lavender)] px-4 py-3 text-base text-[var(--ink)] outline-none ring-2 ring-transparent transition focus:ring-[var(--purple)]"
            data-testid="parent-password"
          />
        </label>

        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-full bg-[var(--blue)] px-5 py-3.5 text-base font-bold text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
          data-testid="parent-auth-submit"
        >
          {status === "saving"
            ? "Saving…"
            : signup
              ? "Sign up"
              : "Log in"}
        </button>

        {message ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {message}
          </p>
        ) : null}

        <p className="text-sm text-[var(--ink-soft)]">
          {signup ? (
            <>
              Already have an account?{" "}
              <Link href="/p/sign-in" className="font-bold text-[var(--blue-deep)]">
                Log in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link href="/p/sign-up" className="font-bold text-[var(--blue-deep)]">
                Sign up
              </Link>
            </>
          )}
        </p>
      </div>
    </form>
  );
}
