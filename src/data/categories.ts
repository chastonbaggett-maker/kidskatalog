import type { Category } from "@/types/toy";

export const categories: Category[] = [
  { id: "dinos", label: "Dinos", hue: "#2F6B4F" },
  { id: "plush", label: "Plush", hue: "#8B5E3C" },
  { id: "cars", label: "Cars", hue: "#C23B22" },
  { id: "blocks", label: "Blocks", hue: "#C9A227" },
  { id: "outside", label: "Outside", hue: "#2E7D32" },
  { id: "games", label: "Games", hue: "#1565C0" },
  { id: "stem", label: "Build", hue: "#546E7A" },
  { id: "pretend", label: "Pretend", hue: "#6A1B9A" },
];

export function getCategory(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}
