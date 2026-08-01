import type { Toy } from "@/types/toy";
import { toys as seedToys } from "@/data/toys";
import { readStore, writeStore } from "@/lib/json-store";

type CatalogData = {
  version: number;
  toys: Toy[];
};

const DEFAULT_CATALOG: CatalogData = {
  version: 1,
  toys: seedToys,
};

async function loadCatalog(): Promise<CatalogData> {
  const data = await readStore("catalog", DEFAULT_CATALOG);
  if (!data.toys?.length) return DEFAULT_CATALOG;
  return data;
}

async function saveCatalog(data: CatalogData): Promise<void> {
  await writeStore("catalog", data);
}

export async function getCatalogToys(): Promise<Toy[]> {
  const data = await loadCatalog();
  return data.toys;
}

export async function getCatalogToy(id: string): Promise<Toy | undefined> {
  const data = await loadCatalog();
  return data.toys.find((t) => t.id === id);
}

export async function getCatalogToysByIds(ids: string[]): Promise<Toy[]> {
  const data = await loadCatalog();
  const byId = new Map(data.toys.map((t) => [t.id, t]));
  return ids.map((id) => byId.get(id)).filter((t): t is Toy => Boolean(t));
}

export async function getCatalogToysByCategory(category: string): Promise<Toy[]> {
  const data = await loadCatalog();
  return data.toys.filter((t) => t.category === category);
}

export async function getMoreCatalogToys(currentId: string): Promise<Toy[]> {
  const data = await loadCatalog();
  const current = data.toys.find((t) => t.id === currentId);
  const rest = data.toys.filter((t) => t.id !== currentId);
  if (!current) return rest;
  const samePile = rest.filter((t) => t.category === current.category);
  const other = rest.filter((t) => t.category !== current.category);
  return [...samePile, ...other];
}

export async function addCatalogToy(toy: Toy): Promise<Toy> {
  const data = await loadCatalog();
  if (data.toys.some((t) => t.id === toy.id)) {
    throw new Error("A toy with this id already exists");
  }
  data.toys.unshift(toy);
  await saveCatalog(data);
  return toy;
}

export async function updateCatalogToy(id: string, patch: Partial<Toy>): Promise<Toy | null> {
  const data = await loadCatalog();
  const index = data.toys.findIndex((t) => t.id === id);
  if (index < 0) return null;
  const next = { ...data.toys[index]!, ...patch, id };
  data.toys[index] = next;
  await saveCatalog(data);
  return next;
}

export async function deleteCatalogToy(id: string): Promise<boolean> {
  const data = await loadCatalog();
  const next = data.toys.filter((t) => t.id !== id);
  if (next.length === data.toys.length) return false;
  data.toys = next;
  await saveCatalog(data);
  return true;
}
