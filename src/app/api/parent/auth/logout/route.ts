import { NextResponse } from "next/server";
import { clearParentSessionCookieHeader } from "@/lib/parent-auth";
import { isClerkServerConfigured } from "@/lib/clerk-config";

export async function POST() {
  if (isClerkServerConfigured()) {
    try {
      const { auth } = await import("@clerk/nextjs/server");
      const { userId } = await auth();
      if (userId) {
        return NextResponse.json({
          ok: true,
          clerk: true,
          hint: "Use Clerk sign out",
        });
      }
    } catch {
      // Fall through to cookie clear.
    }
  }

  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearParentSessionCookieHeader());
  return res;
}
