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
    })();
  }
  await schemaReady;
}
