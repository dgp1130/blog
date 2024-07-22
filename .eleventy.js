/**
 * @fileoverview Configuration file for 11ty.
 * @see https://www.11ty.dev/docs/config/
 */

const { createHash } = require('crypto');
const { promises: fs } = require('fs');

const { minify: minifyHtml } = require('html-minifier-terser');
const Nunjucks = require('nunjucks');
const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');
const pluginRss = require('@11ty/eleventy-plugin-rss');

const { cleanCssConfig, cleanCssConfigDev } = require('./configs/clean_css');
const { htmlMinifierConfig } = require('./configs/html_minifier');
const { injectCsp } = require('./src/11ty/csp');
const { Environment, getEnv } = require('./src/11ty/environment');
const { format: formatDate } = require('./src/11ty/filters/dates');
const { short } = require('./src/11ty/filters/git');
const { bundleStyles } = require('./src/11ty/filters/styles');
const { markdown } = require('./src/11ty/markdown');
const { getImageMimeType, getVideoMimeType } = require('./src/11ty/mime_types');

module.exports = function (config) {
    // Process markdown and Nunjucks templates.
    config.setTemplateFormats(['md', 'njk']);
    const njkEnv = new Nunjucks.Environment(
        new Nunjucks.FileSystemLoader('src/www/_includes'),
        {
            throwOnUndefined: true,
            trimBlocks: true,
            lstripBlocks: true,
        },
    );

    // Explicitly provide the Markdown library to use `marked`.
    config.addExtension('md', {
        compile(contents) {
            return (frontmatter) => markdown(contents, {
                frontmatter,
                njk: njkEnv,
            });
        },
    });

    // Explicitly provide the Nunjucks library to set an explicit configuration.
    config.setLibrary('njk', njkEnv);

    config.addPlugin(syntaxHighlight);
    config.addPlugin(pluginRss);

    // Copy pre-built client JavaScript and sourcemaps to the output directory.
    config.addPassthroughCopy('src/www/**/*.js');
    config.addPassthroughCopy('src/www/**/*.js.map');

    // Copy image resources to the output directory.
    config.addPassthroughCopy('src/www/**/*.avif');
    config.addPassthroughCopy('src/www/**/*.ico');
    config.addPassthroughCopy('src/www/**/*.jpg');
    config.addPassthroughCopy('src/www/**/*.png');
    config.addPassthroughCopy('src/www/**/*.svg');
    config.addPassthroughCopy('src/www/**/*.webp');
    config.addPassthroughCopy('src/www/**/*.webm');
    config.addPassthroughCopy('src/www/**/*.mp4');
    config.addPassthroughCopy('src/www/**/*.vtt');
    config.addPassthroughCopy('src/www/**/*.xsl');

    // Copy font resources to the output directory.
    config.addPassthroughCopy('src/www/**/*.woff2');

    // Live reload on CSS file changes.
    config.addWatchTarget('src/www/**/*.css');

    // Add filters.
    config.addFilter('date', formatDate);
    config.addFilter('mimeImg', (path) => getImageMimeType(path));
    config.addFilter('mimeVideo', (path) => getVideoMimeType(path));
    config.addFilter('short', short);
    config.addFilter('split', (data, splitter) => {
        return data.split(splitter);
    });
    config.addFilter('oneline', (data) => {
        return data.trim().split('\n').map((line) => line.trim()).join(' ');
    });
    config.addFilter('throw', (message) => {
        throw new Error(message.split('\n').map((line) => line.trim()).join(' '));
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

    // Debug filter for viewing available keys on an object in a template.
    config.addFilter('keys', (obj) => Object.keys(obj).join(', '));

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
            // Just use 'unsafe-inline' for styles because Firefox doesn't
            // support adopted style sheets, meaning that inlined CSS in Lit
            // Element falls back to appending a `<style />` tag.
            // `strict-dynamic` could handle this, but isn't supported broadly
            // enough. We also can't do `style-src 'unsafe-inline' ${hosts}`
            // because modern browsers ignore the 'unsafe-inline' part for
            // backwards compatibility. Most we can do is restrict to `https:`
            // hosts.
            //
            // TL;DR: Firefox (and probably Safari) don't support adopted style
            // sheets or enough CSP to do anything more specific than
            // 'unsafe-inline'.
            styleSrc: [`'self'`, `'unsafe-inline'`, 'https:'],
            extractStyles: false,
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
        markdownTemplateEngine: false,
    };
};

/**
 * Calculates the CSP hash source for the given string.
 * @param {string} text Text content to hash.
 * @return {string} The hashed content.
 */
function hash(text) {
    return createHash('sha256').update(text).digest('base64');
}
