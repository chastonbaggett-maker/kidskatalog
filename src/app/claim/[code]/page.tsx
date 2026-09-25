import type { Metadata } from "next";
import { ShelfHeader } from "@/components/ShelfHeader";
import { AssociatesDisclosure } from "@/components/parent/AssociatesDisclosure";
import { ClaimList } from "@/components/parent/ClaimList";

export const metadata: Metadata = {
  title: "Claim a list",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ code: string }> };

export default async function ClaimCodePage({ params }: Props) {
  const { code } = await params;
  return (
    <div className="app-shell relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="shelf-page star-field flex min-h-0 flex-1 flex-col overflow-hidden">
        <ShelfHeader title="Claim a list" logoHref="/" backHref="/claim" trailing={null} />
        <div className="page-scroll star-field min-h-0 flex-1 px-4 py-6 scroll-pad-bottom">
          <AssociatesDisclosure className="mx-auto mb-4 max-w-md text-center" />
          <ClaimList initialCode={decodeURIComponent(code)} />
        </div>
      </div>
    </div>
  );
}
