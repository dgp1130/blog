import 'jasmine';

import { marked } from 'marked';
import { highlightExtension } from './highlight';

describe('highlight', () => {
    describe('highlightExtension', () => {
        marked.use(highlightExtension);

        it('highlights code blocks', () => {
            expect(marked(`
\`\`\`typescript
export const foo: string = 'bar';
\`\`\`
            `.trim())).toContain(`class="token keyword"`);
        });

        it('skips highlighting code blocks without a language', () => {
            expect(marked(`
\`\`\`
Hello, World!
\`\`\`
            `.trim())).toContain(`<code>Hello, World!\n</code>`);
        });
    });
});
