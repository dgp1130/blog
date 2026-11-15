import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertDefined } from './asserts.js';

describe('asserts', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('assertDefined()', () => {
        it('no-ops when given a defined value', () => {
            expect(() => assertDefined('test')).not.toThrow();

            // Verify falsey values.
            expect(() => assertDefined('')).not.toThrow();
            expect(() => assertDefined(false)).not.toThrow();
            expect(() => assertDefined(0)).not.toThrow();
        });

        it('throws when given an undefined value', () => {
            expect(() => assertDefined(undefined))
                    .toThrow('Value not defined.');
        });

        it('throws when given an undefined value with the given label', () => {
            expect(() => assertDefined(undefined, 'Foo'))
                    .toThrow('Foo not defined.');
        });
    });
});
