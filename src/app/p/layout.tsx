import type { Metadata } from "next";
import { ParentBirthYearGate } from "@/components/parent/ParentBirthYearGate";
import { ParentClerkProvider } from "@/components/parent/ParentClerkProvider";
import { ParentFooter } from "@/components/parent/ParentFooter";
import { parentContentRequiresGate } from "@/lib/site-mode-server";

export const metadata: Metadata = {
  title: "Parent Mode",
  description:
    "Wish list and Amazon buy links for grown-ups. As an Amazon Associate I earn from qualifying purchases.",
  robots: { index: true, follow: true },
};

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locked = await parentContentRequiresGate();

  return (
    <ParentClerkProvider>
      <div className="app-shell relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        <div className="star-field flex min-h-0 flex-1 flex-col overflow-hidden">
          {locked ? (
            <ParentBirthYearGate />
          ) : (
            <>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
              <ParentFooter />
            </>
          )}
        </div>
      </div>
    </ParentClerkProvider>
  );
}
