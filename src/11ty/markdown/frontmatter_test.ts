import 'jasmine';

import { useContext, getContext } from './frontmatter';
import { mockFrontmatter } from './frontmatter_mock';

describe('frontmatter', () => {
    it('context is shared between `useContext()` and `getContext()`', () => {
        const frontmatter = mockFrontmatter();
        const context = useContext(frontmatter, () => getContext());
        expect(context).toBe(frontmatter);
    });

    it('getContext() throws when no context is available', () => {
        // Never called `useContext()`.
        expect(() => getContext())
            .toThrowError('No frontmatter context available.');
    });

    it('useContext() throws when context is already set', () => {
        expect(() => {
            useContext(mockFrontmatter(), () => {
                // Cannot `useContext()` within another `useContext()`.
                useContext(mockFrontmatter(), () => {});
            });
        }).toThrowError('Attempting to set context when one already exists.');
    });

    it('useContext() clears the context after the callback completes', () => {
        useContext(mockFrontmatter(), () => {
            expect(() => getContext()).not.toThrow();
        });

        // Calling `getContext()` *after* `useContext()` has finished.
        expect(() => getContext())
            .toThrowError('No frontmatter context available.');
    });

    it('useContext() clears the context even when the callback throws', () => {
        expect(() => {
            useContext(mockFrontmatter(), () => {
                throw new Error('Oh noes!');
            });
        }).toThrowError('Oh noes!');

        // Context should be cleaned up after the callback threw.
        expect(() => getContext())
            .toThrowError('No frontmatter context available.');
    });
});
