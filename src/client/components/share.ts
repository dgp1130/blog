import { LitElement, TemplateResult, html, property, customElement, css } from 'lit-element';
import { ifDefined } from 'lit-html/directives/if-defined';
import { assertDefined } from '../asserts';
import { makeShareable } from '../share';

/** Displays a share UI to allow users to easily share the given URL. */
@customElement('dwac-share')
export class Share extends LitElement {
    static styles = css`
        :host {
            --dwac-twitter-blue: rgb(29, 161, 242);
        }

        #twitter-logo {
            width: 24px;
            height: 24px;
            vertical-align: middle;

            fill: currentColor;
            color: var(--dwac-twitter-blue);
        }
    `;

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

    render(): TemplateResult|void {
        assertDefined(this.target);
        assertDefined(this.articleTitle);

        return html`
            ${ifDefined(navigator.share && html`
                <button id="share" @click="${this.onShare.bind(this)}">
                    Share!
                </button>
            `)}
            ${ifDefined(navigator.clipboard?.writeText && html`
                <button id="copy" @click="${this.onCopy.bind(this)}">
                    Copy!
                </button>
            `)}
            <a href="https://twitter.com/intent/tweet?text=${
                    encodeURIComponent(`Check out: "${this.articleTitle}". ${
                            this.target.toString()}`)}"
                    target="_blank"
                    rel="noopener"
                    title="Share on Twitter">
                <svg id="twitter-logo">
                    <title>Twitter logo</title>
                    <g><path d="M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z"></path></g>
                </svg>
            </a>
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
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'dwac-share': Share;
    }
}
