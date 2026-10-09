import { defineConfig } from '@playwright/test';

// E2E: `npm run test:e2e` (wxt build --mode e2e → .output/chrome-mv3-e2e 로드)
export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
});
