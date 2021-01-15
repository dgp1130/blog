import { JSDOM as JsDom } from 'jsdom';
import { injectCsp } from './csp';

describe('csp', () => {
    describe('injectCsp()', () => {
        it('injects an empty policy', () => {
            const csp = getInjectedCsp(injectCsp(`
                <!DOCTYPE html>
                <html>
                    <head></head>
                    <body></body>
                </html>
            `));

            expect(csp).toBe(`object-src 'none';`);
        });

        it('hashes inline <script /> tags', () => {
            const csp = getInjectedCsp(injectCsp(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <script>'bare';</script>
                        <script type="module">'module';</script>
                        <script type="text/javascript">'test/javascript';</script>
                        <script type="application/javascript">'application/javascript';</script>
                        <script type="application/x-other">Not JavaScript</script>
                    </head>
                    <body></body>
                </html>
            `));

            // All JavaScript tags should be hashed. `application/x-other` is
            // not JavaScript by MIME type and should **not** be included.
            expect(csp).toBe(`script-src 'sha256-5d34NEinNl1U1YeOFHTka8dTqARzL8+ETrmCJOaj5ZI=' 'sha256-QWTfWzCIE/oRx2c0Kop7Gc3AmbSFCLRt0DNf0mrUyCg=' 'sha256-ToLbmSfoSC+QpKNHjHHDuUHYqToDYeJau6UVYJMaC68=' 'sha256-q3H+UaiJ2s+2C6FQ2ZCmmLcY5ZKXaYrG/4h8lwUYX1s='; object-src 'none';`);
        });

        it('allowlists self-hosted, relative URL scripts', () => {
            const csp = getInjectedCsp(injectCsp(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <script src="relative.js"></script>
                    </head>
                    <body></body>
                </html>
            `));

            expect(csp).toBe(`script-src 'self'; object-src 'none';`);
        });

        it('allowlists self-hosted, absolute path URL scripts', () => {
            const csp = getInjectedCsp(injectCsp(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <script src="/absolute.js"></script>
                    </head>
                    <body></body>
                </html>
            `));

            expect(csp).toBe(`script-src 'self'; object-src 'none';`);
        });

        it('deduplicates multiple `self` script sources', () => {
            const csp = getInjectedCsp(injectCsp(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <script src="relative.js"></script>
                        <script src="/absolute.js"></script>
                    </head>
                    <body></body>
                </html>
            `));

            // Only one 'self' should be included.
            expect(csp).toBe(`script-src 'self'; object-src 'none';`);
        });

        it('allowlists foreign domain script sources', () => {
            const csp = getInjectedCsp(injectCsp(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <script src="http://example1.com/js"></script>
                        <script src="https://example2.com/js"></script>
                        <script src="http://example3.com:8080/js"></script>
                    </head>
                    <body></body>
                </html>
            `));

            expect(csp).toBe(`script-src http://example1.com/js https://example2.com/js http://example3.com:8080/js; object-src 'none';`);
        });

        it('allowlists protocol script sources', () => {
            const csp = getInjectedCsp(injectCsp(`
                <!DOCTYPE html>
                <html>
                    <head></head>
                    <body></body>
                </html>
            `, { scriptSrc: ['http:', 'https:'] }));

            expect(csp).toBe(`script-src http: https:; object-src 'none';`);
        });

        it('appends provided script sources', () => {
            const csp = getInjectedCsp(injectCsp(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <script src="http://example2.com/js"></script>
                    </head>
                    <body></body>
                </html>
            `, { scriptSrc: ['http://example1.com/js', `'sha256-abc123'`] }));

            expect(csp).toBe(`script-src http://example1.com/js 'sha256-abc123' http://example2.com/js; object-src 'none';`)
        });

        it('hashes inline <style /> sources', () => {
            const csp = getInjectedCsp(injectCsp(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <style>.foo{}</style>
                    </head>
                    <body></body>
                </html>
            `));

            expect(csp).toBe(`style-src 'sha256-5gDzvFAxDTqq9+8IbIV1n6QT8rTTzWFgoqVBG94Zwl0='; object-src 'none';`);
        });

        it('allowlists self-hosted, relative URL style sources', () => {
            const csp = getInjectedCsp(injectCsp(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <link rel="stylesheet" href="relative.css">
                    </head>
                    <body></body>
                </html>
            `));

            expect(csp).toBe(`style-src 'self'; object-src 'none';`);
        });

        it('allowlists self-hosted, absolute path URL style sources', () => {
            const csp = getInjectedCsp(injectCsp(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <link rel="stylesheet" href="/absolute.css">
                    </head>
                    <body></body>
                </html>
            `));

            expect(csp).toBe(`style-src 'self'; object-src 'none';`);
        });

        it('deduplicates multiple `self` style sources', () => {
            const csp = getInjectedCsp(injectCsp(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <link rel="stylesheet" href="relative.css">
                        <link rel="stylesheet" href="/absolute.css">
                    </head>
                    <body></body>
                </html>
            `));

            expect(csp).toBe(`style-src 'self'; object-src 'none';`);
        });

        it('allowlists foreign domain style sources', () => {
            const csp = getInjectedCsp(injectCsp(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <link rel="stylesheet" href="http://example1.com/css">
                        <link rel="stylesheet" href="https://example2.com/css">
                        <link rel="stylesheet" href="http://example3.com:8080/css">
                    </head>
                    <body></body>
                </html>
            `));

            expect(csp).toBe(`style-src http://example1.com/css https://example2.com/css http://example3.com:8080/css; object-src 'none';`);
        });

        it('allowlists protocol style sources', () => {
            const csp = getInjectedCsp(injectCsp(`
                <!DOCTYPE html>
                <html>
                    <head></head>
                    <body></body>
                </html>
            `, { styleSrc: ['http:', 'https:'] }));

            expect(csp).toBe(`style-src http: https:; object-src 'none';`);
        });

        it('appends provided style sources', () => {
            const csp = getInjectedCsp(injectCsp(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <link rel="stylesheet" href="http://example2.com/css">
                    </head>
                    <body></body>
                </html>
            `, { styleSrc: ['http://example1.com/css', `'sha256-abc123'`] }));

            expect(csp).toBe(`style-src http://example1.com/css 'sha256-abc123' http://example2.com/css; object-src 'none';`)
        });

        it('skips style extraction when `extractStyles` is `false`', () => {
            const csp = getInjectedCsp(injectCsp(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <link rel="stylesheet" href="http://example2.com/css">
                    </head>
                    <body></body>
                </html>
            `, { styleSrc: [`'unsafe-inline'`], extractStyles: false }));

            expect(csp).toBe(`style-src 'unsafe-inline'; object-src 'none';`);
        });

        it('allowlists self-hosted, relative URL image sources', () => {
            const csp = getInjectedCsp(injectCsp(`
                <!DOCTYPE html>
                <html>
                    <head></head>
                    <body>
                        <img src="relative.jpg" />
                    </body>
                </html>
            `));

            expect(csp).toBe(`img-src 'self'; object-src 'none';`);
        });

        it('allowlists self-hosted, absolute path URL image sources', () => {
            const csp = getInjectedCsp(injectCsp(`
                <!DOCTYPE html>
                <html>
                    <head></head>
                    <body>
                        <img src="/absolute.jpg" />
                    </body>
                </html>
            `));

            expect(csp).toBe(`img-src 'self'; object-src 'none';`);
        });

        it('deduplicates multiple `self` image sources', () => {
            const csp = getInjectedCsp(injectCsp(`
                <!DOCTYPE html>
                <html>
                    <head></head>
                    <body>
                        <img src="relative.jpg" />
                        <img src="/absolute.jpg" />
                    </body>
                </html>
            `));

            expect(csp).toBe(`img-src 'self'; object-src 'none';`);
        });

        it('allowlists foreign domain image sources', () => {
            const csp = getInjectedCsp(injectCsp(`
                <!DOCTYPE html>
                <html>
                    <head></head>
                    <body>
                        <img src="http://example1.com/css" />
                        <img src="https://example2.com/css" />
                        <img src="http://example3.com:8080/css" />
                    </body>
                </html>
            `));

            expect(csp).toBe(`img-src http://example1.com/css https://example2.com/css http://example3.com:8080/css; object-src 'none';`);
        });

        it('injects the policy as the first child of <head />', () => {
            const { document } = new JsDom(injectCsp(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <script src="/foo.js"></script>
                    </head>
                    <body></body>
                </html>
            `)).window;

            const firstChild = document.head.children[0];
            expect(firstChild.tagName).toBe('META');
            expect(firstChild.getAttribute('http-equiv'))
                    .toBe('Content-Security-Policy');
        });
    });
});

function getInjectedCsp(html: string): string|undefined {
    const { document } = new JsDom(html).window;
    const meta = document.querySelector(
        'meta[http-equiv="Content-Security-Policy"]');
    return meta?.getAttribute('content') ?? undefined;
}
