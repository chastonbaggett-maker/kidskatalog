import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
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
    <>
      <Header />
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-white/50 ring-1 ring-[var(--forest)]/10">
          <div
            className="absolute inset-0 opacity-50"
            style={{
              background: `linear-gradient(160deg, ${toy.color}66, transparent 65%)`,
            }}
          />
          <Image
            src={toy.image}
            alt={toy.imageAlt}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>

        <div className="flex flex-col justify-center">
          <Link
            href={`/shop/${toy.category}`}
            className="mb-3 w-fit text-sm font-bold text-[var(--leaf)] hover:underline"
          >
            {cat?.label ?? "Browse"}
          </Link>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-[var(--forest)] sm:text-5xl">
            {toy.name}
          </h1>
          <p className="mt-3 text-lg text-[var(--ink-soft)]">{toy.blurb}</p>
          <p className="mt-2 text-sm font-semibold text-[var(--forest)]">
            Ages {toy.ageMin}–{toy.ageMax}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <AddToKartButton toyId={toy.id} />
            <Link
              href="/kart"
              className="rounded-2xl bg-[var(--mint)] px-6 py-3.5 text-center text-base font-bold text-[var(--forest)] transition hover:bg-[var(--forest)] hover:text-white active:scale-[0.98]"
            >
              Go to Kart
            </Link>
          </div>

          <p className="mt-6 text-sm text-[var(--ink-soft)]">
            No buying here. Save it, then send the Kart to a grown-up.
          </p>
        </div>
      </main>
    </>
  );
}
