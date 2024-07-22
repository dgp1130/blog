import { MarkedExtension, Tokens } from 'marked';
import * as zod from 'zod';
import { Context, getContext } from './context';

/**
 * A `marked` extension which renders a tweet when it encounters a code block
 * with the language `tweet`. The content of the code block must be a
 * JSON-formatted object with the required information like so:
 *
 * ```markdown
 * Check out this tweet:
 *
 * \`\`\`tweet
 * {
 *   "url": "https://twitter.com/develwoutacause/status/1452082837075607553",
 *   "author": "Doug Parker",
 *   "username": "develwoutacause",
 *   "avatars": ["/res/img/profile.avif", "/res/img/profile.webp"],
 *   "avatarDimensions": [200, 200],
 *   "timestamp": "2021-10-23T18:21:00-0700",
 *   "content": "Hello, World!"
 * }
 * \`\`\`
 * ```
 *
 * The configuration object supports the following properties:
 * * `url` - A `string` which links to the original tweet source.
 * * `author` - A `string` of the author's printed name.
 * * `username` - A `string` of the author's Twitter username (without the @).
 * * `avatars` - An `Array<string>` which links to the images of the user's
 *               avatar. Most likely you want to copy the image to a particular
 *               local path for the site and link to that copy. Multiple avatars
 *               are available for performance and the earliest supported format
 *               for the current browser will be used.
 * * `avatarDimensions` - A `[width: number, height: number]` tuple indicating
 *                        the expected dimensions of the avatar images.
 * * `timestamp` - An ISO8601-formatted `string` of the time the tweet was
 *                 tweeted.
 * * `content` - A `string` of the text content of the tweet.
 *
 * You also probably want to include the `additional_styles` frontmatter so the
 * tweet is styled correctly:
 *
 * ```markdown
 * ---
 * # Frontmatter
 * additional_styles: [ tweet ]
 * ---
 *
 * Markdown content...
 * ```
 */
export const tweetExtension: MarkedExtension = {
    useNewRenderer: true,
    renderer: {
        code({ text, lang }: Tokens.Code): string | false {
            // Ignore any code blocks not labeled as `tweet`.
            if (lang !== 'tweet') return false;

            const config = parseConfig(text);
            const ctx = getContext();
            return renderTweet(config, ctx);
        }
    },
};

function parseConfig(configString: string): TweetConfig {
    // Parse the JSON configuration.
    let json: unknown;
    try {
        json = JSON.parse(configString);
    } catch {
        throw new Error(`Expected tweet body to be a JSON object, but got:\n${configString}`);
    }

    // Parse and validate the data type.
    const result = tweetConfigParser.safeParse(json);
    if (!result.success) {
        throw new Error(`Failed to parse tweet config, encountered errors:\n${
            result.error.issues
                .map((issue) => JSON.stringify(issue, null, 2))
                .join('\n')
        }`);
    }

    const config = result.data;
    if (config.avatars.length === 0) {
        throw new Error('At least one avatar is required.');
    }

    return config;
}

// Parser for an ISO8601 formatted string into a `Date` object.
const zodIso8601Date = zod.preprocess(
    (input) => typeof input === 'string' ? new Date(input) : input,
    zod.date(),
);

// Parser for the JSON configuration of a tweet.
const tweetConfigParser = zod.strictObject({
    url: zod.string().url(),
    author: zod.string(),
    username: zod.string(),
    avatars: zod.array(zod.string()),
    avatarDimensions: zod.tuple([ zod.number(), zod.number() ]),
    timestamp: zodIso8601Date,
    content: zod.string(),
});
type TweetConfig = zod.infer<typeof tweetConfigParser>;

function renderTweet(config: TweetConfig, ctx: Context): string {
    return ctx.njk.renderString(tweetNjkTemplate, {
        ...ctx.frontmatter,
        ...config,
        content: renderContent(config.content),
        authorHref: `https://twitter.com/${config.username}/`,
        timeOfDay: config.timestamp.toLocaleTimeString('en', {
            hour: 'numeric',
            hour12: true,
            minute: 'numeric',
        }),
        date: config.timestamp.toLocaleDateString('en', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }),
    });
}

const tweetNjkTemplate = `
    <!-- We use \`<div role="blockquote" />\` instead of a regular
    \`<blockquote />\` to avoid applying typical markdown styles for them. -->
    <div role="blockquote" class="tweet">
        <div class="author">
            <a href="{{ authorHref }}" target="_blank">
                <picture>
                    {% for avatar in avatars.slice(0, -1) %}
                        <source srcset="{{ avatar }}" type="{{ avatar | mimeImg }}" />
                    {% endfor %}
                    <img srcset="{{ avatars | last }}" width="{{ avatarDimensions[0] }}" height="{{ avatarDimensions[1] }}" />
                </picture>
            </a>
        <div class="name">
                <a href="{{ authorHref }}" class="author-name" target="_blank">{{ author }}</a>
                <a href="{{ authorHref }}" class="username" target="_blank">@{{ username }}</a>
            </div>
            <div class="source">
                <a href="{{ url }}" target="_blank">
                    <svg id="twitter-logo" viewBox="0 0 24 24" width="24px" height="24px">
                        <title>Twitter logo</title>
                        <g><path d="M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z"></path></g>
                    </svg>
                </a>
            </div>
        </div>
        <div class="content">{{ content | safe }}</div>
        <time datetime="{{ timestamp.toISOString() }}">
            <a href="{{ url }}" target="_blank">{{ timeOfDay }} - {{ date }}</a>
        </time>
    </div>
`.trim();

function renderContent(content: string): string {
    return content
        // Fix newlines.
        .replace(/\\n/g, '<br>')
        // Linkify hashtags.
        .replace(/#([a-zA-Z0-9_]*)/g, (_, hashTag) => `
<a href="https://twitter.com/hashtag/${hashTag}" class="hashtag" target="_blank">#${hashTag}</a>
        `.trim());
    ;
}
