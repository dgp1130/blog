import 'jasmine';

import { Marked, MarkedExtension, Tokens } from 'marked';
import { highlightExtension } from './highlight';

describe('highlight', () => {
    describe('highlightExtension', () => {
        const marked = new Marked(highlightExtension);

        it('highlights code blocks', () => {
            expect(marked.parse(`
\`\`\`typescript
export const foo: string = 'bar';
\`\`\`
            `.trim())).toContain(`class="token keyword"`);
        });

        it('skips highlighting code blocks without a language', () => {
            expect(marked.parse(`
\`\`\`
Hello, World!
\`\`\`
            `.trim())).toContain(`<code>Hello, World!\n</code>`);
        });

        it('ignores unknown languages', () => {
            const customExtension: MarkedExtension = {
                useNewRenderer: true,
                renderer: {
                    code({ text, lang }: Tokens.Code): string | false {
                        if (lang !== 'custom') return false;

                        return text.split('').reverse().join('');
                    },
                },
            };

            const marked = new Marked(highlightExtension, customExtension);
            const html = marked.parse(`
\`\`\`custom
Hello!
\`\`\`
            `.trim());
            expect(html).toBe('!olleH');
        });

        it('aliases XML to HTML', () => {
            const html = marked.parse(`
\`\`\`xml
<doc>Hello, World!</doc>
\`\`\`
            `);

            expect(html).toContain('language-xml');
            expect(html).toContain('class="token tag"');
        });
    });
});
