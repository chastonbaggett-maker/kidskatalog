import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/admin-auth";

export async function getAdminSessionFromCookies(): Promise<{ pinId: string } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireAdminToysPageSession(): Promise<{ pinId: string }> {
  const session = await getAdminSessionFromCookies();
  if (!session) {
    redirect("/admin?next=/admin/toys");
  }
  return session;
}
