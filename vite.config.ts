import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/Timska-kasa/",
  resolve: {
    alias: {
      "@identity": path.resolve(__dirname, "src/identity"),
      "@finance": path.resolve(__dirname, "src/finance"),
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
});
