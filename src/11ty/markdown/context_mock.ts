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
    webRoot?: string;
    njk?: nunjucks.Environment;
}

/** Mocks the context type. */
export function mockContext(overrides: ContextOverrides = {}): Context {
    return {
        frontmatter: {
            page: {
                url: '/posts/test/',
                inputPath: './path/to/www/posts/test.md',
                outputPath: '_site/posts/test/index.html',
                date: new Date('2022-01-01T00:00:00Z'),
                ...overrides.frontmatter?.page ?? {},
            },
        },
        webRoot: overrides.webRoot ?? 'path/to/www',
        njk: overrides.njk ?? new nunjucks.Environment(),
    };
}
