import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const root = import.meta.dirname;

export default defineConfig({
  plugins: [react()],
  base: "/Timska-kasa/",
  test: {
    exclude: ["**/node_modules/**", "dist/**", "rules-tests/**"],
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
