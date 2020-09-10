import { getLocation } from "./browser_env";

describe('browser_env', () => {
    describe('getLocation()', () => {
        it('returns the location', () => {
            expect(getLocation()).toBe(location);
        });
    });
});
