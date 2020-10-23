/**
 * @fileoverview Configuration file for 11ty.
 * @see https://www.11ty.dev/docs/config/
 */

const { promises: fs } = require('fs');

const { minify: minifyHtml } = require('html-minifier-terser');
const mdLib = require('markdown-it');
const Nunjucks = require('nunjucks');
const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');

const { cleanCssConfig, cleanCssConfigDev } = require('./configs/clean_css');
const { htmlMinifierConfig } = require('./configs/html_minifier');
const { injectCsp } = require('./src/11ty/csp');
const { Environment, getEnv } = require('./src/11ty/environment');
const { format: formatDate } = require('./src/11ty/filters/dates');
const { short } = require('./src/11ty/filters/git');
const { bundleStyles } = require('./src/11ty/filters/styles');
const { addMdTimestampPlugin } = require('./src/11ty/timestamp');

module.exports = function (config) {
    // Process markdown and Nunjucks templates.
    config.setTemplateFormats(['md', 'njk']);

    // Explicitly provide the Markdown library to set an explicit configuration.
    const md = mdLib();
    addMdTimestampPlugin(md);
    config.setLibrary('md', md);

    // Explicitly provide the Nunjucks library to set an explicit configuration.
    config.setLibrary('njk', new Nunjucks.Environment(
        new Nunjucks.FileSystemLoader('src/www/_includes'),
        {
            throwOnUndefined: true,
            trimBlocks: true,
            lstripBlocks: true,
        },
    ));

    config.addPlugin(syntaxHighlight);

    // Copy pre-built client JavaScript and sourcemaps to the output directory.
    config.addPassthroughCopy('src/www/**/*.js');
    config.addPassthroughCopy('src/www/**/*.js.map');

    // Copy image resources to the output directory.
    config.addPassthroughCopy('src/www/**/*.avif');
    config.addPassthroughCopy('src/www/**/*.ico');
    config.addPassthroughCopy('src/www/**/*.jpg');
    config.addPassthroughCopy('src/www/**/*.svg');
    config.addPassthroughCopy('src/www/**/*.webp');

    // Live reload on CSS file changes.
    config.addWatchTarget('src/www/**/*.css');

    // Add filters.
    config.addFilter('date', formatDate);
    config.addFilter('short', short);
    config.addFilter('oneline', (data) => {
        return data.trim().split('\n').map((line) => line.trim()).join(' ');
    });

    config.addShortcode('buildDate', () => {
        return new Date().toISOString();
    });

    // Aggregate a list of CSS file references into a de-duplicated and
    // concatenated string of their content. Useful to pipe into `safe` and
    // place into a `<style />` tag to apply all the styles.
    const cssConfig = getEnv() === Environment.DEV
            ? cleanCssConfigDev
            : cleanCssConfig;
    config.addNunjucksAsyncFilter('css', bundleStyles({
        ignoredWarnings: [
            /^Ignoring local @import of "[^"]*" as it has already been imported.$/,
        ],
        cleanCssOptions: cssConfig,
    }));

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
        // need to be calculated afterwards. Don't minify dev builds to improve
        // debuggability.
        const minified = getEnv() !== Environment.DEV
                ? minifyHtml(content, htmlMinifierConfig)
                : content;

        // Generate and inject a content security policy.
        return injectCsp(minified, {
            scriptSrc: getEnv() === Environment.DEV ? liveReloadCspSources : [],
        });
    });

    config.setBrowserSyncConfig({
        callbacks: {
            ready: (err, browserSync) => {
                if (err) throw err;

                // Serve the 404 page to any unresolved path.
                browserSync.addMiddleware("*", async (_, res) => {
                    const content = await fs.readFile('_site/404/index.html');
                    res.writeHead(404);
                    res.end(content);
                });
            },
        },
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

// CSP sources for 11ty live reload functionality.
const liveReloadCspSources = [
    // Live reload inlined script for browser sync 2.26.13.
    `'sha256-ktarjbJmNtF8IylbwgjSQoKrcQSdXJkqf60bj4nusHA='`,
    // The inlined script creates another script that loads browser sync as a
    // self-hosted script.
    `'self'`,
];
