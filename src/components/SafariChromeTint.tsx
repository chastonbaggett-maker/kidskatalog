/**
 * Safari 26+ ignores theme-color and tints browser chrome from fixed/sticky
 * elements at the viewport edges (solid background-color only).
 * These probes sit at the top/bottom so status bar + toolbar match adjacent UI.
 */
export function SafariChromeTint() {
  return (
    <>
      <div className="safari-chrome-tint safari-chrome-tint--top" aria-hidden />
      <div
        className="safari-chrome-tint safari-chrome-tint--bottom"
        aria-hidden
      />
    </>
  );
}
