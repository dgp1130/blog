import { MarkedExtension, Tokens } from 'marked';
import * as zod from 'zod';
import { Context, getContext } from './context';

/**
 * A `marked` extension which renders a demo URL in an `<iframe />`. The content
 * of the code block must be a JSON-formatted object with the required
 * information like so:
 *
 * ```markdown
 * Check out this demo:
 *
 * \`\`\`demo
 * {
 *     "src": "http://demo.test/",
 *     "title": "Title of the iframe for a11y."
 * }
 * \`\`\`
 * ```
 *
 * The configuration object supports the following properties:
 * * `src` - The `src` attribute of the `<iframe />`.
 * * `title` - The `title` attribute of the `<iframe />`, used for a11y.
 */
export const demoExtension: MarkedExtension = {
    useNewRenderer: true,
    renderer: {
        code({ text, lang }: Tokens.Code): string | false {
            if (lang !== 'demo') return false;

            const config = parseConfig(text);
            const ctx = getContext();
            return renderDemo(config, ctx);
        }
    },
};

const demoConfigParser = zod.strictObject({
    src: zod.string(),
    title: zod.string(),
});
type DemoConfig = zod.infer<typeof demoConfigParser>;

function parseConfig(configString: string): DemoConfig {
    // Parse the JSON configuration.
    let json: unknown;
    try {
        json = JSON.parse(configString);
    } catch {
        throw new Error(`Expected demo body to be a JSON object, but got:\n${configString}`);
    }

    // Parse and validate the data type.
    const result = demoConfigParser.safeParse(json);
    if (!result.success) {
        throw new Error(`Failed to parse demo config, encountered errors:\n${
            result.error.issues
                .map((issue) => JSON.stringify(issue, null, 2))
                .join('\n')}`)
    }

    return result.data;
}

function renderDemo(config: DemoConfig, ctx: Context): string {
    return ctx.njk.renderString(demoNjkTemplate, {
        ...ctx.frontmatter,
        ...config,
    });
}

const demoNjkTemplate = `
<div class="demo">
    <aside>
        <a href="{{ src }}" target="blank" rel="noopener" title="Open demo in new tab.">
            <img src="/res/img/open-in-new-tab.svg" alt="Open demo in new tab."
                width="64" height="64" loading="lazy" decoding="async">
        </a>
    </aside>
    <iframe src="{{ src }}" title="{{ title }}" class="demo" loading="lazy"></iframe>
</div>
`.trim();
