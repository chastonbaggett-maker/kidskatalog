import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ProductGallery } from "@/components/ProductGallery";
import { ShelfHeader } from "@/components/ShelfHeader";
import { MoreToysFeed } from "@/components/MoreToysFeed";
import { getCategory } from "@/data/categories";
import { getMoreToys, getToy } from "@/data/toys";
import { AddToKartButton } from "@/components/AddToKartButton";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ToyPage({ params }: Props) {
  const { id } = await params;
  const toy = getToy(id);
  if (!toy) notFound();

  const cat = getCategory(toy.category);
  const gallery = toy.images?.length ? toy.images : [toy.image];
  const more = getMoreToys(toy.id);

  return (
    <AppShell>
      <ShelfHeader backHref="/shop" />

      <div className="star-field flex-1 overflow-y-auto px-4 py-4 scroll-pad-bottom sm:px-6 lg:px-8">
        <div className="product-detail mx-auto w-full max-w-6xl">
          <div className="product-detail__layout">
            <ProductGallery images={gallery} alt={toy.imageAlt} />

            <div className="product-detail__info min-w-0">
              <p className="mb-1 text-sm font-bold text-[var(--blue)]">
                {cat?.label ?? "Toy"}
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--ink)] sm:text-4xl">
                {toy.name}
              </h2>
              <p className="mt-2 text-lg text-[var(--ink-soft)]">{toy.blurb}</p>
              <p className="mt-2 text-sm font-semibold text-[var(--purple-deep)]">
                Ages {toy.ageMin}–{toy.ageMax}
              </p>

              <div className="mt-6 flex max-w-md flex-col gap-3">
                <AddToKartButton toyId={toy.id} />
                <Link
                  href="/kart"
                  className="rounded-full bg-[var(--purple)] px-6 py-3.5 text-center text-base font-bold text-white shadow-md active:scale-[0.98]"
                >
                  Go to Kart
                </Link>
              </div>

              <p className="mt-5 text-center text-sm text-[var(--ink-soft)] sm:text-left">
                No buying here. Save it, then send the Kart to a grown-up.
              </p>
            </div>
          </div>

          <MoreToysFeed seed={more} showText />
        </div>
      </div>
    </AppShell>
  );
}
