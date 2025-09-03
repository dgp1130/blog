import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertDefined } from './asserts';

describe('asserts', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('assertDefined()', () => {
        it('narrows the type of the provided element when defined', () => {
            const foo = ('test' as string|undefined);

            // @ts-expect-error `foo` is possibly undefined.
            const possiblyUndefined: string = foo;

            assertDefined(foo);

            // Typescript validates that `foo` must be defined.
            const str: string = foo;
            expect(true).toBe(true);
        });

        it('throws when given an undefined value', () => {
            expect(() => assertDefined(undefined))
                    .toThrowError('Value not defined.');
        });

        it('throws when given an undefined value with the given label', () => {
            expect(() => assertDefined(undefined, 'Foo'))
                    .toThrowError('Foo not defined.');
        });
    });
});
