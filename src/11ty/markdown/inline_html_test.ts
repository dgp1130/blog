import 'jasmine';

import { Marked } from 'marked';
import { inlineHtmlExtension } from './inline_html';

describe('inline-html', () => {
    describe('inlineHtmlExtension', () => {
        const marked = new Marked(inlineHtmlExtension);

        it('returns inlined HTML, including insignificant whitespace', () => {
            expect(marked.parse(`
\`\`\`inline-html
<div>Hello,          World!</div>
\`\`\`
            `.trim())).toBe(`<div>Hello,          World!</div>`);
        });
    });
});
