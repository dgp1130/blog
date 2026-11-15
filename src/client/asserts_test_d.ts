import { describe, expectTypeOf, it } from 'vitest';
import { assertDefined } from './asserts';

describe('asserts', () => {
    describe('assertDefined()', () => {
        it('narrows the type of the provided element when defined', () => {
            const foo = 'test' as string | undefined;

            assertDefined(foo);

            expectTypeOf(foo).toEqualTypeOf<string>();
        });
    });
});
