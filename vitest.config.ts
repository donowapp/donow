import { defineConfig } from 'vitest/config';

// Unit tests only. The Playwright e2e suite under e2e/ is run separately via
// `npm run test:e2e` (it requires a running browser + dev server), so it must
// be excluded here or Playwright's test.describe() throws under vitest.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
    environment: 'node',
  },
});
