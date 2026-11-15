import { describe, expectTypeOf, it } from 'vitest';
import { Context, useContext } from './context.js';

describe('context', () => {
    it('useContext() infers its color from the given callback', () => {
        expectTypeOf(useContext({} as Context, () => 1))
            .toEqualTypeOf<number>();
        expectTypeOf(useContext({} as Context, async () => 1))
            .toEqualTypeOf<Promise<number>>();
    });
});
