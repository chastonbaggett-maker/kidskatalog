import Image from "next/image";
import Link from "next/link";
import { categories } from "@/data/categories";

export function ThumbCarousel() {
  return (
    <div className="thumb-carousel px-3 py-3">
      <div className="flex gap-3 overflow-x-auto pb-0.5 scrollbar-none">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/shop/${cat.id}`}
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl ring-1 ring-black/5 transition active:scale-95"
            aria-label={cat.label}
            title={cat.label}
          >
            <Image
              src={cat.image}
              alt={cat.imageAlt}
              fill
              unoptimized
              className="object-cover"
              sizes="64px"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
