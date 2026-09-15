import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { isClerkServerConfigured } from "@/lib/clerk-config";

export const PARENT_SESSION_COOKIE = "kk_parent_session";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export type ParentAuthProvider = "clerk" | "password";

export type ParentUser = {
  id: string;
  email?: string;
  provider: ParentAuthProvider;
};

function sessionSecret(): string {
  return (
    process.env.PARENT_SESSION_SECRET?.trim() ||
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    "dev-parent-secret-change-me"
  );
}

function readCookie(req: Request, name: string): string | undefined {
  const nextReq = req as NextRequest;
  if (typeof nextReq.cookies?.get === "function") {
    const fromApi = nextReq.cookies.get(name)?.value;
    if (fromApi) return fromApi;
  }
  const header = req.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${name}=`)) continue;
    return decodeURIComponent(trimmed.slice(name.length + 1));
  }
  return undefined;
}

export function signParentSession(userId: string): string {
  const exp = Date.now() + SESSION_MS;
  const nonce = randomBytes(8).toString("hex");
  const payload = `${userId}.${exp}.${nonce}`;
  const sig = createHmac("sha256", sessionSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyParentSessionToken(token: string): { userId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [userId, expStr, nonce, sig] = parts;
  if (!userId || !expStr || !nonce || !sig) return null;
  if (!/^par_[a-z0-9]+$/i.test(userId) && !/^user_/.test(userId)) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  const payload = `${userId}.${expStr}.${nonce}`;
  const expected = createHmac("sha256", sessionSecret()).update(payload).digest("hex");
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return { userId };
}

export function parentSessionCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const maxAge = Math.floor(SESSION_MS / 1000);
  return `${PARENT_SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearParentSessionCookieHeader(): string {
  return `${PARENT_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function getPasswordSessionFromRequest(req: Request): { userId: string } | null {
  const token = readCookie(req, PARENT_SESSION_COOKIE);
  if (!token) return null;
  return verifyParentSessionToken(token);
}

async function clerkUser(): Promise<ParentUser | null> {
  if (!isClerkServerConfigured()) return null;
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (!userId) return null;
    return { id: userId, provider: "clerk" };
  } catch {
    return null;
  }
}

export async function getParentUser(req?: Request): Promise<ParentUser | null> {
  const clerk = await clerkUser();
  if (clerk) return clerk;

  if (req) {
    const session = getPasswordSessionFromRequest(req);
    if (session) return { id: session.userId, provider: "password" };
    return null;
  }

  try {
    const { cookies } = await import("next/headers");
    const token = (await cookies()).get(PARENT_SESSION_COOKIE)?.value;
    if (!token) return null;
    const session = verifyParentSessionToken(token);
    if (!session) return null;
    return { id: session.userId, provider: "password" };
  } catch {
    return null;
  }
}
