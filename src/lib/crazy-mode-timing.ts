/** Keep in sync with crazy-btn-strike-pulse in globals.css (0.28s). */
export const CRAZY_CARD_FLASH_MS = 280;

/** Full-screen flash duration — matches .crazy-screen-flash (0.45s). */
export const CRAZY_SCREEN_FLASH_MS = 450;

/** Random delay between crazy-mode randomize pulses. */
export const CRAZY_FLASH_MIN_MS = 3000;
export const CRAZY_FLASH_MAX_MS = 7000;

export function nextCrazyIntervalMs() {
  const span = CRAZY_FLASH_MAX_MS - CRAZY_FLASH_MIN_MS;
  return CRAZY_FLASH_MIN_MS + Math.floor(Math.random() * (span + 1));
}
