// @ts-check

const { execFilter } = require('./filters.js');

describe('filters', () => {
    describe('execFilter()', () => {
        it('executes the given filter and resolves with the result',
                async () => {
            function testFilter(first, second, callback) {
                callback(null, first + second);
            }

            const result = await execFilter(testFilter, 1, 2);
            
            expect(result).toBe(3);
        });

        it('executes the given filter and rejects on a called back error',
                async () => {
            const err = new Error('Filter got clogged.');
            function testFilter(_, callback) {
                callback(err);
            }

            await expectAsync(execFilter(testFilter, 'unused arg'))
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