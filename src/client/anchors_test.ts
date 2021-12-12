import { handleHeaderLinkOnClick } from './anchors';
import * as browserEnv from './browser_env';
import * as snackbar from './components/snackbar';

describe('anchors', () => {
    describe('handleHeaderLinkOnClick()', () => {
        it('copies header URL on `<h* />` tag click', () => {
            const root = document.createElement('div');
    
            const header = document.createElement('h2');
            header.id = 'foo-bar';
            root.appendChild(header);

            spyOn(browserEnv, 'getLocation').and.returnValue({
                href: 'http://blog.dwac.test/post/',
            } as Location);
            spyOn(history, 'replaceState');
            spyOn(navigator.clipboard, 'writeText');
            spyOn(snackbar, 'show').and.resolveTo();
    
            handleHeaderLinkOnClick(root);
            header.click();

            expect(history.replaceState).toHaveBeenCalledOnceWith(
                {}, '', new URL('http://blog.dwac.test/post/#foo-bar'));
            expect(navigator.clipboard.writeText).toHaveBeenCalledOnceWith(
                'http://blog.dwac.test/post/#foo-bar');
            expect(snackbar.show).toHaveBeenCalledOnceWith(
                'Copied URL to clipboard.', 2_000 /* ms */);
        });

        it('ignores clicks non-`<h* />` tags', () => {
            const root = document.createElement('div');

            const child = document.createElement('div');
            root.appendChild(child);

            spyOn(history, 'replaceState');
            spyOn(navigator.clipboard, 'writeText');
            spyOn(snackbar, 'show');

            handleHeaderLinkOnClick(root);
            child.click();

            expect(history.replaceState).not.toHaveBeenCalled();
            expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
            expect(snackbar.show).not.toHaveBeenCalled();
        });

        it('ignores clicks on `<h* />` tags without an `id` attribute', () => {
            const root = document.createElement('div');
    
            const header = document.createElement('h2'); // No `id` attribute.
            root.appendChild(header);

            spyOn(history, 'replaceState');
            spyOn(navigator.clipboard, 'writeText');
            spyOn(snackbar, 'show');
    
            handleHeaderLinkOnClick(root);
            header.click();

            expect(history.replaceState).not.toHaveBeenCalled();
            expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
            expect(snackbar.show).not.toHaveBeenCalled();
        });
    });
});
