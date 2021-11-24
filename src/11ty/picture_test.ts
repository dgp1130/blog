import mdLib from 'markdown-it';

import { addMdPicturePlugin } from './picture';

describe('picture', () => {
    describe('addMdPicturePlugin()', () => {
        it('renders a `<picture />` element with multiple sources', () => {
            const md = mdLib();
            addMdPicturePlugin(md);

            const rendered = md.render('![foo](bar.jpg)(source1.jpg)(source2.jpg)');
            expect(rendered).toContain(`
<picture><source srcset="source1.jpg"><source srcset="source2.jpg"><img srcset="bar.jpg" alt="foo"></picture>
            `.trim());
        });

        it('renders a `<picture />` element with a single source', () => {
            const md = mdLib();
            addMdPicturePlugin(md);

            const rendered = md.render('![foo](bar.jpg)');
            expect(rendered).toContain(`
<picture><img srcset="bar.jpg" alt="foo"></picture>
            `.trim());
        });

        it('renders multiline alt text as a single line', () => {
            const md = mdLib();
            addMdPicturePlugin(md);

            const rendered = md.render('![foo\nbar\ntest](baz.jpg)');
            expect(rendered).toContain('alt="foo bar test"');
        });
    });
});
