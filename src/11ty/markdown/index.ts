import { Marked } from 'marked';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import { Context, useContext } from './context.js';
import { demoExtension } from './demo.js';
import { highlightExtension } from './highlight.js';
import { inlineHtmlExtension } from './inline_html.js';
import { pictureExtension } from './picture.js';
import { targetBlankExtension } from './target_blank.js';
import { timestampExtension } from './timestamp.js';
import { tweetExtension } from './tweet.js';
import { videoExtension } from './video.js';

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
