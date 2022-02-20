import { marked } from 'marked';

interface PictureToken extends marked.Tokens.Generic {
    type: 'picture';
    alt: string;
    sources: string[];
}

const extension = {
    name: 'picture',
    level: 'inline',

    start(src: string): number {
        return src.match(/^!\[/)?.index ?? -1;
    },

    tokenizer(raw: string, tokens: marked.Token[]): PictureToken | undefined {
        // Separate the alt text and source list from markdown.
        const match = raw.match(/!\[(?<alt>[^\]]*)\](?<sources>.*)/);
        if (!match) return undefined;

        // Collapse a multiline alt onto a single line like markdown typically
        // does for text.
        const rawAlt = match.groups?.['alt'];
        if (!rawAlt) throw new Error(`No alt: \`${raw}\``);
        const alt = rawAlt.split('\n').join(' ');

        // Parse the sources.
        const rawSources = match.groups?.['sources'];
        if (!rawSources) throw new Error(`No sources: \`${raw}\``);
        const sources = Array.from(matches(/\((?<source>[^)]*)\)/g, rawSources))
            .map((match) => match.groups?.['source']!)
        ;

        // Just one source, should be an `<img />` tag.
        if (sources.length === 1) {
            return undefined;
        }

        return {
            type: 'picture',
            raw,
            alt,
            sources,
        };
    },

    renderer(inputToken: marked.Tokens.Generic): string {
        // Validate input token.
        if (inputToken.type !== 'picture') {
            throw new Error(`Unknown token of type: ${inputToken.type}`);
        }
        const token = inputToken as PictureToken;
        if (token.sources.length === 0) {
            throw new Error(`Picture token has zero sources: ${token.raw}`);
        }

        // Extract the final, default source.
        const [ defaultSource ] = token.sources.slice(-1);
        const sources = token.sources.slice(0, -1);

        // Render the picture.
        return `
<picture>
${sources.map((source) => `    <source srcset="${source}" type="${
        getMimeType(source)}" />`).join('\n')}
    <img srcset="${defaultSource}" alt="${token.alt}" />
</picture>
        `.trim();
    },
};

/**
 * A marked extension which renders images with multiple sources as a
 * `<picture />` element. Simply append additional sources to an image markdown
 * and it will render a `<picture />` element with a `<source />` for each image
 * in order. The last source will be used as the fallback `<img />` source.
 * 
 * ```markdown
 * ![alt](/source1.avif)(/source2.webp)(/source3.png)
 * ```
 */
export const pictureExtension: marked.MarkedExtension = {
    extensions: [ extension ],
};

function* matches(regex: RegExp, content: string): Generator<RegExpExecArray> {
    let match: RegExpExecArray | null = null;
    while ((match = regex.exec(content)) !== null) {
        yield match;
    }
}

function getMimeType(source: string): string {
    const extension = source.split('.').slice(-1)[0];
    if (!extension) {
        throw new Error(`Failed to extract extension from source: ${source}`);
    }

    switch (extension) {
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
