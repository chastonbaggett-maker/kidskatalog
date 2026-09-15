import { ParentAuthForm } from "@/components/parent/ParentAuthForm";
import { ParentAuthLinks } from "@/components/parent/ParentAuthLinks";
import { ParentClerkSignIn } from "@/components/parent/ParentClerkSignIn";
import { ShelfHeader } from "@/components/ShelfHeader";
import { isClerkConfigured } from "@/lib/clerk-config";
import { parentReturnPath } from "@/lib/parent-paths";

type Props = {
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export default async function ParentSignInPage({ searchParams }: Props) {
  const params = await searchParams;
  const returnTo = parentReturnPath(params.returnTo);

  return (
    <div className="shelf-page star-field flex min-h-0 flex-1 flex-col overflow-hidden">
      <ShelfHeader
        title="Parent Mode"
        subtitle="Log in to save wish lists"
        backHref="/p"
        logoHref="/p"
        trailing={<ParentAuthLinks returnTo={returnTo} />}
      />
      <div className="page-scroll star-field min-h-0 flex-1 px-4 py-4 scroll-pad-bottom">
        <div className="mx-auto w-full max-w-md">
          {isClerkConfigured() ? (
            <ParentClerkSignIn returnTo={returnTo} />
          ) : (
            <ParentAuthForm mode="signin" returnTo={returnTo} />
          )}
        </div>
      </div>
    </div>
  );
}
