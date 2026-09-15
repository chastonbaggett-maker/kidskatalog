import type { Metadata } from "next";
import { ParentClerkProvider } from "@/components/parent/ParentClerkProvider";

export const metadata: Metadata = {
  title: "Parent Mode",
  description:
    "Wish list and Amazon buy links for grown-ups. Kids never see affiliate URLs.",
  robots: { index: true, follow: true },
};

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ParentClerkProvider>
      <div className="app-shell relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        <div className="star-field flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </ParentClerkProvider>
  );
}
