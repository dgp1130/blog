import { promises as fs } from 'fs';
import process from 'process';

import * as cleanCssLib from '../clean_css';
import { execFilter } from '../testing/filters';
import { aggregateStyles, minifyStyles } from './styles';

describe('styles', () => {
    describe('aggregateStyles()', () => {
        it('aggregates multiple CSS files\' contents', async () => {
            spyOn(process, 'cwd').and.returnValue('/blog');
            spyOn(fs, 'readFile').and.returnValues(
                Promise.resolve(`.foo { color: red; }`),
                Promise.resolve(`.bar { color: blue; }`),
            );

            const styles = await execFilter(aggregateStyles, `
                styles/foo.css
                otherStyles/bar.css
            `);

            expect(fs.readFile).toHaveBeenCalledTimes(2);
            expect(fs.readFile).toHaveBeenCalledWith(
                '/blog/src/www/styles/foo.css',
                { encoding: 'utf8' },
            );
            expect(fs.readFile).toHaveBeenCalledWith(
                '/blog/src/www/otherStyles/bar.css',
                { encoding: 'utf8' },
            );

            expect(styles).toContain(`.foo { color: red; }`);
            expect(styles).toContain(`.bar { color: blue; }`);
        });

        it('deduplicates any duplicate CSS files\'', async () => {
            spyOn(process, 'cwd').and.returnValue('/blog');
            spyOn(fs, 'readFile').and.returnValue(
                Promise.resolve(`.foo { color: red; }`),
            );

            // `foo.css` is requested multiple times.
            const styles = await execFilter(aggregateStyles, `
                foo.css
                foo.css
            `);

            expect(fs.readFile).toHaveBeenCalledTimes(1);
            expect(fs.readFile).toHaveBeenCalledWith(
                '/blog/src/www/foo.css',
                { encoding: 'utf8' },
            );

            // Only one copy of `foo.css` should be present.
            expect(styles).toBe(`.foo { color: red; }`);
        });

        it('deduplicates any duplicate CSS file\'s with different paths',
                async () => {
            spyOn(process, 'cwd').and.returnValue('/blog');
            spyOn(fs, 'readFile').and.returnValue(
                Promise.resolve(`.foo { color: red; }`),
            );

            // Two links to the same file, but using different paths.
            const styles = await execFilter(aggregateStyles, `
                foo.css
                ../www/foo.css
            `);

            expect(fs.readFile).toHaveBeenCalledTimes(1);
            expect(fs.readFile).toHaveBeenCalledWith(
                '/blog/src/www/foo.css',
                { encoding: 'utf8' },
            );

            // Only one copy of `foo.css` should be present.
            expect(styles).toBe(`.foo { color: red; }`);
        });
    });

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

            const minifyFilter = minifyStyles({
                level: 2,
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
                }),
            );
            spyOn(cleanCssLib, 'getCleanCss').and.returnValue(class {
                minify = minifySpy;
            });

            const minifyFilter = minifyStyles();
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

            await execFilter(minifyStyles(), 'foo.css');

            expect(console.warn).toHaveBeenCalledWith(
                    'Got warnings while minifying src/www/foo.css:\nStyles are looking very ugly...');
        });
    });
});
