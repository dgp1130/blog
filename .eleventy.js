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
const { injectCsp } = require('./src/11ty/csp');

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

    // Live reload on CSS file changes.
    config.addWatchTarget('src/www/**/*.css');

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

    // Post-process HTML files.
    config.addTransform('html-post-process', (content, path) => {
        // Ignore non-HTML files.
        if (!path.endsWith('.html')) return content;

        // Minify the HTML first. Some scripts may be minified, so CSP hashes
        // need to be calculated afterwards.
        const minified = minifyHtml(content, htmlMinifierConfig);

        // Generate and inject a content security policy.
        return injectCsp(minified, {
            scriptSrc: [
                // Live reload script.
                `'self'`,
                `'sha256-d8xVpEfOlXT388lPL445U0wcaE4cweRSVh5BQpm9scE='`,
            ],
        });
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
