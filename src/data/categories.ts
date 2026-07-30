import type { Category } from "@/types/toy";

export const categories: Category[] = [
  {
    id: "dinos",
    label: "Dinos",
    hue: "#4A90E2",
    image: "/categories/dinos.svg",
    imageAlt: "Dinosaurs",
  },
  {
    id: "plush",
    label: "Plush",
    hue: "#F5A9C5",
    image: "/categories/plush.svg",
    imageAlt: "Plush toys",
  },
  {
    id: "cars",
    label: "Cars",
    hue: "#5BA3F0",
    image: "/categories/cars.svg",
    imageAlt: "Cars and trucks",
  },
  {
    id: "blocks",
    label: "Blocks",
    hue: "#B19CD9",
    image: "/categories/blocks.svg",
    imageAlt: "Building blocks",
  },
  {
    id: "outside",
    label: "Outside",
    hue: "#6CB6FF",
    image: "/categories/outside.svg",
    imageAlt: "Outside play",
  },
  {
    id: "games",
    label: "Games",
    hue: "#9B7FD1",
    image: "/categories/games.svg",
    imageAlt: "Games",
  },
  {
    id: "stem",
    label: "Build",
    hue: "#7B6DFF",
    image: "/categories/stem.svg",
    imageAlt: "Build and robots",
  },
  {
    id: "pretend",
    label: "Pretend",
    hue: "#EF8FB3",
    image: "/categories/pretend.svg",
    imageAlt: "Pretend play",
  },
];

export function getCategory(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}
