import 'jasmine';

import { marked } from 'marked';
import { useContext } from './frontmatter';
import { mockFrontmatter } from './frontmatter_mock';
import { timestampExtension } from './timestamp';

describe('timestamp', () => {
    describe('timestampExtension', () => {
        marked.use(timestampExtension);

        it('renders a timestamp from the frontmatter context', () => {
            const frontmatter = mockFrontmatter({
                page: {
                    date: new Date("2022-02-19T12:00:00-0700"),
                },
            });
            const html = useContext(frontmatter, () => marked(`
\`\`\`timestamp
\`\`\`
            `.trim()));

            expect(html).toContain(`
<time datetime="2022-02-19T19:00:00.000Z" class="timestamp">February 19, 2022</time>
            `.trim());
        });

        it('renders a TODO when no date is available for the post', () => {
            const frontmatter = mockFrontmatter({
                page: {
                    date: undefined,
                },
            });
            const html = useContext(frontmatter, () => marked(`
\`\`\`timestamp
\`\`\`
            `.trim()));

            expect(html).toContain(`
<time class="timestamp">TODO: Set post date.</time>
            `.trim());
        });

        it('ignores non-timestamp code blocks', () => {
            const frontmatter = mockFrontmatter();
            const html = useContext(frontmatter, () => marked(`
\`\`\`typescript
\`\`\`
            `.trim()));

            expect(html).toContain('<code class="language-typescript">');
        });

        it('throws when no context is set', () => {
            expect(() => marked(`
\`\`\`timestamp
\`\`\`
            `.trim())).toThrowError(/No frontmatter context available\./);
        });
    });
});
