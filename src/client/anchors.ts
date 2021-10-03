/**
 * @fileoverview Makes header `<h*>` tags clickable to copy the URL to that
 * header.
 */

import { getLocation } from './browser_env';

/**
 * Adds an event listener to the given `Node` which detects clicks to header
 * (`<h* />`) elements and copies a permalink to the user's clipboard.
 */
export function handleHeaderLinkOnClick(node: Node): void {
    node.addEventListener('click', (evt) => {
        // Ignore non-<h*> elements.
        if (!(evt.target instanceof HTMLHeadingElement)) return;
    
        // Ignore elements without an `id` attribute.
        const header = evt.target;
        const id = header.getAttribute('id');
        if (!id) return;
    
        // Copy a permalink to this header element.
        const url = new URL(getLocation().href);
        url.hash = id;
        history.replaceState({}, '', url);
        navigator.clipboard.writeText(url.toString());
    });
}
