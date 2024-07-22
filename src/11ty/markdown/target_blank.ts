import { MarkedExtension, Tokens } from 'marked';

/**
 * A marked extension which renders link tags to other pages with the
 * `target="_blank"` attribute to make them open in a new tab.
 */
export const targetBlankExtension: MarkedExtension = {
    useNewRenderer: true,
    renderer: {
        link({ href, title, text }: Tokens.Link): string | false {
            if (!href) throw new Error(`No href for link with text: ${text}`);

            const attrs = [
                `href="${href}"`,
                title ? `title="${title}"` : null,
                isInternalLink(href) ? null : `target="_blank"`,
            ].filter((attr): attr is string => !!attr);

            return `<a ${attrs.join(' ')}>${text}</a>`;
        },
    },
};

function isInternalLink(href: string): boolean {
    if (href.startsWith('#')) return true;
    if (href.startsWith('/')) return true;
    if (href.startsWith('.')) return true;
    return false;
}
