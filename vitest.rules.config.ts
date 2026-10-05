import { defineConfig } from "vitest/config";

// Rules тестови захтевају Firebase емулатор: `npm run test:rules`.
export default defineConfig({
  test: {
    include: ["rules-tests/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
