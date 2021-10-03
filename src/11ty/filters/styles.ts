import * as path from 'path';

import { OptionsOutput as CssOptions } from 'clean-css';

import { getCleanCss } from '../clean_css';
import { AsyncFilter, asyncFilter } from './utils';

/**
 * Generates a filter to concatenate and minify the CSS at the given file paths
 * separated by a newline and with the given options. All files are treated as
 * relative to `src/www/`.
 * 
 * Usage:
 * ```nunjucks
 * {{ filter css }}
 *   foo/bar.css
 *   hello/world.css
 * {{ endfilter }}
 * ```
 * 
 * This example reads the files from `src/www/foo/bar.css` and
 * `src/www/hello/world.css`, concatenates them, and minifies the result.
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

    return asyncFilter(async (paths) => {
        const rootedPaths = paths.split('\n')
            .map((p) => path.join('src/www', p.trim()));
        const output = await minifier.minify(rootedPaths);

        const actualWarnings = output.warnings.filter((warning) => {
            return ignoredWarnings.every((regex) => !regex.test(warning));
        });

        if (output.errors.length > 0) {
            throw new Error(`Failed to minify [${rootedPaths.join(', ')}]:\n${
                    output.errors.join('\n')}`);
        }
        if (actualWarnings.length > 0) {
            console.warn(`Got warnings while minifying [${
                rootedPaths.join(', ')}]:\n${actualWarnings.join('\n')}`);
        }

        return output.styles;
    });
}
