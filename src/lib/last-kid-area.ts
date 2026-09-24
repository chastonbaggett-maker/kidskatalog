/** Remembers the last kid browse area so Kart can send them back. */

export const LAST_KID_AREA_KEY = "kk_last_kid_area";
export const DEFAULT_KID_AREA = "/shop";

export function isKidBrowsePath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/shop") ||
    pathname.startsWith("/toy") ||
    pathname.startsWith("/menu")
  );
}

export function rememberKidArea(pathname: string, search = "") {
  if (typeof window === "undefined") return;
  if (!isKidBrowsePath(pathname)) return;
  try {
    sessionStorage.setItem(LAST_KID_AREA_KEY, `${pathname}${search}`);
  } catch {
    /* private mode / blocked storage */
  }
}

export function readLastKidArea(): string {
  if (typeof window === "undefined") return DEFAULT_KID_AREA;
  try {
    const value = sessionStorage.getItem(LAST_KID_AREA_KEY);
    if (value && value.startsWith("/") && !value.startsWith("/kart")) {
      return value;
    }
  } catch {
    /* private mode / blocked storage */
  }
  return DEFAULT_KID_AREA;
}
