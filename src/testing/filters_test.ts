import { execFilter } from './filters';
import { FilterCallback } from '../filters/utils';

// Variance bites us for testing simple filters because most implementations of
// a filter will be a subtype for a particular set of inputs, rather than
// handling all the intermixed cases of string params and callbacks in any order
// as is specially required by the type. So instead, we can cast to a `Filter`
// type to make the type checker happy without being too hacky.
type Filter = Parameters<typeof execFilter>[0];

describe('filters', () => {
    describe('execFilter()', () => {
        it('executes the given filter and resolves with the result',
                async () => {
            function testFilter(
                    first: string, second: string, callback: FilterCallback) {
                callback(null, first + second);
            }

            const result = await execFilter(
                    testFilter as Filter, 'first', 'second');
            
            expect(result).toBe('firstsecond');
        });

        it('executes the given filter and rejects on a called back error',
                async () => {
            const err = new Error('Filter got clogged.');
            function testFilter(_: string, callback: FilterCallback) {
                callback(err);
            }

            await expectAsync(execFilter(testFilter as Filter, 'unused arg'))
                    .toBeRejectedWith(err);
        });

        it('executes the given filter and rejects on a thrown error',
                async () => {
            const err = new Error('Filter got clogged.');
            function testFilter() {
                throw err;
            }

            await expectAsync(execFilter(testFilter, 'unused arg'))
                    .toBeRejectedWith(err);
        });
    });
});