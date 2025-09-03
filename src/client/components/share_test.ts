import './share'; // Side-effectful import of `<dwac-share>`.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as browserEnv from '../browser_env';
import { Share } from './share';
import * as snackbar from './snackbar';

vi.mock('../browser_env', () => ({
    getLocation: vi.fn(),
}));
vi.mock('./snackbar', () => ({
    show: vi.fn(),
}));

describe('Share', () => {
    let share: Share|undefined;

    beforeEach(() => {
        // Make fake share function if not present in the browser.
        navigator.share = navigator.share ?? new Function();
    });

    async function init({
        target = new URL('https://dummy.url/'),
        articleTitle = 'Dummy Article',
    }: {
        target?: URL | string,
        articleTitle?: string,
    } = {}): Promise<Share> {
        share = document.createElement('dwac-share');

        // Either set the target property directly as a URL, or set an attribute
        // which gets converted into a URL using the `fromAttribute()` function.
        if (target instanceof URL) {
            share.target = target;
        } else {
            share.setAttribute('target', target);
        }

        share.articleTitle = articleTitle;
        document.body.appendChild(share);

        await share.updateComplete;
        return share;
    }

    afterEach(() => {
        share?.parentElement?.removeChild(share);
        vi.restoreAllMocks();
    });

    it('is defined', async () => {
        const share = await init();

        expect(share.tagName).toBe('DWAC-SHARE');
    });

    it('shows share UI when supported', async () => {
        vi.spyOn(navigator, 'share');

        const share = await init();

        expect(navigator.share).not.toHaveBeenCalled();

        expect(share.shadowRoot!.querySelector('#share')).not.toBeNull();
    });

    it('hides share UI when not supported', async () => {
        delete (navigator as Partial<typeof navigator>).share;

        const share = await init();

        expect(share.shadowRoot!.querySelector('#share')).toBeNull();
    });

    it('shares the given full URL when the user clicks "Share"', async () => {
        vi.spyOn(navigator, 'share').mockReturnValue(Promise.resolve());

        const share = await init({
            target: new URL('https://shared.test/'),
            articleTitle: 'Shared Article',
        });

        const shareBtn = share.shadowRoot!.querySelector('#share') as HTMLButtonElement;
        expect(shareBtn).not.toBeNull();

        shareBtn.click();
        await share.updateComplete;

        expect(navigator.share).toHaveBeenCalledWith({
            title: 'Shared Article',
            text: 'Check out: "Shared Article".',
            url: 'https://shared.test/',
        });
    });

    it('shares the given path when the user clicks "Share"', async () => {
        vi.mocked(browserEnv.getLocation).mockReturnValue({
            href: 'https://shared.test/',
        } as Location);
        vi.spyOn(navigator, 'share').mockReturnValue(Promise.resolve());

        const share = await init({
            target: '/foo',
            articleTitle: 'Shared Article',
        });

        const shareBtn = share.shadowRoot!.querySelector('#share') as HTMLButtonElement;
        expect(shareBtn).not.toBeNull();

        shareBtn.click();
        await share.updateComplete;

        expect(navigator.share).toHaveBeenCalledWith({
            title: 'Shared Article',
            text: 'Check out: "Shared Article".',
            url: 'https://shared.test/foo',
        });
    });

    it('shows copy UI when supported', async () => {
        const clipboard = { writeText: vi.fn() };
        vi.spyOn(navigator, 'clipboard', 'get')
                .mockReturnValue(clipboard as any);

        const share = await init();

        expect(navigator.clipboard.writeText).not.toHaveBeenCalled();

        expect(share.shadowRoot!.querySelector('#copy')).not.toBeNull();
    });

    it('copies the given full URL when the user presses "Copy"', async () => {
        const clipboard = { writeText: vi.fn() };
        vi.spyOn(navigator, 'clipboard', 'get')
                .mockReturnValue(clipboard as any);
        vi.mocked(snackbar.show).mockResolvedValue(undefined);

        const share = await init({
            target: new URL('https://copied.test/'),
        });

        const copyBtn = share.shadowRoot!.querySelector('#copy') as HTMLButtonElement;
        expect(copyBtn).not.toBeNull();

        copyBtn.click();
        await share.updateComplete;

        expect(navigator.clipboard.writeText)
                .toHaveBeenCalledWith('https://copied.test/');
        expect(snackbar.show).toHaveBeenCalledWith(
                'Copied URL to clipboard.', 2_000 /* ms */);
    });

    it('copies the given path when the user presses "Copy"', async () => {
        vi.mocked(browserEnv.getLocation).mockReturnValue({
            href: 'https://copied.test/',
        } as Location);
        const clipboard = { writeText: vi.fn() };
        vi.spyOn(navigator, 'clipboard', 'get')
                .mockReturnValue(clipboard as any);

        const share = await init({
            target: '/foo',
        });

        const copyBtn = share.shadowRoot!.querySelector('#copy') as HTMLButtonElement;
        expect(copyBtn).not.toBeNull();

        copyBtn.click();
        await share.updateComplete;

        expect(navigator.clipboard.writeText)
                .toHaveBeenCalledWith('https://copied.test/foo');
    });

    it('renders a direct link to the RSS feed', async () => {
        const share = await init();

        const link = share.shadowRoot!.querySelector('a:has(#rss-icon)')! as
            HTMLAnchorElement;
        expect(link).not.toBeNull();

        expect(new URL(link.href).pathname).toBe('/feed.xml');
    });

    it('renders a direct link to tweet the link', async () => {
        const share = await init({
            target: new URL('https://tweeted.link/'),
            articleTitle: 'Tweetable Article',
        });

        const link = share.shadowRoot!.querySelector('a:has(#twitter-logo)')! as
            HTMLAnchorElement;
        expect(link).not.toBeNull();

        expect(link.href).toContain('https://twitter.com/intent/tweet');
        const href = new URL(link.href);
        expect(href.searchParams.get('text'))
                .toBe('Check out: "Tweetable Article". https://tweeted.link/');

        expect(link.target).toBe('_blank');
        expect(link.rel).toBe('noopener');
    });
});
