import type { Metadata } from "next";
import { ShelfHeader } from "@/components/ShelfHeader";
import { AssociatesDisclosure } from "@/components/parent/AssociatesDisclosure";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How KidsKatalog handles Kid Mode and Parent Mode. As an Amazon Associate I earn from qualifying purchases.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <div className="app-shell relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="shelf-page star-field flex min-h-0 flex-1 flex-col overflow-hidden">
        <ShelfHeader title="Privacy" subtitle="Parent Mode" logoHref="/" backHref="/" />
        <div className="page-scroll star-field min-h-0 flex-1 px-4 py-6 scroll-pad-bottom">
          <article className="mx-auto flex w-full max-w-xl flex-col gap-4 text-base text-[var(--ink)]">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">
              Privacy
            </h1>
            <p>
              KidsKatalog is a toy catalog. Kid Mode is for browsing. Parent Mode is
              where grown-ups see Amazon buy links.
            </p>
            <p>
              Kid Mode does not show prices, buy buttons, or ads. It does not load
              analytics, tag managers, ad pixels, or Amazon-hosted images and videos.
            </p>
            <p>
              Parent pages link to Amazon. We keep the short toy descriptions and do
              not show prices, star ratings, or review counts.
            </p>
            <AssociatesDisclosure />
            <p>
              Leaving Kid Mode asks for a birth year on this device. That year is not
              saved. We keep only a session pass flag.
            </p>
            <p>We do not sell personal information.</p>
            <p>
              <a href="/" className="font-bold text-[var(--blue-deep)]">
                Back to the catalog
              </a>
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}
