import 'jasmine';

import { Marked } from 'marked';
import { targetBlankExtension } from './target_blank';

describe('target blank', () => {
    describe('targetBlankExtension', () => {
        const marked = new Marked(targetBlankExtension);

        it('renders an external link with `target="_blank"`', () => {
            expect(marked.parse(`[foo](bar.test)`))
                .toContain('<a href="bar.test" target="_blank">foo</a>');
        });

        it('renders a heading link without `target="_blank"`', () => {
            expect(marked.parse(`[foo](#bar)`)).toContain('<a href="#bar">foo</a>');
        });

        it('renders a relative link without `target="_blank"', () => {
            expect(marked.parse(`[foo](./bar)`)).toContain('<a href="./bar">foo</a>');
        });

        it('renders an absolute link without `target="_blank"', () => {
            expect(marked.parse(`[foo](/bar)`)).toContain('<a href="/bar">foo</a>');
        });

        it('renders a link with a title', () => {
            expect(marked.parse(`[foo](#bar "This is the title")`))
                .toContain('<a href="#bar" title="This is the title">foo</a>');
        });

        it('throws an error when rendering a link with no href', () => {
            expect(() => marked.parse(`[foo]()`))
                .toThrowError(/No href for link with text: foo/);
        });
    });
});
