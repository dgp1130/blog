// @ts-check

import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';

export default [
    // Post page entry point.
    {
        input: 'src/www/scripts/post.ts',
        output: {
            name: 'post',
            file: 'src/www/scripts/post.js',
            format: 'es',
            sourcemap: true,
        },
        plugins: [
            typescript({
                tsconfig: './tsconfig.browser.json',
            }),
            resolve({ browser: true }),
            terser(),
        ],
    },
];
