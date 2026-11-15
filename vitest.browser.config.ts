import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
    test: {
        name: 'client',
        include: [
            'src/client/**/*_test.ts',
        ],

        browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            screenshotFailures: false,

            // https://vitest.dev/guide/browser/playwright
            instances: [
                { browser: 'chromium' },
            ],
        },

        // Use the correct `tsconfig` file.
        typecheck: {
            tsconfig: './tsconfig.browser-test.json',
        },

        expect: {
            // Fail a test if no assertions are present.
            requireAssertions: true,
        },
    },
});
