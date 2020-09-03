import { short } from './git';

describe('git', () => {
    describe('short()', () => {
        it('returns the short form of a given Git hash', () => {
            expect(short('86fb5c086042fb92019152fe19e8fdb2f42109e2'))
                    .toBe('86fb5c0');
        });
    });
});
