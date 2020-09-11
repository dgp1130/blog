import { LitElement, TemplateResult, html, property, customElement } from 'lit-element';
import { ifDefined } from 'lit-html/directives/if-defined';
import { assertDefined } from '../asserts';
import { makeShareable } from '../share';

/** Displays a share UI to allow users to easily share the given URL. */
@customElement('dwac-share')
export class Share extends LitElement {
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
                    rel="noopener">
                Tweet!
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
