import { fadeOutTimeoutMs, Snackbar } from './snackbar_element';

describe('Snackbar Element', () => {
    let snackbar: Snackbar|undefined;

    async function init({ text = 'text', attrs = {} }: {
        text?: string,
        attrs?: Record<string, string>,
    } = {}): Promise<Snackbar> {
        snackbar = Snackbar.of(text);
        for (const [ name, value ] of Object.entries(attrs)) {
            snackbar.setAttribute(name, value);
        }

        document.body.appendChild(snackbar);

        await snackbar.updateComplete;
        return snackbar;
    }

    afterEach(() => {
        snackbar?.parentElement?.removeChild(snackbar);
    });

    beforeEach(() => { jasmine.clock().install(); });
    afterEach(() => { jasmine.clock().uninstall(); });

    it('is defined', async () => {
        const snackbar = await init();

        expect(snackbar.tagName).toBe('DWAC-SNACKBAR');
    });

    it('renders the text', async () => {
        const snackbar = await init({ text: 'Hello, World!' });

        expect(snackbar.shadowRoot!.textContent).toBe('Hello, World!');
    });

    it('defaults to `role="alert"`', async () => {
        const snackbar = await init();

        expect(snackbar.getAttribute('role')).toBe('alert');
    });

    it('does not override a provided `role`', async () => {
        const snackbar = await init({
            attrs: { role: 'test' },
        });

        expect(snackbar.getAttribute('role')).toBe('test');
    });

    it('fadeOut() fades out the element', async () => {
        const snackbar = await init();

        expect(Array.from(snackbar.classList.values()))
            .not.toContain('fade-out');
        const promise = snackbar.fadeOut();
        expect(Array.from(snackbar.classList.values())).toContain('fade-out');

        jasmine.clock().tick(fadeOutTimeoutMs);
        await expectAsync(promise).toBeResolved();
    });
});
