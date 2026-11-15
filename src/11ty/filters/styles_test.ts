import CleanCss, { MinifierOutput, MinifierPromise, OptionsOutput } from 'clean-css';
import { describe, expect, it, vi } from 'vitest';
import { execFilter } from '../testing/filters.js';
import { bundleStyles } from './styles.js';

type CleanCssCtor = (options?: OptionsOutput) => MinifierOutput;
type CleanCssMinify = MinifierPromise['minify'];

function mockCleanCss({constructorSpy, minifySpy}: {
    constructorSpy?: CleanCssCtor,
    minifySpy?: CleanCssMinify,
} = {}): typeof CleanCss {
    // @ts-ignore CleanCss constructor is weird and not worth fighting.
    return class CleanCssMock extends CleanCss {
        constructor(...args: ConstructorParameters<typeof CleanCss>) {
            super(...args);
            constructorSpy?.(...args);
        }

        override minify = minifySpy ?? super.minify;
    }
}

describe('styles', () => {
    describe('minifyStyles', () => {
        it('minifies the given CSS files', async () => {
            const constructorSpy = vi.fn<CleanCssCtor>(CleanCss as any);
            const minifySpy = vi.fn<CleanCssMinify>(CleanCss.prototype.minify)
                .mockResolvedValue({
                    styles: '/* minified! */',
                    errors: [],
                    warnings: [],
                    stats: {} as any,
                });

            // @ts-ignore CleanCss constructor is weird and not worth fighting.
            const minifyFilter = bundleStyles({
                cleanCssOptions: {
                    level: 2,
                },
            }, {CleanCss: mockCleanCss({constructorSpy, minifySpy})});

            expect(constructorSpy).toHaveBeenCalledTimes(1);
            expect(constructorSpy).toHaveBeenCalledWith({
                level: 2,
                returnPromise: true,
            });

            const minified = await execFilter(minifyFilter, 'foo.css\nbar.css');
            expect(minifySpy).toHaveBeenCalledTimes(1);
            expect(minifySpy).toHaveBeenCalledWith([
                'src/www/foo.css',
                'src/www/bar.css',
            ]);
            expect(minified).toBe('/* minified! */');
        });

        it('rethrows minification errors', async () => {
            const minifySpy = vi.fn<CleanCssMinify>().mockResolvedValue({
                styles: '',
                errors: [ 'Styles are too ugly to minify.' ],
                warnings: [],
                stats: {} as any,
            });

            const minifyFilter = bundleStyles(
                /* options */ undefined,
                {CleanCss: mockCleanCss({minifySpy})},
            );
            await expect(execFilter(minifyFilter, 'foo.css'))
                    .rejects.toThrow(`
Failed to minify [src/www/foo.css]:
Styles are too ugly to minify.
                    `.trim());
        });

        it('logs minification warnings', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});
            const minifySpy = vi.fn<CleanCssMinify>(CleanCss.prototype.minify)
                    .mockResolvedValue({
                        styles: '',
                        errors: [],
                        warnings: [ 'Styles are looking very ugly...' ],
                        stats: {} as any,
                    });

            await execFilter(bundleStyles(
                /* options */ undefined,
                {CleanCss: mockCleanCss({minifySpy})},
            ), 'foo.css');

            expect(console.warn).toHaveBeenCalledWith(`
Got warnings while minifying [src/www/foo.css]:
Styles are looking very ugly...
            `.trim());
        });

        it('ignores undesired warnings', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});
            const minifySpy = vi.fn<CleanCssMinify>(CleanCss.prototype.minify)
                .mockResolvedValue({
                    styles: '',
                    errors: [],
                    warnings: [
                        'Styles are looking very ugly...',
                        'Some useless warning.',
                    ],
                    stats: {} as any,
                });

            await execFilter(bundleStyles(
                {ignoredWarnings: [ /^Some useless warning.$/ ]},
                {CleanCss: mockCleanCss({minifySpy})},
            ), 'foo.css');

            expect(console.warn).toHaveBeenCalledWith(`
Got warnings while minifying [src/www/foo.css]:
Styles are looking very ugly...
            `.trim());
        });
    });
});
