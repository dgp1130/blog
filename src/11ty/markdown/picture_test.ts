import 'jasmine';

import { Marked } from 'marked';
import { pictureExtension } from './picture';

describe('picture', () => {
    describe('pictureExtension', () => {
        const marked = new Marked(pictureExtension);

        it('renders an image with a single source as an `<img />`', () => {
            expect(marked.parse(`![alt](/foo.png)`))
                .toContain(`<img src="/foo.png" alt="alt">`);
        });

        it('renders an image with multiple sources as a `<picture />`', () => {
            expect(marked.parse(`![alt](/foo.avif)(/foo.webp)(/foo.png)`))
                .toContain(`
<picture>
    <source srcset="/foo.avif" type="image/avif" />
    <source srcset="/foo.webp" type="image/webp" />
    <img srcset="/foo.png" alt="alt" />
</picture>
                `.trim())
        });

        it('renders an image with a multiline alt', () => {
            const html = marked.parse(`
![this is a
very long
alt text](/foo.webp)(/foo.png)
            `.trim());
            expect(html).toContain(`alt="this is a very long alt text"`);
        });

        it('throws an error when given a source with no alt', () => {
            expect(() => marked.parse(`![](/foo.png)(/bar.png)`))
                .toThrowError(/No image alt/);
        });

        it('escapes alt text with quotes', () => {
            const html = marked.parse(
                `![this is "alt" text with "quotes"!](/foo.webp)(/foo.png)`);
            expect(html).toContain(
                `alt="this is &quot;alt&quot; text with &quot;quotes&quot;!"`);
        });

        it('trims leading and trailing alt whitespace', () => {
            const html = marked.parse(`
![
this is some
multiline alt text
with leading and trailing newlines
](/foo.webp)(/foo.png)
            `.trim());

            expect(html).toContain(
                `alt="this is some multiline alt text with leading and trailing newlines"`);
        });

        it('throws an error when given no sources', () => {
            expect(() => marked.parse(`![alt]`))
                .toThrowError(/Picture token has zero sources/);
        });

        it('throws an error when given a source with an unknown MIME type', () => {
            expect(() => marked.parse(`![alt](/foo.doesnotexist)(/foo.png)`))
                .toThrow();
        });

        it('throws an error when given a source without an extension', () => {
            expect(() => marked.parse(`![alt](/foowithoutextension)(/foo.png)`))
                .toThrow();
        });

        it('renders custom attributes', () => {
            expect(marked.parse(`![alt](/foo.png)(/bar.png){foo="bar"}`))
                .toMatch(/<img[^>]*foo="bar"[^>]*>/);
        });

        it('renders multiple custom attributes', () => {
            const rendered = marked.parse(
                `![alt](/foo.png)(/bar.png){foo="bar", hello="world"}`);

            expect(rendered).toMatch(/<img[^>]*foo="bar"[^>]*>/);
            expect(rendered).toMatch(/<img[^>]*hello="world"[^>]*>/);
        });

        it('renders custom attributes even when only one source is used', () => {
            expect(marked.parse(`![alt](/foo.png){foo="bar"}`))
                .toMatch(/<img[^>]*foo="bar"[^>]*>/);
        });
    });
});
