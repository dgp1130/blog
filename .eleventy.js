/**
 * @fileoverview Configuration file for 11ty.
 * @see https://www.11ty.dev/docs/config/
 */

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

    return {
        dir: {
            input: 'www/',
        },
    };
};
