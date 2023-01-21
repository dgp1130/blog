/** Simplified LLK parser implementation. */
export class Parser {
    private input: string;
    private readonly fullText: string;
    private constructor({ input, fullText }: {
        input: string,
        fullText: string,
    }) {
        this.input = input;
        this.fullText = fullText;
    }

    /** Factory function to create a new parser. */
    public static of(input: string): Parser {
        return new Parser({ input, fullText: input });
    }

    /**
     * Discards the given text if it matches the start of the current string.
     * Throws an error if it does not match.
     */
    public expect(text: string): void {
        if (!this.input.startsWith(text)) throw new ParseError(this.input.slice(0, text.length), text, this.fullText);
        this.input = this.input.slice(text.length);
    }

    /**
     * Returns the given number of leading characters of the current string and
     * does _not_ alter the current state. Returns the first character if no
     * argument is given.
     */
    public peek(characters: number = 1): string {
        return this.input.slice(0, characters);
    }

    /**
     * Parses the current state until it matches the given argument. All the
     * text before (but not including) the given text is discarded from the
     * current state and returned. Throws an error if the given argument is
     * never matched.
     */
    public until(text: string): string {
        const start = this.input.indexOf(text);
        if (start === -1) throw new ParseError(`${this.input.split('\n')[0]}...`, `...${text}`, this.fullText);

        const parsed = this.input.slice(0, start);
        this.input = this.input.slice(start);
        return parsed;
    }

    /**
     * Trims the start of the current state by removing all leading whitespace.
     */
    public trimStart(): void {
        const result = this.input.match(/^\s*/);
        if (!result) return;

        const match = result[0]!;
        this.input = this.input.slice(match.length);
    }
}

class ParseError extends Error {
    public constructor(actual: string, expected: string, full: string) {
        super(`Expected to parse "${expected}", but got "${actual}" in:\n${full}`);
    }
}
