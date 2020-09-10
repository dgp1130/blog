import { getLocation } from "./browser_env";

/**
 * Returns a shareable URL for the given path. It uses the domain currently on
 * `window.location` with the provided path. It will also drop any query
 * parameters, hash values, or any other data inappropriate for sharing that
 * happens to be currently on `window.location`.
 * 
 * @param path An absolute path on the current domain (ie. `/foo/bar`).
 */
export function makeShareable(path: string): URL {
    // Use a new URL with only the parts that we want. This drops query
    // params, hash values, etc. which may be inappropriate for sharing.
    const pageUrl = new URL(getLocation().href);
    return new URL(`${pageUrl.protocol}//${pageUrl.host}${path}`);
}
