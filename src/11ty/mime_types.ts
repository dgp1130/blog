/**
 * Returns the MIME type for the given file path. Throws an error if the path
 * does not include an extension, or it is not a known MIME type.
 */
export function getImageMimeType(path: string): string {
    const extension = getExtension(path);

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
            throw new Error(`No known image MIME type for file extension \`${
                extension}\` from path \`${path}\`.`);
    }
}

export function getVideoMimeType(path: string): string {
    const extension = getExtension(path);

    // Map to MIME type.
    switch (extension) {
        case 'mp4':
            return 'video/mp4';
        case 'webm':
            return 'video/webm';
        default:
            throw new Error(`No known video MIME type for file extension \`${
                extension}\` from path \`${path}\`.`);
    }
}

function getExtension(path: string): string {
    // Extract extension.
    const parts = path.split('.');
    if (parts.length <= 1) {
        throw new Error(`Failed to extract extension from path: \`${path}\`.`);
    }
    return parts.slice(-1)[0]!;
}
