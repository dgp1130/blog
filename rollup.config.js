// @ts-check

import alias from '@rollup/plugin-alias';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import minifyHtmlTemplateLiterals from 'rollup-plugin-minify-html-literals';
import { terser } from 'rollup-plugin-terser';

const { cleanCssConfig } = require('./configs/clean_css');
const { htmlMinifierConfig } = require('./configs/html_minifier');

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
            alias({
                entries: [{
                    find: 'lit-html/lib/shady-render.js',
                    replacement: 'node_modules/lit-html/lit-html.js',
                }],
            }),
            resolve({ browser: true }),
            minifyHtmlTemplateLiterals({
                options: {
                    minifyOptions: {
                        ...htmlMinifierConfig,
                        minifyCSS: cleanCssConfig,
                    },
                },
            }),
            terser(),
        ],
    },
];
