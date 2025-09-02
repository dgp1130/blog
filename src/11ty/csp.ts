import { DefaultTreeAdapterTypes, parse } from 'parse5';
import { getTextContent, isElementNode, isParentNode } from '@parse5/tools';
import { createHash } from 'crypto';

type Document = DefaultTreeAdapterTypes.Document;
type Element = DefaultTreeAdapterTypes.Element;
type Node = DefaultTreeAdapterTypes.Node;

/**
 * Injects a Content Security Policy into the given HTML string.
 *
 * This parses the HTML document and identifies all the resources loaded by the
 * page. It then generates the strictest CSP it can for the page, using file
 * hashes for inline resources and URLs for hyperlinked resources.
 *
 * IMPORTANT SECURITY NOTE: This function assumes that all resources on the page
 * are trusted. Think very carefully before running on a page with user
 * generated content.
 *
 * @param html The HTML content to extract a policy from.
 * @param styleSrc Custom sources to add to the `style-src` policy.
 * @param extractStyles Whether or not to extract styles from the given HTML and
 *     add them to the returned page. Defaults to `true`.
 * @returns The HTML content given, with a CSP `<meta />` tag injected into it.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
 */
export function injectCsp(html: string, {
    styleSrc = [],
    extractStyles = true,
}: {
    scriptSrc?: string[],
    styleSrc?: string[],
    extractStyles?: boolean,
} = {}): string {
    // Parse the HTML into a manipulatable document.
    const document = parse(html);

    // Extract sources from the document.
    const scriptSources = Array.from(normalize(genScriptSources(document)));
    const styleSources = Array.from(normalize([
        ...styleSrc,
        ...(extractStyles ? genStyleSources(document) : []),
    ]));
    const imageSources = Array.from(normalize(genImageSources(document)));

    // Generate a minimal policy string.
    const csp = [
        genDirective('script-src', scriptSources),
        genDirective('style-src', styleSources),
        genDirective('img-src', imageSources),
        genDirective('object-src', [`'none'`]),
    ].filter((directive) => Boolean(directive)).join(' ');

    // Inject the CSP into the HTML.
    // CSP node must come **before** other scripts!
    // Resources that preceed the CSP may not be appropriately blocked.
    let cspInjected = false;
    const injected = html.replace(
        /<head[^>]*>/,
        (match) => {
            cspInjected = true;
            return `${match}<meta http-equiv="Content-Security-Policy" content="${csp}">`;
        },
    );

    // `String.prototype.replace` will no-op if the search string isn't found,
    // so explicitly verify that the CSP was injected as expected.
    if (!cspInjected) throw new Error('Failed to inject CSP, could not match `<head>` element.');

    return injected;
}

/**
 * Returns a CSP directive based on the given name and sources list. Returns
 * `undefined` if the sources list is empty.
 */
function genDirective(directive: string, sources: string[]): string|undefined {
    if (sources.length === 0) return undefined;
    return `${directive} ${sources.join(' ')};`;
}

/** Yields all the `<script>` tags in the document. */
function* walkScripts(document: Document): Iterable<Element> {
    for (const node of walkTree(document)) {
        // Ignore non-script elements.
        if (!isElementNode(node) || node.tagName !== 'script') continue;

        const type = node.attrs.find((attr) => attr.name === 'type');

        // Emit only JS script tags.
        if (!type || type.value === 'module' || isJsMimeType(type.value)) {
            yield node;
        }
    }
}

/** Yields sources for the `script-src` directive from the given document. */
function* genScriptSources(document: Document): Iterable<string> {
    for (const scriptTag of walkScripts(document)) {
        // For a hyperlinked script, yield the source link.
        const src = scriptTag.attrs.find((attr) => attr.name === 'src');
        if (src) {
            yield src.value;
            continue;
        }

        // For an inline script, yield a hash of its contents.
        const textContent = getTextContent(scriptTag);
        if (textContent) yield hash(textContent);
    }
}

/** Yields all the `<style>` tags in the document. */
function* walkStyles(document: Document): Iterable<Element> {
    for (const node of walkTree(document)) {
        if (isElementNode(node) && node.tagName === 'style') yield node;
    }
}

/** Yields all the `<link>` tags in the document. */
function* walkLinks(document: Document): Iterable<Element> {
    for (const node of walkTree(document)) {
        if (isElementNode(node) && node.tagName === 'link') yield node;
    }
}

/** Yields sources for the `style-src` directive from the given document. */
function* genStyleSources(document: Document): Iterable<string> {
    // For an inlined style tag, yield a hash of its contents.
    for (const style of walkStyles(document)) {
        const textContent = getTextContent(style);
        if (textContent) yield hash(textContent);
    }

    // For a hyperlinked source, yield the source link.
    for (const link of walkLinks(document)) {
        // Filter to just stylesheets.
        const rel = link.attrs.find((attr) => attr.name === 'rel');
        if (!rel || rel.value !== 'stylesheet') continue;

        // Emit the source link.
        const href = link.attrs.find((attr) => attr.name === 'href');
        if (href) yield href.value;
    }
}

/** Yields all the `<img>` tags in the document. */
function* walkImages(document: Document): Iterable<Element> {
    for (const node of walkTree(document)) {
        if (isElementNode(node) && node.tagName === 'img') yield node;
    }
}

/** Yields sources for the `img-src` directive from the given document. */
function* genImageSources(document: Document): Iterable<string> {
    for (const image of walkImages(document)) {
        // For a hyperlinked source, yield the source link.
        const src = image.attrs.find((attr) => attr.name === 'src');
        if (src) yield src.value;
    }
}

/** Yields the node and all its transitive descendents. */
function* walkTree(node: Node): Iterable<Node> {
    yield node;
    if (isParentNode(node)) {
        for (const child of node.childNodes) {
            yield* walkTree(child);
        }
    }
}

/**
 * Normalizes the given source list. This performs a few operations:
 * 1. Replaces self-hosted URLs with the 'self' source.
 * 2. Removes query parameters from URLs (as they are unsupported by CSP).
 * 3. Deduplicates sources.
 */
function normalize(sources: Iterable<string>): Iterable<string> {
    const selfNormalized = normalizeSelf(sources);
    const urlNormalized = normalizeUrls(selfNormalized)

    return unique(urlNormalized);
}

/** Replaces all self-hosted sources with the 'self' source. */
function* normalizeSelf(sources: Iterable<string>): Iterable<string> {
    for (const source of sources) {
        if (source.startsWith(`'`)) {
            // Quoted sources are not URLs, ignore them.
            yield source;
            continue;
        }

        if (source === 'http:' || source === 'https:') {
            // Ignore protocol sources.
            yield source;
            continue;
        }

        // Check if the URL does not have a domain by giving it a base. If the
        // base is used, then the URL must not have a domain and must be
        // self-hosted.
        const url = new URL(source, 'http://arbitrary-url-for-csp.dne/');
        if (url.hostname === 'arbitrary-url-for-csp.dne') {
            yield `'self'`; // Self-hosted URL.
        } else {
            yield url.toString(); // Foreign URL.
        }
    }
}

/**
 * Removes query parameters from source URLs. Query parameters are not supported
 * on CSP strings.
 */
function* normalizeUrls(sources: Iterable<string>): Iterable<string> {
    for (const source of sources) {
        if (source.startsWith(`'`)) {
            // Quoted sources are not URLs, ignore them.
            yield source;
            continue;
        }

        if (source === 'http:' || source === 'https:') {
            // Just a protocol, pass through.
            yield source;
            continue;
        }

        // Remove the query parameter.
        const url = new URL(source);
        url.search = '';
        yield url.toString();
    }
}

/** Removes duplicates from the input list. */
function unique<T>(list: Iterable<T>): Iterable<T> {
    return Array.from(new Set(list));
}

/** Calculates the CSP hash source for the given string. */
function hash(text: string): string {
    const hash = createHash('sha256').update(text).digest('base64');
    return `'sha256-${hash}'`;
}

/** Returns whether or not the given MIME type is well-known JavaScript. */
function isJsMimeType(type: string): boolean {
    return jsMimeTypes.has(type);
}

const jsMimeTypes = new Set([
    'application/javascript',
    'application/ecmascript',
    'application/x-ecmascript',
    'application/x-javascript',
    'text/javascript',
    'text/ecmascript',
    'text/javascript1.0',
    'text/javascript1.1',
    'text/javascript1.2',
    'text/javascript1.3',
    'text/javascript1.4',
    'text/javascript1.5',
    'text/jscript',
    'text/livescript',
    'text/x-ecmascript',
    'text/x-javascript',
]);
