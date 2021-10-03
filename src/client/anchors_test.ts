import { handleHeaderLinkOnClick } from './anchors';
import * as browserEnv from './browser_env';

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
    
            handleHeaderLinkOnClick(root);
            header.click();

            expect(history.replaceState).toHaveBeenCalledOnceWith(
                {}, '', new URL('http://blog.dwac.test/post/#foo-bar'));
            expect(navigator.clipboard.writeText).toHaveBeenCalledOnceWith(
                'http://blog.dwac.test/post/#foo-bar');
        });

        it('ignores clicks non-`<h* />` tags', () => {
            const root = document.createElement('div');

            const child = document.createElement('div');
            root.appendChild(child);

            spyOn(history, 'replaceState');
            spyOn(navigator.clipboard, 'writeText');

            handleHeaderLinkOnClick(root);
            child.click();

            expect(history.replaceState).not.toHaveBeenCalled();
            expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
        });

        it('ignores clicks on `<h* />` tags without an `id` attribute', () => {
            const root = document.createElement('div');
    
            const header = document.createElement('h2'); // No `id` attribute.
            root.appendChild(header);

            spyOn(history, 'replaceState');
            spyOn(navigator.clipboard, 'writeText');
    
            handleHeaderLinkOnClick(root);
            header.click();

            expect(history.replaceState).not.toHaveBeenCalled();
            expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
        });
    });
});
