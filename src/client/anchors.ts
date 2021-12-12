/**
 * @fileoverview Makes header `<h*>` tags clickable to copy the URL to that
 * header.
 */

import { getLocation } from './browser_env';
import { show as showSnackbar } from './components/snackbar';

/**
 * Adds an event listener to the given `Node` which detects clicks to header
 * (`<h* />`) elements and copies a permalink to the user's clipboard.
 */
export function handleHeaderLinkOnClick(node: Node): void {
    node.addEventListener('click', async (evt) => {
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

        await showSnackbar('Copied URL to clipboard.', 2_000 /* ms */);
    });
}
