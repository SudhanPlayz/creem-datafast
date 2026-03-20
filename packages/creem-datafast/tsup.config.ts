import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/react/index.tsx",
    "src/next.ts",
    "src/client/index.ts",
    "src/idempotency/upstash.ts",
  ],
  clean: true,
  dts: true,
  format: ["esm", "cjs"],
  sourcemap: true,
  target: "es2022",
  outDir: "dist",
  treeshake: true,
  splitting: false,
});
