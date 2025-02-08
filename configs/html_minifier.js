// @ts-check

const HtmlMinifier = require('html-minifier-terser');

/** @type {!HtmlMinifier.Options} */
module.exports.htmlMinifierConfig = {
    caseSensitive: true,
    collapseBooleanAttributes: true,

    // HTML Whitespace post, Example 31 depends on whitespace collapsing not
    // happening. Also the size benefit of this seems minimal anyways (~126KB vs
    // ~128KB) for that page. Therefore I have decided I don't care.
    collapseWhitespace: false,

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
