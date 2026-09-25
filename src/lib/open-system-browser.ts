"use client";

/**
 * Open an Amazon Special Link in the system browser.
 * Standalone PWA / in-app WebViews must navigate cross-origin so iOS/Android
 * hand off to Safari/Chrome instead of keeping Amazon inside the WebView.
 */
export function openSystemBrowser(
  url: string,
  event?: { preventDefault(): void },
): void {
  if (typeof window === "undefined") return;

  const nav = window.navigator as Navigator & { standalone?: boolean };
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true;

  if (standalone) {
    event?.preventDefault();
    window.location.assign(url);
    return;
  }

  const opened = window.open(url, "_blank", "noopener");
  if (opened) {
    event?.preventDefault();
    opened.opener = null;
  }
}
