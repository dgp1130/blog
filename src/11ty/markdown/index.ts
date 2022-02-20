import { marked } from 'marked';
import { TemplateFrontmatter, useContext } from './frontmatter';
import { highlightExtension } from './highlight';
import { pictureExtension } from './picture';
import { targetBlankExtension } from './target_blank';
import { timestampExtension } from './timestamp';

/**
 * Returns a function which accepts markdown content as a string parameter and
 * returns the rendered HTML.
 */
export function markdown(): (md: string, data: TemplateFrontmatter) => string {
    marked.use(highlightExtension);
    marked.use(pictureExtension);
    marked.use(targetBlankExtension);
    marked.use(timestampExtension);

    // Set the frontmatter context and render to HTML.
    return (md: string, data: TemplateFrontmatter) => {
        return useContext(data, () => marked(md));
    };
}
