import 'jasmine';

import { marked } from 'marked';
import { inlineHtmlExtension } from './inline_html';

describe('inline-html', () => {
    describe('inlineHtmlExtension', () => {
        marked.use(inlineHtmlExtension);

        it('returns inlined HTML, including insignificant whitespace', () => {
            expect(marked(`
\`\`\`inline-html
<div>Hello,          World!</div>
\`\`\`
            `.trim())).toBe(`<div>Hello,          World!</div>`);
        });
    });
});
