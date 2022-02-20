/** An interface representing markdown frontmatter parsed by 11ty. */
export interface TemplateFrontmatter {
    page: {
        date?: Date;
        url: string;
        inputPath: string;
        outputPath: string;
    };
}

// The currently active context.
let context: TemplateFrontmatter | undefined = undefined;

/**
 * Attaches a frontmatter object as context to the stack trace of the executed
 * callback. The object given is used as the context and is accessible from
 * {@link getContext}.
 * 
 * @returns The result of the callback for convenience.
 */
export function useContext<T>(
    frontmatter: TemplateFrontmatter,
    callback: () => T,
): T {
    if (context) throw new Error('Attempting to set context when one already exists.');

    context = frontmatter;
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
export function getContext(): TemplateFrontmatter {
    if (!context) throw new Error(`No frontmatter context available.`);
    return context;
}
