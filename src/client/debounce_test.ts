import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce } from './debounce';

describe('debounce', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('debounce()', () => {
        it('proxies a function call', () => {
            const callback = vi.fn();
            const debounced = debounce(1_000 /* ms */, callback);

            // Starts timer to wait 1 second.
            debounced();
            expect(callback).not.toHaveBeenCalled();

            vi.advanceTimersByTime(999);
            expect(callback).not.toHaveBeenCalled();

            // Invokes callback after the 1 second timer expires.
            vi.advanceTimersByTime(1);
            expect(callback).toHaveBeenCalledWith();
            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('debounces multiple calls', () => {
            const callback = vi.fn();
            const debounced = debounce(1_000 /* ms */, callback);

            // Starts timer to wait 1 second.
            debounced();
            expect(callback).not.toHaveBeenCalled();

            vi.advanceTimersByTime(500);
            expect(callback).not.toHaveBeenCalled();

            // Resets timer when invoked again.
            debounced();
            expect(callback).not.toHaveBeenCalled();

            vi.advanceTimersByTime(500);
            expect(callback).not.toHaveBeenCalled();

            vi.advanceTimersByTime(499);
            expect(callback).not.toHaveBeenCalled();

            // Invokes callback after the 1 second timer expires from the last
            // call.
            vi.advanceTimersByTime(1);
            expect(callback).toHaveBeenCalledExactlyOnceWith();
        });
    });
});
