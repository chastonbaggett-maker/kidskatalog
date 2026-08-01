import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { head, put } from "@vercel/blob";

const DATA_DIR = path.join(process.cwd(), "data");

type StoreKey = "catalog" | "admin" | "metrics";

const FILE_NAMES: Record<StoreKey, string> = {
  catalog: "catalog.json",
  admin: "admin.json",
  metrics: "metrics.json",
};

const BLOB_PATHS: Record<StoreKey, string> = {
  catalog: "kidskatalog/catalog.json",
  admin: "kidskatalog/admin.json",
  metrics: "kidskatalog/metrics.json",
};

function useBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
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

async function readBlob<T>(key: StoreKey): Promise<T | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;

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
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN is not configured");

  await put(BLOB_PATHS[key], JSON.stringify(data, null, 2), {
    access: "public",
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function readStore<T>(key: StoreKey, fallback: T): Promise<T> {
  if (useBlob()) {
    const blob = await readBlob<T>(key);
    if (blob) return blob;
  }
  const local = await readLocal<T>(key);
  if (local) return local;
  return fallback;
}

export async function writeStore<T>(key: StoreKey, data: T): Promise<void> {
  if (useBlob()) {
    await writeBlob(key, data);
    return;
  }
  await writeLocal(key, data);
}
