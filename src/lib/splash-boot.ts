/** First-paint splash cover — inline so nav can't flash before CSS/JS. */

/** Mint matches part-1 (pre-tap) so the first paint is the opening clip color. */
export const SPLASH_BG_SOLID = "#3ecfc0";
export const SPLASH_BG_GRADIENT = "none";

/**
 * Critical first-paint CSS.
 * ::before sits UNDER .app-splash so the intro video stays visible.
 * `holding` / `exiting` reveal the shell under the overlay so the cut
 * lands on an already-painted page.
 */
export const SPLASH_BOOT_STYLE = `
html[data-splash="active"],html[data-splash="active"] body,
html[data-splash="holding"],html[data-splash="holding"] body,
html[data-splash="exiting"],html[data-splash="exiting"] body{
  background-color:${SPLASH_BG_SOLID}!important;background-image:none!important;
}
html[data-splash="active"] .app-shell,
html[data-splash="active"] .bottom-nav,
html[data-splash="active"] .bottom-nav__frost{
  visibility:hidden!important;opacity:0!important;pointer-events:none!important;
}
html[data-splash="holding"] .app-shell,
html[data-splash="holding"] .bottom-nav,
html[data-splash="holding"] .bottom-nav__frost,
html[data-splash="exiting"] .app-shell,
html[data-splash="exiting"] .bottom-nav,
html[data-splash="exiting"] .bottom-nav__frost{
  visibility:visible!important;opacity:1!important;
}
html[data-splash="active"]::before,
html[data-splash="holding"]::before{
  content:"";
  position:fixed;top:0;left:0;right:0;bottom:0;z-index:9990;
  width:100%;height:100%;
  min-height:100vh;min-height:100dvh;min-height:-webkit-fill-available;
  height:calc(100dvh + 4rem);
  margin:0;padding:0;border:0;
  background-color:${SPLASH_BG_SOLID};
  background-image:none;
  background-size:100% 100%;background-repeat:no-repeat;background-position:center;
  pointer-events:none;
}
`.trim();
