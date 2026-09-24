/**
 * Safari 26 Liquid Glass caches the top chrome tint until a scroll or layout
 * change. Mode colors update sticky headers instantly via CSS, but the status
 * bar stays stale until we force a re-composite.
 *
 * Browser only — installed PWA has no Safari chrome to tint.
 */

function readHeaderSolid(): string {
  const from =
    document.querySelector(".feed-header, .shelf-header--pile, .shelf-header--rounded, .app-shell") ??
    document.documentElement;
  const solid = getComputedStyle(from)
    .getPropertyValue("--header-solid")
    .trim();
  return solid || "#2bb8a8";
}

export function nudgeSafariChromeTint() {
  if (typeof window === "undefined") return;
  if (document.documentElement.dataset.standalone === "true") return;

  const solid = readHeaderSolid();
  const headers = document.querySelectorAll<HTMLElement>(
    ".feed-header, .shelf-header--rounded, .shelf-header--pile",
  );

  for (const el of headers) {
    // Mutate the sampled property itself (not only a CSS variable).
    el.style.backgroundColor = solid;
    // Tiny layout change — Liquid Glass re-samples on layout, not bare paints.
    el.style.top = "0.5px";
    void el.offsetHeight;
    el.style.top = "";
    // Drop inline so stylesheet / PWA gradients stay in control after the nudge.
    el.style.backgroundColor = "";
  }

  const probe = document.querySelector<HTMLElement>(".safari-safe-area-tint");
  if (probe) {
    probe.style.backgroundColor = solid;
    void probe.offsetHeight;
  }

  const scrolling = document.scrollingElement as HTMLElement | null;
  if (scrolling) {
    const y = scrolling.scrollTop;
    scrolling.scrollTop = y + 1;
    scrolling.scrollTop = y;
  }

  // App shell keeps document overflow hidden — nudge inner scrollports too.
  document.querySelectorAll<HTMLElement>(".page-scroll").forEach((el) => {
    const y = el.scrollTop;
    el.scrollTop = y + 1;
    el.scrollTop = y;
  });
}

/** Run after the next paint so CSS vars / mode classes are committed. */
export function scheduleSafariChromeTintNudge() {
  if (typeof window === "undefined") return;
  if (document.documentElement.dataset.standalone === "true") return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      nudgeSafariChromeTint();
    });
  });
}

export function readSafariHeaderSolid(): string {
  if (typeof window === "undefined") return "#2bb8a8";
  return readHeaderSolid();
}
