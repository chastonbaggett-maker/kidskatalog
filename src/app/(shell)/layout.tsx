import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  applicationName: "KidsKatalog Kids",
  description: "Browse toys and build a Kart.",
  robots: { index: false, follow: false },
};

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
