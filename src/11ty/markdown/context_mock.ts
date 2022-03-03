import * as nunjucks from 'nunjucks';
import { Context } from './context';

type DeepPartial<T> = T extends Date
    ? Date
    : T extends object
        ? {[P in keyof T]?: DeepPartial<T[P]>}
        : T;

/** Mocks the context type. */
export function mockContext(overrides: DeepPartial<Context> = {}): Context {
    return {
        frontmatter: {
            page: {
                url: '/posts/test/',
                inputPath: './src/www/posts/test.md',
                outputPath: '_site/posts/test/index.html',
                date: new Date('2022-01-01T00:00:00Z'),
                ...overrides.frontmatter?.page ?? {},
            },
        },
        njk: new nunjucks.Environment(),
    };
}
