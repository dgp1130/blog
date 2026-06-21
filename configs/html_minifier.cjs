// @ts-check

const HtmlMinifier = require('html-minifier-terser');

/** @type {!HtmlMinifier.Options} */
module.exports.htmlMinifierConfig = {
    caseSensitive: true,
    collapseBooleanAttributes: true,

    // Collapse whitespace for improved performance (admittedly minor). But we
    // want conservative collapsing as example 31 of the HTML whitespace post
    // depends on it specifically, but also it just leads to a whole host of
    // potential whitespace issues we don't want to deal with for minimal
    // performance gain. Destructive whitespace optimizations just aren't worth
    // the effort.
    collapseWhitespace: true,
    conservativeCollapse: true,

    decodeEntities: true,
    removeAttributeQuotes: true,
    removeComments: true,
    removeEmptyAttributes: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    useShortDoctype: true,
    minifyJS: true,
};
