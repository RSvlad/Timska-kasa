import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const root = import.meta.dirname;

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Тимска каса",
        short_name: "Каса",
        description: "Тимска каса – евиденција заједничких уплата и трошкова",
        lang: "sr",
        theme_color: "#fdf6f0",
        background_color: "#fdf6f0",
        display: "standalone",
        start_url: "/Timska-kasa/",
        scope: "/Timska-kasa/",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png}"],
        navigateFallback: "/Timska-kasa/index.html",
        // Firebase/Google API позиви остају мрежни (Firestore има сопствени offline кеш).
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts" },
          },
        ],
      },
    }),
  ],
  base: "/Timska-kasa/",
  test: {
    exclude: ["**/node_modules/**", "dist/**", "rules-tests/**", "e2e/**"],
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
