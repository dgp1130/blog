import 'jasmine';

import { marked } from 'marked';
import { useContext } from './context';
import { mockContext } from './context_mock';
import { timestampExtension } from './timestamp';

describe('timestamp', () => {
    describe('timestampExtension', () => {
        marked.use(timestampExtension);

        it('renders a timestamp from the context frontmatter', () => {
            const ctx = mockContext({
                frontmatter: {
                    page: {
                        date: new Date("2022-02-19T12:00:00-0700"),
                    },
                },
            });
            const html = useContext(ctx, () => marked(`
\`\`\`timestamp
\`\`\`
            `.trim()));

            expect(html).toContain(`
<time datetime="2022-02-19T19:00:00.000Z" class="timestamp">February 19, 2022</time>
            `.trim());
        });

        it('renders a TODO when no date is available for the post', () => {
            const ctx = mockContext({
                frontmatter: {
                    page: {
                        date: undefined,
                    },
                },
            });
            const html = useContext(ctx, () => marked(`
\`\`\`timestamp
\`\`\`
            `.trim()));

            expect(html).toContain(`
<time class="timestamp">TODO: Set post date.</time>
            `.trim());
        });

        it('ignores non-timestamp code blocks', () => {
            const ctx = mockContext();
            const html = useContext(ctx, () => marked(`
\`\`\`typescript
\`\`\`
            `.trim()));

            expect(html).toContain('<code class="language-typescript">');
        });

        it('throws when no context is set', () => {
            expect(() => marked(`
\`\`\`timestamp
\`\`\`
            `.trim())).toThrowError(/No context available\./);
        });
    });
});
