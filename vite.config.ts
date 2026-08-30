import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/evolution/",
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
