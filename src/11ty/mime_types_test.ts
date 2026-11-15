import { describe, expect, it } from 'vitest';
import { getImageMimeType, getVideoMimeType } from './mime_types.js';

describe('mime_types', () => {
    describe('getImageMimeType()', () => {
        it('returns known mime types', () => {
            expect(getImageMimeType('/foo.avif')).toBe('image/avif');
            expect(getImageMimeType('/foo.jpg')).toBe('image/jpeg');
            expect(getImageMimeType('/foo.jpeg')).toBe('image/jpeg');
            expect(getImageMimeType('/foo.png')).toBe('image/png');
            expect(getImageMimeType('/foo.svg')).toBe('image/svg+xml');
            expect(getImageMimeType('/foo.webp')).toBe('image/webp');
        });

        it('throws an error for a unknown extension', () => {
            expect(() => getImageMimeType('/foo.doesnotexist')).toThrow(
                'No known image MIME type for file extension `doesnotexist`'
                + ' from path `/foo.doesnotexist`.',
            );
        });

        it('throws an error when given a path with no extension', () => {
            expect(() => getImageMimeType('/foowithoutextension')).toThrow(
                'Failed to extract extension from path: `/foowithoutextension`.');
        });
    });

    describe('getVideoMimeTypes()', () => {
        it('returns known mime types', () => {
            expect(getVideoMimeType('/foo.mp4')).toBe('video/mp4');
            expect(getVideoMimeType('/foo.webm')).toBe('video/webm');
        });

        it('throws an error for an unknown extension', () => {
            expect(() => getVideoMimeType('/foo.doesnotexist')).toThrow(
                'No known video MIME type for file extension `doesnotexist`'
                + ' from path `/foo.doesnotexist`.',
            );
        });

        it('throws an error when given a path with no extension', () => {
            expect(() => getVideoMimeType('/foowithoutextension')).toThrow(
                'Failed to extract extension from path: `/foowithoutextension`.');
        });
    });
});
