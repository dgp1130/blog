import { defineConfig } from 'vitest/config';
import checker from 'vite-plugin-checker';

/** Vitest configuration. */
export default defineConfig({
  plugins: [
    checker({
      typescript: {
        tsconfigPath: 'tsconfig.browser-test.json',
      },
    }),
  ],
  test: {
    include: [ 'src/client/share_test.ts' ],
    typecheck: {
      enabled: true,
      tsconfig: 'tsconfig.browser-test.json',
      include: [ 'src/client/share_test.ts' ],
    },
    browser: {
      enabled: true,
      name: 'chromium',
      headless: true,
      provider: 'playwright',
      screenshotFailures: false,
      // https://playwright.dev
      providerOptions: {},
    },
  },
});
