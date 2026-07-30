"use client";

import Image from "next/image";
import { useState } from "react";

export function ProductGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const shots = images.length > 0 ? images : [];
  const [active, setActive] = useState(0);
  const current = shots[active] ?? shots[0];

  if (!current) return null;

  return (
    <div className="mb-4">
      <div className="relative mb-3 aspect-[4/5] w-full overflow-hidden rounded-[2rem] bg-white shadow-md lg:aspect-square">
        <Image
          src={current}
          alt={alt}
          fill
          priority
          className="object-contain p-3 sm:p-4"
          sizes="(max-width: 640px) 100vw, (max-width: 900px) 90vw, 520px"
        />
      </div>

      {shots.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
          {shots.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white ring-2 transition ${
                i === active
                  ? "ring-[var(--blue)]"
                  : "ring-transparent opacity-80"
              }`}
              aria-label={`Photo ${i + 1}`}
              aria-pressed={i === active}
            >
              <Image
                src={src}
                alt=""
                fill
                className="object-contain p-1"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
