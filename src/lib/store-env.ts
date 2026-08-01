import "server-only";

/** Resolve Turso/libSQL connection settings from common env var names. */
export function tursoDatabaseUrl(): string | undefined {
  return (
    process.env.TURSO_DATABASE_URL?.trim() ||
    process.env.LIBSQL_URL?.trim() ||
    process.env.TURSO_URL?.trim() ||
    undefined
  );
}

export function tursoAuthToken(): string | undefined {
  return (
    process.env.TURSO_AUTH_TOKEN?.trim() ||
    process.env.LIBSQL_AUTH_TOKEN?.trim() ||
    undefined
  );
}

export function tursoConfigured(): boolean {
  return Boolean(tursoDatabaseUrl() && tursoAuthToken());
}

export function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export function productionStoreConfigured(): boolean {
  return tursoConfigured() || blobConfigured();
}

export function missingProductionStoreMessage(): string {
  if (tursoConfigured() || blobConfigured()) {
    return "Could not save data";
  }
  return (
    "Storage is not configured. Add TURSO_DATABASE_URL + TURSO_AUTH_TOKEN " +
    "(recommended) or BLOB_READ_WRITE_TOKEN in Vercel environment variables."
  );
}
