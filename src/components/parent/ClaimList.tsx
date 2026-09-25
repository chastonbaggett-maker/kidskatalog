"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { parentSavedListPath, parentSignInPath, parentSignUpPath } from "@/lib/parent-paths";

export function ClaimList({ initialCode = "" }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [listId, setListId] = useState("");
  const [pending, setPending] = useState(false);
  const returnTo = code.trim()
    ? `/claim/${encodeURIComponent(code.trim().toUpperCase())}`
    : "/claim";

  useEffect(() => {
    void fetch("/api/parent/auth/me")
      .then((res) => res.json())
      .then((data: { signedIn?: boolean }) => setSignedIn(Boolean(data.signedIn)))
      .catch(() => setSignedIn(false));
  }, []);

  async function claim() {
    setPending(true);
    setMessage("");
    try {
      const res = await fetch("/api/parent/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json()) as { error?: string; list?: { id: string } };
      if (res.status === 401) {
        setSignedIn(false);
        throw new Error(data.error || "Sign in to claim this list");
      }
      if (!res.ok || !data.list?.id) throw new Error(data.error || "Could not claim this list");
      setListId(data.list.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not claim this list");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--ink)]">
        Claim a list
      </h1>
      <p className="text-base text-[var(--ink-soft)]">
        Enter the code from a child&apos;s device. The toys save to your account.
      </p>
      <form
        className="shelf-panel shelf-panel--soft"
        data-testid="claim-form"
        onSubmit={(event) => {
          event.preventDefault();
          void claim();
        }}
      >
        <div className="shelf-panel__surface flex flex-col gap-3 p-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-[var(--ink)]">Code</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              autoCapitalize="characters"
              autoComplete="off"
              data-testid="claim-code"
              className="rounded-full bg-[var(--lavender)] px-4 py-3 text-base tracking-[0.15em] text-[var(--ink)] outline-none"
            />
          </label>
          <button
            type="submit"
            data-testid="claim-submit"
            disabled={pending || signedIn === false}
            className="rounded-full bg-[var(--blue)] px-5 py-3.5 text-base font-bold text-white disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save to my account"}
          </button>
          {signedIn === false ? (
            <p className="text-sm font-bold text-[var(--blue-deep)]">
              <Link href={parentSignUpPath(returnTo)}>Sign up</Link>
              {" · "}
              <Link href={parentSignInPath(returnTo)}>Log in</Link>
            </p>
          ) : null}
          {message ? (
            <p className="text-sm font-medium text-red-600" role="alert">
              {message}
            </p>
          ) : null}
          {listId ? (
            <p className="text-sm font-bold text-[var(--ink)]" data-testid="claim-saved">
              Saved. <Link href={parentSavedListPath(listId)}>Open the list</Link>
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
