/**
 * @fileoverview Re-exports symbols from the browser environment so they can be
 * more easily spied upon and tested.
 */

/** Gets the location of the current window. */
export function getLocation(): Location {
    return location;
}
