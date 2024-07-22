import { describe, expect, it } from 'vitest';
import { makeShareable } from './share';

describe('share', () => {
    describe('makeShareable()', () => {
        it('returns a URL from the current window origin', () => {
            const url = makeShareable('/foo/bar/baz', {
                getLocation: () => new URL('https://example.com/'),
            });

            expect(url.toString()).toBe('https://example.com/foo/bar/baz');
        });

        it('returns a URL with non-shareable information santitized from the current window origin', () => {
            const url = makeShareable('/foo/bar/baz', {
                getLocation: () => new URL('https://user:pass@example.com:80/test?foo=bar#something'),
            });

            expect(url.toString()).toBe('https://example.com:80/foo/bar/baz');
        });
    });
});
