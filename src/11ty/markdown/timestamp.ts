import { MarkedExtension, Tokens } from 'marked';
import { getContext } from './context';

/**
 * A `marked` extension which renders the timestamp of the current page when it
 * encounters a code block with the language `timestamp`.
 *
 * ```markdown
 * Here is the timestamp:
 *
 * \`\`\`timestamp
 * \`\`\`
 * ```
 *
 * The actual timestamp rendered comes from the `date` property in the
 * frontmatter of a post.
 */
export const timestampExtension: MarkedExtension = {
    useNewRenderer: true,
    renderer: {
        code({ lang }: Tokens.Code): string | false {
            // Ignore any code blocks not labeled as `timestamp`.
            if (lang !== 'timestamp') return false;

            // Get the date of the post from the frontmatter context.
            const { frontmatter } = getContext();
            const postDate = frontmatter.page.date;

            if (!postDate) {
                // Leave a TODO if no date is set yet.
                return `<time class="timestamp">TODO: Set post date.</time>`;
            } else {
                // Render the timestamp.
                return `<time datetime="${postDate.toISOString()}" class="timestamp">${
                    postDate.toLocaleDateString('en', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                    })
                }</time>`;
            }
        },
    },
};
