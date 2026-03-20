import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      exclude: ["src/types.ts"],
      reporter: ["text", "json-summary"],
    },
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
