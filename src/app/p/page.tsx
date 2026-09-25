import { ParentWishlistView } from "@/components/parent/ParentWishlistView";
import { resolveParentBuyUrls } from "@/lib/associates";
import { getCatalogToysByIds } from "@/lib/catalog-store";
import { toParentToys } from "@/lib/kid-surface";
import { getParentUser } from "@/lib/parent-auth";
import { getParentList } from "@/lib/parent-list-store";
import {
  parseSavedListId,
  parseWishlistIds,
  parseWishlistInterest,
  parentSavedListQueryPath,
  parentWishlistPath,
} from "@/lib/parent-paths";
import type { Toy } from "@/types/toy";

type Props = {
  searchParams: Promise<{
    ids?: string | string[];
    list?: string | string[];
    interest?: string | string[];
  }>;
};

export default async function ParentWishlistPage({ searchParams }: Props) {
  const params = await searchParams;
  const ids = parseWishlistIds(params.ids);
  const interest = parseWishlistInterest(params.interest);
  const listId = parseSavedListId(params.list);

  let toys: Toy[] = [];
  let savedListName: string | undefined;

  if (listId) {
    const user = await getParentUser();
    const list = user ? await getParentList(listId, user.id) : null;
    if (list) {
      toys = await getCatalogToysByIds(list.toyIds);
      savedListName = list.name;
    } else if (ids.length > 0) {
      toys = await getCatalogToysByIds(ids);
    }
  } else if (ids.length > 0) {
    toys = await getCatalogToysByIds(ids);
  }

  const returnTo = savedListName && listId
    ? parentSavedListQueryPath(listId)
    : ids.length > 0
      ? parentWishlistPath(ids, interest)
      : "/p";

  return (
    <ParentWishlistView
      initialToys={toParentToys(toys) as Toy[]}
      buyUrls={resolveParentBuyUrls(toys)}
      savedListName={savedListName}
      returnTo={returnTo}
      interest={interest}
    />
  );
}
