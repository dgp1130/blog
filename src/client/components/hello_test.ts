import { Hello } from './hello';

describe('Hello', () => {
    let hello: Hello|undefined;

    async function init({ name = 'Unused' }: { name?: string } = {}):
            Promise<Hello> {
        hello = new Hello();
        hello.name = name;
        document.body.appendChild(hello);
        await hello.updateComplete;
        return hello;
    }

    afterEach(() => {
        hello?.parentElement?.removeChild(hello);
    });

    it('is defined', async () => {
        const hello = await init();

        expect(hello.tagName).toBe('DWAC-HELLO');
    });

    it('says hello', async () => {
        const hello = await init({ name: 'World' });

        expect(hello.shadowRoot!.querySelector('h2')!.textContent)
                .toBe('Hello World!');
    });
});
