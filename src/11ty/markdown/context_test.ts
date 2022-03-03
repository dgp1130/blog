import 'jasmine';

import { useContext, getContext } from './context';
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
});
