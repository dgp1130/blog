import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { show as showSnackbar } from './snackbar';
import { fadeInTimeoutMs, Snackbar } from './snackbar_element'

describe('Snackbar', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('show()', () => {
        it('shows the given text in a snackbar', async () => {
            vi.spyOn(Snackbar, 'of').mockReturnValue(mockSnackbar());

            const promise = showSnackbar('Hello, World!', 1_000 /* ms */);
            expect(Snackbar.of).toHaveBeenCalledWith('Hello, World!');

            const snackbar = document.querySelector('dwac-mock-snackbar')!;
            expect(snackbar).toBeDefined();

            // Pass time snackbar fades in and is fully visible.
            vi.advanceTimersByTime(fadeInTimeoutMs);
            vi.advanceTimersByTime(1_000 /* ms */);
            await Promise.resolve(); // Flush pending async operations.
            await Promise.resolve(); // Flush mocked fade out task.

            expect(document.querySelector('dwac-mock-snackbar')).toBeNull();
            await expect(promise).resolves.toBeUndefined();
        });
    });
});

function mockSnackbar(): Snackbar {
    const mock = document.createElement('dwac-mock-snackbar') as Snackbar;
    mock.fadeOut = vi.fn().mockResolvedValue(undefined);
    return mock;
}
