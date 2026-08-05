import type { ImgHTMLAttributes } from "react";

/**
 * Clipped catalog photo — sizing/overflow is enforced in CSS on the container +
 * photo class. No opacity toggles (those caused visible disappear/reappear flashes).
 */
export function ToyPhoto(props: ImgHTMLAttributes<HTMLImageElement>) {
  return <img {...props} />;
}
