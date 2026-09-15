import { NextResponse } from "next/server";
import { authenticateParent } from "@/lib/parent-accounts";
import {
  parentSessionCookieHeader,
  signParentSession,
} from "@/lib/parent-auth";
import { isClerkConfigured } from "@/lib/clerk-config";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (isClerkConfigured()) {
    return NextResponse.json(
      { error: "Use Clerk log in on this site" },
      { status: 409 },
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = (await req.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const account = await authenticateParent(body.email || "", body.password || "");
  if (!account) {
    return NextResponse.json(
      { error: "Email or password is wrong" },
      { status: 401 },
    );
  }

  const res = NextResponse.json({
    ok: true,
    signedIn: true,
    id: account.id,
    email: account.email,
  });
  res.headers.set(
    "Set-Cookie",
    parentSessionCookieHeader(signParentSession(account.id)),
  );
  return res;
}
