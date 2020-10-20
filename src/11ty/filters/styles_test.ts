import * as cleanCssLib from '../clean_css';
import { execFilter } from '../testing/filters';
import { bundleStyles } from './styles';

describe('styles', () => {
    describe('minifyStyles', () => {
        it('minifies the given CSS file', async () => {
            const constructorSpy = jasmine.createSpy('CleanCss Constructor');
            const minifySpy = jasmine.createSpy('minify').and.returnValue(
                Promise.resolve({
                    styles: '/* minified! */',
                    errors: [],
                    warnings: [],
                }),
            );
            spyOn(cleanCssLib, 'getCleanCss').and.returnValue(class {
                constructor(...args: unknown[]) {
                    // Proxy calls to constructor spy so they can be asserted.
                    constructorSpy.apply(this, args);
                }
                minify = minifySpy;
            });

            const minifyFilter = bundleStyles({
                cleanCssOptions: {
                    level: 2,
                },
            });
            expect(constructorSpy).toHaveBeenCalledTimes(1);
            expect(constructorSpy).toHaveBeenCalledWith({
                level: 2,
                returnPromise: true,
            });

            const minified = await execFilter(minifyFilter, 'foo.css');
            expect(minifySpy).toHaveBeenCalledTimes(1);
            expect(minifySpy).toHaveBeenCalledWith([ 'src/www/foo.css' ]);
            expect(minified).toBe('/* minified! */');
        });

        it('rethrows minification errors', async () => {
            const minifySpy = jasmine.createSpy('minify').and.returnValue(
                Promise.resolve({
                    errors: [ 'Styles are too ugly to minify.' ],
                    warnings: [],
                }),
            );
            spyOn(cleanCssLib, 'getCleanCss').and.returnValue(class {
                minify = minifySpy;
            });

            const minifyFilter = bundleStyles();
            await expectAsync(execFilter(minifyFilter, 'foo.css'))
                    .toBeRejectedWithError(Error, `Failed to minify src/www/foo.css:\nStyles are too ugly to minify.`);
        });

        it('logs minification warnings', async () => {
            spyOn(console, 'warn');
            const minifySpy = jasmine.createSpy('minify').and.returnValue(
                Promise.resolve({
                    errors: [],
                    warnings: [ 'Styles are looking very ugly...' ],
                }),
            );
            spyOn(cleanCssLib, 'getCleanCss').and.returnValue(class {
                minify = minifySpy;
            });

            await execFilter(bundleStyles(), 'foo.css');

            expect(console.warn).toHaveBeenCalledWith(
                    'Got warnings while minifying src/www/foo.css:\nStyles are looking very ugly...');
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
            spyOn(cleanCssLib, 'getCleanCss').and.returnValue(class {
                minify = minifySpy;
            });

            await execFilter(bundleStyles({
                ignoredWarnings: [ /^Some useless warning.$/ ],
            }), 'foo.css');

            expect(console.warn).toHaveBeenCalledWith(
                    'Got warnings while minifying src/www/foo.css:\nStyles are looking very ugly...');
        });
    });
});
