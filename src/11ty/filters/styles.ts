import { promises as fs } from 'fs';
import * as path from 'path';
import process from 'process';

import { OptionsOutput as CssOptions } from 'clean-css';

import { getCleanCss } from '../clean_css';
import { AsyncFilter, asyncFilter } from './utils';

/**
 * Accepts a list of input file paths delineated by newlines, and resolves with
 * the content of the unqiue files in the list. Each input path is relative to
 * `www/` in the current working directory.
 * 
 * The deduplicate algorithm will dedupe multiple paths to the same location,
 * even if they take different routes. For example, `bar.css` and
 * `../www/bar.css` will be de-duplicated. However, other tricks like symlinks
 * may work around deduplication. So don't get too complicated here.
 */
export const aggregateStyles = asyncFilter(async (cssFiles) => {
    // Format the loose input structure into a set of absoluate, normalized file
    // paths without duplicates.
    const files = new Set(cssFiles.split('\n')
        .map((file) => file.trim())
        .filter((file) => file !== '')
        .map((file) => path.normalize(path.join(
            process.cwd(), 'src/www/', file))));

    // Read all source files.
    const styles = await Promise.all(Array.from(files)
        .map((file) => fs.readFile(file, { encoding: 'utf8' })));

    // Concatenate the files together.
    return styles.reduce((lStyles, rStyles) => lStyles + rStyles);
});

/**
 * Generates a filter to minify the CSS at a provided file path with the given
 * options.
 */
export function minifyStyles(options: CssOptions = {}): AsyncFilter {
    // Find default export at runtime to be easily mockable for tests.
    const CleanCss = getCleanCss();
    const minifier = new CleanCss({
        ...options,
        returnPromise: true,
    });

    return asyncFilter(async (root) => {
        const rootPath = path.normalize(path.join('src/www/', root));
        const output = await minifier.minify([ rootPath ]);

        if (output.errors.length > 0) {
            throw new Error(`Failed to minify src/www/${root}:\n${
                    output.errors.join('\n')}`);
        }
        if (output.warnings.length > 0) {
            console.warn(`Got warnings while minifying src/www/${root}:\n${
                    output.warnings.join('\n')}`);
        }

        return output.styles;
    });
}
