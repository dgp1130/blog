import 'jasmine';

import { marked } from 'marked';
import * as nunjucks from 'nunjucks';
import { useContext } from './context';
import { mockContext } from './context_mock';
import { demoExtension } from './demo';

describe('demo', () => {
    describe('demoExtension', () => {
        marked.use(demoExtension);

        const goldenConfig = Object.freeze({
            src: 'http://mock-demo.test/',
            title: 'Mock demo title',
        });

        const parseErrorRegex = /Failed to parse demo config/;

        it('renders a demo from valid JSON', () => {
            expect(() => renderDemo(goldenConfig)).not.toThrow();
        });

        it('renders `iframe`', () => {
            const html = renderDemo({
                ...goldenConfig,
                src: 'http://demo.test/',
                title: 'My demo.',
            });

            expect(html)
                .toMatch(/<iframe[^>]*src="http:\/\/demo.test\/"[^>]*>/);
            expect(html).toMatch(/<iframe[^>]*title="My demo."[^>]*>/);
        });

        it('renders "open in new tab" header', () => {
            const html = renderDemo({
                ...goldenConfig,
                src: 'http://demo.test/',
            });

            expect(html).toMatch(/<a[^>]*href="http:\/\/demo.test\/"[^>]*>/);
            expect(html).toMatch(/<a[^>]*title="Open demo in new tab."[^>]*>/);
            expect(html).toMatch(
                /<img[^>]*src="\/res\/img\/open-in-new-tab.svg"[^>]*>/);
        });

        it('throws an error when given non-JSON content', () => {
            expect(() => useContext(mockContext(), () => marked(`
\`\`\`demo
not a json object
\`\`\`
            `.trim()))).toThrowMatching((err) => err.message.includes(
                'Expected demo body to be a JSON object'));
        });

        it('throws an error when given a JSON array', () => {
            expect(() => renderDemo([])).toThrowError(parseErrorRegex);
        });

        it('throws an error for a malformed `src`', () => {
            expect(() => renderDemo({ ...goldenConfig, src: undefined }))
                .toThrowError(parseErrorRegex);
            expect(() => renderDemo({ ...goldenConfig, src: null }))
                .toThrowError(parseErrorRegex);
            expect(() => renderDemo({ ...goldenConfig, src: 1234 }))
                .toThrowError(parseErrorRegex);
        });

        it('throws an error for a malformed `title`', () => {
            expect(() => renderDemo({ ...goldenConfig, title: undefined }))
                .toThrowError(parseErrorRegex);
            expect(() => renderDemo({ ...goldenConfig, title: null }))
                .toThrowError(parseErrorRegex);
            expect(() => renderDemo({ ...goldenConfig, title: 1234 }))
                .toThrowError(parseErrorRegex);
        });

        it('throws an error for an extra property', () => {
            expect(() => renderDemo({ ...goldenConfig, foo: 'bar' }))
                .toThrowError(parseErrorRegex);
        });

        it('ignores non-demo code blocks', () => {
            const ctx = mockContext({ njk: mockEnvironment });
            const html = useContext(ctx, () => marked(`
\`\`\`typescript
\`\`\`
            `.trim()));

            expect(html).toContain('<code class="language-typescript">');
        });

        it('throws when no context is set', () => {
            expect(() => marked(`
\`\`\`demo
${JSON.stringify(goldenConfig, null, 4)}
\`\`\`
            `.trim())).toThrowError(/No context available\./);
        });
    });
});

const mockEnvironment = new nunjucks.Environment();
function renderDemo(config: unknown): string {
    const ctx = mockContext({ njk: mockEnvironment });
    return useContext(ctx, () => marked(`
\`\`\`demo
${JSON.stringify(config, null, 4)}
\`\`\`
    `.trim()));
}
