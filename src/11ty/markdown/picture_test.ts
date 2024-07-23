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
        const marked = new Marked(pictureExtension({ imageSize }));

        afterEach(() => {
            imageSize.calls.reset();
        });

        async function renderImage(md: string, ctx?: Context): Promise<string> {
            return await useContext(
                ctx ?? mockContext(),
                async () => await marked.parse(md),
            );
        }

        it('renders an image with a single source as an `<img />`', async () => {
            expect(await renderImage(`![alt](/foo.png)`))
                .toContain(`<img src="/foo.png" alt="alt">`);
        });

        it('renders an image with multiple sources as a `<picture />`', async () => {
            imageSize.and.returnValues(
                Promise.resolve({ width: 100, height: 100 }),
                Promise.resolve({ width: 200, height: 200 }),
                Promise.resolve({ width: 300, height: 300 }),
            );

            expect(await renderImage(`![alt](/foo.avif)(/foo.webp)(/foo.png)`))
                .toContain(`
<picture>
    <source srcset="/foo.avif" type="image/avif" width="100" height="100" />
    <source srcset="/foo.webp" type="image/webp" width="200" height="200" />
    <img srcset="/foo.png" alt="alt" width="300" height="300" />
</picture>
                `.trim())
        });

        it('renders an image with a multiline alt', async () => {
            imageSize.and.resolveTo(MOCK_SIZE);

            const html = await renderImage(`
![this is a
very long
alt text](/foo.webp)(/foo.png)
            `.trim());
            expect(html).toContain(`alt="this is a very long alt text"`);
        });

        it('throws an error when given a source with no alt', async () => {
            await expectAsync(renderImage(`![](/foo.png)(/bar.png)`))
                .toBeRejectedWithError(/No image alt/);
        });

        it('escapes alt text with quotes', async () => {
            imageSize.and.resolveTo(MOCK_SIZE);

            const html = await renderImage(
                `![this is "alt" text with "quotes"!](/foo.webp)(/foo.png)`);
            expect(html).toContain(
                `alt="this is &quot;alt&quot; text with &quot;quotes&quot;!"`);
        });

        it('trims leading and trailing alt whitespace', async () => {
            imageSize.and.resolveTo(MOCK_SIZE);

            const html = await renderImage(`
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

            await expectAsync(renderImage(`![alt]`))
                .toBeRejectedWithError(/Picture token has zero sources/);
        });

        it('throws an error when given a source with an unknown extension', async () => {
            imageSize.and.resolveTo(MOCK_SIZE);

            await expectAsync(renderImage(
                `![alt](/foo.doesnotexist)(/foo.png)`)).toBeRejected();
        });

        it('throws an error when given a source without an extension', async () => {
        imageSize.and.resolveTo(MOCK_SIZE);

            await expectAsync(renderImage(
                `![alt](/foowithoutextension)(/foo.png)`)).toBeRejected();
        });

        it('renders custom attributes', async () => {
            imageSize.and.resolveTo(MOCK_SIZE);

            expect(await renderImage(`![alt](/foo.png)(/bar.png){foo="bar"}`))
                .toMatch(/<img[^>]*foo="bar"[^>]*>/);
        });

        it('renders multiple custom attributes', async () => {
            imageSize.and.resolveTo(MOCK_SIZE);

            const rendered = await renderImage(
                `![alt](/foo.png)(/bar.png){foo="bar", hello="world"}`);

            expect(rendered).toMatch(/<img[^>]*foo="bar"[^>]*>/);
            expect(rendered).toMatch(/<img[^>]*hello="world"[^>]*>/);
        });

        it('renders custom attributes even when only one source is used', async () => {
            imageSize.and.resolveTo(MOCK_SIZE);

            expect(await renderImage(`![alt](/foo.png){foo="bar"}`))
                .toMatch(/<img[^>]*foo="bar"[^>]*>/);
        });

        it('renders with size from a relative path', async () => {
            imageSize.and.resolveTo({ width: 100, height: 200 });

            const html = await renderImage(
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

            const html = await renderImage(
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
            await expectAsync(renderImage(
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
            await expectAsync(renderImage(
                '![alt](/../foo.png){foo="bar"}',
            )).toBeRejectedWithError(/outside the root directory/);

            expect(imageSize).not.toHaveBeenCalled();
        });

        it('renders without size for an SVG', async () => {
            const html = await renderImage('![alt](./foo.svg){foo="bar"}');

            expect(imageSize).not.toHaveBeenCalled();

            expect(html).not.toMatch(/<img[^>]*width=[^>]*>/);
            expect(html).not.toMatch(/<img[^>]*height=[^>]*>/);
        });

        it('throws when `image-size` throws', async () => {
            const error = new Error('Negative-sized image?!');

            imageSize.and.rejectWith(error);

            await expectAsync(renderImage('![alt](./foo.jpg){foo="bar"}'))
                .toBeRejectedWith(error);
        });

        it('throws when `image-size` returns `undefined`', async () => {
            imageSize.and.resolveTo(undefined);

            await expectAsync(renderImage('![alt](./foo.jpg){foo="bar"}'))
                .toBeRejectedWithError(/Could not extract dimensions/);
        });

        it('throws when `width` is `undefined`', async () => {
            imageSize.and.resolveTo({ width: undefined, height: 100 });

            await expectAsync(renderImage('![alt](./foo.jpg){foo="bar"}'))
                .toBeRejectedWithError(/Missing width/);
        });

        it('throws when `height` is `undefined`', async () => {
            imageSize.and.resolveTo({ width: 100, height: undefined });

            await expectAsync(renderImage('![alt](./foo.jpg){foo="bar"}'))
                .toBeRejectedWithError(/Missing.*height/);
        });
    });
});
