// @ts-check

/**
 * Accepts a filter function as an argument and curries a filter function for
 * use in `eleventyConfig.addNunjucksAsyncFilter()`. The filter function must
 * return a {@link Promise} which resolves to the output of the filter.
 */
function asyncFilter(filter) {
    return (...arguments) => {
        if (arguments.length === 1) {
            throw new Error(
                    'Expected at least two arguments for an async filter!');
        }

        // Last argument is the callback function, extract that out.
        const args = arguments.slice(0, arguments.length - 1);
        const callback = arguments[arguments.length - 1];

        // Invoke the provided filter and call back with the result.
        filter(...args).then((result) => {
            callback(null /* error */, result);
        }, (err) => {
            callback(err);
        });
    };
}

module.exports = {
    asyncFilter,
};