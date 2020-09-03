import {doSomething} from './example';

describe('example', () => {
    describe('doSomething()', () => {
        it('does something', () => {
            expect(doSomething()).toBe('test');
        });
    });
});
