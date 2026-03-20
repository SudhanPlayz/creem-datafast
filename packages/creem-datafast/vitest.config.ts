import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      all: true,
      enabled: true,
      include: ["src/**/*.ts"],
      exclude: ["src/types.ts"],
      reporter: ["text", "json-summary"],
      thresholds: {
        branches: 99,
        functions: 99,
        lines: 99,
        statements: 99,
      },
    },
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
