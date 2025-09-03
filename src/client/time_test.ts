import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { timeout } from './time';

describe('time', () => {
    describe('timeout()', () => {
        beforeEach(() => { vi.useFakeTimers(); });
        afterEach(() => {
            vi.useRealTimers();
            vi.restoreAllMocks();
        });

        it('resolves after the given duration', async () => {
            const promise = timeout(1_000 /* ms */);

            vi.advanceTimersByTime(1_000 /* ms */);

            await expect(promise).resolves.toBeUndefined();
        });
    });
});
