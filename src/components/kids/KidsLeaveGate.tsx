"use client";

import { useEffect } from "react";
import { ParentBirthYearGate } from "@/components/parent/ParentBirthYearGate";

function UnpairThenShop() {
  useEffect(() => {
    void fetch("/api/kids/unpair", { method: "POST" }).finally(() => {
      window.location.assign("/shop");
    });
  }, []);

  return (
    <p className="px-4 py-8 text-center text-base font-bold text-[var(--ink)]">
      Unpairing this device…
    </p>
  );
}

export function KidsLeaveGate() {
  return (
    <div className="app-shell relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <ParentBirthYearGate afterUnlock="children">
        <UnpairThenShop />
      </ParentBirthYearGate>
    </div>
  );
}
