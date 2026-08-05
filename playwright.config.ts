import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./scripts",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://localhost:3456",
  },
});
