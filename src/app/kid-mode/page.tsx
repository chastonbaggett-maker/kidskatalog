import type { Metadata } from "next";
import { ShelfHeader } from "@/components/ShelfHeader";
import { AssociatesDisclosure } from "@/components/parent/AssociatesDisclosure";
import { kidsOrigin } from "@/lib/deployment";

export const metadata: Metadata = {
  title: "Kid Mode",
  description: "Kid Mode is a separate site with no prices or buy buttons.",
  robots: { index: true, follow: true },
};

export default function KidModePage() {
  const kids = kidsOrigin();
  return (
    <div className="app-shell relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="shelf-page star-field flex min-h-0 flex-1 flex-col overflow-hidden">
        <ShelfHeader
          title="Kid Mode"
          subtitle="A separate site for kids"
          logoHref="/"
          backHref="/"
          trailing={null}
        />
        <div className="page-scroll star-field min-h-0 flex-1 px-4 py-6 scroll-pad-bottom">
          <article className="mx-auto flex w-full max-w-xl flex-col gap-4 text-base text-[var(--ink)]">
            <AssociatesDisclosure />
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">
              Kid Mode lives on its own site
            </h1>
            <p>
              This website is the parent catalog. Kid Mode has the same toys and
              no prices, buy buttons, or ads. A child&apos;s device stores toy
              picks until you pair it or claim a code.
            </p>
            <p>
              Sign in, open your lists, and choose Set up Kid Mode. You&apos;ll
              get a link and a QR code to open on the child&apos;s device. The
              device gets an opaque credential. We don&apos;t ask for a
              child&apos;s name or email.
            </p>
            <p>
              A child can also tap Show a grown-up. That makes a short code.
              Open Claim a list and enter it to save those toys on your account.
              Paired devices update your list as toys are added or removed.
            </p>
            {kids ? (
              <p>
                The kids site is <span className="font-bold">{kids}</span>.
              </p>
            ) : (
              <p>The kids site address is set with KIDS_ORIGIN.</p>
            )}
            <p className="flex flex-wrap gap-4 text-sm font-bold text-[var(--blue-deep)]">
              <a href="/p/lists">Your account</a>
              <a href="/claim">Claim a list</a>
              <a href="/">Back to the catalog</a>
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}
