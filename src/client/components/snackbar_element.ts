import { css, html, LitElement, TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { timeout } from '../time';

/** @testonly */
export const fadeInTimeoutMs = 100;
/** @testonly */
export const fadeOutTimeoutMs = 250;

/**
 * Displays a "snackbar" alert message to the user. This is shown in a small
 * popup-like box near the top of the screen.
 */
@customElement('dwac-snackbar')
export class Snackbar extends LitElement {
    static override styles = css`
        :host {
            /* Fill up the whole screen horizontally. */
            display: block;
            width: 100%;
            position: fixed;
            top: 60px;

            /* Center visible child element. */
            text-align: center;

            /* User interactions should empty space within this element. */
            pointer-events: none;
        }

        div {
            /* Center the snackbar. */
            display: inline-block;
            min-width: 15%;
            max-width: 50%;
            margin: auto;

            /* Show in a popup-like design. */
            color: var(--dwac-color-secondary);
            background: rgb(60, 60, 60);
            padding: 0.25em;
            border-radius: 0.5em;

            /* Block user interactions on this element. */
            pointer-events: auto;

            /* Apply a fade-in animation when added to the DOM. */
            animation-name: fadeIn;
            animation-iteration-count: 1;
            animation-timing-function: ease-in;
            animation-duration: var(--dwac-snackbar-fade-in-duration);
            opacity: 1; /* End fade-in by staying visible. */
        }

        @keyframes fadeIn {
            0% { opacity: 0; }
            100% { opacity: 1; }
        }

        /* Apply a fade-out animation when the \`.fade-out\` class is set. */
        :host(.fade-out) div {
            animation-name: fadeOut;
            animation-iteration-count: 1;
            animation-timing-function: ease-out;
            animation-duration: var(--dwac-snackbar-fade-out-duration);
            opacity: 0; /* End fade-out by staying invisible. */
        }

        @keyframes fadeOut {
            0% { opacity: 1; }
            100% { opacity: 0; }
        }
    `;

    private text!: string;

    /** Creates a snackbar which displays the given text. */
    public static of(text: string): Snackbar {
        const el = document.createElement('dwac-snackbar');
        el.text = text;
        return el;
    }

    public override connectedCallback(): void {
        super.connectedCallback();

        // Bind fade-in and fade-out durations to CSS properties for styles to
        // use. Ideally this would be inlined in the `styles` static property,
        // but doing so would break `minify-html-literals`, so this is the next
        // best way. See: https://github.com/asyncLiz/minify-html-literals/issues/31.
        this.style.setProperty(
            '--dwac-snackbar-fade-in-duration', `${fadeInTimeoutMs}ms`);
        this.style.setProperty(
            '--dwac-snackbar-fade-out-duration', `${fadeOutTimeoutMs}ms`);

        // Default to `alert` role which most accurately represents the intended
        // use of this component.
        if (!this.hasAttribute('role')) this.setAttribute('role', 'alert');
    }

    protected override render(): TemplateResult {
        if (!this.text) throw new Error('No `text` given to snackbar.');

        return html`<div>${this.text}</div>`;
    }

    /**
     * Fades out this element and returns a `Promise` which resolve when done.
     */
    public async fadeOut(): Promise<void> {
        this.classList.add('fade-out');
        await timeout(fadeOutTimeoutMs);
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'dwac-snackbar': Snackbar;
    }
}
