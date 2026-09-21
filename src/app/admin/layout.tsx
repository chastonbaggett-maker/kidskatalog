import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  description: "KidsKatalog toy approval queue",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      {children}
    </div>
  );
}
