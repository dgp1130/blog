// @ts-nocheck
// Forked from https://github.com/johanlef/markdown-it-picture/blob/72bfb57cc75d2061be30a189cfe5ad4175a7e4fc/src/index.js.
// `MarkdownIt` is not well typed and its plugin types are not importable, not
// worth trying to type it here.

import md from 'markdown-it';

type MarkdownIt = ReturnType<typeof md>;

export function addMdPicturePlugin(md: MarkdownIt, options: any = {}): void {
    md.inline.ruler.at('image', rule, options);
}

/**
 * Converts md to html5 picture elements
 *
 * input:
 *    ![alt](defaultSource "title")(source1 "cond1")(source2 "cond2")(etc.)
 *
 * output:
 *    <picture>
 *      <source srcset="source1" media="cond1" />
 *      <source srcset="source2" media="cond2" />
 *      <img srcset="defaultSource" alt="alt" title="title" />
 *    </picture>
 */
function rule(state, silent) {
    if (state.src.charCodeAt(state.pos) !== 0x21 /* ! */) return false;
    if (state.src.charCodeAt(state.pos + 1) !== 0x5b /* [ */) return false;

    let pos = state.pos;
    let start = pos;
    let index = 0;
    let res = {};
    const oldPos = state.pos;

    const sources = [];
    const media = [];
    const labelStart = state.pos + 2;
    const labelEnd =
        state.md.helpers.parseLinkLabel(state, state.pos + 1, false);

    // parser failed to find ']', so it's not a valid link
    if (labelEnd < 0) return false;
    // '(' should come next
    pos = labelEnd;
    if (state.src.charCodeAt(labelEnd + 1) !== 0x28 /* ( */) return false;

    const parseSources = () => {
        // [link](  <href>  "title"  )
        //        ^^ skipping these spaces
        pos++;
        for (; pos < state.posMax; pos++) {
            const code = state.src.charCodeAt(pos);
            if (!state.md.utils.isSpace(code) && code !== 0x0a) {
                break;
            }
        }
        if (pos >= state.posMax) return false;

        // [link](  <href>  "title"  )
        //          ^^^^^^ parsing link destination
        start = pos;
        res = state.md.helpers.parseLinkDestination(
            state.src, pos, state.posMax);
        if (res.ok) {
            const source = state.md.normalizeLink(res.str);
            if (state.md.validateLink(source)) {
                pos = res.pos;
                index = sources.push(source);
            }
        }

        // [link](  <href>  "title"  )
        //                ^^ skipping these spaces
        start = pos;
        for (; pos < state.posMax; pos++) {
            const code = state.src.charCodeAt(pos);
            if (!state.md.utils.isSpace(code) && code !== 0x0a) break;
        }

        // [link](  <href>  "title"  )
        //                  ^^^^^^^ parsing link title
        res = state.md.helpers.parseLinkTitle(state.src, pos, state.posMax);
        if (pos < state.posMax && start !== pos && res.ok) {
            media[index - 1] = res.str;
            pos = res.pos;

            // [link](  <href>  "title"  )
            //                         ^^ skipping these spaces
            for (; pos < state.posMax; pos++) {
                const code = state.src.charCodeAt(pos);
                if (!state.md.utils.isSpace(code) && code !== 0x0a) break;
            }
        }

        if (pos >= state.posMax || state.src.charCodeAt(pos) !== 0x29 /* ) */) {
            state.pos = oldPos;
            return false;
        }
        // pos++
    }

    while (state.src.charCodeAt(++pos) === 0x28 /* ( */ && pos < state.posMax) {
        parseSources();
    }

    const mimeTypes = sources.map((source) => getMimeTypeFromSource(source));

    if (!silent && sources.length) {
        const primary = sources.shift();
        const primaryMimeType = mimeTypes.shift();
        const title = media.shift();
        const alt = state.src.slice(labelStart, labelEnd)
            .replace(/\n/g, ' ')
            .trim();

        let token = state.push('picture_open', 'picture', 1);

        sources.forEach((s, i) => {
            token = state.push('picture_source', 'source', 0);
            const attrs = [['srcset', s], ['type', mimeTypes[i]]];
            if (media[i]) attrs.push(['media', media[i]]);
            token.attrs = attrs;
        });

        token = state.push('picture_img', 'img', 0);
        const attrs = [
            ['srcset', primary],
            ['alt', alt],
            ['type', primaryMimeType],
        ];
        if (title) attrs.push(['title', title]);
        token.attrs = attrs;

        token = state.push('picture_close', 'picture', -1);
    }

    state.pos = pos;
    return true;
}

function getMimeTypeFromSource(source: string): string {
    const parts = source.split('.');
    if (parts.length <= 1) {
        throw new Error(`Failed to determine extension for \`${source}\`.`);
    }

    const extension = parts[parts.length - 1];
    switch (extension.toLowerCase()) {
        case 'avif':
            return 'image/avif';
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg';
        case 'png':
            return 'image/png';
        case 'webp':
            return 'image/webp';
        default:
            throw new Error(`No known MIME type for file extension \`${
                extension}\` from source \`${source}\`.`);
    }
}
