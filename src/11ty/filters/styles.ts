import * as path from 'path';

import { OptionsOutput as CssOptions } from 'clean-css';

import { getCleanCss } from '../clean_css';
import { AsyncFilter, asyncFilter } from './utils';

/**
 * Generates a filter to minify the CSS at a provided file path with the given
 * options.
 */
export function bundleStyles({
    cleanCssOptions = {},
    ignoredWarnings = [],
}: {
    ignoredWarnings?: RegExp[],
    cleanCssOptions?: CssOptions,
} = {}): AsyncFilter {
    // Find default export at runtime to be easily mockable for tests.
    const CleanCss = getCleanCss();
    const minifier = new CleanCss({
        ...cleanCssOptions,
        returnPromise: true,
    });

    return asyncFilter(async (root) => {
        const rootPath = path.normalize(path.join('src/www/', root));
        const output = await minifier.minify([ rootPath ]);

        const actualWarnings = output.warnings.filter((warning) => {
            return ignoredWarnings.every((regex) => !regex.test(warning));
        });

        if (output.errors.length > 0) {
            throw new Error(`Failed to minify src/www/${root}:\n${
                    output.errors.join('\n')}`);
        }
        if (actualWarnings.length > 0) {
            console.warn(`Got warnings while minifying src/www/${root}:\n${
                    actualWarnings.join('\n')}`);
        }

        return output.styles;
    });
}
