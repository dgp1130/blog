import 'jasmine';

import { imageSize as imageSizeCb } from 'image-size';
import { Marked } from 'marked';
import { promisify } from 'util';
import { pictureExtension } from './picture';
import { Context, useContext } from './context';
import { mockContext } from './context_mock';

const imageSizeFn = promisify(imageSizeCb);

const MOCK_SIZE = Object.freeze({
    width: 123,
    height: 321,
}) as Awaited<ReturnType<typeof imageSizeFn>>;

describe('picture', () => {
    describe('pictureExtension', () => {
        const imageSize = jasmine.createSpy('imageSize', imageSizeFn);
        function init(): Marked {
            // `pictureExtension` is stateful (has different `loading="lazy"`
            // behavior) for the first image, therefore we need a new extension
            // for every test to avoid leaking state.
            return new Marked(pictureExtension({ imageSize }));
        }

        afterEach(() => {
            imageSize.calls.reset();
        });

        async function renderImage(marked: Marked, md: string, ctx?: Context): Promise<string> {
            return await useContext(
                ctx ?? mockContext(),
                async () => await marked.parse(md),
            );
        }

        it('renders an image with a single source as an `<img />`', async () => {
            const marked = init();

            expect(await renderImage(marked, `![alt](/foo.png)`))
                .toContain(`<img src="/foo.png" alt="alt">`);
        });

        it('renders an image with multiple sources as a `<picture />`', async () => {
            imageSize.and.returnValues(
                Promise.resolve({ width: 100, height: 100 }),
                Promise.resolve({ width: 200, height: 200 }),
                Promise.resolve({ width: 300, height: 300 }),
            );

            const marked = init();

            expect(await renderImage(
                marked,
                `![alt](/foo.avif)(/foo.webp)(/foo.png)`,
            )).toContain(`
<picture>
    <source srcset="/foo.avif" type="image/avif" width="100" height="100">
    <source srcset="/foo.webp" type="image/webp" width="200" height="200">
    <img srcset="/foo.png" alt="alt" width="300" height="300" decoding="async" loading="eager" fetchpriority="high">
</picture>
                `.trim())
        });

        it('renders all but the first image lazily', async () => {
            imageSize.and.resolveTo(MOCK_SIZE);

            const marked = init();

            // First image is not lazy.
            const img1 = await renderImage(
                marked, `![alt](/foo.avif)(/foo.webp)`);
            expect(img1).toContain('loading="eager"');
            expect(img1).toContain('fetchpriority="high"');

            // All other images are lazy.
            const img2 = await renderImage(
                marked, `![alt](/foo.avif)(/foo.webp)`);
            expect(img2).toContain('loading="lazy"');
            expect(img2).not.toContain('fetchpriority');

            const img3 = await renderImage(
                marked, `![alt](/foo.avif)(/foo.webp)`);
            expect(img3).toContain('loading="lazy"');
            expect(img3).not.toContain('fetchpriority');

            const img4 = await renderImage(
                marked, `![alt](/foo.avif)(/foo.webp)`);
            expect(img4).toContain('loading="lazy"');
            expect(img4).not.toContain('fetchpriority');
        });

        it('resets lazy loading behavior when parsing a new document', async () => {
            imageSize.and.resolveTo(MOCK_SIZE);

            const marked = init();

            const firstPageCtx = mockContext({
                frontmatter: {
                    page: {
                        inputPath: 'src/www/posts/first.md',
                    },
                },
            });

            // First image is not lazy.
            const img1 = await renderImage(
                marked,
                `![alt](/foo.avif)(/foo.webp)`,
                firstPageCtx,
            );
            expect(img1).toContain('loading="eager"');
            expect(img1).toContain('fetchpriority="high"');

            // Subsequent images are lazy.
            const img2 = await renderImage(
                marked,
                `![alt](/foo.avif)(/foo.webp)`,
                firstPageCtx,
            );
            expect(img2).toContain('loading="lazy"');
            expect(img2).not.toContain('fetchpriority');

            const secondPageCtx = mockContext({
                frontmatter: {
                    page: {
                        inputPath: 'src/www/posts/second.md',
                    },
                },
            });

            // Switching to another doc resets laziness.
            const img3 = await renderImage(
                marked,
                `![alt](/foo.avif)(/foo.webp)`,
                secondPageCtx,
            );
            expect(img3).toContain('loading="eager"');
            expect(img3).toContain('fetchpriority="high"');

            // Subsequent images are lazy.
            const img4 = await renderImage(
                marked,
                `![alt](/foo.avif)(/foo.webp)`,
                secondPageCtx,
            );
            expect(img4).toContain('loading="lazy"');
            expect(img4).not.toContain('fetchpriority');
        });

        it('renders an image with a multiline alt', async () => {
            imageSize.and.resolveTo(MOCK_SIZE);

            const marked = init();

            const html = await renderImage(marked, `
![this is a
very long
alt text](/foo.webp)(/foo.png)
            `.trim());
            expect(html).toContain(`alt="this is a very long alt text"`);
        });

        it('throws an error when given a source with no alt', async () => {
            const marked = init();

            await expectAsync(renderImage(marked, `![](/foo.png)(/bar.png)`))
                .toBeRejectedWithError(/No image alt/);
        });

        it('escapes alt text with quotes', async () => {
            imageSize.and.resolveTo(MOCK_SIZE);

            const marked = init();

            const html = await renderImage(
                marked,
                `![this is "alt" text with "quotes"!](/foo.webp)(/foo.png)`,
            );
            expect(html).toContain(
                `alt="this is &quot;alt&quot; text with &quot;quotes&quot;!"`);
        });

        it('trims leading and trailing alt whitespace', async () => {
            imageSize.and.resolveTo(MOCK_SIZE);

            const marked = init();

            const html = await renderImage(marked, `
![
this is some
multiline alt text
with leading and trailing newlines
](/foo.webp)(/foo.png)
            `.trim());

            expect(html).toContain(
                `alt="this is some multiline alt text with leading and trailing newlines"`);
        });

        it('throws an error when given no sources', async () => {
            imageSize.and.resolveTo(MOCK_SIZE);

            const marked = init();

            await expectAsync(renderImage(marked, `![alt]`))
                .toBeRejectedWithError(/Picture token has zero sources/);
        });

        it('throws an error when given a source with an unknown extension', async () => {
            imageSize.and.resolveTo(MOCK_SIZE);

            const marked = init();

            await expectAsync(renderImage(
                marked,
                `![alt](/foo.doesnotexist)(/foo.png)`,
            )).toBeRejected();
        });

        it('throws an error when given a source without an extension', async () => {
        imageSize.and.resolveTo(MOCK_SIZE);

        const marked = init();

            await expectAsync(renderImage(
                marked,
                `![alt](/foowithoutextension)(/foo.png)`,
            )).toBeRejected();
        });

        it('renders custom attributes', async () => {
            imageSize.and.resolveTo(MOCK_SIZE);

            const marked = init();

            expect(await renderImage(
                marked,
                `![alt](/foo.png)(/bar.png){foo="bar"}`,
            )).toMatch(/<img[^>]*foo="bar"[^>]*>/);
        });

        it('renders multiple custom attributes', async () => {
            imageSize.and.resolveTo(MOCK_SIZE);

            const marked = init();

            const rendered = await renderImage(
                marked,
                `![alt](/foo.png)(/bar.png){foo="bar", hello="world"}`,
            );

            expect(rendered).toMatch(/<img[^>]*foo="bar"[^>]*>/);
            expect(rendered).toMatch(/<img[^>]*hello="world"[^>]*>/);
        });

        it('renders custom attributes even when only one source is used', async () => {
            imageSize.and.resolveTo(MOCK_SIZE);

            const marked = init();

            expect(await renderImage(marked, `![alt](/foo.png){foo="bar"}`))
                .toMatch(/<img[^>]*foo="bar"[^>]*>/);
        });

        it('renders with size from a relative path', async () => {
            imageSize.and.resolveTo({ width: 100, height: 200 });

            const marked = init();

            const html = await renderImage(
                marked,
                '![alt](./foo.png){foo="bar"}',
                mockContext({
                    frontmatter: {
                        page: {
                            inputPath: 'src/www/path/to/post.md',
                        },
                    },
                    webRoot: 'src/www',
                }),
            );

            expect(imageSize).toHaveBeenCalledWith('src/www/path/to/foo.png');

            expect(html).toMatch(/<img[^>]*srcset=".\/foo.png"[^>]*>/);
            expect(html).toMatch(/<img[^>]*width="100"[^>]*>/);
            expect(html).toMatch(/<img[^>]*height="200"[^>]*>/);
        });

        it('renders with size from an absolute path', async () => {
            imageSize.and.resolveTo({ width: 100, height: 200 });

            const marked = init();

            const html = await renderImage(
                marked,
                '![alt](/path/to/foo.png){foo="bar"}',
                mockContext({
                    webRoot: 'src/www',
                }),
            );

            expect(imageSize).toHaveBeenCalledWith('src/www/path/to/foo.png');

            expect(html).toMatch(/<img[^>]*srcset="\/path\/to\/foo.png"[^>]*>/);
            expect(html).toMatch(/<img[^>]*width="100"[^>]*>/);
            expect(html).toMatch(/<img[^>]*height="200"[^>]*>/);
        });

        it('throws an error when given a relative path outside the root directory', async () => {
            const marked = init();

            await expectAsync(renderImage(
                marked,
                '![alt](../../../../../../../foo.png){foo="bar"}',
                mockContext({
                    frontmatter: {
                        page: {
                            inputPath: 'src/www/path/to/post.md',
                        },
                    },
                    webRoot: 'src/www',
                }),
            )).toBeRejectedWithError(/outside the root directory/);

            expect(imageSize).not.toHaveBeenCalled();
        });

        it('throws an error when given an absolute path outside the root directory', async () => {
            const marked = init();

            await expectAsync(renderImage(
                marked,
                '![alt](/../foo.png){foo="bar"}',
            )).toBeRejectedWithError(/outside the root directory/);

            expect(imageSize).not.toHaveBeenCalled();
        });

        it('renders without size for an SVG', async () => {
            const marked = init();

            const html = await renderImage(
                marked,
                '![alt](./foo.svg){foo="bar"}',
            );

            expect(imageSize).not.toHaveBeenCalled();

            expect(html).not.toMatch(/<img[^>]*width=[^>]*>/);
            expect(html).not.toMatch(/<img[^>]*height=[^>]*>/);
        });

        it('throws when `image-size` throws', async () => {
            const error = new Error('Negative-sized image?!');

            imageSize.and.rejectWith(error);

            const marked = init();

            await expectAsync(renderImage(
                marked,
                '![alt](./foo.jpg){foo="bar"}',
            )).toBeRejectedWith(error);
        });

        it('throws when `image-size` returns `undefined`', async () => {
            imageSize.and.resolveTo(undefined);

            const marked = init();

            await expectAsync(renderImage(
                marked,
                '![alt](./foo.jpg){foo="bar"}',
            )).toBeRejectedWithError(/Could not extract dimensions/);
        });

        it('throws when `width` is `undefined`', async () => {
            imageSize.and.resolveTo({ width: undefined, height: 100 });

            const marked = init();

            await expectAsync(renderImage(
                marked,
                '![alt](./foo.jpg){foo="bar"}',
            )).toBeRejectedWithError(/Missing width/);
        });

        it('throws when `height` is `undefined`', async () => {
            imageSize.and.resolveTo({ width: 100, height: undefined });

            const marked = init();

            await expectAsync(renderImage(
                marked,
                '![alt](./foo.jpg){foo="bar"}',
            )).toBeRejectedWithError(/Missing.*height/);
        });
    });
});
