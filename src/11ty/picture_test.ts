import mdLib from 'markdown-it';

import { addMdPicturePlugin } from './picture';

describe('picture', () => {
    describe('addMdPicturePlugin()', () => {
        it('renders a `<picture />` element with multiple sources', () => {
            const md = mdLib();
            addMdPicturePlugin(md);

            const rendered = md.render('![foo](bar.jpg)(source1.jpg)(source2.jpg)');
            expect(rendered).toContain(`
<picture><source srcset="source1.jpg" type="image/jpeg"><source srcset="source2.jpg" type="image/jpeg"><img srcset="bar.jpg" alt="foo" type="image/jpeg"></picture>
            `.trim());
        });

        it('renders a `<picture />` element with a single source', () => {
            const md = mdLib();
            addMdPicturePlugin(md);

            const rendered = md.render('![foo](bar.jpg)');
            expect(rendered).toContain(`
<picture><img srcset="bar.jpg" alt="foo" type="image/jpeg"></picture>
            `.trim());
        });

        it('renders multiline alt text as a single line', () => {
            const md = mdLib();
            addMdPicturePlugin(md);

            const rendered = md.render('![foo\nbar\ntest\n](baz.jpg)');
            expect(rendered).toContain('alt="foo bar test"');
        });

        describe('sets the `type` attribute', () => {
            it('for jpegs', () => {
                const md = mdLib();
                addMdPicturePlugin(md);
    
                const renderedJpg = md.render('![foo](foo.jpg)');
                expect(renderedJpg).toContain('type="image/jpeg"');

                const renderedJpeg = md.render('![foo](foo.jpeg)');
                expect(renderedJpeg).toContain('type="image/jpeg"');
            });

            it('for avif', () => {
                const md = mdLib();
                addMdPicturePlugin(md);
    
                const rendered = md.render('![foo](foo.avif)');
                expect(rendered).toContain('type="image/avif"');
            });

            it('for png', () => {
                const md = mdLib();
                addMdPicturePlugin(md);
    
                const rendered = md.render('![foo](foo.png)');
                expect(rendered).toContain('type="image/png"');
            });

            it('for webp', () => {
                const md = mdLib();
                addMdPicturePlugin(md);
    
                const rendered = md.render('![foo](foo.webp)');
                expect(rendered).toContain('type="image/webp"');
            });
        });

        it('throws an error when given a file with no extension', () => {
            const md = mdLib();
            addMdPicturePlugin(md);

            expect(() => md.render('![foo](bar)'))
                .toThrowError('Failed to determine extension for `bar`.');
        });

        it('throws an error when given a file with an unknown extension', () => {
            const md = mdLib();
            addMdPicturePlugin(md);

            expect(() => md.render('![foo](bar.doesnotexist)'))
                .toThrowError('No known MIME type for file extension `doesnotexist` from source `bar.doesnotexist`.');
        });
    });
});
