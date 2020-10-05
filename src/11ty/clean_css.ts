import CleanCss from 'clean-css';

/**
 * Wrapper utility to get a reference to the CleanCSS dependency. This allows it
 * to be easily mocked for testing purposes.
 */
export function getCleanCss(): typeof CleanCss {
    return CleanCss;
}
