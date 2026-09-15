import { NextResponse } from "next/server";
import { createParentAccount } from "@/lib/parent-accounts";
import {
  parentSessionCookieHeader,
  signParentSession,
} from "@/lib/parent-auth";
import { isClerkConfigured } from "@/lib/clerk-config";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (isClerkConfigured()) {
    return NextResponse.json(
      { error: "Use Clerk sign up on this site" },
      { status: 409 },
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = (await req.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  try {
    const account = await createParentAccount(
      body.email || "",
      body.password || "",
    );
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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create account";
    const status = message.includes("already") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
