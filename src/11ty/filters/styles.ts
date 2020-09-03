import { promises as fs } from 'fs';
import * as path from 'path';
import process from 'process';

import { asyncFilter } from './utils';

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
