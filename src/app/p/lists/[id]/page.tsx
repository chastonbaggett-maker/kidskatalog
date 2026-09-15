import { notFound, redirect } from "next/navigation";
import { ParentAuthLinks } from "@/components/parent/ParentAuthLinks";
import { ShelfHeader } from "@/components/ShelfHeader";
import { getParentUser } from "@/lib/parent-auth";
import { getParentList } from "@/lib/parent-list-store";
import {
  parentSavedListQueryPath,
  parentSignInPath,
} from "@/lib/parent-paths";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ParentSavedListPage({ params }: Props) {
  const { id } = await params;
  const user = await getParentUser();
  if (!user) {
    return (
      <div className="shelf-page star-field flex min-h-0 flex-1 flex-col overflow-hidden">
        <ShelfHeader
          title="Saved list"
          subtitle="Log in to open this list"
          backHref="/p"
          logoHref="/p"
          trailing={<ParentAuthLinks returnTo={`/p/lists/${id}`} />}
        />
        <div className="page-scroll star-field min-h-0 flex-1 px-4 py-4">
          <div className="shelf-panel">
            <div className="shelf-panel__surface px-6 py-14 text-center">
              <p className="text-[var(--ink-soft)]">
                Saved lists are for the parent who created them. Log in, or use
                a one-shot /p?ids= share link.
              </p>
              <p className="mt-3 text-sm font-bold text-[var(--blue-deep)]">
                <a href={parentSignInPath(`/p/lists/${id}`)}>Log in</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const list = await getParentList(id, user.id);
  if (!list) notFound();
  redirect(parentSavedListQueryPath(list.id));
}
