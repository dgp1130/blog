import mdLib from 'markdown-it';

import { addMdTimestampPlugin } from './timestamp';

describe('timestamp', () => {
    describe('addMdTimestampPlugin()', () => {
        it('renders the timestamp', () => {
            const md = mdLib();
            addMdTimestampPlugin(md);
    
            const rendered = md.render('::: timestamp :::', {
                page: {
                    date: new Date('2020-01-01T12:00:00'),
                },
            });
            expect(oneline(rendered)).toBe(
                '<time datetime="2020-01-01" class="timestamp">January 1, 2020</time>');
        });

        it('throws an error when not given an environment', () => {
            const md = mdLib();
            addMdTimestampPlugin(md);

            expect(() => md.render(
                '::: timestamp :::',
                undefined /* environment */,
            )).toThrowError();
        });

        it('throws an error when not given a `page`', () => {
            const md = mdLib();
            addMdTimestampPlugin(md);

            expect(() => md.render(
                '::: timestamp :::',
                { foo: 'bar' } /* No `page` property */,
            )).toThrow();
        });

        it('throws an error when given a non-string `inputPath`', () => {
            const md = mdLib();
            addMdTimestampPlugin(md);

            expect(() => md.render(
                '::: timestamp :::',
                {
                    page: {
                        inputPath: 0, // Invalid: Should be a string.
                        date: new Date(),
                    },
                },
            )).toThrowError(/expected `inputPath` to be of type string/i);
        });

        it('throws an error when not given a `date` with `inputPath`', () => {
            const md = mdLib();
            addMdTimestampPlugin(md);

            expect(() => md.render(
                '::: timestamp :::',
                {
                    page: {
                        inputPath: 'foo.md',
                        // Missing `date`.
                    },
                },
            )).toThrowError(/foo.md: attempted to render a timestamp but no `date` value was provided/i);
        });

        it('throws an error when not given a `date` without `inputPath`', () => {
            const md = mdLib();
            addMdTimestampPlugin(md);

            expect(() => md.render(
                '::: timestamp :::',
                {
                    page: {
                        // Missing `date` **and** `inputPath`.
                        foo: 'bar',
                    },
                },
            )).toThrowError(/attempted to render a timestamp but no `date` value was provided/i);
        });

        it('throws an error when given a non-Date with `inputPath`', () => {
            const md = mdLib();
            addMdTimestampPlugin(md);

            expect(() => md.render(
                '::: timestamp :::',
                {
                    page: {
                        inputPath: 'foo.md',
                        date: 'not-a-date',
                    },
                },
            )).toThrowError(/foo.md: expected front matter `date` value to be a `Date` type/i);
        });

        it('throws an error when given a non-Date without `inputPath`', () => {
            const md = mdLib();
            addMdTimestampPlugin(md);

            expect(() => md.render(
                '::: timestamp :::',
                {
                    page: {
                        // Missing `inputPath`.
                        date: 'not-a-date',
                    },
                },
            )).toThrowError(/expected front matter `date` value to be a `Date` type/i);
        });
    });
});

function oneline(content: string): string {
    return content.split('\n').map((line) => line.trim()).join('');
}
