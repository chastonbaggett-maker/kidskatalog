import type { Category } from "@/types/toy";

export const categories: Category[] = [
  { id: "dinos", label: "Dinos", hue: "#4A90E2" },
  { id: "plush", label: "Plush", hue: "#F5A9C5" },
  { id: "cars", label: "Cars", hue: "#5BA3F0" },
  { id: "blocks", label: "Blocks", hue: "#B19CD9" },
  { id: "outside", label: "Outside", hue: "#6CB6FF" },
  { id: "games", label: "Games", hue: "#9B7FD1" },
  { id: "stem", label: "Build", hue: "#7B6DFF" },
  { id: "pretend", label: "Pretend", hue: "#EF8FB3" },
];

export function getCategory(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}
