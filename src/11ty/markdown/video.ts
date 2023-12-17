import { marked } from 'marked';
import * as zod from 'zod';
import { Context, getContext } from './context';

/**
 * A `marked` extension which renders an optimized video when it encounters a
 * code block with the language `video`. The content of the code block must be a
 * JSON-formatted object with the required information like so:
 *
 * ```markdown
 * Check out this video:
 *
 * \`\`\`video
 * {
 *     "type": "demo",
 *     "urls": ["/video.avif", "/video.mp4"],
 *     "size": [1920, 1080],
 *     "audible": false
 * }
 * \`\`\`
 * ```
 *
 * The configuration object supports the following properties:
 * * `type`    - An enum string which chooses which kind of video to render.
 *               Options are: 'demo', 'gif'.
 * * `urls`    - An `Array<string>` of video URLs to use. Multiple URLs are
 *               available for performance and the earliest supported format by
 *               the browser will be used.
 * * `size`    - A `[width: number, height: number]` tuple indicating the
 *               expected dimensions of the avatar images.
 * * `audible` - Whether or not the video contains meaningful audio. Optional,
 *               defaults to `false`.
 */
export const videoExtension: marked.MarkedExtension = {
    renderer: {
        code(code: string, language?: string): string | false {
            if (language !== 'video') return false;

            const config = parseConfig(code);
            const ctx = getContext()
            return renderVideo(config, ctx);
        }
    },
};

const videoConfigParser = zod.strictObject({
    type: zod.enum(['demo', 'gif']),
    urls: zod.array(zod.string()),
    size: zod.tuple([ zod.number(), zod.number() ]),
    audible: zod.boolean().default(false),
});
type VideoConfig = zod.infer<typeof videoConfigParser>;

function parseConfig(configString: string): VideoConfig {
    // Parse the JSON configuration.
    let json: unknown;
    try {
        json = JSON.parse(configString);
    } catch {
        throw new Error(`Expected video body to be a JSON object, but got:\n${configString}`);
    }

    // Parse and validate the data type.
    const result = videoConfigParser.safeParse(json);
    if (!result.success) {
        throw new Error(`Failed to parse video config, encountered errors:\n${
            result.error.issues
                .map((issue) => JSON.stringify(issue, null, 2))
                .join('\n')
        }`);
    }

    const config = result.data;
    if (config.urls.length === 0) {
        throw new Error('At least one URL is required.');
    }

    return config;
}

function renderVideo(config: VideoConfig, ctx: Context): string {
    return ctx.njk.renderString(videoNjkTemplate, {
        ...ctx.frontmatter,
        ...config,
    });
}

const videoNjkTemplate = `
{% set autoplay %}
    {% if not audible %}
        autoplay muted loop
    {% endif %}
{% endset %}
{% set sizes %}width="{{ size[0] }}" height="{{ size[1] }}"{% endset %}
{% set sources %}
    {% for url in urls %}
        <source src="{{ url }}" type="{{ url | mimeVideo }}" />
    {% endfor %}
{% endset %}

{% set videoEl %}
    {% if type === 'demo' %}
        <video {{ autoplay }} playsinline {{ sizes | safe }} controls>
            {{ sources | safe }}
        </video>
    {% elif type === 'gif' %}
        <video {{ autoplay }} playsinline {{ sizes | safe }} class="gif">
            {{ sources | safe }}
        </video>
    {% else %}
        {% filter throw %}
            Unknown video type "{{ type }}".
        {% endfilter %}
    {% endif %}
{% endset %}

<dwac-lazy style="display: block; aspect-ratio: {{ size[0] | safe }} / {{ size[1] | safe }};">
    <template>{{ videoEl | safe }}</template>
    <noscript>{{ videoEl | safe }}</noscript>
</dwac-lazy>
`.trim();
