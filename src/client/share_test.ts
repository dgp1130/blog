import * as browserEnv from './browser_env';
import { makeShareable } from './share';

describe('share', () => {
    describe('makeShareable()', () => {
        it('returns a URL from the current window origin', () => {
            spyOn(browserEnv, 'getLocation').and.returnValue({
                href: 'https://example.com/',
            } as Location);

            const url = makeShareable('/foo/bar/baz');

            expect(url.toString()).toBe('https://example.com/foo/bar/baz');
        });

        it('returns a URL with non-shareable information santitized from the current window origin', () => {
            spyOn(browserEnv, 'getLocation').and.returnValue({
                // Most of this information isn't shareable.
                href: 'https://user:pass@example.com:80/test?foo=bar#something',
            } as Location);

            const url = makeShareable('/foo/bar/baz');

            expect(url.toString()).toBe('https://example.com:80/foo/bar/baz');
        });
    });
});
