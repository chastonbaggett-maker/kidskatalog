import Image from "next/image";
import Link from "next/link";
import type { Toy } from "@/types/toy";

export function ThumbCarousel({ toys }: { toys: Toy[] }) {
  if (toys.length === 0) return null;

  return (
    <div className="mx-4 mb-3 overflow-hidden rounded-[1.5rem] bg-white px-3 py-3 shadow-sm ring-1 ring-black/[0.03]">
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
        {toys.map((toy) => (
          <Link
            key={toy.id}
            href={`/toy/${toy.id}`}
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl ring-1 ring-black/5 transition active:scale-95"
          >
            <Image
              src={toy.image}
              alt={toy.imageAlt}
              fill
              className="object-cover"
              sizes="64px"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
