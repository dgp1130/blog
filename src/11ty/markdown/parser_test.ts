import { Parser } from './parser';

describe('parser', () => {
    describe('Parser', () => {
        describe('expect()', () => {
            it('discards the given string when matched', () => {
                const parser = Parser.of('hello world');
                parser.expect('hello');
                expect(getCurrentString(parser)).toBe(' world');
            });

            it('throws an error when the given string is not matched', () => {
                const parser = Parser.of('hello world');
                expect(() => parser.expect('world')).toThrowError();
            });
        });

        describe('peek()', () => {
            it('returns the first character of the string when called with no arguments', () => {
                const parser = Parser.of('hello world');
                expect(parser.peek()).toBe('h');
            });

            it('returns the leading substring with the given length of the current string', () => {
                const parser = Parser.of('hello world');
                expect(parser.peek(5)).toBe('hello');
            });
        });

        describe('until()', () => {
            it('returns and removes the current string text up to the given match', () => {
                const parser = Parser.of('hello world');
                const parsed = parser.until('wor');
                expect(parsed).toBe('hello ');
                expect(getCurrentString(parser)).toBe('world')
            });

            it('throws an error when the given string is not matched', () => {
                const parser = Parser.of('hello world');
                expect(() => parser.until('foo')).toThrowError();
            });
        });

        describe('trimStart()', () => {
            it('discards leading whitespace from the current string', () => {
                const parser = Parser.of('  hello world');
                parser.trimStart();
                expect(getCurrentString(parser)).toBe('hello world');
            });

            it('ignores a string with no leading whitespace', () => {
                const parser = Parser.of('hello world');
                parser.trimStart();
                expect(getCurrentString(parser)).toBe('hello world');
            });
        });
    });
});

function getCurrentString(parser: Parser): string {
    return parser['input']; // Extracting private variable for testing.
}
