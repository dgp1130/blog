import * as browserEnv from '../browser_env';
import { Share } from "./share";

describe('Share', () => {
    let share: Share|undefined;

    beforeAll(() => {
        // Make fake share function if not present in the browser.
        navigator.share = navigator.share ?? new Function();
    });

    async function init({
        prompt,
        target = new URL('https://dummy.url/'),
        articleTitle = 'Dummy Article',
    }: {
        prompt?: string,
        target?: URL | string,
        articleTitle?: string,
    } = {}): Promise<Share> {
        share = new Share();
        share.prompt = prompt;
        
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
    });

    it('is defined', async () => {
        const share = await init();

        expect(share.tagName).toBe('DWAC-SHARE');
    });

    it('renders the prompt', async () => {
        const share = await init({
            prompt: 'Share me!',
        });

        expect(share.shadowRoot!.textContent).toContain('Share me!');
    });

    it('renders no text when missing a prompt', async () => {
        const share = await init({
            prompt: undefined,
        });

        expect(share.shadowRoot!.querySelector('span')).toBeNull();
    });

    it('shows share UI when supported', async () => {
        spyOn(navigator, 'share');

        const share = await init();
        
        expect(navigator.share).not.toHaveBeenCalled();

        expect(share.shadowRoot!.querySelector('#share')).not.toBeNull();
    });

    it('shares the given full URL when the user clicks "Share"', async () => {
        spyOn(navigator, 'share').and.returnValue(Promise.resolve());

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
        spyOn(browserEnv, 'getLocation').and.returnValue({
            href: 'https://shared.test/',
        } as Location);
        spyOn(navigator, 'share').and.returnValue(Promise.resolve());

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
        const clipboard = jasmine.createSpyObj('clipboard', {
            writeText: () => {},
        });
        spyOnProperty(navigator, 'clipboard', 'get')
                .and.returnValue(clipboard);
        
        const share = await init();

        expect(navigator.clipboard.writeText).not.toHaveBeenCalled();

        expect(share.shadowRoot!.querySelector('#copy')).not.toBeNull();
    });

    it('copies the given full URL when the user presses "Copy"', async () => {
        const clipboard = jasmine.createSpyObj('clipboard', {
            writeText: () => {},
        });
        spyOnProperty(navigator, 'clipboard', 'get')
                .and.returnValue(clipboard);
        
        const share = await init({
            target: new URL('https://copied.test/'),
        });

        const copyBtn = share.shadowRoot!.querySelector('#copy') as HTMLButtonElement;
        expect(copyBtn).not.toBeNull();
        
        copyBtn.click();
        await share.updateComplete;

        expect(navigator.clipboard.writeText)
                .toHaveBeenCalledWith('https://copied.test/');
    });

    it('copies the given path when the user presses "Copy"', async () => {
        spyOn(browserEnv, 'getLocation').and.returnValue({
            href: 'https://copied.test/',
        } as Location);
        const clipboard = jasmine.createSpyObj('clipboard', {
            writeText: () => {},
        });
        spyOnProperty(navigator, 'clipboard', 'get')
                .and.returnValue(clipboard);
        
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

    it('renders a direct link to tweet the link', async () => {
        const share = await init({
            target: new URL('https://tweeted.link/'),
            articleTitle: 'Tweetable Article',
        });

        const link = share.shadowRoot!.querySelector('a')!;
        expect(link).not.toBeNull();

        expect(link.href).toContain('https://twitter.com/intent/tweet');
        const href = new URL(link.href);
        expect(href.searchParams.get('text'))
                .toBe('Check out: "Tweetable Article". https://tweeted.link/');

        expect(link.target).toBe('_blank');
        expect(link.rel).toBe('noopener');
    });
});
