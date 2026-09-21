import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "kk_admin_session";
const SESSION_MS = 8 * 60 * 60 * 1000;

export function hashPin(pin: string): string {
  return createHash("sha256").update(pin).digest("hex");
}

export function verifyPin(pin: string, hash: string): boolean {
  const a = Buffer.from(hashPin(pin));
  const b = Buffer.from(hash);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || "dev-admin-secret-change-me";
}

export function signSession(pinId: string): string {
  const exp = Date.now() + SESSION_MS;
  const nonce = randomBytes(8).toString("hex");
  const payload = `${pinId}.${exp}.${nonce}`;
  const sig = createHmac("sha256", sessionSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): { pinId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [pinId, expStr, nonce, sig] = parts;
  if (!pinId || !expStr || !nonce || !sig) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  const payload = `${pinId}.${expStr}.${nonce}`;
  const expected = createHmac("sha256", sessionSecret()).update(payload).digest("hex");
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return { pinId };
}

export function sessionCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_MS / 1000}${secure}`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

export function getSessionFromRequest(req: NextRequest): { pinId: string } | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function requireAdminSession(req: NextRequest): { pinId: string } | null {
  return getSessionFromRequest(req);
}

function ingestKeyFromEnv(): string | null {
  const key =
    process.env.ADMIN_INGEST_KEY?.trim() ||
    process.env.ADMIN_API_KEY?.trim() ||
    "";
  return key || null;
}

function providedIngestKey(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (bearer) return bearer;
  const header =
    req.headers.get("x-admin-ingest-key")?.trim() ||
    req.headers.get("x-admin-key")?.trim() ||
    "";
  return header || null;
}

function keysMatch(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export type AdminAccess =
  | { kind: "session"; pinId: string }
  | { kind: "ingest" };

/**
 * PIN session (queue + publish) or ingest API key (drop proposals only).
 * Approve / Reject / Submit Approval still require a PIN session.
 */
export function requireAdminAccess(req: NextRequest): AdminAccess | null {
  const session = getSessionFromRequest(req);
  if (session) return { kind: "session", pinId: session.pinId };

  const expected = ingestKeyFromEnv();
  const provided = providedIngestKey(req);
  if (!expected || !provided) return null;
  if (!keysMatch(provided, expected)) return null;
  return { kind: "ingest" };
}

export function requireAdminSessionOrIngest(req: NextRequest): AdminAccess | null {
  return requireAdminAccess(req);
}
