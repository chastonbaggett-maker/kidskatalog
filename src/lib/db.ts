import "server-only";
import { createClient, type Client } from "@libsql/client/web";
import { tursoAuthToken, tursoConfigured, tursoDatabaseUrl } from "@/lib/store-env";

let client: Client | null = null;
let schemaReady: Promise<void> | null = null;

export { tursoConfigured } from "@/lib/store-env";

export function getDb(): Client {
  if (!tursoConfigured()) {
    throw new Error("Turso is not configured");
  }
  if (!client) {
    client = createClient({
      url: tursoDatabaseUrl()!,
      authToken: tursoAuthToken()!,
    });
  }
  return client;
}

export async function ensureSchema(): Promise<void> {
  if (!tursoConfigured()) return;
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getDb();
      await db.execute(`
        CREATE TABLE IF NOT EXISTS store_documents (
          namespace TEXT PRIMARY KEY,
          body TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS parent_accounts (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS parent_wishlists (
          id TEXT PRIMARY KEY,
          owner_id TEXT NOT NULL,
          name TEXT,
          toy_ids TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      await db.execute(`
        CREATE INDEX IF NOT EXISTS parent_wishlists_owner
        ON parent_wishlists(owner_id)
      `);
    })();
  }
  await schemaReady;
}
