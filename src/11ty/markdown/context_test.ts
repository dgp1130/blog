import 'jasmine';

import { useContext, getContext, Context } from './context';
import { mockContext } from './context_mock';

describe('context', () => {
    it('context is shared between `useContext()` and `getContext()`', () => {
        const ctx = mockContext();
        const context = useContext(ctx, () => getContext());
        expect(context).toBe(ctx);
    });

    it('getContext() throws when no context is available', () => {
        // Never called `useContext()`.
        expect(() => getContext())
            .toThrowError('No context available.');
    });

    it('useContext() throws when context is already set', () => {
        expect(() => {
            useContext(mockContext(), () => {
                // Cannot `useContext()` within another `useContext()`.
                useContext(mockContext(), () => {});
            });
        }).toThrowError('Attempting to set context when one already exists.');
    });

    it('useContext() clears the context after the callback completes', () => {
        useContext(mockContext(), () => {
            expect(() => getContext()).not.toThrow();
        });

        // Calling `getContext()` *after* `useContext()` has finished.
        expect(() => getContext())
            .toThrowError('No context available.');
    });

    it('useContext() clears the context even when the callback throws', () => {
        expect(() => {
            useContext(mockContext(), () => {
                throw new Error('Oh noes!');
            });
        }).toThrowError('Oh noes!');

        // Context should be cleaned up after the callback threw.
        expect(() => getContext())
            .toThrowError('No context available.');
    });

    it('useContext() waits for the returned `Promise` to resolve', async () => {
        let resolver!: (result: number) => void;
        const promise = new Promise<number>((resolve) => {
            resolver = resolve;
        });

        const result = useContext(mockContext(), () => promise);

        expect(() => getContext()).not.toThrow();

        resolver(1234);
        await expectAsync(result).toBeResolved(1234);

        expect(() => getContext()).toThrowError('No context available.');
    });

    it('useContext() cleans up context when the returned `Promise` rejects', async () => {
        const error = new Error('Oh noes!');
        let rejector!: (err: Error) => void;
        const promise = new Promise<void>((_, reject) => {
            rejector = reject;
        });

        const result = useContext(mockContext(), () => promise);

        expect(() => getContext()).not.toThrow();

        rejector(error);
        await expectAsync(result).toBeRejectedWith(error);

        expect(() => getContext()).toThrowError('No context available.');
    });

    it('useContext() infers its color from the given callback', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
            const ctx = {} as Context;

            // Synchronous
            useContext(ctx, () => 1) satisfies number;

            // Asynchronous
            useContext(ctx, () => Promise.resolve(1)) satisfies Promise<number>;
        };
    });
});
