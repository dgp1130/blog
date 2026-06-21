import CleanCss, { MinifierOutput, MinifierPromise, OptionsOutput } from 'clean-css';
import { execFilter } from '../testing/filters.js';
import { bundleStyles } from './styles.js';

function mockCleanCss({constructorSpy, minifySpy}: {
    constructorSpy?: jasmine.Spy<(options?: OptionsOutput) => MinifierOutput>,
    minifySpy?: jasmine.Spy<MinifierOutput['minify'] & MinifierPromise['minify']>,
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
            const constructorSpy = jasmine.createSpy('CleanCss Constructor');
            const minifySpy = jasmine.createSpy('minify').and.returnValue(
                Promise.resolve({
                    styles: '/* minified! */',
                    errors: [],
                    warnings: [],
                }),
            );

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
            const minifySpy = jasmine.createSpy('minify').and.returnValue(
                Promise.resolve({
                    errors: [ 'Styles are too ugly to minify.' ],
                    warnings: [],
                }),
            );

            const minifyFilter = bundleStyles(
                /* options */ undefined,
                {CleanCss: mockCleanCss({minifySpy})},
            );
            await expectAsync(execFilter(minifyFilter, 'foo.css'))
                    .toBeRejectedWithError(Error, `
Failed to minify [src/www/foo.css]:
Styles are too ugly to minify.
                    `.trim());
        });

        it('logs minification warnings', async () => {
            spyOn(console, 'warn');
            const minifySpy = jasmine.createSpy('minify').and.returnValue(
                Promise.resolve({
                    errors: [],
                    warnings: [ 'Styles are looking very ugly...' ],
                }),
            );

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
            spyOn(console, 'warn');
            const minifySpy = jasmine.createSpy('minify').and.returnValue(
                Promise.resolve({
                    errors: [],
                    warnings: [
                        'Styles are looking very ugly...',
                        'Some useless warning.',
                    ],
                }),
            );

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
