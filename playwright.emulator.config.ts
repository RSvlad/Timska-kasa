import { defineConfig, devices } from "@playwright/test";

const PORT = 4174;
const OUT_DIR = "dist-e2e";

export default defineConfig({
  testDir: "e2e-emulator",
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}/Timska-kasa/`,
    locale: "sr-RS",
    trace: "on-first-retry",
    acceptDownloads: true,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npx vite build --outDir ${OUT_DIR} && npm run preview -- --outDir ${OUT_DIR} --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/Timska-kasa/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      VITE_USE_EMULATORS: "true",
      VITE_FIREBASE_API_KEY: "e2e-api-key",
      VITE_FIREBASE_AUTH_DOMAIN: "demo-timska-kasa.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "demo-timska-kasa",
      VITE_FIREBASE_STORAGE_BUCKET: "demo-timska-kasa.appspot.com",
      VITE_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
      VITE_FIREBASE_APP_ID: "1:000000000000:web:e2e",
    },
  },
});
