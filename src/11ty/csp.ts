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
    const document = parse(html, {
        sourceCodeLocationInfo: true,
    });

    // Extract CSP-relevant resources from the document.
    const resources = Object.groupBy(
        walkResources(document),
        ({type}) => type,
    ) as {[Type in ResourceType]: Array<Resource & {type: Type}>};
    const head = resources[ResourceType.Head]![0]!.head!;
    const scripts = resources[ResourceType.Script]?.map(({src}) => src) ?? [];
    const styles = resources[ResourceType.Style]?.map(({src}) => src) ?? [];
    const images = resources[ResourceType.Image]?.map(({src}) => src) ?? [];

    // `parse5` always creates a `<head>` tag during parse. The only way to know
    // if it was _actually_ present is to check the code location.
    if (!head.sourceCodeLocation) throw new Error('Failed to parse `<head>` tag.');

    // Generate a minimal policy string.
    const csp = [
        genDirective('script-src', Array.from(normalize(scripts))),
        genDirective('style-src', Array.from(normalize([
            ...styleSrc,
            ...(extractStyles ? styles : []),
        ]))),
        genDirective('img-src', Array.from(normalize(images))),
        genDirective('object-src', [`'none'`]),
    ].filter((directive) => Boolean(directive)).join(' ');

    // Inject the CSP into the HTML.
    // CSP node must come **before** other scripts!
    // Resources that preceed the CSP may not be appropriately blocked.
    const headStartTag = head.sourceCodeLocation.startTag!;
    const before = html.slice(0, headStartTag.endOffset);
    const end = html.slice(headStartTag.endOffset);
    return `${before}<meta http-equiv="Content-Security-Policy" content="${csp}">${end}`;
}

/** The type of a CSP-relevant resource. */
enum ResourceType {
    /** The `<head>` element. */
    Head,

    /** A resource for `script-src`. */
    Script,

    /** A resource for `style-src`. */
    Style,

    /** A resource for `img-src`. */
    Image,
}

/** A single CSP-relevant resource. */
interface BaseResource {
    /** The discrimator of the union of types. */
    type: ResourceType;
}

/** A single `script-src` resource. */
interface ScriptResource extends BaseResource {
    type: ResourceType.Script;

    /** The CSP `script-src` value for the resource. */
    src: string;
}

/** A single `style-src` resource. */
interface StyleResource extends BaseResource {
    type: ResourceType.Style;

    /** The CSP `style-src` value for the resource. */
    src: string;
}

/** A single `img-src` resource. */
interface ImageResource extends BaseResource {
    type: ResourceType.Image;

    /** The CSP `img-src` value for the resource. */
    src: string;
}

/** The `<head>` element to insert the CSP directive into. */
interface HeadResource extends BaseResource {
    type: ResourceType.Head;

    /** The `<head>` element. */
    head: Element;
}

/** Discriminated union of all CSP resources. */
type Resource = ScriptResource | StyleResource | ImageResource | HeadResource;

/** Yields all the individual CSP-relevant resources in the document. */
function* walkResources(document: Document): Generator<Resource, void, void> {
    for (const node of walkTree(document)) {
        if (!isElementNode(node)) continue;

        switch (node.tagName) {
            case 'head': {
                yield {
                    head: node,
                    type: ResourceType.Head,
                };
                break;
            } case 'script': {
                const src = getScriptSource(node);
                if (src) yield { src, type: ResourceType.Script };
                break;
            } case 'style': {
                const src = getInlineStyleSource(node);
                if (src) yield { src, type: ResourceType.Style };
                break;
            } case 'link': {
                const src = getExternalStyleSource(node);
                if (src) yield { src, type: ResourceType.Style };
                break;
            } case 'img': {
                const src = getImageSource(node);
                if (src) yield { src, type: ResourceType.Image };
                break;
            } default: {
                continue;
            }
        }
    }
}

/** Yields the node and all its transitive descendents. */
function* walkTree(node: Node): Generator<Node, void, void> {
    yield node;
    if (isParentNode(node)) {
        for (const child of node.childNodes) {
            yield* walkTree(child);
        }
    }
}

/**
 * Returns a CSP directive based on the given name and sources list. Returns
 * `undefined` if the sources list is empty.
 */
function genDirective(directive: string, sources: string[]):
        string | undefined {
    if (sources.length === 0) return undefined;
    return `${directive} ${sources.join(' ')};`;
}

/** Returns the CSP source value of a JS `<script>` tag. */
function getScriptSource(node: Element): string | undefined {
    // Ignore non-JS script tags.
    const type = node.attrs.find((attr) => attr.name === 'type');
    if (type && type.value !== 'module' && !isJsMimeType(type.value)) {
        return undefined;
    }

    const src = node.attrs.find((attr) => attr.name === 'src');
    if (src) {
        // For a hyperlinked script, yield the source link.
        return src.value;
    } else {
        // For an inline script, yield a hash of its contents.
        const textContent = getTextContent(node);
        if (!textContent) return undefined;

        return hash(textContent);
    }
}

/** Returns the CSP source value of an inline `<style>` tag. */
function getInlineStyleSource(node: Element): string | undefined {
    // For an inlined style tag, return a hash of its contents.
    const textContent = getTextContent(node);
    return textContent ? hash(textContent) : undefined;
}

/** Returns the CSP source value of an external stylesheet (`<link>` tag). */
function getExternalStyleSource(node: Element): string | undefined {
    // Filter to just stylesheets.
    const rel = node.attrs.find((attr) => attr.name === 'rel');
    if (!rel || rel.value !== 'stylesheet') return undefined;

    // Emit the source link.
    const href = node.attrs.find((attr) => attr.name === 'href');
    if (!href) return undefined;

    return href.value;
}

/** Returns the CSP source value of an `<img>` tag. */
function getImageSource(node: Element): string | undefined {
    // For a hyperlinked source, yield the source link.
    const src = node.attrs.find((attr) => attr.name === 'src');
    if (!src) return undefined;

    return src.value;
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
