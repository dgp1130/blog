/**
 * @fileoverview Configuration file for 11ty.
 * @see https://www.11ty.dev/docs/config/
 */

const { aggregateStyles } = require('./src/filters/styles.js');
const { short } = require('./src/filters/git.js');

module.exports = function (config) {
    // Process markdown and Nunjucks templates.
    // Pass through *.css files to the output directory.
    config.setTemplateFormats(['md', 'njk', 'css']);

    // Add filters.

    // Display the current date in the format: "Jan 1, 2020".
    config.addFilter('date', (date, options) => {
        return new Date(date).toLocaleDateString('en', options);
    });

    // Print the given data to the console for debugging purposes.
    config.addFilter('debug', (data) => {
        console.log(data);
        return data;
    });

    config.addFilter('short', short);

    // Aggregate a list of CSS file references into a de-duplicated and
    // concatenated string of their content. Useful to pipe into `safe` and
    // place into a `<style />` tag to apply all the styles.
    config.addNunjucksAsyncFilter('aggregateStyles', aggregateStyles);

    return {
        dir: {
            input: 'src/www/',
        },
    };
};
