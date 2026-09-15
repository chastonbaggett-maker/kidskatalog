import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { getDb, ensureSchema, tursoConfigured } from "@/lib/db";
import { readStore, writeStore } from "@/lib/json-store";

export type ParentAccount = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

type AccountStore = {
  version: number;
  accounts: ParentAccount[];
};

const DEFAULT_STORE: AccountStore = { version: 1, accounts: [] };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeParentEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidParentEmail(email: string): boolean {
  return EMAIL_RE.test(normalizeParentEmail(email)) && email.length <= 120;
}

export function isValidParentPassword(password: string): boolean {
  return password.length >= 8 && password.length <= 200;
}

export function hashParentPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyParentPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(hash);
  const b = Buffer.from(next);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function newAccountId(): string {
  return `par_${randomBytes(12).toString("hex")}`;
}

let writeChain: Promise<void> = Promise.resolve();

function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function loadJson(): Promise<AccountStore> {
  return readStore("parent-accounts", DEFAULT_STORE);
}

async function saveJson(data: AccountStore): Promise<void> {
  await writeStore("parent-accounts", data);
}

export async function createParentAccount(
  email: string,
  password: string,
): Promise<ParentAccount> {
  const normalized = normalizeParentEmail(email);
  if (!isValidParentEmail(normalized)) {
    throw new Error("That email looks wrong");
  }
  if (!isValidParentPassword(password)) {
    throw new Error("Password must be at least 8 characters");
  }

  const account: ParentAccount = {
    id: newAccountId(),
    email: normalized,
    passwordHash: hashParentPassword(password),
    createdAt: new Date().toISOString(),
  };

  if (tursoConfigured()) {
    await ensureSchema();
    const db = getDb();
    try {
      await db.execute({
        sql: `INSERT INTO parent_accounts (id, email, password_hash, created_at)
              VALUES (?, ?, ?, ?)`,
        args: [account.id, account.email, account.passwordHash, account.createdAt],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/unique|constraint/i.test(message)) {
        throw new Error("That email already has a parent account");
      }
      throw error;
    }
    return account;
  }

  return serialized(async () => {
    const data = await loadJson();
    if (data.accounts.some((row) => row.email === normalized)) {
      throw new Error("That email already has a parent account");
    }
    data.accounts.push(account);
    await saveJson(data);
    return account;
  });
}

export async function findParentAccountByEmail(
  email: string,
): Promise<ParentAccount | null> {
  const normalized = normalizeParentEmail(email);
  if (!normalized) return null;

  if (tursoConfigured()) {
    await ensureSchema();
    const db = getDb();
    const result = await db.execute({
      sql: "SELECT id, email, password_hash, created_at FROM parent_accounts WHERE email = ?",
      args: [normalized],
    });
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: String(row.id),
      email: String(row.email),
      passwordHash: String(row.password_hash),
      createdAt: String(row.created_at),
    };
  }

  const data = await loadJson();
  return data.accounts.find((row) => row.email === normalized) ?? null;
}

export async function findParentAccountById(
  id: string,
): Promise<ParentAccount | null> {
  if (!id) return null;

  if (tursoConfigured()) {
    await ensureSchema();
    const db = getDb();
    const result = await db.execute({
      sql: "SELECT id, email, password_hash, created_at FROM parent_accounts WHERE id = ?",
      args: [id],
    });
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: String(row.id),
      email: String(row.email),
      passwordHash: String(row.password_hash),
      createdAt: String(row.created_at),
    };
  }

  const data = await loadJson();
  return data.accounts.find((row) => row.id === id) ?? null;
}

export async function authenticateParent(
  email: string,
  password: string,
): Promise<ParentAccount | null> {
  const account = await findParentAccountByEmail(email);
  if (!account) return null;
  if (!verifyParentPassword(password, account.passwordHash)) return null;
  return account;
}
