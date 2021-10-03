import md from 'markdown-it';
import mdAnchor from 'markdown-it-anchor';
import slugify from '@sindresorhus/slugify';

type MarkdownIt = ReturnType<typeof md>;

/**
 * Adds a plugin to apply anchor IDs to header elements. This adds support for
 * `#header-id` in the URL bar to jump to a particular section.
 */
export function addMdAnchorPlugin(md: MarkdownIt): void {
    mdAnchor(md, { slugify });
}
