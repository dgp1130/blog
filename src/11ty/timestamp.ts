import md from 'markdown-it';
import mdContainer from 'markdown-it-container';

type MarkdownIt = ReturnType<typeof md>;

/**
 * Adds a plugin to render timestamps for markdown files.
 * 
 * When a file includes `::: timestamp :::`, that syntax is replaced by the date
 * value provided in the `date` front matter of the page.
 */
export function addMdTimestampPlugin(md: MarkdownIt): void {
    mdContainer(md, 'timestamp', {
        render: (tokens, idx, options: unknown, env: unknown) => {
            // `env` is the 11ty context. Read the `date` value from the page
            // front matter.
            const timestamp = getPageDate(env);

            const token = tokens[idx];
            if (token.nesting === 1) {
                // Opening `::: timestamp` tag, generate the markup.
                const datetime = `${timestamp.getUTCFullYear()}-${
                        (timestamp.getUTCMonth() + 1).toString().padStart(2, '0')}-${
                        timestamp.getUTCDate().toString().padStart(2, '0')}`
                return `
                    <time datetime="${datetime}" class="timestamp">
                        ${timestamp.toLocaleDateString('en', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                        })}
                    </time>
                `.trim();
            } else {
                // Closing `:::` tag. Nothing to do because this isn't intended
                // as block syntax and opening tag generated everything already.
                return ``;
            }
        },
    });
}

/** Reads the page date from the context passed in by 11ty. */
function getPageDate(environment: unknown): Date {
    const env = (environment || {}) as Record<string, unknown>;
    const page = (env.page || {}) as Record<string, unknown>;
    const { date, inputPath: pageInputPath } = page;

    // Get the `inputPath` to use for debugging purposes.
    if (pageInputPath !== undefined && typeof pageInputPath !== 'string') {
        throw new Error(
                `Expected \`inputPath\` to be of type string, but got:\n${
                pageInputPath}`);
    }
    const inputPath = pageInputPath as string|undefined;
    const inputPathPrefix = () => inputPath ? `${inputPath}: ` : ``;

    // Get and validate the `date` value.
    if (!date) {
        throw new Error(`${inputPathPrefix()}Attempted to render a timestamp`
                + ' but no `date` value was provided in the front matter.');
    }
    if (!(date instanceof Date)) {
        throw new Error(`${inputPathPrefix()}Expected front matter \`date\``
                + ' value to be a `Date` type.');
    }

    return date;
}
