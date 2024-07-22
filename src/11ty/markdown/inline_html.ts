import { MarkedExtension, Tokens } from 'marked';

/**
 * Marked extension which defines an `inline-html` code language which is
 * rendered directly to the output without modification.
 *
 * Example:
 *
 * ```inline-html
 * <div>Hello, World!</div>
 * ```
 *
 * Marked already has support for inline HTML elements, however whitespace
 * semantics get complicated and confusing because they are within a markdown
 * document where most of that whitespace is ignored. `inline-html` exists to
 * preserve the exact text (including whitespace) provided as an input ensuring
 * the rendered output exactly matches the input HTML.
 */
export const inlineHtmlExtension: MarkedExtension = {
    useNewRenderer: true,
    renderer: {
        code({ text, lang }: Tokens.Code): string | false {
            if (lang !== 'inline-html') return false;

            return text;
        }
    },
};
