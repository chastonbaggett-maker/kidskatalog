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
      <div className="flex min-h-0 flex-1 flex-col">
        <ShelfHeader backHref="/shop" />

        <div className="page-scroll star-field px-4 py-4 sm:px-6 lg:px-8">
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

              <div className="mt-6 flex max-w-md items-stretch gap-3">
                <AddToKartButton toyId={toy.id} />
                <Link
                  href="/kart"
                  aria-label="Go to Kart"
                  className="kart-go-btn inline-flex h-[3.9rem] w-[3.9rem] shrink-0 items-center justify-center rounded-full text-white shadow-md transition active:scale-[0.98]"
                >
                  <svg
                    className="kart-go-arrow shrink-0"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M9.5 5.5 16 12l-6.5 6.5"
                      stroke="currentColor"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M15 12H6"
                      stroke="currentColor"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                    />
                  </svg>
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
      </div>
    </AppShell>
  );
}
