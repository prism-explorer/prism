import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // Next needs `jsx: preserve`; Vitest renders React trees in tests, so use the
  // automatic runtime when transforming .tsx here.
  oxc: { jsx: "automatic" },
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
