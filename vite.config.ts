import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const root = import.meta.dirname;

export default defineConfig({
  plugins: [react()],
  base: "/Timska-kasa/",
  test: {
    exclude: ["**/node_modules/**", "dist/**", "rules-tests/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/finance/domain/**", "src/finance/application/**"],
      exclude: ["**/*.test.ts", "**/*.tsx", "src/finance/application/use*.ts"],
      thresholds: { lines: 50, functions: 50, statements: 50, branches: 50 },
    },
  },
  resolve: {
    alias: {
      "@identity": path.resolve(root, "src/identity"),
      "@finance": path.resolve(root, "src/finance"),
      "@shared": path.resolve(root, "src/shared"),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "firebase", test: /node_modules[\\/](@firebase|firebase)[\\/]/ },
            { name: "react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
});
