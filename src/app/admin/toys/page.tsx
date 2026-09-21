import { AdminToysClient } from "@/components/admin/AdminToysClient";
import { requireAdminToysPageSession } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export default async function AdminToysPage() {
  await requireAdminToysPageSession();
  return <AdminToysClient />;
}
