import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleHeaderLinkOnClick } from './anchors';
import * as browserEnv from './browser_env';
import * as snackbar from './components/snackbar';

vi.mock('./browser_env', () => ({
    getLocation: vi.fn(),
}));
vi.mock('./components/snackbar', () => ({
    show: vi.fn(),
}));

describe('anchors', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('handleHeaderLinkOnClick()', () => {
        it('copies header URL on `<h* />` tag click', () => {
            const root = document.createElement('div');

            const header = document.createElement('h2');
            header.id = 'foo-bar';
            root.appendChild(header);

            vi.mocked(browserEnv.getLocation).mockReturnValue({
                href: 'http://blog.dwac.test/post/',
            } as Location);
            vi.spyOn(history, 'replaceState').mockImplementation(() => {});
            vi.spyOn(navigator.clipboard, 'writeText');
            vi.mocked(snackbar.show).mockResolvedValue(undefined);

            handleHeaderLinkOnClick(root);
            header.click();

            expect(history.replaceState).toHaveBeenCalledExactlyOnceWith(
                {}, '', new URL('http://blog.dwac.test/post/#foo-bar'));
            expect(navigator.clipboard.writeText).toHaveBeenCalledExactlyOnceWith(
                'http://blog.dwac.test/post/#foo-bar');
            expect(snackbar.show).toHaveBeenCalledExactlyOnceWith(
                'Copied URL to clipboard.', 2_000 /* ms */);
        });

        it('ignores clicks non-`<h* />` tags', () => {
            const root = document.createElement('div');

            const child = document.createElement('div');
            root.appendChild(child);

            vi.spyOn(history, 'replaceState');
            vi.spyOn(navigator.clipboard, 'writeText');

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

            vi.spyOn(history, 'replaceState').mockImplementation(() => {});
            vi.spyOn(navigator.clipboard, 'writeText');

            handleHeaderLinkOnClick(root);
            header.click();

            expect(history.replaceState).not.toHaveBeenCalled();
            expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
            expect(snackbar.show).not.toHaveBeenCalled();
        });
    });
});
