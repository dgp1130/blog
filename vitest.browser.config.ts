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
            enabled: true,
            tsconfig: './tsconfig.browser-test.json',
            include: [ 'src/client/**/*_test_d.ts' ],
        },

        expect: {
            // Fail a test if no assertions are present.
            requireAssertions: true,
        },
    },
});
