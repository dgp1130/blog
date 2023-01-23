/**
 * Set of Lazy elements which have been loaded and should no longer be observed
 * for viewport intersection.
 */
const loadedElements = new WeakSet<Element>();

/**
 * An element which lazily renders the given content when it is nearing the
 * viewport. Render this with `display: block;` and
 * `aspect-ratio: ${width} / ${height};` to avoid CLS.
 */
export class Lazy extends HTMLElement {
    connectedCallback(): void {
        // Only observe for an intersection if the element has not been loaded.
        if (!loadedElements.has(this)) getObserver().observe(this);
    }

    disconnectedCallback(): void {
        getObserver().unobserve(this);
    }
}

customElements.define('dwac-lazy', Lazy);

declare global {
    interface HTMLElementTagNameMap {
        'dwac-lazy': Lazy;
    }
}

let observer: IntersectionObserver;
function getObserver(): IntersectionObserver {
    // An `IntersectionObserver` which renders `<dwac-lazy />` content when it
    // is approaching the viewport.
    observer ??= new IntersectionObserver((entries) => {
        for (const entry of entries) {
            // Ignore elements which haven't intersected yet.
            if (entry.intersectionRatio === 0) continue;
    
            // Extract the child `<template />` tag.
            const children = Array.from(entry.target.children)
                .filter((el) => el.tagName !== 'NOSCRIPT');
            if (children.length !== 1) throw new Error('Expected exactly one `<template />` child (excluding `<noscript />`).');
            const tmpl = children[0]! as HTMLTemplateElement;
            if (tmpl.tagName !== 'TEMPLATE') throw new Error('Expected exactly one `<template />` child (excluding `<noscript />`).');
        
            // Clone the template and append its contents.
            const contents =
                tmpl.content.cloneNode(true /* deep */) as DocumentFragment;
            tmpl.remove();
            entry.target.append(contents);
    
            // Remove this observer as this was a one-time change.
            observer.unobserve(entry.target);
            loadedElements.add(entry.target);
        }
    }, {
        // Intersect when the screen is one full viewport away from intersecting
        // the element. This provides some limited pre-loading functionality.
        rootMargin: '100%',
    });

    return observer;
}
