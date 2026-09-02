import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  base: "/evolution/",
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        benchmark: resolve(import.meta.dirname, "benchmark.html"),
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
