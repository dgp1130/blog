// Type of the callback function for the async filter.
type FilterCallback = (err: Error|null, result?: string) => void;

/**
 * Accepts a filter function as an argument and curries a filter function for
 * use in `eleventyConfig.addNunjucksAsyncFilter()`. The input filter function
 * must return a {@link Promise} which resolves to the output of the filter.
 */
export function asyncFilter(filter: (...args: string[]) => Promise<string>):
        (...inputs: Array<string|FilterCallback>) => void {
    // TODO: After TS 4.0, make this a more strongly typed input.
    return (...inputs: Array<string|FilterCallback>) => {
        if (inputs.length === 1) {
            throw new Error(
                    'Expected at least two arguments for an async filter!');
        }

        // Last argument is the callback function, extract that out.
        const args = inputs.slice(0, inputs.length - 1);
        const callback = inputs[inputs.length - 1];
        if (!(callback instanceof Function)) {
            throw new Error(`Last argument is not a callback function! ${
                JSON.stringify(callback)}`);
        }

        // Assume rest of the args are well-behaved 11ty filter arguments.
        const filterArgs = args as string[];

        // Invoke the provided filter and call back with the result.
        filter(...filterArgs).then((result) => {
            callback(null /* error */, result);
        }, (err) => {
            callback(err);
        });
    };
}
