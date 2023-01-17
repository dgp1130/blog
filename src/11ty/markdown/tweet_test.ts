import 'jasmine';

import { marked } from 'marked';
import * as nunjucks from 'nunjucks';
import { getMimeType } from '../mime_types';
import { useContext } from './context';
import { mockContext } from './context_mock';
import { tweetExtension } from './tweet';

describe('tweet', () => {
    describe('tweetExtension', () => {
        marked.use(tweetExtension);

        const goldenConfig = Object.freeze({
            url: 'http://twitter.test/status/abc123/',
            author: 'Doug Parker',
            username: 'develwoutacause',
            avatars: [ '/devel.avif', '/devel.webp', '/devel.jpg' ],
            avatarDimensions: [ 200, 200 ],
            timestamp: '2022-03-02T12:00:00-0700',
            content: 'Hello, World!',
        });

        const parseErrorRegex = /Failed to parse tweet config/;

        it('renders a tweet from valid JSON', () => {
            expect(() => renderTweet(goldenConfig)).not.toThrow();
        });

        it('renders avatar images in order', () => {
            const html = renderTweet({
                ...goldenConfig,
                avatars: [ '/profile.avif', '/profile.webp', '/profile.jpg' ],
            });

            const avifSource = html
                .indexOf('<source srcset="/profile.avif" type="image/avif" />');
            const webpSource = html
                .indexOf('<source srcset="/profile.webp" type="image/webp" />');
            
            // `.avif` is first and should be preferred over `.webp`.
            expect(avifSource).toBeLessThan(webpSource);

            // `.jpg` is last and should be the default.
            expect(html).toContain('<img srcset="/profile.jpg"');
        });

        it('renders a single avatar image', () => {
            const html = renderTweet({
                ...goldenConfig,
                avatars: [ '/profile.jpg' ],
            });

            expect(html).toContain('<img srcset="/profile.jpg"');
            expect(html).not.toContain('<source');
        });

        it('throws an error when given non-JSON content', () => {
            expect(() => useContext(mockContext(), () => marked(`
\`\`\`tweet
not a json object
\`\`\`
            `.trim()))).toThrowMatching((err) => err.message.includes(`
Expected tweet body to be a JSON object, but got:
not a json object
            `.trim()));
        });

        it('throws an error when given a JSON array', () => {
            expect(() => renderTweet([])).toThrowError(parseErrorRegex);
        });

        it('throws an error for a malformed `url`', () => {
            expect(() => renderTweet({ ...goldenConfig, url: undefined }))
                .toThrowError(parseErrorRegex);
            expect(() => renderTweet({ ...goldenConfig, url: null }))
                .toThrowError(parseErrorRegex);
            expect(() => renderTweet({ ...goldenConfig, url: 1234 }))
                .toThrowError(parseErrorRegex);
            expect(() => renderTweet({ ...goldenConfig, url: 'not a URL' }))
                .toThrowError(parseErrorRegex);
        });

        it('throws an error for a malformed `author`', () => {
            expect(() => renderTweet({ ...goldenConfig, author: undefined }))
                .toThrowError(parseErrorRegex);
            expect(() => renderTweet({ ...goldenConfig, author: null }))
                .toThrowError(parseErrorRegex);
            expect(() => renderTweet({ ...goldenConfig, author: 12345 }))
                .toThrowError(parseErrorRegex);
        });

        it('throws an error for a malformed `username`', () => {
            expect(() => renderTweet({ ...goldenConfig, username: undefined }))
                .toThrowError(parseErrorRegex);
            expect(() => renderTweet({ ...goldenConfig, username: null }))
                .toThrowError(parseErrorRegex);
            expect(() => renderTweet({ ...goldenConfig, username: 12345 }))
                .toThrowError(parseErrorRegex);
        });

        it('throws an error for malformed `avatars`', () => {
            expect(() => renderTweet({ ...goldenConfig, avatars: undefined }))
                .toThrowError(parseErrorRegex);
            expect(() => renderTweet({ ...goldenConfig, avatars: null }))
                .toThrowError(parseErrorRegex);
            expect(() => renderTweet({ ...goldenConfig, avatars: 12345 }))
                .toThrowError(parseErrorRegex);
            expect(() => renderTweet({ ...goldenConfig, avatars: [ 12345 ] }))
                .toThrowError(parseErrorRegex);
            expect(() => renderTweet({ ...goldenConfig, avatars: [ ] }))
                .toThrowError(/At least one avatar is required\./);
        });

        it('throws an error for malformed `avatarDimensions`', () => {
            expect(() => renderTweet({
                ...goldenConfig,
                avatarDimensions: undefined,
            })).toThrowError(parseErrorRegex);
            expect(() => renderTweet({
                ...goldenConfig,
                avatarDimensions: null,
            })).toThrowError(parseErrorRegex);
            expect(() => renderTweet({
                ...goldenConfig,
                avatarDimensions: 12345,
            })).toThrowError(parseErrorRegex);
            expect(() => renderTweet({
                ...goldenConfig,
                avatarDimensions: [ ],
            })).toThrowError(parseErrorRegex);
            expect(() => renderTweet({
                ...goldenConfig,
                avatarDimensions: [ 12345 ],
            })).toThrowError(parseErrorRegex);
            expect(() => renderTweet({
                ...goldenConfig,
                avatarDimensions: [ 1, 2, 3 ],
            })).toThrowError(parseErrorRegex);
        });

        it('throws an error for a malformed `timestamp`', () => {
            expect(() => renderTweet({ ...goldenConfig, timestamp: undefined }))
                .toThrowError(parseErrorRegex);
            expect(() => renderTweet({ ...goldenConfig, timestamp: null }))
                .toThrowError(parseErrorRegex);
            expect(() => renderTweet({ ...goldenConfig, timestamp: 12345 }))
                .toThrowError(parseErrorRegex);
            expect(() => renderTweet({
                ...goldenConfig,
                timestamp: 'not a timestamp',
            })).toThrowError(parseErrorRegex);
        });

        it('throws an error for a malformed `content`', () => {
            expect(() => renderTweet({ ...goldenConfig, content: undefined }))
                .toThrowError(parseErrorRegex);
            expect(() => renderTweet({ ...goldenConfig, content: null }))
                .toThrowError(parseErrorRegex);
            expect(() => renderTweet({ ...goldenConfig, content: 12345 }))
                .toThrowError(parseErrorRegex);
        });

        it('throws an error for an extra property', () => {
            expect(() => renderTweet({ ...goldenConfig, foo: 'bar' }))
                .toThrowError(parseErrorRegex);
        });

        it('ignores non-tweet code blocks', () => {
            const ctx = mockContext({ njk: mockEnvironment });
            const html = useContext(ctx, () => marked(`
\`\`\`typescript
\`\`\`
            `.trim()));

            expect(html).toContain('<code class="language-typescript">');
        });

        it('throws when no context is set', () => {
            expect(() => marked(`
\`\`\`tweet
${JSON.stringify(goldenConfig, null, 4)}
\`\`\`
            `.trim())).toThrowError(/No context available\./);
        });
    });
});

const mockEnvironment = new nunjucks.Environment()
    .addFilter('mime', (path) => getMimeType(path))
;

function renderTweet(config: unknown): string {
    const ctx = mockContext({ njk: mockEnvironment });
    return useContext(ctx, () => marked(`
\`\`\`tweet
${JSON.stringify(config, null, 4)}
\`\`\`
    `.trim()));
}
