// @ts-check

const { execFilter } = require('../testing/filters.js');
const { asyncFilter } = require('./utils.js');

describe('utils', () => {
    describe('asyncFilter()', () => {
        it('creates an async filter', async () => {
            const filter = asyncFilter(async (first, second) => {
                return first + second;
            });

            const result = await execFilter(filter, 1, 2);

            expect(result).toBe(3);
        });

        it('propagates errors', async () => {
            const err = new Error('Pipe is clogged!');
            const filter = asyncFilter(async () => { throw err; });

            await expectAsync(execFilter(filter, 'test')).toBeRejectedWith(err);
        });

        it('calls back with an error when not given enough arguments',
                async () => {
            const filter = asyncFilter(async (input) => input + 1);

            // Filter is executed incorrectly with no arguments.
            await expectAsync(execFilter(filter))
                    .toBeRejectedWithError(/Expected at least two arguments/g);
        });

        it('throws an error when not given a callback as the last argument',
                () => {
            const filter = asyncFilter(async (input) => input + 1);

            expect(() => filter('foo', 'bar'))
                    .toThrowError(/Last argument is not a callback function/);
        });
    });
});