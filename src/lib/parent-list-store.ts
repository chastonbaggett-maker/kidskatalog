import "server-only";
import { randomBytes } from "crypto";
import { getDb, ensureSchema, tursoConfigured } from "@/lib/db";
import { readStore, writeStore } from "@/lib/json-store";

export type SavedParentList = {
  id: string;
  ownerId: string;
  name: string;
  toyIds: string[];
  createdAt: string;
  updatedAt: string;
};

type ListStore = {
  version: number;
  lists: SavedParentList[];
};

const DEFAULT_STORE: ListStore = { version: 1, lists: [] };

const TOY_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/;
const MAX_IDS = 200;
const MAX_LISTS = 50;
const MAX_NAME = 80;

export function sanitizeListName(name: string | undefined): string {
  const trimmed = (name ?? "").trim().slice(0, MAX_NAME);
  return trimmed || "Wish list";
}

export function sanitizeToyIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const seen = new Set<string>();
  const next: string[] = [];
  for (const raw of ids) {
    if (typeof raw !== "string") continue;
    const id = raw.trim();
    if (!TOY_ID_RE.test(id) || seen.has(id)) continue;
    seen.add(id);
    next.push(id);
    if (next.length >= MAX_IDS) break;
  }
  return next;
}

function newListId(): string {
  return `lst_${randomBytes(12).toString("hex")}`;
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

function rowToList(row: Record<string, unknown>): SavedParentList {
  let toyIds: string[] = [];
  try {
    toyIds = sanitizeToyIds(JSON.parse(String(row.toy_ids ?? "[]")));
  } catch {
    toyIds = [];
  }
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    name: String(row.name || "Wish list"),
    toyIds,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listParentLists(ownerId: string): Promise<SavedParentList[]> {
  if (!ownerId) return [];

  if (tursoConfigured()) {
    await ensureSchema();
    const db = getDb();
    const result = await db.execute({
      sql: `SELECT id, owner_id, name, toy_ids, created_at, updated_at
            FROM parent_wishlists
            WHERE owner_id = ?
            ORDER BY updated_at DESC`,
      args: [ownerId],
    });
    return result.rows.map((row) => rowToList(row as Record<string, unknown>));
  }

  const data = await readStore("parent-lists", DEFAULT_STORE);
  return data.lists
    .filter((list) => list.ownerId === ownerId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getParentList(
  id: string,
  ownerId?: string,
): Promise<SavedParentList | null> {
  if (!id) return null;

  if (tursoConfigured()) {
    await ensureSchema();
    const db = getDb();
    const result = await db.execute({
      sql: `SELECT id, owner_id, name, toy_ids, created_at, updated_at
            FROM parent_wishlists WHERE id = ?`,
      args: [id],
    });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    const list = rowToList(row);
    if (ownerId && list.ownerId !== ownerId) return null;
    return list;
  }

  const data = await readStore("parent-lists", DEFAULT_STORE);
  const list = data.lists.find((row) => row.id === id) ?? null;
  if (!list) return null;
  if (ownerId && list.ownerId !== ownerId) return null;
  return list;
}

export async function createParentList(
  ownerId: string,
  input: { name?: string; toyIds: unknown },
): Promise<SavedParentList> {
  const toyIds = sanitizeToyIds(input.toyIds);
  if (toyIds.length === 0) {
    throw new Error("Pick at least one toy to save");
  }

  const now = new Date().toISOString();
  const list: SavedParentList = {
    id: newListId(),
    ownerId,
    name: sanitizeListName(input.name),
    toyIds,
    createdAt: now,
    updatedAt: now,
  };

  if (tursoConfigured()) {
    await ensureSchema();
    const existing = await listParentLists(ownerId);
    if (existing.length >= MAX_LISTS) {
      throw new Error("List limit reached");
    }
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO parent_wishlists (id, owner_id, name, toy_ids, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        list.id,
        list.ownerId,
        list.name,
        JSON.stringify(list.toyIds),
        list.createdAt,
        list.updatedAt,
      ],
    });
    return list;
  }

  return serialized(async () => {
    const data = await readStore("parent-lists", DEFAULT_STORE);
    const owned = data.lists.filter((row) => row.ownerId === ownerId);
    if (owned.length >= MAX_LISTS) {
      throw new Error("List limit reached");
    }
    data.lists.push(list);
    await writeStore("parent-lists", data);
    return list;
  });
}

export async function updateParentList(
  id: string,
  ownerId: string,
  patch: { name?: string; toyIds?: unknown },
): Promise<SavedParentList | null> {
  const existing = await getParentList(id, ownerId);
  if (!existing) return null;

  const next: SavedParentList = {
    ...existing,
    name:
      patch.name !== undefined ? sanitizeListName(patch.name) : existing.name,
    toyIds:
      patch.toyIds !== undefined ? sanitizeToyIds(patch.toyIds) : existing.toyIds,
    updatedAt: new Date().toISOString(),
  };
  if (next.toyIds.length === 0) {
    throw new Error("Pick at least one toy to save");
  }

  if (tursoConfigured()) {
    await ensureSchema();
    const db = getDb();
    await db.execute({
      sql: `UPDATE parent_wishlists
            SET name = ?, toy_ids = ?, updated_at = ?
            WHERE id = ? AND owner_id = ?`,
      args: [next.name, JSON.stringify(next.toyIds), next.updatedAt, id, ownerId],
    });
    return next;
  }

  return serialized(async () => {
    const data = await readStore("parent-lists", DEFAULT_STORE);
    const index = data.lists.findIndex(
      (row) => row.id === id && row.ownerId === ownerId,
    );
    if (index < 0) return null;
    data.lists[index] = next;
    await writeStore("parent-lists", data);
    return next;
  });
}

export async function deleteParentList(
  id: string,
  ownerId: string,
): Promise<boolean> {
  if (tursoConfigured()) {
    await ensureSchema();
    const db = getDb();
    const result = await db.execute({
      sql: "DELETE FROM parent_wishlists WHERE id = ? AND owner_id = ?",
      args: [id, ownerId],
    });
    return Number(result.rowsAffected ?? 0) > 0;
  }

  return serialized(async () => {
    const data = await readStore("parent-lists", DEFAULT_STORE);
    const next = data.lists.filter(
      (row) => !(row.id === id && row.ownerId === ownerId),
    );
    if (next.length === data.lists.length) return false;
    data.lists = next;
    await writeStore("parent-lists", data);
    return true;
  });
}
