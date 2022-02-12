import { LitElement, TemplateResult, html, css } from 'lit';
import { customElement, property } from 'lit/decorators';
import { when } from 'lit/directives/when';
import { assertDefined } from '../asserts';
import { makeShareable } from '../share';
import { show as showSnackbar } from './snackbar';

/** Displays a share UI to allow users to easily share the given URL. */
@customElement('dwac-share')
export class Share extends LitElement {
    static override styles = css`
        :host {
            --dwac-share-twitter-blue: rgb(29, 161, 242);

            display: block;
            color: var(--dwac-text-color-primary);
        }

        ul {
            margin: 0;
            padding: 0;
        }

        span + ul {
            margin-top: 10px;
        }

        li {
            display: inline-block;
        }

        li + li {
            margin-left: 5px;
        }

        #share {
            height: 44px;
            vertical-align: middle;
        }

        #share > svg {
            height: 100%;
        }

        #copy {
            height: 44px;
            vertical-align: middle;
        }

        #copy > svg {
            height: 100%;
        }

        #twitter-logo {
            width: 44px;
            height: 44px;
            vertical-align: middle;

            fill: currentColor;
            color: var(--dwac-share-twitter-blue);
        }

        /*
         * Removes default styling on a button element. Useful for a semantic
         * button that doesn't **look** like a traditional button.
         */
        button.unstyled {
            display: inline-block;
            background: none;
            border: none;
            margin: 0;
            padding: 0;
            text-decoration: none;
            font-family: sans-serif;
            font-size: 1rem;
            cursor: pointer;
            text-align: center;
            -webkit-appearance: none;
            -moz-appearance: none;
        }
    `;

    @property({ attribute: 'prompt'}) public prompt?: string;

    // Required.
    @property({
        converter: {
            // Parse the string attribute into a URL object.
            fromAttribute: (target) => {
                if (!target) return null;

                if (target.startsWith('/')) {
                    return makeShareable(target);
                } else {
                    return new URL(target);
                }
            },
        },
    }) public target?: URL;

    // Required.
    @property({ attribute: 'article-title' }) public articleTitle?: string;

    override render(): TemplateResult|void {
        assertDefined(this.target);
        assertDefined(this.articleTitle);

        return html`
            ${when(this.prompt, () => html`
                <span>${this.prompt}</span>
            `)}
            <ul>
                ${when(navigator.share, () => html`
                    <li>
                        <button id="share" @click="${this.onShare.bind(this)}"
                                class="unstyled" title="Share link">
                            ${shareIcon}
                        </button>
                    </li>
                `)}
                ${when(navigator.clipboard?.writeText, () => html`
                    <li>
                        <button id="copy" @click="${this.onCopy.bind(this)}"
                                class="unstyled" title="Copy link to clipboard">
                            ${copyIcon}
                        </button>
                    </li>
                `)}
                <li>
                    <a href="https://twitter.com/intent/tweet?text=${
                            encodeURIComponent(
                                    `Check out: "${this.articleTitle}". ${
                                        this.target.toString()}`)}"
                            target="_blank"
                            rel="noopener"
                            title="Share link on Twitter">
                        ${twitterIcon}
                    </a>
                </li>
            </ul>
        `;
    }

    /** Shares the URL via the user-agent. */
    private async onShare(): Promise<void> {
        assertDefined(this.target);
        assertDefined(this.articleTitle);

        await navigator.share({
            title: this.articleTitle,
            text: `Check out: "${this.articleTitle}".`,
            url: this.target.toString(),
        });
    }

    /** Copies the URL to the user's clipboard. */
    private async onCopy(): Promise<void> {
        assertDefined(this.target);

        await navigator.clipboard.writeText(this.target.toString());

        await showSnackbar('Copied URL to clipboard.', 2_000 /* ms */);
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'dwac-share': Share;
    }
}

const shareIcon = html`
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid meet" viewBox="0 0 365 329">
        <defs>
            <path d="M255 60C255 87.6 277.4 110 305 110C332.6 110 355 87.6 355 60C355 32.4 332.6 10 305 10C277.4 10 255 32.4 255 60Z" id="c1Ggf7vaAL"></path>
            <path d="M255.93 66.39L101.39 130.67L109.07 149.13L263.61 84.86L255.93 66.39Z" id="c45etRo0QD"></path>
            <path d="M10 161.4C10 189 32.4 211.4 60 211.4C87.59 211.4 110 189 110 161.4C110 133.81 87.59 111.4 60 111.4C32.4 111.4 10 133.81 10 161.4Z" id="c2tpKmjxHV"></path>
            <path d="M255 269.17C255 241.58 277.4 219.17 305 219.17C332.6 219.17 355 241.58 355 269.17C355 296.77 332.6 319.17 305 319.17C277.4 319.17 255 296.77 255 269.17Z" id="a42YXrfFV"></path>
            <path d="M251.88 259.06L97.34 194.79L105.02 176.32L259.56 240.6L251.88 259.06Z" id="c40venACK"></path>
        </defs>
        <g>
            <g>
                <g>
                    <use xlink:href="#c1Ggf7vaAL" opacity="1" fill="#ffffff" fill-opacity="1"></use>
                    <g><use xlink:href="#c1Ggf7vaAL" opacity="1" fill-opacity="0" stroke="#000000" stroke-width="20" stroke-opacity="1"></use></g>
                </g>
                <g><use xlink:href="#c45etRo0QD" opacity="1" fill="#000000" fill-opacity="1"></use></g>
                <g>
                    <use xlink:href="#c2tpKmjxHV" opacity="1" fill="#ffffff" fill-opacity="1"></use>
                    <g><use xlink:href="#c2tpKmjxHV" opacity="1" fill-opacity="0" stroke="#000000" stroke-width="20" stroke-opacity="1"></use></g>
                </g>
                <g>
                    <use xlink:href="#a42YXrfFV" opacity="1" fill="#ffffff" fill-opacity="1"></use>
                    <g><use xlink:href="#a42YXrfFV" opacity="1" fill-opacity="0" stroke="#000000" stroke-width="20" stroke-opacity="1"></use></g>
                </g>
                <g><use xlink:href="#c40venACK" opacity="1" fill="#000000" fill-opacity="1"></use></g>
            </g>
        </g>
    </svg>
`;

const copyIcon = html`
    <svg viewBox="0 0 373 475" xmlns="http://www.w3.org/2000/svg">
        <g>
            <rect stroke="#000" rx="60" width="248" height="328" x="105" y="20" stroke-width="40" fill="#fff" />
            <rect stroke="#000" rx="60" width="248" height="328" x="20" y="127" stroke-width="40" fill="#fff" />
        </g>
    </svg>
`;

const twitterIcon = html`
    <svg id="twitter-logo" viewBox="0 0 24 24">
        <title>Twitter logo</title>
        <g><path d="M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z"></path></g>
    </svg>
`;
