import { NextResponse } from "next/server";
import { findParentAccountById } from "@/lib/parent-accounts";
import { getParentUser } from "@/lib/parent-auth";
import { isClerkConfigured } from "@/lib/clerk-config";

export async function GET(req: Request) {
  const user = await getParentUser(req);
  if (!user) {
    return NextResponse.json({
      signedIn: false,
      clerk: isClerkConfigured(),
    });
  }

  let email = user.email;
  if (!email && user.provider === "password") {
    const account = await findParentAccountById(user.id);
    email = account?.email;
  }

  return NextResponse.json({
    signedIn: true,
    id: user.id,
    email: email ?? null,
    provider: user.provider,
    clerk: isClerkConfigured(),
  });
}
