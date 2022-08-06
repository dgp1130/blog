/**
 * Returns the MIME type for the given file path. Throws an error if the path
 * does not include an extension, or it is not a known MIME type.
 */
export function getMimeType(path: string): string {
    // Extract extension.
    const parts = path.split('.');
    if (parts.length <= 1) {
        throw new Error(`Failed to extract extension from path: \`${path}\`.`);
    }
    const extension = parts.slice(-1)[0];

    // Map to MIME type.
    switch (extension) {
        case 'avif':
            return 'image/avif';
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg';
        case 'png':
            return 'image/png';
        case 'svg':
            return 'image/svg+xml';
        case 'webp':
            return 'image/webp';
        default:
            throw new Error(`No known MIME type for file extension \`${
                extension}\` from path \`${path}\`.`);
    }
}
