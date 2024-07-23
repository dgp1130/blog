import { Marked } from 'marked';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import { Context, useContext } from './context';
import { demoExtension } from './demo';
import { highlightExtension } from './highlight';
import { inlineHtmlExtension } from './inline_html';
import { pictureExtension } from './picture';
import { targetBlankExtension } from './target_blank';
import { timestampExtension } from './timestamp';
import { tweetExtension } from './tweet';
import { videoExtension } from './video';

const marked = new Marked(
    // Highlight extension must come first, or else it will conflict with other
    // code block extensions. It does not appear to be possible to have it
    // ignore certain languages entirely.
    highlightExtension,

    gfmHeadingId(),
    demoExtension,
    inlineHtmlExtension,
    pictureExtension(),
    targetBlankExtension,
    timestampExtension,
    tweetExtension,
    videoExtension,
);

/**
 * Returns a function which accepts markdown content as a string parameter and
 * returns the rendered HTML.
 */
export function markdown(md: string, data: Context): Promise<string> {
    // Set the context and render to HTML.
    return useContext(data, async () => await marked.parse(md));
}
