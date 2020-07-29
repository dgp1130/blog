import { format } from './dates';

describe('dates', () => {
    describe('format()', () => {
        it('formats the given ISO-8601 string date', () => {
            const date = format('2020-07-01T12:00:00-07:00', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            });

            expect(date).toBe('Jul 1, 2020');
        });
    });
});
