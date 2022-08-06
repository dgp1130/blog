import { getMimeType } from './mime_types';

describe('mime_types', () => {
    describe('getMimeType()', () => {
        it('returns known mime types', () => {
            expect(getMimeType('/foo.avif')).toBe('image/avif');
            expect(getMimeType('/foo.jpg')).toBe('image/jpeg');
            expect(getMimeType('/foo.jpeg')).toBe('image/jpeg');
            expect(getMimeType('/foo.png')).toBe('image/png');
            expect(getMimeType('/foo.svg')).toBe('image/svg+xml');
            expect(getMimeType('/foo.webp')).toBe('image/webp');
        });

        it('throws an error for a unknown extension', () => {
            expect(() => getMimeType('/foo.doesnotexist')).toThrowError(
                'No known MIME type for file extension `doesnotexist` from'
                + ' path `/foo.doesnotexist`.',
            );
        });

        it('throws an error when given a path with no extension', () => {
            expect(() => getMimeType('/foowithoutextension')).toThrowError(
                'Failed to extract extension from path: `/foowithoutextension`.');
        });
    });
});
