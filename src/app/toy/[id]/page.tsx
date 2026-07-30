import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getCategory } from "@/data/categories";
import { getToy } from "@/data/toys";
import { AddToKartButton } from "@/components/AddToKartButton";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ToyPage({ params }: Props) {
  const { id } = await params;
  const toy = getToy(id);
  if (!toy) notFound();

  const cat = getCategory(toy.category);

  return (
    <AppShell>
      <header className="flex items-center gap-2 bg-[image:var(--header-grad)] px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <Link
          href="/shop"
          className="flex h-10 w-10 items-center justify-center"
          aria-label="Back"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 5 8 12l7 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <h1 className="flex-1 truncate text-center font-[family-name:var(--font-display)] text-xl font-bold">
          {toy.name}
        </h1>
        <span className="w-10" />
      </header>

      <div className="star-field flex-1 overflow-y-auto px-4 py-4 pb-8">
        <div className="relative mb-4 aspect-square overflow-hidden rounded-[2rem] bg-white shadow-md">
          <Image
            src={toy.image}
            alt={toy.imageAlt}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 430px) 100vw, 430px"
          />
        </div>

        <p className="mb-1 text-sm font-bold text-[var(--blue)]">
          {cat?.label ?? "Toy"}
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--ink)]">
          {toy.name}
        </h2>
        <p className="mt-2 text-lg text-[var(--ink-soft)]">{toy.blurb}</p>
        <p className="mt-2 text-sm font-semibold text-[var(--purple-deep)]">
          Ages {toy.ageMin}–{toy.ageMax}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <AddToKartButton toyId={toy.id} />
          <Link
            href="/kart"
            className="rounded-full bg-[var(--purple)] px-6 py-3.5 text-center text-base font-bold text-white shadow-md active:scale-[0.98]"
          >
            Go to Kart
          </Link>
        </div>

        <p className="mt-5 text-center text-sm text-[var(--ink-soft)]">
          No buying here. Save it, then send the Kart to a grown-up.
        </p>
      </div>
    </AppShell>
  );
}
