import * as fs from 'fs';
import * as path from 'path';
import { JSDOM as JsDom } from 'jsdom';
import probe from 'probe-image-size';

/** Adds `width` and `height` attributes to image tags in the given HTML. */
export async function addImageDimensions(
        html: string, htmlPath: string, inputDir: string): Promise<string> {
    const dom = new JsDom(html);
    const document = dom.window.document;

    // Get all `<img />` and `<source />` elements from the page.
    const imageEls = Array.from(document.querySelectorAll('img, source'));

    // Extract the `src` attribute from each, ignoring those without a source or
    // with remote sources (links to other pages).
    const sources = imageEls.flatMap((el) => {
        const source = getLocalSource(el);
        return source ? [source] : [];
    });
    const uniqueSources = Array.from(new Set(sources));

    // Map the `src` attribute to the file path it loads from.
    const sourcePathMap = new Map(uniqueSources.map((source) => {
        if (source.startsWith('/')) {
            // Absolute path, file is relative to input directory.
            return [ source, path.join(inputDir, source) ];
        } else {
            // Relative path, file is relative to the directory of the HTML file
            // which references it.
            const htmlDir = htmlPath.split('/').slice(0, -1).join('/');
            return [ source, path.join(htmlDir, source) ];
        }
    }));

    // Map the `src` attribute to the size of that file on disk.
    const sourceSizeMap = new Map(await Promise.all(
        Array.from(sourcePathMap.entries())
            .map(([ source, filePath ]) => probe(fs.createReadStream(filePath))
                .then((size) => [ source, size ] as const)),
    ));

    // Add `width` and `height` attributes to each `<img />` & `<source />` tag.
    for (const imageEl of imageEls) {
        // Ignore tags with non-local sources. TODO: Avoid repeating this?
        const source = getLocalSource(imageEl);
        if (!source) continue;

        const sourceSize = sourceSizeMap.get(source);
        if (!sourceSize) {
            throw new Error(`Failed to find image \`${source}\` relative to \`${
                htmlPath}\` among:\n${
                Array.from(sourceSizeMap.keys()).join('\n')}`);
        }

        imageEl.setAttribute('width', sourceSize.width.toString());
        imageEl.setAttribute('height', sourceSize.height.toString());
    }

    return dom.serialize();
}

function getLocalSource(el: Element): string | null {
    const source = el.getAttribute('src') ?? el.getAttribute('srcset');
    if (source?.startsWith('http://') || source?.startsWith('https://')) {
        return null;
    }

    return source;
}
