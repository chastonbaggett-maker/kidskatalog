import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ParentBirthYearGate } from "@/components/parent/ParentBirthYearGate";
import { safeParentReturnPath } from "@/lib/request-routing";
import { getSiteMode, isParentGateSessionUnlocked } from "@/lib/site-mode-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Parent Mode",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function LeaveKidModePage({ searchParams }: Props) {
  const params = await searchParams;
  const raw = Array.isArray(params.next) ? params.next[0] : params.next;
  const returnTo = safeParentReturnPath(raw);

  if ((await getSiteMode()) !== "kid" || (await isParentGateSessionUnlocked())) {
    redirect(returnTo);
  }

  return (
    <div className="app-shell relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <ParentBirthYearGate returnTo={returnTo} />
    </div>
  );
}
