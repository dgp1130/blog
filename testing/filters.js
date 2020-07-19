// @ts-check

/**
 * Executes the given filter with the provided arguments and returns a
 * {@link Promise} representing the result. This is a more ergonomic way of
 * calling an 11ty async filter.
 */
function execFilter(filter, ...args) {
    return new Promise((resolve, reject) => {
        filter(...args, (err, result) => {
            if (err) reject(err);
            resolve(result);
        });
    });
}

module.exports = {
    execFilter,
};