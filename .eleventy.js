/**
 * @fileoverview Configuration file for 11ty.
 * @see https://www.11ty.dev/docs/config/
 */

const { minifyStyles } = require('./src/11ty/filters/styles.js');
const { short } = require('./src/11ty/filters/git.js');
const { format: formatDate } = require('./src/11ty/filters/dates.js');
const { minify: minifyHtml } = require('html-minifier-terser');
const { cleanCssConfig } = require('./configs/clean_css');
const { htmlMinifierConfig } = require('./configs/html_minifier');

module.exports = function (config) {
    // Process markdown and Nunjucks templates.
    config.setTemplateFormats(['md', 'njk']);

    // Copy pre-built client JavaScript and sourcemaps to the output directory.
    config.addPassthroughCopy('src/www/**/*.js');
    config.addPassthroughCopy('src/www/**/*.js.map');

    // Copy image resources to the output directory.
    config.addPassthroughCopy('src/www/**/*.avif');
    config.addPassthroughCopy('src/www/**/*.jpg');
    config.addPassthroughCopy('src/www/**/*.webp');

    // Add filters.
    config.addFilter('date', formatDate);
    config.addFilter('short', short);

    // Aggregate a list of CSS file references into a de-duplicated and
    // concatenated string of their content. Useful to pipe into `safe` and
    // place into a `<style />` tag to apply all the styles.
    config.addNunjucksAsyncFilter('css', minifyStyles(cleanCssConfig));

    // Print the given data to the console for debugging purposes.
    config.addFilter('debug', (data) => {
        console.log(data);
        return data;
    });

    // Post-process HTML files and minify them.
    config.addTransform('minify-html', (content, path) => {
        if (!path.endsWith('.html')) {
            // Not an HTML file, do nothing.
            return content;
        }

        // Minify the HTML.
        return minifyHtml(content, htmlMinifierConfig);
    });

    return {
        dir: {
            input: 'src/www/',

            // Move _data/ outside input directory so it can be compiled as 11ty
            // code without conflicting with other build targets.
            data: '../11ty/_data/',
        },
    };
};
