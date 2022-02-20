import { marked } from 'marked';

/**
 * A marked extension which renders link tags to other pages with the
 * `target="_blank"` attribute to make them open in a new tab.
 */
export const targetBlankExtension: marked.MarkedExtension = {
    renderer: {
        link(href: string | null, title: string | null, text: string):
                string | false {
            if (!href) throw new Error(`No href for link with text: ${text}`);

            const attrs = [
                `href="${href}"`,
                title ? `title="${title}"` : null,
                href.startsWith('#') ? null : `target="_blank"`,
            ].filter((attr): attr is string => !!attr);

            return `<a ${attrs.join(' ')}>${text}</a>`;
        },
    },
};
