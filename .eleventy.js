/**
 * @fileoverview Configuration file for 11ty.
 * @see https://www.11ty.dev/docs/config/
 */

module.exports = function (config) {
    // Process markdown and liquid templates.
    // Pass through *.css files to the output directory.
    config.setTemplateFormats(['md', 'liquid', 'njk', 'css']);
    config.setLiquidOptions({
        strict_filters: true,
        strict_variables: true,
    });
    config.addFilter('date', (date, options) => {
        return new Date(date).toLocaleDateString('en', options);
    });

    return {
        dir: {
            input: 'www/',
        },
    };
};
