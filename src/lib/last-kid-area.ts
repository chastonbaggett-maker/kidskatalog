/** Remembers the last kid browse area so Kart can send them back. */

export const LAST_KID_AREA_KEY = "kk_last_kid_area";
export const DEFAULT_KID_AREA = "/shop";

function kidAreaStorage(): Storage | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

export function isKidBrowsePath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/shop") ||
    pathname.startsWith("/toy") ||
    pathname.startsWith("/menu")
  );
}

export function rememberKidArea(pathname: string, search = "") {
  const store = kidAreaStorage();
  if (!store) return;
  if (!isKidBrowsePath(pathname)) return;
  try {
    store.setItem(LAST_KID_AREA_KEY, `${pathname}${search}`);
  } catch {
    /* private mode / blocked storage */
  }
}

export function readLastKidArea(): string {
  const store = kidAreaStorage();
  if (!store) return DEFAULT_KID_AREA;
  try {
    const value = store.getItem(LAST_KID_AREA_KEY);
    if (value && value.startsWith("/") && !value.startsWith("/kart")) {
      return value;
    }
  } catch {
    /* private mode / blocked storage */
  }
  return DEFAULT_KID_AREA;
}
