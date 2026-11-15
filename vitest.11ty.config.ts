import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        name: '11ty',
        include: [
            'src/11ty/**/*_test.ts',
        ],

        // Use the correct `tsconfig` file.
        typecheck: {
            enabled: true,
            tsconfig: './tsconfig.11ty-test.json',
            include: ['src/11ty/**/*_test_d.ts'],
        },

        // Don't isolate tests because this hurts performance and any safety
        // it provides just papers over bad tests which should be identified and
        // fixed without relying on messy isolation like this.
        isolate: false,

        expect: {
            // Fail a test if no assertions are present.
            requireAssertions: true,
        },
    },
});
