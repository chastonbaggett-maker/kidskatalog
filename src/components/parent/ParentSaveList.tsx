"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { parentSignInPath, parentSignUpPath, parentSavedListPath } from "@/lib/parent-paths";

type Me = { signedIn: boolean };

export function ParentSaveList({
  toyIds,
  returnTo = "/p",
}: {
  toyIds: string[];
  returnTo?: string;
}) {
  const [me, setMe] = useState<Me | null>(null);
  const [name, setName] = useState("Wish list");
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/parent/auth/me")
      .then((res) => res.json())
      .then((data: Me) => {
        if (!cancelled) setMe(data);
      })
      .catch(() => {
        if (!cancelled) setMe({ signedIn: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveList() {
    if (toyIds.length === 0) return;
    setStatus("saving");
    setMessage("");
    try {
      const res = await fetch("/api/parent/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, toyIds }),
      });
      const data = (await res.json()) as {
        error?: string;
        list?: { id: string };
      };
      if (!res.ok || !data.list) {
        throw new Error(data.error || "Could not save list");
      }
      setSavedId(data.list.id);
      setStatus("ok");
      setMessage("Saved. Open it anytime from My lists.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not save list");
    }
  }

  if (toyIds.length === 0) return null;

  return (
    <div className="shelf-panel shelf-panel--soft" data-testid="parent-save-list">
      <div className="shelf-panel__surface flex flex-col gap-3 p-5">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--ink)]">
          Save this list
        </h2>
        <p className="text-sm text-[var(--ink-soft)]">
          Sign up or log in to keep this wish list and open it later. The
          /p?ids= share link still works without an account.
        </p>
        {me?.signedIn ? (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-[var(--ink)]">
                List name
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-full border-0 bg-[var(--lavender)] px-4 py-3 text-base text-[var(--ink)] outline-none ring-2 ring-transparent transition focus:ring-[var(--purple)]"
                data-testid="save-list-name"
              />
            </label>
            <button
              type="button"
              onClick={() => void saveList()}
              disabled={status === "saving"}
              className="rounded-full bg-[var(--blue)] px-5 py-3.5 text-base font-bold text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
              data-testid="save-list-button"
            >
              {status === "saving" ? "Saving…" : "Save list"}
            </button>
          </>
        ) : (
          <p className="text-sm font-bold text-[var(--blue-deep)]">
            <Link href={parentSignUpPath(returnTo)} data-testid="save-list-signup">
              Sign up
            </Link>
            {" · "}
            <Link href={parentSignInPath(returnTo)} data-testid="save-list-login">
              Log in
            </Link>
          </p>
        )}
        {message ? (
          <p
            className={`text-sm font-medium ${
              status === "error" ? "text-red-600" : "text-[var(--blue-deep)]"
            }`}
            role="status"
          >
            {message}
            {savedId ? (
              <>
                {" "}
                <Link
                  href={parentSavedListPath(savedId)}
                  className="font-bold"
                  data-testid="open-saved-list"
                >
                  Open saved list
                </Link>
              </>
            ) : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}
