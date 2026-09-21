"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { AdminPinGate } from "@/components/admin/AdminPinGate";

export function AdminPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [unlocked, setUnlocked] = useState(false);
  const [pinOpen, setPinOpen] = useState(true);

  function handleUnlocked() {
    const next = searchParams.get("next");
    if (next === "/admin/toys") {
      router.replace("/admin/toys");
      return;
    }
    setUnlocked(true);
    setPinOpen(false);
  }

  function handleLock() {
    setUnlocked(false);
    setPinOpen(true);
  }

  return (
    <>
      <AdminPinGate
        open={pinOpen && !unlocked}
        onClose={() => setPinOpen(false)}
        onUnlocked={handleUnlocked}
      />
      <AdminPanel open={unlocked} onClose={handleLock} />
      {!unlocked && !pinOpen ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6">
          <p className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--ink)]">
            Admin locked
          </p>
          <button
            type="button"
            onClick={() => setPinOpen(true)}
            className="rounded-full bg-[var(--purple-deep)] px-4 py-2 text-sm font-bold text-white"
          >
            Unlock
          </button>
        </div>
      ) : null}
    </>
  );
}
