/** First-paint splash cover — inline so nav can't flash before CSS/JS. */

/** Brand mint — CSS plate is the only background for part 1 (video is screened). */
export const SPLASH_BG_SOLID = "#3ecfc0";
export const SPLASH_BG_GRADIENT = "none";
export const SPLASH_PART1_POSTER = "/splash/intro-part-1-mint-start.jpg?v=4";
export const SPLASH_PART1_END = "/splash/intro-part-1-mint-end.jpg?v=4";

/**
 * Critical first-paint CSS.
 * Solid mint plate only — part-1 video uses mix-blend screen so mint never shifts.
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
  pointer-events:none;
}
`.trim();
