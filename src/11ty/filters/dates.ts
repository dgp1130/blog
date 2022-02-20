/** @fileoverview Filters related to date parsing and formatting. */

/**
 * Returns the given ISO-8601 date with the given format options.
 * 
 * The semantics of the options field are equivalent to its usage in
 * {@link Date.prototype.toLocaleDataString}.
 */
export function format(date: string, options?: Intl.DateTimeFormatOptions):
        string {
    return new Date(date).toLocaleDateString('en', options);
}