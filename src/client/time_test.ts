import { timeout } from './time';

describe('time', () => {
    describe('timeout()', () => {
        beforeEach(() => { jasmine.clock().install(); });
        afterEach(() => { jasmine.clock().uninstall(); });

        it('resolves after the given duration', async () => {
            const promise = timeout(1_000 /* ms */);

            jasmine.clock().tick(1_000 /* ms */);

            await expectAsync(promise).toBeResolved();
        });
    });
});
