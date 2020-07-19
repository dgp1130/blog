// @ts-check

const fs = require('fs').promises;
const path = require('path');

const { asyncFilter } = require('./utils.js');

// Accepts a list of input file paths delineated by newlines, and resolves with
// the content of the unqiue files in the list. Each path is relative to `www/`.
const aggregateStyles = asyncFilter(async (cssFiles) => {
    // Format the loose input structure into a set of relative file paths.
    const files = new Set(cssFiles.split('\n')
        .map((file) => file.trim())
        .filter((file) => file !== '')
        .map((file) => path.join('www/', file)));

    // Read all source files.
    const styles = await Promise.all(Array.from(files)
        .map((file) => fs.readFile(file, { encoding: 'utf8' })));

    // Concatenate the files together.
    return styles.reduce((lStyles, rStyles) => lStyles + rStyles);
});

module.exports = {
    aggregateStyles,
};