import { TemplateFrontmatter } from './frontmatter';

type DeepPartial<T> = T extends Date
    ? Date
    : T extends object
        ? {[P in keyof T]?: DeepPartial<T[P]>}
        : T;

/** Mocks the frontmatter type. */
export function mockFrontmatter(
        overrides: DeepPartial<TemplateFrontmatter> = {}): TemplateFrontmatter {
    return {
        page: {
            url: '/posts/test/',
            inputPath: './src/www/posts/test.md',
            outputPath: '_site/posts/test/index.html',
            date: new Date('2022-01-01T00:00:00Z'),
            ...overrides.page ?? {},
        },
    };
}
