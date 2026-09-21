import { Suspense } from "react";
import { AdminPageClient } from "@/components/admin/AdminPageClient";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminPageClient />
    </Suspense>
  );
}
