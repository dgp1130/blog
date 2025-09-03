/**
 * Given a function, returns a new function which proxies it after delaying for
 * the provided timeout without another invocation. Usage:
 *
 * ```typescript
 * const debounced = debounce(1_000, () => console.log('Hello'));
 *
 * // Call the function three times consecutively.
 * debounced();
 * debounced();
 * debounced();
 * // Nothing logged yet...
 *
 * await new Promise((resolve) => setTimeout(() => resolve(), 1_000));
 * // Logs 'Hello' *once* after waiting for the timeout.
 * ```
 *
 * @param timeout The length of time (in milliseconds) to wait and debounce.
 * @param callback The function to invoke after debouncing.
 * @returns A function which debounces invocations to the given callback.
 */
export function debounce(timeout: number, callback: () => void): () => void {
    // For some reason, Vitest seems to pull in `@types/node`, and causes a type
    // mismatch with `number`. Ideally, we wouldn't depend on Node at all.
    let timeoutId: ReturnType<typeof setTimeout> | undefined = undefined;
    return () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = undefined;
        }

        timeoutId = setTimeout(() => callback(), timeout);
    };
}
