import { Environment, getEnv } from './environment';

describe('environment', () => {
    beforeEach(() => {
        // Need to `delete` the value rather than set to `undefined`.
        // See: https://stackoverflow.com/a/42170366
        delete process.env.DWAC_ENV;
    });

    it('defaults to dev environment', () => {
        expect(getEnv()).toBe(Environment.DEV);
    });

    it('reads dev environment from process env', () => {
        process.env.DWAC_ENV = 'dev';
        expect(getEnv()).toBe(Environment.DEV);
    });

    it('reads prod environment from process env', () => {
        process.env.DWAC_ENV = 'prod';
        expect(getEnv()).toBe(Environment.PROD);
    });

    it('throws an error when given an invalid process env', () => {
        process.env.DWAC_ENV = 'not an environment';
        expect(() => getEnv()).toThrowError(/Unknown environment/);
    });
});
