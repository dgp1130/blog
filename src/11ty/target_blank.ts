import md from 'markdown-it';

type MarkdownIt = ReturnType<typeof md>;

// Hack: `Token` is not exported so we need to reference it via dependent types.
type Token = ReturnType<MarkdownIt['parse']>[number];

/**
 * Adds `target="_blank"` to all `<a />` tags, making them open them in a new
 * tab.
 * 
 * Implementation is a simplified version of:
 * https://github.com/markdown-it/markdown-it/blob/e07a9ddeee192ad099ed1dd7e6d1960fd5aa8d05/docs/architecture.md#:~:text=how%20to%20add-,target%3D%22_blank%22,-to%20all%20links
 */
export function addMdTargetBlankPlugin(md: MarkdownIt): void {
    md.renderer.rules['link_open'] = linkOpenRule;
}

function linkOpenRule(
    tokens: Token[],
    idx: number,
    options: md.Options,
    env: any,
    self: MarkdownIt['renderer'],
): string {
    const token = tokens[idx];
    if (!token) throw new Error(`No token at index ${idx}.`);

    token.attrSet('target', '_blank');

    return self.renderToken(tokens, idx, options);
}
