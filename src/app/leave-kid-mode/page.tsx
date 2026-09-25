import type { Metadata } from "next";
import { KidsLeaveGate } from "@/components/kids/KidsLeaveGate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Grown-ups only · KidsKatalog Kids" },
  robots: { index: false, follow: false },
};

export default function LeaveKidModePage() {
  return <KidsLeaveGate />;
}
