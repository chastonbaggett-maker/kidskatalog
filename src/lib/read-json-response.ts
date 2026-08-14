/** Safely parse fetch responses — Safari throws on res.json() for HTML/empty bodies. */
export async function readJsonResponse<T extends Record<string, unknown>>(
  res: Response,
): Promise<T> {
  const text = await res.text();
  if (!text) {
    throw new Error(
      res.ok ? "Empty response from server" : `Request failed (${res.status})`,
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      res.ok
        ? "Invalid response from server"
        : `Request failed (${res.status}). Check server configuration.`,
    );
  }
}
