/** Shown when a kids request fails or the body is not JSON. */
export const KID_TRY_AGAIN = "Oops, that didn't work. Ask a grown-up to try again.";

/**
 * Read a kids API response. Empty or non-JSON bodies (including a bare 500)
 * do not call Response.json(), which throws "Unexpected end of JSON input".
 */
export async function readKidJson<T extends Record<string, unknown> = Record<string, unknown>>(
  res: Response,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const type = (res.headers.get("content-type") || "").toLowerCase();
  if (!res.ok || !type.includes("application/json")) {
    return { ok: false, message: KID_TRY_AGAIN };
  }
  try {
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, message: KID_TRY_AGAIN };
  }
}
