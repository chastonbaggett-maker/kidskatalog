/** First-paint splash cover — inline so nav can't flash before CSS/JS. */

export const SPLASH_BG_SOLID = "#3ecfc0";
export const SPLASH_BG_GRADIENT =
  "linear-gradient(165deg, #6ee8db 0%, #3ecfc0 42%, #2bb8a8 100%)";

/**
 * Critical first-paint CSS.
 * ::before sits UNDER .app-splash during the intro video.
 * During exiting, the shell stays under the white→fade overlay.
 */
export const SPLASH_BOOT_STYLE = `
html[data-splash="active"],html[data-splash="active"] body{
  background-color:${SPLASH_BG_SOLID}!important;background-image:none!important;
}
html[data-splash="exiting"],html[data-splash="exiting"] body{
  background-color:#fff!important;background-image:none!important;
}
html[data-splash="active"] .app-shell,
html[data-splash="active"] .bottom-nav,
html[data-splash="active"] .bottom-nav__frost{
  visibility:hidden!important;opacity:0!important;pointer-events:none!important;
}
html[data-splash="exiting"] .app-shell,
html[data-splash="exiting"] .bottom-nav,
html[data-splash="exiting"] .bottom-nav__frost{
  visibility:visible!important;opacity:1!important;pointer-events:none!important;
}
html[data-splash="active"]::before{
  content:"";
  position:fixed;top:0;left:0;right:0;bottom:0;z-index:9990;
  width:100%;height:100%;
  min-height:100vh;min-height:100dvh;min-height:-webkit-fill-available;
  height:calc(100dvh + 4rem);
  margin:0;padding:0;border:0;
  background-color:${SPLASH_BG_SOLID};
  background-image:${SPLASH_BG_GRADIENT};
  background-size:100% 100%;background-repeat:no-repeat;background-position:center;
  pointer-events:none;
}
html[data-splash="exiting"]::before,
html[data-splash="exiting"] #app-splash-boot{
  opacity:0!important;visibility:hidden!important;pointer-events:none!important;
}
`.trim();
