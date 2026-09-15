"use client";

import Link from "next/link";
import type { Toy } from "@/types/toy";
import { ProductGallery } from "@/components/ProductGallery";
import { ShelfHeader } from "@/components/ShelfHeader";
import { AssociatesDisclosure } from "@/components/parent/AssociatesDisclosure";
import { ParentBuyButton } from "@/components/parent/ParentBuyButton";
import { ParentWishlistButton } from "@/components/parent/ParentWishlistButton";

type Props = {
  toy: Toy;
  categoryLabel: string;
  gallery: string[];
  buyUrl: string;
  buyPlaceholder?: boolean;
};

export function ParentToyView({
  toy,
  categoryLabel,
  gallery,
  buyUrl,
  buyPlaceholder = true,
}: Props) {
  return (
    <div className="shelf-page star-field flex min-h-0 flex-1 flex-col">
      <ShelfHeader
        title="Parent Mode"
        subtitle="Wish list + Buy — kids never see these links"
        backHref="/p"
        logoHref="/p"
        trailing={<span className="w-11" aria-hidden />}
      />

      <div className="page-scroll star-field min-h-0 flex-1 py-4 scroll-pad-bottom">
        <div className="product-detail mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="product-detail__layout">
            <ProductGallery
              images={gallery}
              videos={toy.videos}
              poster={toy.image}
              alt={toy.imageAlt}
            />

            <div className="product-detail__info min-w-0">
              <p className="mb-1 text-sm font-bold text-[var(--blue)]">
                {categoryLabel}
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--ink)] sm:text-4xl">
                {toy.name}
              </h2>
              <p className="mt-2 text-lg text-[var(--ink-soft)]">{toy.blurb}</p>
              <p className="mt-2 text-sm font-semibold text-[var(--purple-deep)]">
                Ages {toy.ageMin}–{toy.ageMax}
              </p>

              <div className="mt-6 flex max-w-md flex-col gap-3 sm:flex-row sm:items-stretch">
                <ParentBuyButton href={buyUrl} />
                <ParentWishlistButton toyId={toy.id} />
              </div>

              <p className="mt-4 text-sm text-[var(--ink-soft)]">
                {buyPlaceholder
                  ? "Associates link goes here when approved."
                  : "Opens Amazon in your phone's browser — not inside the app."}
              </p>
              <AssociatesDisclosure className="mt-3 max-w-md" placeholder={buyPlaceholder} />

              <p className="mt-5">
                <Link
                  href="/p"
                  className="text-sm font-bold text-[var(--blue-deep)]"
                >
                  Open your wish list
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
