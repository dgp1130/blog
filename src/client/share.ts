/**
 * Returns a shareable URL for the given path. It uses the domain currently on
 * `window.location` with the provided path. It will also drop any query
 * parameters, hash values, or any other data inappropriate for sharing that
 * happens to be currently on `window.location`.
 *
 * @param path An absolute path on the current domain (ie. `/foo/bar`).
 */
export function makeShareable(
    path: string,
    { getLocation = () => new URL(window.location.href) }: {
        getLocation?: () => URL,
    } = {},
): URL {
    // Use a new URL with only the parts that we want. This drops query
    // params, hash values, etc. which may be inappropriate for sharing.
    const pageUrl = getLocation();
    return new URL(`${pageUrl.protocol}//${pageUrl.host}${path}`);
}
