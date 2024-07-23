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

    /** The directory of the web content root (`www`) relative to CWD. */
    webRoot: string;

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
export function useContext<Result>(ctx: Context, callback: () => Result):
        Result {
    if (context) throw new Error('Attempting to set context when one already exists.');

    context = ctx;
    let result: Result | undefined;
    try {
        result = callback();
        return result;
    } finally {
        if (!(result instanceof Promise)) {
            context = undefined;
        } else {
            result.finally(() => {
                context = undefined;
            }).catch(() => { /* suppress unhandled rejection */ });
        }
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
