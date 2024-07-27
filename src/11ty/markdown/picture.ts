import { imageSize as imageSizeCb } from 'image-size';
import { MarkedExtension, RendererExtension, Token, TokenizerExtension, Tokens } from 'marked';
import * as path from 'path';
import { promisify } from 'util';
import { getImageMimeType } from '../mime_types';
import { Parser } from './parser';
import { getContext } from './context';

const imageSizeFn = promisify(imageSizeCb);

interface Source {
    path: string,
    dimensions?: Dimensions;
}

interface Dimensions {
    width: number;
    height: number;
}

interface PictureToken extends Tokens.Generic {
    type: 'picture';
    alt: string;
    sources: Source[];
    attrs: Map<string, string>;
}

function pictureParserExtension(): TokenizerExtension & RendererExtension {
    let currentMdPage: string | undefined;
    return {
        name: 'picture',
        level: 'inline',

        start(src: string): number {
            return src.match(/^!\[/)?.index ?? -1;
        },

        tokenizer(raw: string): PictureToken | undefined {
            return PictureParser.parse(raw);
        },

        renderer(inputToken: Tokens.Generic): string {
            // Validate input token.
            if (inputToken.type !== 'picture') {
                throw new Error(`Unknown token of type: ${inputToken.type}`);
            }
            const token = inputToken as PictureToken;
            if (token.sources.length === 0) {
                throw new Error(`Picture token has zero sources: ${token.raw}`);
            }

            // Check if the page we're rendering has changed to know if this is
            // the first image on it. The first image should
            const ctx = getContext();
            const firstImgOfPage =
                currentMdPage !== ctx.frontmatter.page.inputPath;
            currentMdPage = ctx.frontmatter.page.inputPath;

            // Separate the final, default source.
            const sources = token.sources.slice(0, -1);
            const defaultSource = token.sources.at(-1)!;

            // Render the picture.
            return `
<picture>
    ${sources.map((source) => renderSource(source)).join('\n    ')}
    ${renderImg(defaultSource, token.alt, {
        decoding: 'async',
        loading: firstImgOfPage ? 'eager' : 'lazy',
        fetchpriority: firstImgOfPage ? 'high' : undefined,
        ...Object.fromEntries(token.attrs.entries()),
    })}
</picture>
            `.trim();
        },
    };
}

/** Renders the `<source>` tag inside a `<picture>` element. */
function renderSource(source: Source): string {
    return `
<source srcset="${source.path}" type="${getImageMimeType(source.path)}"${
    source.dimensions
        ? ` width="${source.dimensions.width}" height="${
            source.dimensions.height}"`
        : ``
}>
    `.trim();
}

/** Renders the `<img>` tag inside a `<picture>` element. */
function renderImg(
    source: Source,
    alt: string,
    attrs: Record<string, string | undefined>,
): string {
    const attrHtml = Array.from(Object.entries(attrs))
        .filter((attr): attr is [ name: string, value: string ] => {
            return attr[1] !== undefined;
        })
        .map(([ name, value ]) => ` ${name}="${value}"`)
        .join('');

    return `
<img srcset="${source.path}" alt="${alt}"${
    source.dimensions
        ? ` width="${source.dimensions.width}" height="${
            source.dimensions.height}"`
        : ``
}${attrHtml}>
    `.trim();
}

/**
 * Creates a Marked extension which renders images with multiple sources as a
 * `<picture />` element. Simply append additional sources to an image markdown
 * and it will render a `<picture />` element with a `<source />` for each image
 * in order. The last source will be used as the fallback `<img />` source.
 *
 * ```markdown
 * ![alt](/source1.avif)(/source2.webp)(/source3.png)
 * ```
 */
export function pictureExtension({ imageSize = imageSizeFn }: {
    imageSize?: typeof imageSizeFn,
} = {}): MarkedExtension {
    return {
        useNewRenderer: true,
        extensions: [ pictureParserExtension() ],
        async: true,

        // Read the dimensions of the referenced image.
        async walkTokens(inputToken: Token) {
            if (inputToken.type !== 'picture') return;
            const token = inputToken as PictureToken;

            // Get the path of the markdown file from context.
            const ctx = getContext();
            const mdPath = ctx.frontmatter.page.inputPath;

            await Promise.all(token.sources.map(async (source) => {
                // Get the path to the image file.
                const relImgPath = source.path;
                const imgExt = relImgPath.split('.').at(-1)!;

                // `image-size` says it supports SVGs, but seems to be buggy.
                // https://github.com/image-size/image-size/issues/397
                if (imgExt === 'svg') return;

                // Resolve the image path relative to the markdown file which
                // references it.
                const imgPath = resolve({
                    target: relImgPath,
                    source: mdPath,
                    root: ctx.webRoot,
                });

                // Read image dimensions.
                const dimensions = await imageSize(imgPath);

                // Validate the result.
                if (!dimensions) {
                    throw new Error(`Could not extract dimensions for image \`${
                        imgPath}\` referenced by \`${mdPath}\``);
                }
                const { width, height } = dimensions;
                if (width === undefined || height === undefined) {
                    throw new Error(`Missing width (${width}) or height (${
                        height}) for image \`${imgPath}\` referenced by \`${
                        mdPath}\`.`)
                }

                // Save the image size on the token for rendering.
                source.dimensions = { width, height };
            }));
        },
    };
}

/**
 * Resolve a path to the given target file relative to the provided source file.
 *
 * @param target A path to a target file to resolve. This can be either an
 *     absolute path relative to the project root, or a relative path relative
 *     to the source file.
 * @param source A path to a source file to resolve the target file from. This
 *     can be either an absolute path or a relative path, relative to the given
 *     root directory.
 * @param root A path relative to the CWD of the root directory to use for
 *     resolving absolute paths.
 * @returns The path to the given target relative to the given source (if
 *     relative) or the given root (if absolute).
 * @throws If the resolved path exists outside the specified root.
 */
function resolve({ target, source, root }: {
    target: string,
    source: string,
    root: string,
}): string {
    const resolved = path.normalize(target.startsWith('/')
        ? path.join(root, target)
        : path.join(source, '..', target)
    );

    if (!resolved.startsWith(root)) {
        throw new Error(`Resolving \`${target}\` from \`${source}\` led to \`${
            resolved}\` which is outside the root directory (\`${root}\`).`);
    }

    return resolved;
}

/** Parses a picture token. */
class PictureParser {
    private readonly raw: string;
    private readonly parser: Parser;
    private constructor({ raw, parser }: { raw: string, parser: Parser }) {
        this.raw = raw;
        this.parser = parser;
    }

    /**
     * Parses the whole token and returns it, or undefined if it is not matched.
     * Throws an error if the input is likely a picture with syntax errors as
     * opposed to just not being a picture.
     */
    public static parse(input: string): PictureToken | undefined {
        return PictureParser.of(input).parse();
    }

    private static of(input: string): PictureParser {
        return new PictureParser({ raw: input, parser: Parser.of(input) });
    }

    /** Parses the whole picture. */
    private parse(): PictureToken | undefined {
        if (this.parser.peek(2) !== '![') return undefined;

        const rawAlt = this.parseAlt();
        const sources = this.parseSources();
        const attrs = this.parseAttrs();

        // Use built-in image parser if it's just a single plain image.
        if (sources.length === 1 && attrs.size === 0) return undefined;

        // Collapse a multiline alt onto a single line like markdown typically
        // does for text.
        if (!rawAlt) throw new Error(`No image alt for:\n${this.raw}`);
        const alt = rawAlt.split('\n').join(' ').trim().replace(/"/g, '&quot;');

        return {
            type: 'picture',
            raw: this.raw,
            alt,
            sources,
            attrs,
        };
    }

    /** Parses the alt text: '![alt text]' => 'alt text' */
    private parseAlt(): string {
        this.parser.expect('![');
        const alt = this.parser.until(']');
        this.parser.expect(']');
        return alt;
    }

    /** Parses a single source: '(/foo.png)' => '/foo.png' */
    private parseSource(): string {
        this.parser.expect('(');
        const source = this.parser.until(')');
        this.parser.expect(')');
        return source;
    }

    /**
     * Parses multiple sources:
     * '(/foo.png)(/bar.png)' => [ '/foo.png', '/bar.png' ]
     */
    private parseSources(): Source[] {
        const sources: string[] = [];
        this.parser.trimStart();
        while (this.parser.peek() === '(') {
            sources.push(this.parseSource());
            this.parser.trimStart();
        }
        return sources.map((source) => ({ path: source }));
    }

    /** Parses a single attribute: 'foo="bar"' => [ 'foo', 'bar' ] */
    private parseAttr(): [ name: string, value: string ] {
        const name = this.parser.until('=');
        this.parser.expect('="');
        const value = this.parser.until('"');
        this.parser.expect('"');

        return [ name, value ];
    }

    /**
     * Parses multiple attributes:
     * '{foo="bar", hello="world"}' => Map({ foo: 'bar', hello: 'world' })
     */
    private parseAttrs(): Map<string, string> {
        const attrs = new Map<string, string>();
        if (this.parser.peek() !== '{') return attrs;

        this.parser.trimStart();
        this.parser.expect('{');
        while (this.parser.peek() !== '}') {
            const [ name, value ] = this.parseAttr();
            attrs.set(name, value);
            this.parser.trimStart();
            if (this.parser.peek() === ',') this.parser.expect(',');
            this.parser.trimStart();
        }
        this.parser.expect('}');
        return attrs;
    }
}
