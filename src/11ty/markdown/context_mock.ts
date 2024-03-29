import * as nunjucks from 'nunjucks';
import { Context } from './context';

interface ContextOverrides {
    frontmatter?: {
        page?: {
            url?: string;
            inputPath?: string;
            outputPath?: string;
            date?: Date;
        };
    };
    njk?: nunjucks.Environment;
}

/** Mocks the context type. */
export function mockContext(overrides: ContextOverrides = {}): Context {
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
        njk: overrides.njk ?? new nunjucks.Environment(),
    };
}
