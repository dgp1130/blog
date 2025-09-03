import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLocation } from './browser_env';

describe('browser_env', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('getLocation()', () => {
        it('returns the location', () => {
            expect(getLocation()).toBe(location);
        });
    });
});
