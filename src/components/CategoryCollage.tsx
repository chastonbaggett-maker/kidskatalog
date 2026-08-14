"use client";

import { ToyPhoto } from "@/components/ToyPhoto";

type Props = {
  images: readonly [string, string, string, string] | readonly string[];
  alt: string;
  className?: string;
  /** Smaller gaps/padding for shop thumb strip. */
  compact?: boolean;
};

/** 2×2 product-photo collage used on pile cards and category thumbs. */
export function CategoryCollage({
  images,
  alt,
  className = "",
  compact = false,
}: Props) {
  const cells = [0, 1, 2, 3].map((i) => images[i] ?? images[i % images.length] ?? "");

  return (
    <span
      className={`category-collage${compact ? " category-collage--compact" : ""} ${className}`.trim()}
      role="img"
      aria-label={alt}
    >
      {cells.map((src, i) => (
        <span key={`${src}-${i}`} className="category-collage__cell">
          {src ? (
            <ToyPhoto
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              className="category-collage__photo"
            />
          ) : null}
        </span>
      ))}
    </span>
  );
}
