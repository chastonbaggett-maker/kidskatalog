import type { Metadata } from "next";
import { PairDevice } from "@/components/kids/PairDevice";

export const metadata: Metadata = {
  title: { absolute: "Connect this device · KidsKatalog Kids" },
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

export default async function PairPage({ params }: Props) {
  const { token } = await params;
  if (!/^[a-f0-9]{32}$/.test(token)) {
    return (
      <div className="app-shell px-4 py-10 text-center">
        <p className="text-base font-bold text-[var(--ink)]">This link is not valid.</p>
      </div>
    );
  }
  return (
    <div className="app-shell relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <PairDevice token={token} />
    </div>
  );
}
