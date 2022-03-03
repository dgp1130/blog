import * as nunjucks from 'nunjucks';

/** An interface representing markdown context parsed by 11ty. */
export interface Context {
    frontmatter: {
        page: {
            date?: Date;
            url: string;
            inputPath: string;
            outputPath: string;
        };
    };

    njk: nunjucks.Environment;
}

// The currently active context.
let context: Context | undefined = undefined;

/**
 * Attaches a context object as context to the stack trace of the executed
 * callback. The object given is used as the context and is accessible from
 * {@link getContext}.
 * 
 * @returns The result of the callback for convenience.
 */
export function useContext<T>(ctx: Context, callback: () => T): T {
    if (context) throw new Error('Attempting to set context when one already exists.');

    context = ctx;
    try {
        return callback();
    } finally {
        context = undefined;
    }
}

/**
 * Returns the currently active context.
 * @throws if no context is available because the current stack trace was not
 *     executed under a `useContext()` callback.
 */
export function getContext(): Context {
    if (!context) throw new Error(`No context available.`);
    return context;
}
