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

/** Returns the HTML for rendering the timestamp header on a blog post. */
export function postDate(date: Date): string {
    return `<time datetime="${date.toISOString()}" class="timestamp">${
        date.toLocaleDateString('en', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        })
    }</time>`.trim();
}
