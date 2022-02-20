import 'jasmine';

import { marked } from 'marked';
import { pictureExtension } from './picture';

describe('picture', () => {
    describe('pictureExtension', () => {
        marked.use(pictureExtension);

        it('renders an image with a single source as an `<img />`', () => {
            expect(marked(`![alt](/foo.png)`))
                .toContain(`<img src="/foo.png" alt="alt">`);
        });

        it('renders an image with multiple sources as a `<picture />`', () => {
            expect(marked(`![alt](/foo.avif)(/foo.webp)(/foo.png)`)).toContain(`
<picture>
    <source srcset="/foo.avif" type="image/avif" />
    <source srcset="/foo.webp" type="image/webp" />
    <img srcset="/foo.png" alt="alt" />
</picture>
            `.trim())
        });

        it('renders an image with a multiline alt', () => {
            expect(marked(`![this is a\nvery long\nalt text](/foo.webp)(/foo.png)`))
                .toContain(`alt="this is a very long alt text"`);
        });

        it('throws an error when given a source with no alt', () => {
            expect(() => marked(`![](/foo.png)`))
                .toThrowError(/No alt: `!\[\]\(\/foo\.png\)`/);
        });

        it('throws an error when given no sources', () => {
            expect(() => marked(`![alt]`)).toThrowError(/No sources: `!\[alt\]`/);
        });

        it('throws an error when given a source with an unknown MIME type', () => {
            expect(() => marked(`![alt](/foo.doesnotexist)(/foo.png)`))
                .toThrowError(/No known MIME type for file extension `doesnotexist` from source `\/foo.doesnotexist`\./);
        });
    });
});
