import { LitElement, TemplateResult, html, customElement, property } from "lit-element";
import { assertDefined } from "../asserts";

/** Displays a hello message to the given name. */
@customElement('dwac-hello')
export class Hello extends LitElement {
    @property() public name?: string;

    render(): TemplateResult|void {
        assertDefined(this.name);

        return html`
            <h2>Hello ${this.name}!</h2>
        `;
    }
}
