import "server-only";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import {
  blobConfigured,
  missingProductionStoreMessage,
  tursoConfigured,
} from "@/lib/store-env";

const DATA_DIR = path.join(process.cwd(), "data");

async function getDbModule() {
  return import("@/lib/db");
}

export type StoreKey = "catalog" | "admin" | "metrics" | "drafts";

const FILE_NAMES: Record<StoreKey, string> = {
  catalog: "catalog.json",
  admin: "admin.json",
  metrics: "metrics.json",
  drafts: "drafts.json",
};

const BLOB_PATHS: Record<StoreKey, string> = {
  catalog: "kidskatalog/catalog.json",
  admin: "kidskatalog/admin.json",
  metrics: "kidskatalog/metrics.json",
  drafts: "kidskatalog/drafts.json",
};

function isDevLocalStore(): boolean {
  return process.env.NODE_ENV === "development";
}

async function readLocal<T>(key: StoreKey): Promise<T | null> {
  try {
    const raw = await readFile(path.join(DATA_DIR, FILE_NAMES[key]), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeLocal<T>(key: StoreKey, data: T): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    path.join(DATA_DIR, FILE_NAMES[key]),
    JSON.stringify(data, null, 2),
    "utf8",
  );
}

async function mirrorLocalOptional<T>(key: StoreKey, data: T): Promise<void> {
  if (!isDevLocalStore()) return;
  try {
    await writeLocal(key, data);
  } catch (error) {
    console.warn(`Local mirror write failed for ${key}`, error);
  }
}

async function readTurso<T>(key: StoreKey): Promise<T | null> {
  const { ensureSchema, getDb } = await getDbModule();
  await ensureSchema();
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT body FROM store_documents WHERE namespace = ?",
    args: [key],
  });
  const row = result.rows[0];
  if (!row?.body) return null;
  return JSON.parse(String(row.body)) as T;
}

async function writeTurso<T>(key: StoreKey, data: T): Promise<void> {
  const { ensureSchema, getDb } = await getDbModule();
  await ensureSchema();
  const db = getDb();
  const body = JSON.stringify(data);
  await db.execute({
    sql: `INSERT INTO store_documents (namespace, body, updated_at)
          VALUES (?, ?, datetime('now'))
          ON CONFLICT(namespace) DO UPDATE SET
            body = excluded.body,
            updated_at = excluded.updated_at`,
    args: [key, body],
  });
}

async function seedTursoFromLocal<T>(key: StoreKey, fallback: T): Promise<T> {
  const local = await readLocal<T>(key);
  const seed = local ?? fallback;
  await writeTurso(key, seed);
  await mirrorLocalOptional(key, seed);
  return seed;
}

async function readBlob<T>(key: StoreKey): Promise<T | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return null;

  const { head } = await import("@vercel/blob");
  try {
    const info = await head(BLOB_PATHS[key], { token });
    if (!info?.url) return null;
    const res = await fetch(info.url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function writeBlob<T>(key: StoreKey, data: T): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN is not configured");

  const { put } = await import("@vercel/blob");
  await put(BLOB_PATHS[key], JSON.stringify(data, null, 2), {
    access: "public",
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

async function seedBlobFromLocal<T>(key: StoreKey, fallback: T): Promise<T> {
  const local = await readLocal<T>(key);
  const seed = local ?? fallback;
  await writeBlob(key, seed);
  await mirrorLocalOptional(key, seed);
  return seed;
}

export async function readStore<T>(key: StoreKey, fallback: T): Promise<T> {
  if (tursoConfigured()) {
    try {
      const stored = await readTurso<T>(key);
      if (stored) return stored;
      return seedTursoFromLocal(key, fallback);
    } catch (error) {
      console.error(`Turso read failed for ${key}`, error);
    }
  }

  if (blobConfigured()) {
    const blob = await readBlob<T>(key);
    if (blob) {
      if (key === "admin") {
        const blobPins = (blob as { pins?: unknown[] }).pins;
        if (!blobPins?.length) {
          const local = await readLocal<T>(key);
          const localPins = local ? (local as { pins?: unknown[] }).pins : undefined;
          if (localPins?.length && local) return local;
        }
      }
      return blob;
    }
    if (isDevLocalStore()) {
      const local = await readLocal<T>(key);
      if (local) {
        await writeBlob(key, local).catch(() => undefined);
        return local;
      }
    }
    return seedBlobFromLocal(key, fallback);
  }

  const local = await readLocal<T>(key);
  if (local) return local;
  return fallback;
}

export async function writeStore<T>(key: StoreKey, data: T): Promise<void> {
  if (tursoConfigured()) {
    try {
      await writeTurso(key, data);
      await mirrorLocalOptional(key, data);
      return;
    } catch (error) {
      console.error(`Turso write failed for ${key}`, error);
      if (blobConfigured()) {
        await writeBlob(key, data);
        await mirrorLocalOptional(key, data);
        return;
      }
      if (isDevLocalStore()) {
        await writeLocal(key, data);
        return;
      }
      throw error;
    }
  }

  if (blobConfigured()) {
    await writeBlob(key, data);
    await mirrorLocalOptional(key, data);
    return;
  }

  if (isDevLocalStore()) {
    await writeLocal(key, data);
    return;
  }

  throw new Error(missingProductionStoreMessage());
}
