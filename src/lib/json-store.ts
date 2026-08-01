import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { ensureSchema, getDb, tursoConfigured } from "@/lib/db";

const DATA_DIR = path.join(process.cwd(), "data");

export type StoreKey = "catalog" | "admin" | "metrics";

const FILE_NAMES: Record<StoreKey, string> = {
  catalog: "catalog.json",
  admin: "admin.json",
  metrics: "metrics.json",
};

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

async function readTurso<T>(key: StoreKey): Promise<T | null> {
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
  await writeLocal(key, seed);
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
      const local = await readLocal<T>(key);
      if (local) return local;
      return fallback;
    }
  }

  const local = await readLocal<T>(key);
  if (local) return local;
  return fallback;
}

export async function writeStore<T>(key: StoreKey, data: T): Promise<void> {
  if (tursoConfigured()) {
    try {
      await writeTurso(key, data);
      await writeLocal(key, data);
      return;
    } catch (error) {
      console.error(`Turso write failed for ${key}`, error);
      await writeLocal(key, data);
      return;
    }
  }
  await writeLocal(key, data);
}
