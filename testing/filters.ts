type FilterCallback = (err: Error|null, result?: string) => void;

/**
 * Executes the given filter with the provided arguments and returns a
 * {@link Promise} representing the result. This is a more ergonomic way of
 * calling an 11ty async filter.
 */
export function execFilter(
    // TODO: TS 4.0 use more specific type.
    filter: (...args: Array<string|FilterCallback>) => void,
    ...args: string[]
) {
    return new Promise((resolve, reject) => {
        filter(...args, (err, result) => {
            if (err) reject(err);
            resolve(result);
        });
    });
}
