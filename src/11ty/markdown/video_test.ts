import 'jasmine';

import { marked } from 'marked';
import * as nunjucks from 'nunjucks';
import { getVideoMimeType } from '../mime_types';
import { useContext } from './context';
import { mockContext } from './context_mock';
import { videoExtension } from './video';

describe('video', () => {
    describe('videoExtension', () => {
        marked.use(videoExtension);

        const goldenConfig = Object.freeze({
            type: 'demo',
            urls: [ '/video.webm', '/video.mp4' ],
            size: [ 1920, 1080 ],
        });

        const parseErrorRegex = /Failed to parse video config/;

        it('renders a video from valid JSON', () => {
            expect(() => renderVideo(goldenConfig)).not.toThrow();
        });

        it('renders `controls` for demo videos', () => {
            const html = renderVideo({ ...goldenConfig, type: 'demo' });
            expect(html).toMatch(/<video[^>]*controls[^>]*>/);
        });

        it('does not render `controls` for gif videos', () => {
            const html = renderVideo({ ...goldenConfig, type: 'gif' });
            expect(html).not.toMatch(/<video[^>]*controls[^>]*>/);
        });

        it('renders `gif` class for gif videos', () => {
            const html = renderVideo({ ...goldenConfig, type: 'gif' });
            const [, classes] = /<video[^>]*class="([^"]*)"/.exec(html)!;
            const classList = classes!
                .split(' ')
                .filter((cls) => cls.trim() !== '')
            ;

            expect(classList).toContain('gif');
        });

        it('renders `urls` in order', () => {
            const html = renderVideo({
                ...goldenConfig,
                urls: [ '/video.webm', '/video.mp4' ],
            });

            const webmSource = html
                .indexOf('<source src="/video.webm" type="video/webm" />');
            const mp4Source = html
                .indexOf('<source src="/video.mp4" type="video/mp4" />');

            // `.webm` is first and should be preferred over `.mp4`.
            expect(webmSource).not.toBe(-1);
            expect(mp4Source).not.toBe(-1);
            expect(webmSource).toBeLessThan(mp4Source);
        });

        it('renders video size', () => {
            const html = renderVideo({
                ...goldenConfig,
                size: [1234, 4321],
            });

            expect(html).toMatch(/<video[^>]*width="1234"[^>]*>/);
            expect(html).toMatch(/<video[^>]*height="4321"[^>]*>/);
        });

        it('throws an error when given non-JSON content', () => {
            expect(() => useContext(mockContext(), () => marked(`
\`\`\`video
not a json object
\`\`\`
            `.trim()))).toThrowMatching((err) => err.message.includes(
                'Expected video body to be a JSON object'));
        });

        it('throws an error when given a JSON array', () => {
            expect(() => renderVideo([])).toThrowError(parseErrorRegex);
        });

        it('throws an error for a malformed `type`', () => {
            expect(() => renderVideo({ ...goldenConfig, type: undefined }))
                .toThrowError(parseErrorRegex);
            expect(() => renderVideo({ ...goldenConfig, type: null }))
                .toThrowError(parseErrorRegex);
            expect(() => renderVideo({ ...goldenConfig, type: 1234 }))
                .toThrowError(parseErrorRegex);
            expect(() => renderVideo({ ...goldenConfig, type: 'not a type' }))
                .toThrowError(parseErrorRegex);
        });

        it('throws an error for a malformed `urls`', () => {
            expect(() => renderVideo({ ...goldenConfig, urls: undefined }))
                .toThrowError(parseErrorRegex);
            expect(() => renderVideo({ ...goldenConfig, urls: null }))
                .toThrowError(parseErrorRegex);
            expect(() => renderVideo({ ...goldenConfig, urls: 1234 }))
                .toThrowError(parseErrorRegex);
            expect(() => renderVideo({ ...goldenConfig, urls: [ 1234 ] }))
                .toThrowError(parseErrorRegex);
            expect(() => renderVideo({ ...goldenConfig, urls: [ ] }))
                .toThrowError(/At least one URL is required./);
        });

        it('throws an error for malformed `size`', () => {
            expect(() => renderVideo({ ...goldenConfig, size: undefined }))
                .toThrowError(parseErrorRegex);
            expect(() => renderVideo({ ...goldenConfig, size: null }))
                .toThrowError(parseErrorRegex);
            expect(() => renderVideo({ ...goldenConfig, size: 12345 }))
                .toThrowError(parseErrorRegex);
            expect(() => renderVideo({ ...goldenConfig, size: [ ] }))
                .toThrowError(parseErrorRegex);
            expect(() => renderVideo({ ...goldenConfig, size: [ 12345 ] }))
                .toThrowError(parseErrorRegex);
            expect(() => renderVideo({ ...goldenConfig, size: [ 1, 2, 3 ] }))
                .toThrowError(parseErrorRegex);
        });

        it('throws an error for an extra property', () => {
            expect(() => renderVideo({ ...goldenConfig, foo: 'bar' }))
                .toThrowError(parseErrorRegex);
        });

        it('ignores non-video code blocks', () => {
            const ctx = mockContext({ njk: mockEnvironment });
            const html = useContext(ctx, () => marked(`
\`\`\`typescript
\`\`\`
            `.trim()));

            expect(html).toContain('<code class="language-typescript">');
        });

        it('throws when no context is set', () => {
            expect(() => marked(`
\`\`\`video
${JSON.stringify(goldenConfig, null, 4)}
\`\`\`
            `.trim())).toThrowError(/No context available\./);
        });
    });
});

const mockEnvironment = new nunjucks.Environment()
    .addFilter('mimeVideo', (path) => getVideoMimeType(path))
;

function renderVideo(config: unknown): string {
    const ctx = mockContext({ njk: mockEnvironment });
    return useContext(ctx, () => marked(`
\`\`\`video
${JSON.stringify(config, null, 4)}
\`\`\`
    `.trim()));
}
