import { MarkedExtension, Tokens } from 'marked';
import { getImageMimeType } from '../mime_types';
import { Parser } from './parser';

interface PictureToken extends Tokens.Generic {
    type: 'picture';
    alt: string;
    sources: string[];
    attrs: Map<string, string>;
}

const extension = {
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

        // Extract the final, default source.
        const [ defaultSource ] = token.sources.slice(-1);
        const sources = token.sources.slice(0, -1);

        const attrs = Array.from(token.attrs.entries())
            .map(([name, value]) => ` ${name}="${value}"`)
            .join('')
        ;

        // Render the picture.
        return `
<picture>
${sources.map((source) => `    <source srcset="${source}" type="${
        getImageMimeType(source)}" />`).join('\n')}
    <img srcset="${defaultSource}" alt="${token.alt}"${attrs} />
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
export const pictureExtension: MarkedExtension = {
    useNewRenderer: true,
    extensions: [ extension ],
};

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
    private parseSources(): string[] {
        const sources: string[] = [];
        this.parser.trimStart();
        while (this.parser.peek() === '(') {
            sources.push(this.parseSource());
            this.parser.trimStart();
        }
        return sources;
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
