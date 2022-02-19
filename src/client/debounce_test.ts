import { debounce } from './debounce';

describe('debounce', () => {
    beforeEach(() => {
        jasmine.clock().install();
    });

    afterEach(() => {
        jasmine.clock().uninstall();
    });

    describe('debounce()', () => {
        it('proxies a function call', () => {
            const callback = jasmine.createSpy('callback');
            const debounced = debounce(1_000 /* ms */, callback);

            // Starts timer to wait 1 second.
            debounced();
            expect(callback).not.toHaveBeenCalled();

            jasmine.clock().tick(999);
            expect(callback).not.toHaveBeenCalled();

            // Invokes callback after the 1 second timer expires.
            jasmine.clock().tick(1);
            expect(callback).toHaveBeenCalledOnceWith();
        });

        it('debounces multiple calls', () => {
            const callback = jasmine.createSpy('callback');
            const debounced = debounce(1_000 /* ms */, callback);

            // Starts timer to wait 1 second.
            debounced();
            expect(callback).not.toHaveBeenCalled();

            jasmine.clock().tick(500);
            expect(callback).not.toHaveBeenCalled();

            // Resets timer when invoked again.
            debounced();
            expect(callback).not.toHaveBeenCalled();

            jasmine.clock().tick(500);
            expect(callback).not.toHaveBeenCalled();

            jasmine.clock().tick(499);
            expect(callback).not.toHaveBeenCalled();

            // Invokes callback after the 1 second timer expires from the last
            // call.
            jasmine.clock().tick(1);
            expect(callback).toHaveBeenCalledOnceWith();
        });
    });
});
