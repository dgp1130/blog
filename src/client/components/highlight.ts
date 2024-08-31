declare class Highlight {
    public constructor(...ranges: Range[]);
    public add(range: AbstractRange): void;
    public delete(range: AbstractRange): void;
    public size: number;
}

declare namespace CSS {
    let highlights: Map<string, Highlight>;
}

/** TODO */
export class Highlighter extends HTMLElement {
    private name: string | null = null;
    private ranges: StaticRange[] | undefined = undefined;

    connectedCallback(): void {
        this.name = this.getAttribute('name');
        if (!this.name) throw new Error('`name` attribute is required.')
        const spans = this.getAttribute('spans');
        if (!spans) throw new Error('`spans` attribute is required.');

        if (this.children.length > 1) throw new Error('Expected only one child.');
        const [ child ] = Array.from(this.children) as [ Element ];

        if (!this.ranges) {
            const parsedSpans = parseSpans(spans);
            this.ranges = convertToRanges(child, parsedSpans);
        }

        const highlight = CSS.highlights.get(this.name) ?? new Highlight();
        for (const range of this.ranges) highlight.add(range);
        CSS.highlights.set(this.name, highlight);
    }

    disconnectedCallback(): void {
        const highlight = CSS.highlights.get(this.name!)!;
        for (const range of this.ranges!) highlight.delete(range);

        if (highlight.size === 0) CSS.highlights.delete(this.name!);
    }
}

customElements.define('dwac-highlight', Highlighter);

declare global {
    interface HTMLElementTagNameMap {
        'dwac-highlight': Highlighter;
    }
}

type Span = [start: number, end: number];
function parseSpans(spans: string): Span[] {
    return spans.split(' ').map((span) => {
        const [ start, end, ...rest ] = span.split('-');
        if (rest.length !== 0) throw new Error(`Bad span: ${span}`);

        if (start === undefined || end === undefined) throw new Error(`Bad span: ${span}`);

        return [ Number(start), Number(end) ];
    });
}

type Offsets = [start: number, end: number];
function toOffsets(spans: Span[]): Offsets[] {
    let currOffset = 0;
    return spans.map(([ start, end ]) => {
        const result = [ start - currOffset, end - start ] as Offsets;
        currOffset = end;
        return result;
    });
}

function convertToRanges(root: Element, spans: Span[]): StaticRange[] {
    const ranges: StaticRange[] = [];

    const step = createStepper(text(walk(root.childNodes)));

    for (const [ start, end ] of toOffsets(spans)) {
        const [ startContainer, startOffset ] = step(start);
        const [ endContainer, endOffset ] = step(end);

        const range = new StaticRange({
            startContainer,
            startOffset,
            endContainer,
            endOffset,
        });
        ranges.push(range);
    }

    return ranges;
}

type Stepper = (count: number) => [ node: Text, offset: number ];
function createStepper(textNodes: IterableIterator<Text>): Stepper {
    let currNode = textNodes.next().value!;
    let isFirstNode = true;
    let currOffset = 0;

    return (count) => {
        while (currOffset + count >= currNode.textContent!.length) {
            count -= currNode.textContent!.length - currOffset;

            const itResult = textNodes.next();
            if (itResult.done) throw new Error('TODO');
            currNode = itResult.value;
            isFirstNode = false;
            currOffset = 0;
        }

        currOffset += count;
        return [ currNode, currOffset ];
    };
}

function* walk(nodes: NodeListOf<Node>): IterableIterator<Node> {
    for (const node of nodes) {
        yield node;
        yield* walk(node.childNodes);
    }
}

function* text(nodes: IterableIterator<Node>): IterableIterator<Text> {
    for (const node of nodes) {
        if (node.nodeType === Node.TEXT_NODE) yield node as Text;
    }
}
