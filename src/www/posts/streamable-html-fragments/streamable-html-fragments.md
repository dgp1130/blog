---
tags: posts
layout: pages/post
title: Streamable HTML Fragments
date: 2022-09-24T12:00:00-07:00
excerpt: |
    HTML fragments part 2: Streaming tweets. Search the far corners of web
    standards to learn how we can *stream* HTML fragments directly into the DOM.
languages: [ html, typescript ]
---

# Streamable HTML Fragments

```timestamp
```

In my recent [HTML fragments blog post](/posts/html-fragments/), I explored how
to dynamically fetch a fully-encapsulated, server-side rendered (SSR) web
component and use it without any custom tooling or "HTML-over-the-wire"
framework.

I suggested that the web spec could be updated to better support this use case,
and it could improve over my prototype by supporting _streamed_ HTML fragments.
I did not explore streaming too much in that post as I didn't think it was
possible to demo, even in a limited capacity.

However, I recently found [this HTTP 203 video](https://youtu.be/LLRig4s1_yA)
where [Jake Archibald](https://twitter.com/jaffathecake) discussed some "magic
tricks" with the HTML parser. Near the end of the video, they mentioned
[`document.implementation.createHTMLDocument()`](https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation/createHTMLDocument)
which can stream dynamic HTML content directly into the page DOM. I'd never
heard of this API before, and it seemed like a great tool to stream HTML
fragments, so I was eager to prototype the approach.

Oh how naive I was.

## Idea

If you haven't read the [HTML fragments post](/posts/html-fragments/), I highly
recommend it, I could use the extra traffic 😉. But if not, the main idea was
that custom elements and declarative shadow DOM (DSD) can support a completely
self-contained, SSR'd UI component. Such a component could then be fetched via
XHR as an "HTML fragment" which gets parsed into a DOM node and appended into
the document. This allows us to encapsulate all the implementation details of a
component, shift the rendering work to the server, and provide dynamic features
without requiring a page refresh.

One example of what a complete HTML fragment server response might look like
(for a Twitter clone):

```html
<my-tweet>
    <template shadowroot="open">
        <link rel="stylesheet" href="/tweet.css">
        <span>Hello world from tweet #1234.</span>
        <button>Edit</button>
    </template>
    <script src="/tweet.js" type="module" async></script>
</my-tweet>
```

Then the client could request and use this fragment by appending it to the DOM.

```typescript
import { parseDomFragment } from './dom.js'; // See HTML fragments post for implementation.

(async () => {
    // Fetch an HTML fragment from the server.
    const res = await fetch(`/tweet?id=1234`);

    // Parse it into an `HTMLTemplateElement` node.
    const template: HTMLTemplateElement =
        await parseDomFragment(res);

    // Append to the document.
    document.body.appendChild(
        template.content.cloneNode(true /* deep */));
})();
```

Combining this with streaming support, could we evolve this into something like:

```typescript
import { streamDomFragment } from './dom.js'; // Implementation TBD...

(async () => {
    // Fetch an HTML fragment from the server.
    const res = await fetch(`/tweet?id=1234`);

    // Stream the fragment into a DOM node. We only have the
    // top-level DOM node right now, `<my-tweet></my-tweet>`
    // from the above example, but content will continue to
    // stream in as it is received.
    const fragment: Node = await streamDomFragment(res);

    // Append to the document.
    document.body.appendChild(fragment);
})();
```

How hard could it be right?

## HTML Streaming Background

You might be wondering why `streamDomFragment()` returns a `Node` and not an
`AsyncGenerator<Node, void, void>`. After all, if the point is to stream the
content, why would we return a fully parsed `Node`?

This is important to the rest of the streaming discussion, so some background in
how HTML streaming actually works can help clear this up. HTML is a textual
format, meaning a start tag (`<div>`) can be far away from its associated close
tag (`</div>`). However DOM is a hierarchical structure. There are no start or
end tags, you either have an `HTMLDivElement` object or you don't. Close tags
don't actually exist! _You've been lied to all your life by big browser!_

Browsers handle this by creating and appending a DOM node when an HTML start tag
parsed. The close tag serves only as a signal to the parser that subsequent HTML
goes _after_ that DOM node, rather than _inside_ it.

Let's assume the browser received the following HTML content in a few different
chunks. How might it render this content at each pause?

```html
<div>
    <span id="1">Hello,

<!-- Pause -->

        World!</span>

<!-- Pause -->

</div>

<span id="2">Howdy, World!</span>
```

At the first pause, the browser renders:

```
HTMLDivElement [
    HTMLSpanElement [
        Text "Hello,"
    ]
]
```

I'm deliberately writing this without using HTML syntax, because the DOM is a
hierarchical structure (remember: close tags don't exist, wake up sheeple!).

At the second pause, the span tag is fully parsed and the browser remembers
where the first half was rendered, so it appends to the existing text node:

```
HTMLDivElement [
    HTMLSpanElement [
        Text "Hello, World!"
    ]
]
```

Finally, after parsing the third chunk the browser sees the closing `</div>` tag
and knows that any following nodes append _after_ that associated
`HTMLDivElement`, so we finally end up with:

```
HTMLDivElement [
    HTMLSpanElement [
        Text "Hello, World!"
    ]
]
HTMLSpanElement [
    Text "Howdy, World!"
]
```

There's a lot more nuances to HTML streaming (what happens if I remove the
`HTMLDivElement` during the first pause?) But this should be good enough to
understand the rest of this post, so I'll stop there. The aforementioned
[HTTP 203 video](https://www.youtube.com/watch?v=LLRig4s1_yA) goes into more
detail on HTML streaming and with great visual aids. I highly recommend it if
this seems interesting to you.

## First Node Problem

With that out of the way, I want to build a similar streaming mechanism. Users
should call `streamDomFragment()` and get back a `Node` which is initially empty
with no children. Users can then append it to the DOM wherever they like. As the
remaining HTML content is streamed in, it should update that existing root node
with the streamed DOM.

I started with a relatively simple implementation which read the HTTP response
as a text stream and wrote each chunk to a new document from
`document.implementation.createHTMLDocument()`, since it already implements this
streamed parsing behavior.

```typescript
/**
 * Returns a Node which renders the streamed HTML content
 * from the given response.
 */
export async function streamDomFragment(res: Response):
        Promise<Node> {
    const body = res.body;
    if (!body) throw new Error('...');

    // Convert the `ReadableStream<Uint8Array>` to
    // `AsyncGenerator<string, void, void>`. Omitted for brevity.
    const textStream: AsyncGenerator<string, void, void> =
        parseText(iterateReader(body));

    // Parse the text to a new `Node` and return it.
    return streamingParse(textStream);
}

/** Write the text into a new document and return it. */
function streamingParse(
    stream: AsyncGenerator<string, void, void>,
): Node {
    const doc: Document =
        document.implementation.createHTMLDocument();

    // Read all chunks in the background, don't block the
    // current execution.
    (async () => {
        for await (const chunk of stream) {
            doc.write(chunk);
        }
    })();

    return doc;
}
```

`Document` extends `Node`, so `streamingParse()` has a valid return value.
However, attempting to append a `Document` to an existing document doesn't work.

```
index.ts:17 Uncaught (in promise) DOMException: Failed to
execute 'appendChild' on 'Node': Nodes of type '#document'
may not be inserted inside nodes of type 'MAIN'.
```

This makes a certain level of sense, you can't put a document inside another
document. So we need a `Node` to append to the document at the start of the
stream, but what `Node` could that be? It _should_ be a `<my-tweet />` element,
but this code is running before the HTTP response is received, so we don't
actually know what the `Node` will be. It could be `<my-other-tweet />` or a
dreaded `<mean-tweet />`.

To solve this, I had to stream enough of the input to parse the root level node
and then return that node to be inserted into the document while the rest of the
response was received. This was especially tricky given that I needed to consume
the rest of the stream asynchronously, so I can't just use `for await` with a
`break`, since that would close the stream in an un-resumable fashion. I
ultimately ended up with:

```typescript
/** Write the text into a new document and return it. */
async function streamingParse(
    stream: AsyncGenerator<string, void, void>,
): Promise<Node> {
    const doc = document.implementation.createHTMLDocument();

    // Use the async iterator API to read the stream
    // imperatively until the top-level Node is parsed.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#the_async_iterator_and_async_iterable_protocols
    let root: Node | null = null;
    while (true) {
        // Wait for the next chunk to arrive.
        const it = await stream.next();
        if (it.done) throw new Error('Failed to parse a root node out of the stream.');

        // Write the chunk to the streamable document.
        doc.write(it.value);

        // Look to see if the root node has been parsed.
        root = doc.body.firstChild;
        if (root) break;
    }

    // Read all remaining chunks in the background, but
    // don't block the current execution.
    (async () => {
        for await (const chunk of stream) {
            doc.write(chunk);
        }
    })();

    return root;
}
```

It is definitely awkward, but works well enough for this demo.

## Streaming Declarative Shadow DOM

Once I had that working I was able to actually see a streamed tweet in the DOM!
Well, a streamed tweet without its declarative shadow DOM as the console
indicated:

```
Found declarative shadowroot attribute on a template, but
declarative Shadow DOM has not been enabled by includeShadowRoots.
```

Apparently `document.implementation.createHTMLDocument()` does not support
declarative shadow DOM and provides no option to enable it. I even found
[the line in Chromium source code](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/dom/dom_implementation.cc;l=108;drc=fde2db9853cab5681586ea71d877f4cefd5eee13)
which explicitly turns it off! I have never contributed to Chromium before, but
it feels like a pretty trivial change to plumb through an option from JS. I
think the main hold up is about bike-shedding the exact option name
[in the spec](https://github.com/whatwg/dom/issues/912).

Absent proper declarative shadow DOM support, it is possible to
[polyfill the feature](https://web.dev/declarative-shadow-dom/#polyfill).
Typically this is done as a one-time transformation over the entire document,
since DSD is a parser-only feature by design. However, this streaming use case
breaks that invariant since we might stream DSD into an existing document after
it has been fully parsed. I adjusted the polyfill to use a
[`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)
and scoped only to the root element of the HTML fragment being pulled into the
DOM.

```typescript
/**
 * Clone the given template and attach it to its parent's
 * shadow root.
 */
function applyDsd(template: HTMLTemplateElement): void {
    const mode = template.getAttribute('shadowroot');
    if (!mode) return;

    // Create a shadow root for its parent and append the content.
    const shadowRoot =
        template.parentElement!.attachShadow({
            mode: mode as ShadowRootMode,
        });
    const contents = template.content.cloneNode(true /* deep */);
    shadowRoot.appendChild(contents);

    template.remove();
}

/**
 * Observes DSD templates added to the `Node` and applies
 * them to their parents.
 */
 function fixupDeclarativeShadowDom(root: Node): () => void {
    // Apply any DSD nodes already parsed. This can happen
    // if a DSD node is in the first chunk.
    if (root.nodeType === Node.ELEMENT_NODE) {
        const templates = Array.from(
            (root as Element)
                .querySelectorAll('template[shadowroot]')
        ) as HTMLTemplateElement[];

        for (const template of templates) {
            applyDsd(template);
        }
    }

    // Watch for any further mutations to the `root` node.
    const obs = new MutationObserver((records) => {
        for (const record of records) {
            for (const added of record.addedNodes) {
                // Check if an added node is a DSD element.
                if (!(added instanceof HTMLElement)) continue;
                if (added.tagName !== 'TEMPLATE') continue;

                applyDsd(added as HTMLTemplateElement);
            }
        }
    });

    obs.observe(root, { childList: true, subtree: true });
    return () => obs.disconnect();
}

/** Write the text into a new document and return it. */
async function streamingParse(
    stream: AsyncGenerator<string, void, void>,
): Promise<Node> {
    const doc = document.implementation.createHTMLDocument();

    const root: Node = /* ... */;

    // Watch for DSD elements streamed in and apply their contents.
    const stopFixingDsd = fixupDeclarativeShadowDom(root);
    (async () => {
        try {
            for await (const chunk of stream) {
                doc.write(chunk);
            }
        } finally {
            // Remove the `MutationObserver` once all the
            // content has been streamed.
            stopFixingDsd();
        }
    })();

    return root;
}
```

With that, the tweet is actually rendering! Notice how the `<my-tweet />` node
is immediately created because the server returned it instantly, while the
rest of the content streams in afterwards.

```video
{
    "type": "demo",
    "urls": ["demos/1-single-node-streaming.mp4"],
    "size": [1280, 720]
}
```

## Streaming a List

Of course, streaming a single tweet probably is not actually worth the effort.
Instead, I would much rather stream a _list_ of tweets into the document one at
a time. So I updated the server's HTML fragment response to serve multiple
tweets with a delay between each one.

```html
<my-tweet>
    <template shadowroot="open">
        <link rel="stylesheet" href="/tweet.css">
        <span>Hello world from tweet #1234.</span>
        <button>Edit</button>
    </template>
    <script src="/tweet.js" type="module" async></script>
</my-tweet>

<!-- Delay 250ms. -->

<my-tweet>
    <template shadowroot="open">
        <link rel="stylesheet" href="/tweet.css">
        <span>Hello world from tweet #4321.</span>
        <button>Edit</button>
    </template>
    <script src="/tweet.js" type="module" async></script>
</my-tweet>
```

However, when I tried this, I only actually saw one tweet appear.

```video
{
    "type": "demo",
    "urls": ["demos/2-list-stream-fail.mp4"],
    "size": [1280, 720]
}
```

I eventually came to realize that `streamingParse()` returns a single `Node`,
but my HTTP response actually contains two top-level `<my-tweet />` nodes. It
doesn't make sense to return only the first node in the response, because more
could stream in and they're left in the document from
`document.implementation.createHTMLDocument()`.

To add complexity, I wanted to stream these tweets into a list, meaning I wanted
the final rendered DOM to be:

```html
<ul>
    <li><my-tweet>...</my-tweet></li>
    <li><my-tweet>...</my-tweet></li>
</ul>
```

Even if I successfully streamed multiple `<my-tweet />` nodes from the response,
there's no `<li />` tags wrapping them! I also didn't want to include the
`<ul />` in the HTTP response, because I'm using this stream to apply infinite
scroll to an existing `<ul />` tag already containing some tweets, I don't want
another one for each batch of tweets.

The simple answer is to put the `<li />` tags in the HTTP response like so:

```html
<li><my-tweet>...</my-tweet></li>
<li><my-tweet>...</my-tweet></li>
```

Though this breaks abstraction somewhat. `<li />` tags aren't really standalone
like that and aren't intended to work outside of a `<ul />` or `<ol />` tag.

Instead I came away with a better approach, _stream the top level nodes_.
Instead of having `streamDomFragment()` return a single `Node` which gets
automatically updated with its children as they are streamed, let's return an
`AsyncGenerator<Node>`. This generator emits a value for every _top-level_ node
in the HTTP response _as soon as it is parsed_, meaning the node is empty
initially. User code can insert this `Node` in the DOM where desired, and
subsequent streamed content will automatically append to that `Node` until the
HTTP response closes it and returns a new root `Node`.

Usage looks like this:

```typescript
const list = document.getElementById('ul#tweet-list')!;

const res = await fetch('/tweets');
for await (const myTweetEl of streamDomFragment(res)) {
    // Wrap the tweet in an `<li />` tag.
    const listItem = document.createElement('li');
    listItem.append(myTweetEl);
    list.append(listItem);
}
```

With this, I have successfully streamed HTML fragments!

```video
{
    "type": "demo",
    "urls": ["demos/3-list-stream.mp4"],
    "size": [1280, 720]
}
```

As for how to actually implement this, we can use another `MutationObserver` to
watch for additional children added to the root node of the hidden document, and
then detach and emit that `Node` as soon as we see it. The implementation here
is especially fun, because we have to use the `Iterator` API directly instead of
a generator because of the `MutationObserver` callback. At this point, the
implementation code snippets tend to get a little involved, so you can check out
the [repository](https://github.com/dgp1130/html-fragments-demo/tree/blog-post-streaming/)
for the full source if you're interested.

## Chunked Streaming

The next step was to make sure my solution was reliable when receiving data in
inconsistent ways. So rather than chunking HTTP responses by each tweet, I made
the server _randomly_ chunk all the tweets, meaning multiple tweets could be in
a single chunk or it may take several chunks to finish a single tweet. As
expected, my implementation was very wrong. But it was wrong in _two_
interesting ways!

### Chunked Declarative Shadow DOM

The first problem I immediately saw was that tweet content is visually cut off
in weird ways:

![A screenshot of the Twitter clone implemented with HTML fragments. Five tweets
have already been streamed into the document. The first four look as expected,
but the last tweet is cut off. It only reads "Hello world" and does not include
an "Edit" button.](demos/4-chunked-dsd-fail.avif)(demos/4-chunked-dsd-fail.webp)(demos/4-chunked-dsd-fail.png)

Sure enough, the response was getting chunked right in the middle of the tweet's
declarative shadow DOM.

```html
<my-tweet>
    <template shadowroot="open">
        <link rel="stylesheet" href="/tweet.css">
        <span>Hello worl

<!-- Delay 250ms -->

d from tweet #1234.</span>
        <button>Edit</button>
    </template>
    <script src="/tweet.js" type="module" async></script>
</my-tweet>
```

Note that DOM structure can't represent half a tag, either you have a `<div />`
tag or you don't, there is no in-between. This means that when the browser
receives only the first chunk, it actually renders the content:

```html
<my-tweet>
    <template shadowroot="open">
        <link rel="stylesheet" href="/tweet.css">
        <span>Hello worl</span>
    </template>
</my-tweet>
```

Normally, this is fine, since the parser is aware of this behavior and will
update the DOM correctly once the rest of the content streams in. However, since
the `<template />` tag gets appended to `<my-tweet />`, it also triggers the
`MutationObserver` and my DSD polyfill, which clones and appends that content
directly under `<my-tweet />`. Doing so deletes the `<template />` tag, and any
future streamed content gets dropped. So you end up with this DOM structure in
the end:

```html
<my-tweet>
    #shadowRoot
        <link rel="stylesheet" href="/tweet.css">
        <span>Hello worl</span>
</my-tweet>
```

The problem here is that HTML streaming is applied as discrete DOM operations
with arbitrary pauses based on network activity. Once the next chunk arrives,
the browser will update the existing `<template />` tag with something like:

```typescript
dsdTemplate.textContent = '...';
```

However, there's no way to know when or _if_ that will ever happen. There's also
no mechanism for knowing when an HTML element is fully parsed, so we can never
be sure that we have the full `<template />` tag and all its contents.

### Chunk Web Component Upgrades

The second problem was that `this.shadowRoot` was sometimes `null` in
`connectedCallback()`. It took quite a bit of debugging, but the exact
case is when the browser receives a chunk which looks like this:

```html
<my-tweet>
```

And yeah, just that. As soon as the browser sees `>`, it creates a DOM element
for the node and appends it, so the DOM actually looks like:

```html
<my-tweet></my-tweet>
```

At this point, the element is connected to the document and invokes
`connectedCallback()`. But since the `<template shadowroot="open" />` node
hasn't been parsed yet, the shadow root hasn't been added either! This means any
work to be done on the shadow root _must_ be done lazily, even after
`connectedCallback()`.

This is a bit of pain for a developer, but you can work around it with getters
or other programming tricks. However, the use case which really stings is event
listeners. It's pretty common to see a pattern like this:

```typescript
class MyTweet extends HTMLElement {
    connectedCallback(): void {
        this.shadowRoot!.querySelector('button#edit')!
            .addEventListener('click', this.onEdit);
    }

    disconnectedCallback(): void {
        this.shadowRoot!.querySelector('button#edit')!
            .removeEventListener('click', this.onEdit);
    }

    // ...
}
```

However, this approach completely falls over when streamed because the shadow
root won't be attached until _after_ the node is connected. The network could be
arbitrarily slow and anything could happen to `<my-tweet />` after it is
attached. In fact, even `disconnectedCallback()` can be invoked before the
shadow root is attached if the JavaScript code chooses to remove it before any
more content is received from the server.

To make matters worse, as far as I could find, there is no hook or event which
triggers when the shadow root is attached, meaning there's no way to wait on it
before attaching event listeners.

This is particularly troublesome if you want to use this approach to build
"hybrid" components, ones which can render on the server and reuse that DOM on
the client, but also can render themselves completely client-side when
requested. The
[declarative shadow DOM explainer on web.dev](https://web.dev/declarative-shadow-dom/#hydration)
even specifically calls out a pattern which _directly conflicts_ with streaming
the component's contents:

```typescript
class MyTweet extends HTMLElement {
    constructor() {
        super();

        // WRONG! `this.shadowRoot` could be attached later
        // when the parser gets to the child `<template />`.
        if (!this.shadowRoot) {
            const shadow = this.attachShadow({ mode: 'open' });
            shadow.innerHTML = `<button id="edit">Edit</button>`;
        }

        this.shadowRoot.querySelector('button#edit')!
            .addEventListener('click', this.onEdit);
    }
}
```

Ignoring the fact that this uses `innerHTML` and attaches an event listener in
the constructor, it just doesn't work in a streaming use case.
`this.shadowRoot` will be `null` for an unspecified amount of time until the DSD
gets parsed and attached. If you call `this.attachShadow()` in the constructor,
then once the DSD downloads it will fail to attach because a shadow root already
exists on the element.

You also can't know if the element will ever receive a DSD and as I mentioned
earlier _there's no hook to know when the element is fully parsed!_

This problem technically exists if you eagerly load your custom element's JS and
then use DSD in your main HTML response. However as long as you use
`<script defer />` or `<script type="module" />` your JS will wait until all the
HTML is parsed, and this isn't an issue. It seems like the HTML fragments use
case just happens to fall into this rough edge of DSD streaming.

All of this effectively means - **it is really hard to write a web component
which is compatible with HTML fragment streaming**.

### Streaming Complete Chunks

My approach to these two problems is to change the streaming model for HTML just
a little bit. Traditionally, streamed HTML renders each node into DOM
immediately when the start tag is received by the browser and then continues to
append their contents as they arrive from the server until the end tag is
reached. This always struck me as a bit non-ideal, since it can easily show
content which isn't meant to be laid out or viewed without subsequent nodes.
This can cause of cumulative layout shift (CLS) for example if you've streamed
your main content into the page, but haven't streamed the right side panel just
yet and didn't account for that case in your CSS.

While non-ideal, I can understand that it's tricky for developers to communicate
to the browser when and how to stream different parts of the HTML document into
browser DOM. In the context of a streamed HTML fragment however, developers'
have a bit more context around the exact usage of this particular piece of DOM
and the best way to stream it.

Based around this, instead of appending empty nodes to the DOM and letting the
browser lazily fill them in, let's instead _wait_ until the node is fully parsed
and only _then_ append the completed node into the DOM.

This means the node is fully rendered to the DOM _before_ it is ever visible to
the user and the DSD operation can happen as a one-time transform over the DOM
with all the template contents and without risking splitting the template in
half.

But didn't I just say there's no way to know when a node is fully parsed? Well,
the node won't give you any signal, but its sibling will suddenly appear.
Consider this minimal example:

```html
<my-tweet id="1"></my-tweet>
<my-tweet id="2"></my-tweet>
```

`my-tweet#1` never signals that it is done parsing, _but_ a `MutationObserver`
can detect that `my-tweet#2` was appended to the DOM, and if the parser got to
the second tweet, it must have already full parsed the first one.

The tricky part with this strategy in general is that the DOM is a hierarchical
structure, not a linear one. Tracking when a deeply nested node is fully parsed
is quite tricky, and streaming intermediate nodes requires them to exist in two
different documents at the same time. It basically requires you to reimplement
HTML streaming in user-land, which I definitely don't want to do here.

However, in the context of streamed HTML fragment, we have root nodes in the
HTTP response which are much more amenable to this approach. As soon as
`my-tweet#2` is appended to the background document, detach `my-tweet#1` and
append it to the DOM! This provides an excellent time to apply the DSD polyfill,
knowing that the element is fully parsed. It also looks great as a user, since
there is only one repaint when a new tweet is fully received, no rendered
half-tweets!

This approach was never the intention of this design and it's kind of a hack to
workaround the lack of native DSD support in the streaming DOM APIs. However, I
actually like the end result a lot better and find it much easier to work with
as a developer.

## Custom element constructors and field initializers

We're not done yet though! I've got one more interesting behavior I discovered
along the way. Does anything look strange with this snippet?

```typescript
class UserComponent extends HTMLElement {
  public name?: string;
}
customElements.define('my-user', UserComponent);

const el = document.createElement('my-user') as UserComponent;
el.name = 'devel';
document.body.append(el);
console.log(el.name); // 'devel'

const doc = document.implementation.createHTMLDocument();
const el2 = doc.createElement('my-user') as UserComponent;
el2.name = 'devel';
document.body.append(el2);
console.log(el2.name); // undefined
```

Yes, you did read that right and I was just as perplexed! The second log
statement 
[_does_ in fact print `undefined`](https://stackblitz.com/edit/typescript-4atoam?file=index.ts).
Well, it does if you're using `target: 'ES2022'` or greater in your
`tsconfig.json`. This took me quite a while to wrap my head around and I had to
call in some air support from
[#WebComponents Twitter](https://tweets.dwac.dev/1571014530058321922/)
to figure it out. Let me explain.

### Class Fields Proposal

The [class fields proposal](https://github.com/tc39/proposal-class-fields) was
recently accepted into the ECMAScript (JavaScript) standard 🎉. This means it's
now valid JavaScript to write:

```typescript
class User {
    name = 'devel';
}
```

This used to be a purely TypeScript feature, but that is no longer the case. If
you use `target: 'ES2022'` (and don't set
[`useDefineForClassFields: false`](https://www.typescriptlang.org/tsconfig#useDefineForClassFields)),
then TypeScript will actually generate this as JS output.

### Omitted Initializers

However, initializers are optional and can be omitted. That means it is also
valid JS to write:

```typescript
class User {
    name;
}
```

`new User().name` will be left `undefined` as you might expect. What you might
not expect is that
[it is _assigned_ to `undefined`](https://github.com/tc39/proposal-class-fields#fields-without-initializers-are-set-to-undefined).
That means that regardless of whatever value it had before, it will _now_ be
`undefined`. This isn't typically easy to observe in practice, since
constructors generally _construct_ things from scratch. But you can see this by
extending a class and overriding a property:

```typescript
class User {
    name = 'devel';
}

class Employee extends User {
    name;
}

console.log(new Employee().name); // `undefined`.
```

You can also see this in custom elements because a custom element constructor is
invoked when a DOM element is _upgraded_ which can happen _after_ the element is
already constructed. This means you have an easy opportunity to put data on the
object before the constructor is invoked, and when it's invoked, any class
fields will be assigned to their initializer, including those without an
initializer.

```typescript
const el = document.createElement('my-user');
el.name = 'devel';
document.body.append(el);
console.log(el.name); // 'devel'

class UserComponent extends HTMLElement {
    name;
}
customElements.define('my-user', UserComponent); // Upgrading...

console.log(el.name); // undefined
```

This makes it look like defining my web component is _deleting_ a property on an
existing object! If that isn't a
["spooky action at a distance"](https://en.wikipedia.org/wiki/Action_at_a_distance_(computer_programming)),
I don't know what is!

Are you starting to the see the connection here? There's still one missing
piece. If TS in ES2022 generates JS class field initializers which cause custom
element upgrades to delete existing properties on an object, why isn't this a
_bigger_ deal? Web components supports lazy upgrades by design, wouldn't this
happen for all kinds of custom elements usage?

### Upgrade Timing

It turns out, no. Because usually a web component is upgraded immediately.
Recall the initial example, but now with an added log in the constructor:

```typescript
class UserComponent extends HTMLElement {
  public name?: string;

  constructor() {
    super();
    console.log('Constructed!');
  }
}
customElements.define('my-user', UserComponent);

const el = document.createElement(
    'my-user') as UserComponent; // Logs 'Constructed!'
el.name = 'devel';
document.body.append(el);
console.log(el.name); // 'test'

const doc = document.implementation.createHTMLDocument();
const el2 = doc.createElement('my-user') as UserComponent;
el2.name = 'devel';
document.body.append(el2); // Logs 'Constructed!'
console.log(el2.name); // undefined
```

Why does the first one work and the second one fail? Notice how the first case
is constructed at `document.createElement()` while the second one is constructed
at `document.body.append()`. The reasoning for this is because
`document.implementation.createHTMLDocument()` is considered _inert_, meaning
it's inactive and does not run scripts. This is similar to
[`HTMLTemplateElement.prototype.contents`](https://html.spec.whatwg.org/multipage/scripting.html#associated-inert-template-document).
After all, you wouldn't want a `<template />` tag to execute its contents, bind
event listeners, and corrupt your global page state. You expect to first _clone_
the `<template />` _and then_ have it corrupt your global page state.

Since `document` is _not_ inert, a new `my-user` node gets upgraded immediately
on creation. But since `doc` _is_ inert, it doesn't get upgraded until it is
"adopted" to an active document. This happens implicitly with
`document.body.append()` which invokes the constructor then.

These subtle timing differences mean construction is delayed until after
property initialization which results in any class fields being reset to
`undefined`. It's this weirdly specific combination of three completely
unrelated nuances:

1. TypeScript now generates JS class fields.
1. Class fields without initializers overwrite any existing data to `undefined`.
1. Inert documents don't upgrade custom elements on creation.

While debugging this was quite involved, the fix is relatively straightforward.
All we need to do is force the element to upgrade when we create it, prior to
setting any properties. We can do this by adopting the element into the main
document with either
[`document.importNode()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/importNode)
or [`document.adoptNode()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/adoptNode).

We can fix our original snippet by doing:

```typescript
class UserComponent extends HTMLElement {
  public name?: string;
}
customElements.define('my-user', UserComponent);

const doc = document.implementation.createHTMLDocument();
const el = doc.createElement('my-user') as UserComponent;

// Upgrades here.
const imported = document.importNode(el, true /* deep */);

imported.name = 'devel';
document.body.append(imported);
console.log(imported.name); // 'devel'
```

I won't pretend to understand the difference between `importNode()` and
`adoptNode()` because I honestly don't. All I understand is that `importNode()`
_copies_ its input while `adoptNode()` actually _moves_ the node by detaching it
from its current document and attaching it to the new document. Also it seems
that `importNode()` implicitly upgrades any custom elements while `adoptNode()`
does not and you need to manually call
[`customElements.upgrade()`](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/upgrade).

At least all we need to do to solve this is add `document.importNode()` to the
streaming HTML fragment implementation, so the fix was easy.

**But wait, there's more!**

### First HTML Fragment

`document.importNode()` only upgrades custom elements which are
_already defined_. It can't upgrade elements which have not been defined yet!

In the case of HTML fragments, a web component's definition is intended to be
self contained in its own fragment.

```html
<my-tweet>
    <template shadowroot="open">
        <link rel="stylesheet" href="/tweet.css">
        <span>Here is a tweet!</span>
    </template>

    <!-- `my-tweet` is defined here. -->
    <script src="/tweet.js" type="module" async></script>
</my-tweet>
```

This presents a bit of a paradox. Consider the following constraints:
1.  We can't set a property on the `<my-tweet />` node until _after_ the element
    is upgraded, or the property will be deleted on upgrade.
1. The first time `<my-tweet />` is appended to the DOM, it won't upgrade until
    `customElements.define('my-tweet', MyTweet);` is executed from the
    `<script />` tag.
1.  The `<script />` tag does not execute until _after_ `<my-tweet />` is
    appended to the DOM.

There is simply no convenient opportunity to set properties on a streamed custom
element. You _have_ to append it to the DOM, wait for the script to be executed,
and only _then_ set the properties you want on a element.

My solution to this is a `preloadScripts()` function which finds all
`<script />` tags in the fragment and appends them to the DOM to execute them
and wait for their completion. This is definitely a hack, but
[as I mentioned in the last post](/posts/html-fragments#custom-elements),
[HTML modules](https://github.com/WICG/webcomponents/blob/c351fc9/proposals/html-modules-explainer.md)
should be able to fix this particular issue. Basically, you use it like this:

```typescript
import { streamDomFragment, preloadScripts } from './dom.js';
import type { MyTweet } from './tweet.js';

const res = await fetch('/tweets');
for await (const fragment of streamDomFragment(res)) {
    // `fragment` is a new `Fragment` type, holding the
    // contents of the HTML fragment. Important this is
    // *not* a `Node`; it can't be used in the DOM directly.

    // const tweet = fragment.cloneContent() as MyTweet;
    // WRONG! While we can clone the HTML fragment like a
    // `HTMLTemplateElement`, we shouldn't cast it to
    // `MyTweet` because that script hasn't executed yet.
    // Any setters or methods defined in that class aren't
    // loaded and can't be used yet.

    // Execute the `<script />` tags in the fragment to make
    // sure any custom elements are defined. `MyTweet` is
    // upgraded here.
    await fragment.preloadScripts();

    // RIGHT! Cast is valid *now* since `MyTweet` is defined.
    // Setters and methods are functional now.
    const tweet = fragment.cloneContent() as MyTweet;

    document.getElementById('my-tweet-list').append(tweet);
}
```

My suggestion is that whenever you use an HTML fragment as a pre-rendered web
component, you should _always_ call `preloadScripts()` before casting to that
web component's type.

`streamDomFragment()` _could_ do that automatically, but I don't think it
actually should because any other side effects in the script would be applied
_before_ its containing fragment is actually in the document. For example, you
could not do:

```html
<div>
    <button id="hi">Say hi!</button>
    <script>
        // Error: `document.getElementById('hi')` is `null`
        // because it's executed in `preloadScripts()`, prior to
        // the `<button />` being appended to the DOM.
        document.getElementById('hi').addEventListener('click', () => {
            alert('Howdy!');
        });
    </script>
</div>
```

The framework designer in me wants to make a separate `streamWebComponents()`
API which assumes / asserts that you're streaming custom elements and
auto-preloads scripts to reduce the likelihood of misuse, but this is all
experimental so let's not overthink it just yet.

Alternatively you can use `target: 'ES2020'` or earlier. You can also set
`useDefineForClassFields: false` to tell TypeScript not to generate real JS
class fields, but those both seem like short term solutions given that
TypeScript is just mimicking JavaScript behavior. HTML modules would codify the
right behavior in my opinion, and I think that's the long term fix for this
issue. Although figuring out how to make that work with this kind of streaming
model is a entirely new scale of problem.

## Conclusion

Whew! That's a lot of nonsense to get through, but in the end we have a very
smooth Twitter clone which can stream tweets with only the snippet:

```typescript
import { streamDomFragment } from './dom.js';

const tweetsList = document.querySelector('ul#tweet-list');
const streamTweetsBtn =
    document.getElementById('streamTweetsBtn');

streamTweetsBtn.addEventListener('click', () => {
    // Fetch an HTML fragment of multiple tweets.
    const res = await fetch('/tweets');
    if (res.status() >= 400) throw new Error('...');

    // Stream the results.
    for await (const tweet of streamDomFragment(res)) {
        // Each time we receive a tweet, wrap it in an
        // `<li />` tag and append it to the list.
        const li = document.createElement('li');
        li.append(tweet);
        tweetsList.append(li);
    }
});
```

```video
{
    "type": "demo",
    "urls": ["demos/3-list-stream.mp4"],
    "size": [1280, 720]
}
```

I'd say that's mission accomplished.

There are a few details I skipped over. For example, did you know that a
[`ShadowRoot`](https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot)
can't be cloned? This required some hacks to clone the declarative shadow DOM in
an HTML fragment _before_ it gets converted to a real `ShadowRoot`.

I learned quite a few interesting things here:

* `document.implementation.createHTMLDocument()` allows you to manually stream
  HTML.
* You can't stream the way HTML normally streams because DSD and `<script />`
  tags aren't natively supported and aren't feasible to implement in user-space.
* You also probably don't _want_ to stream in the typical manner because the web
  component lifecycle becomes untenable.
* You _can_ stream by waiting for individual top-level elements, and this
  actually works out much more conveniently for developers.
* TypeScript now generates JS class fields in ES2022+.
* JS class fields without initializers can "delete" data from an existing
  object.
* Web components parsed from another document get upgraded too late and lose any
  assigned properties.
* The HTML fragments pattern loads custom element definitions _after_ appending
  them to the DOM, making property initialization much more difficult.
* All these points combined lead to a lot of pain and suffering...

You can check out the
[full source code on GitHub](https://github.com/dgp1130/html-fragments-demo/tree/blog-post-streaming/)
and play around with it.
[Let me know what you think](https://techhub.social/@develwithoutacause/) or try
it out yourself!

I was expecting this project to only take a couple hours and 3 weeks later, I
think it _may_ have fallen a little out of hand. But I know just the solution...

🛫🏖️🛌
