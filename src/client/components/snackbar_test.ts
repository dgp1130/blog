import { show as showSnackbar } from './snackbar';
import { fadeInTimeoutMs, Snackbar } from './snackbar_element'

describe('Snackbar', () => {
    beforeEach(() => { jasmine.clock().install(); });
    afterEach(() => { jasmine.clock().uninstall(); });

    describe('show()', () => {
        it('shows the given text in a snackbar', async () => {
            spyOn(Snackbar, 'of').and.returnValue(mockSnackbar());

            const promise = showSnackbar('Hello, World!', 1_000 /* ms */);
            expect(Snackbar.of).toHaveBeenCalledWith('Hello, World!');

            const snackbar = document.querySelector('dwac-mock-snackbar')!;
            expect(snackbar)
                .withContext('Failed to find snackbar').toBeDefined();

            // Pass time snackbar fades in and is fully visible.
            jasmine.clock().tick(fadeInTimeoutMs);
            jasmine.clock().tick(1_000 /* ms */);
            await Promise.resolve(); // Flush pending async operations.
            await Promise.resolve(); // Flush mocked fade out task.

            expect(document.querySelector('dwac-mock-snackbar')).toBeNull();
            await expectAsync(promise).toBeResolved();
        });
    });
});

function mockSnackbar(): Snackbar {
    const mock = document.createElement('dwac-mock-snackbar') as Snackbar;
    mock.fadeOut = jasmine.createSpy('fadeOut').and.resolveTo();
    return mock;
}
