/**
 * Asserts that the given value is defined. Useful to narrow the types of
 * variables easily. This is most relevant for web components where most of
 * their properties must be defined as optional, but are often required for use
 * of the component.
 * 
 * @param input The value to check if defined.
 * @param name A name to identify to the developer what the value is. Usually
 *     this isn't necessary as the stack trace will point to the particular call
 *     that threw the error, but it can occasionally be useful.
 */
export function assertDefined<T>(input?: T, name?: string): asserts input is T {
    if (!input) throw new Error(`${name ?? 'Value'} not defined.`);
}
