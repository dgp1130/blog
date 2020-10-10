// @ts-check

const HtmlMinifier = require('html-minifier-terser');

/** @type {!HtmlMinifier.Options} */
module.exports.htmlMinifierConfig = {
    caseSensitive: true,
    collapseBooleanAttributes: true,
    collapseWhitespace: true,
    decodeEntities: true,
    removeAttributeQuotes: true,
    removeComments: true,
    removeEmptyAttributes: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    useShortDoctype: true,
};
