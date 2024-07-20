import { marked } from 'marked';
import { Context, useContext } from './context';
import { demoExtension } from './demo';
import { highlightExtension } from './highlight';
import { inlineHtmlExtension } from './inline_html';
import { pictureExtension } from './picture';
import { targetBlankExtension } from './target_blank';
import { timestampExtension } from './timestamp';
import { tweetExtension } from './tweet';
import { videoExtension } from './video';

/**
 * Returns a function which accepts markdown content as a string parameter and
 * returns the rendered HTML.
 */
export function markdown(): (md: string, data: Context) => string {
    marked.use(highlightExtension);
    marked.use(demoExtension);
    marked.use(inlineHtmlExtension);
    marked.use(pictureExtension);
    marked.use(targetBlankExtension);
    marked.use(timestampExtension);
    marked.use(tweetExtension);
    marked.use(videoExtension);

    // Set the context and render to HTML.
    return (md: string, data: Context) => {
        return useContext(data, () => marked(md));
    };
}
