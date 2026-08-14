/**
 * One-time helper: copy local data/*.json into Turso store_documents.
 * Usage: TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... node scripts/seed-turso.mjs
 */
import { createClient } from "@libsql/client";
import { readFile, readdir } from "fs/promises";
import path from "path";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN");
  process.exit(1);
}

const db = createClient({ url, authToken });
const dataDir = path.join(process.cwd(), "data");

await db.execute(`
  CREATE TABLE IF NOT EXISTS store_documents (
    namespace TEXT PRIMARY KEY,
    body TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const files = (await readdir(dataDir)).filter((name) => name.endsWith(".json"));
for (const file of files) {
  const key = file.replace(/\.json$/, "");
  if (!["catalog", "admin", "metrics"].includes(key)) continue;
  const body = await readFile(path.join(dataDir, file), "utf8");
  await db.execute({
    sql: `INSERT INTO store_documents (namespace, body, updated_at)
          VALUES (?, ?, datetime('now'))
          ON CONFLICT(namespace) DO UPDATE SET
            body = excluded.body,
            updated_at = excluded.updated_at`,
    args: [key, body],
  });
  console.log(`Seeded ${key}`);
}

console.log("Done.");
