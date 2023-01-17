---
tags: posts
layout: pages/post
title: HTML Fragments Routing
date: 2023-01-24T12:00:00-07:00
excerpt: |
    Let's build a router by fetching each route as an HTML
    fragment!
languages: [ html, typescript ]
---

# HTML Fragments Routing

```timestamp
```

Another blog post about [HTML fragments](/posts/html-fragments/) for you. If you
haven't read the [previous](/posts/html-fragments/)
[ones](/posts/streamable-html-fragments/), I suggest you do because they are
really interesting and probably the most popular thing on this blog right now.
Tens of people can't be wrong about something like that!

For those of you that didn't click the links above 😢, the TL;DR: for HTML
fragments is basically "What if servers just rendered a single,
fully-encapsulated component. Could we use that on the client without any
special integration or tooling?" In practice this looks like serving:

```html
<my-counter>
    <template shadowroot="open">
        <div>The current count is: <span>5</span>.</div>
        <button id="decrement">-</button>
        <button id="increment">+</button>

        <style>:host { display: block; }</style>
        <script src="/my-counter.js" type="module"></script>
    </template>
</my-counter>
```

And then requesting and appending it to the DOM like so:

```typescript
import { parseDomFragment } from './see-html-fragments-post.js';

const response = await fetch('/my-counter/');
const fragment = await parseDomFragment(response);
document.body.appendChild(fragment.cloneContent());
```

Well at some point I got the idea: "What if servers just rendered a single
**route**? Could we use that on the client without any special integration or
tooling?" This is essentially trying to build a router on top of HTML fragments,
where clicking a link fetches _just the page content_ as an HTML fragment and
then performs a same page navigation by replacing the current page content with
the result.

Most web sites have a singular "frame" around the main content of its pages. The
frame includes the header, navigation, sidebar, footer, login status, and more.
However the only thing which meaningfully changes between routes is the core
page content, usually the stuff inside the `<main>...</main>` element. So let's
define the page content as an HTML fragment which can be rendered independently
by the server. Is it possible for the client to use this and perform same-page
navigations, allowing full server-side rendering in single-page applications?

The initial navigation works just like always, the browser requests a page and
gets both the page "frame" and its content. However on subsequent navigations,
the browser should only request the _content_ of the new page, not including the
frame. That content is then swapped in to the existing page, keeping all the
existing JavaScript state and reusing the existing frame from the first request.

![A sequence diagram demonstrating a browser requesting the index page of a
website, where the server returns the full page HTML content. The user then
clicks a link and the browser requests the `/about/` page. The server only
returns `<p>About me...</p>`, not the full HTML page.](./sequence-diagram.svg){class="large"}

## Example Router

This problem space is roughly broken up into three areas we need to handle:
1.  Serve only page content when requested.
1.  Create a router component.
1.  Render a page with the router.

### Server-side Rendering

If the user visits `/home` in their browser, the server will receive a request
for `/home` and it needs to interpret that as the initial navigation. However,
when the user performs a same-page navigation to `/about`, the router only wants
the main page content. The user could also visit these pages in the opposite
order, starting at `/about` and then navigating to `/home`. In either case, the
application should do a full page render for the first route, and then all
subsequent routes should be done using the HTML fragment of the new route's
content.

This means we need the server to support rendering a page in both contexts. It
must render the full page for the initial browser navigation, but then all
subsequent same-page navigations need to only return the page content. This is
extra complicated because once the user has performed a same-page navigation to
`/about`, they may refresh the page and the browser will expect to receive the
full page and its frame from scratch.

We can implement this through many different mechanisms, but the most
straightforward one is a query parameter. In this example, let's set up the
server to check for a `?fragment` query parameter and use that to decide what
it's output should be. If the `?fragment` query parameter is set, the server
will return only the page's main content, without the frame. If the `?fragment`
query parameter is missing, then it must be the browser's initial navigation and
the full page including the frame is needed.

```typescript
function serveAboutPage(request: Request): Response {
    const isRequestingFragment =
        new URL(request.url).searchParams.has('fragment');
    if (isRequestingFragment) {
        // Only return the about page's main content.
        return new Response(renderAboutContent());
    } else {
        // Return the full page, include the frame.
        return new Response(
            renderPageFrame(renderAboutContent()));
    }
}
```

### Router Component

The next problem is that we need to build a router aware of HTML fragments which
understands how to use the `?fragment` query parameter. This is mostly tackled
by a `BaseRouter` custom element class. We can extend this class and then
override the `route()` method to fetch a new route from the server and return it
as a `DocumentFragment`. This allows us to specify how to translate a route into
the fragment displayed to the user, and gives an opportunity to use the
`?fragment` query parameter.

```typescript
import { parseDomFragment, BaseRouter, Route } from './dom.js';

/**
 * Application router. Requests all routes with the
 * `?fragment` query parameter.
 */
class Router extends BaseRouter {
    /** Fetch a `Route` from the server and return it's fragment. */
    protected override async route(route: Route):
            Promise<DocumentFragment> {
        const url = new URL(route.toString(), location.href);

        // Tell the server to only respond with the page's
        // contents, not the full page.
        url.searchParams.set('fragment', '');

        // Request the HTML fragment and return it to the
        // base router.
        const res = await fetch(url);
        const frag = await parseDomFragment(res);
        return frag.cloneContent();
    }
}

// Don't forget to define the custom element!
customElements.define('my-router', Router);
```

This router translates a given route into a network request to the server which
returns the HTML fragment to use. Most of this is boilerplate could _almost_ be
entirely done by `BaseRouter`. However, we need this hook in order to provide
the `?fragment` query parameter, since `BaseRouter` does not have knowledge of
the server or any of its semantics.

### Rendering the Router

Now that we have a custom element defining our router, we need to render it in
the page. The router requires a `<router-outlet>` element to be somewhere in its
descendants where content will be swapped out on navigation. Also, it only
captures navigations from links in its descendants, though they do not _have_ to
be under the `<router-outlet>`. In practice, this might look like:

```html
<!DOCTYPE html>
<html>
    <head>
        <script src="/my-router.js" type="module"></script>
    </head>
    <body>
        <my-router>
            <!-- Router handles navigation from these links. -->
            <nav>
                <ul>
                    <li><a href="/">Home</a></li>
                    <li><a href="/about">About</a></li>
                    <li><a href="/contact">Contact us</a></li>
                </ul>
            </nav>

            <main>
                <!-- `<router-outlet>` gets swapped out
                    on navigation. -->
                <router-outlet>
                    <!-- Don't forget to render the initial
                        page the user is actually on! -->
                    <h2>Welcome to the home page!</h2>
                </router-outlet>
            </main>
        </my-router>
    </body>
</html>
```

And with that everything is set up! When the user clicks on a link, it will
request an HTML fragment containing that page's content, and then swap it into
the `<router-outlet>`.

```video
{
    "type": "demo",
    "urls": ["demos/1-about.mp4"],
    "size": [1920, 1080]
}
```

## Demo

You can play with this yourself in a real, running demo below, or [open it in a
new tab][Demo]. Bring up DevTools and look at the network tab to see what data
is being transferred on the initial page load, vs subsequent same-page
navigations.

```demo
{
    "src": "https://html-fragments-routing-demo.dwac.dev/",
    "title": "Demo routing application"
}
```

You can check out the full source code on the [GitHub repository][Repo]. Note
that the "server-side rendering" logic is actually implemented in a
[service worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers),
not a real server. [More on that later.](#service-worker-server)

## Additional Features

A few cool features this router provides:

### Self-contained Components

HTML fragments already support rich, fully self-contained, and server-side
rendered web components. This means a route fragment can contain its own
implementation which gets dynamically loaded into the page when needed. In this
example, we have a counter object which gets its initial state server-side
rendered (initial value of 5) and can be modified via its buttons. This element
was not loaded onto the page previously, but instead is dynamically loaded once
it is rendered by the router.

```video
{
    "type": "demo",
    "urls": ["demos/2-counter.mp4"],
    "size": [1920, 1080]
}
```

### Caching

When a same-page navigation occurs, the new route is fetched and displayed while
the old route is removed from the DOM. That old route is kept in a cache and
reused if the user navigates back to that page, whether through the back and
forward buttons, or clicking the links again. No need to request the route a
second time!

```video
{
    "type": "demo",
    "urls": ["demos/3-cache.mp4"],
    "size": [1920, 1080]
}
```

### Maintaining State

Because web components tend to store their own state and the router caches
previously-visited routes, it also means that any state held by those components
is retained between navigations. For example, the counter remembers the current
count even when the user navigates away, and then navigates back. This didn't
require any special effort to support, either by `BaseRouter` or the
application's `Router` class, it just happened naturally.

```video
{
    "type": "demo",
    "urls": ["demos/4-cached-counter.mp4"],
    "size": [1920, 1080]
}
```

## Streaming

Since [I didn't learn my lesson last time](/posts/streaming-html-fragments/), I
decided to try adding HTML streaming support to this router, how hard could that
be?

There are a few important requirements I wanted to cover:
1.  Application router classes should be able to stream HTML fragments.
1.  If the user navigates while content is still streaming, that streaming
    should continue in the background.
1.  The initial page navigation should be streamed into the router. If the user
    navigates while that content is still streaming, it should also continue to
    stream that content in that background.

The most straightforward case is to render a streaming list of top-level
elements, so let's consider a simplified case of two elements streamed with a
delay between them.

```html
<div id="1">Hello from line #1.</div>
<!-- Wait 1 second. -->
<div id="2">Hello from line #2.</div>
```

We'll also ignore that HTML fragments streaming actually [needs to receive a bit
of line 2 on the client before it can render line
1](https://techhub.social/@develwithoutacause/109692050991403622), that's just
not important here.

We can implement this API in the router by returning an `AsyncGenerator<Node>`,
which is already the case for the HTML fragments streaming API. This looks like:

```typescript
import { streamDomFragment, BaseRouter, Route } from './dom.js';

class Router extends BaseRouter {
    /** Implement `route()` as an `AsyncGenerator`. */
    protected override async *route(route: Route):
            AsyncGenerator<Node, void, void> {
        const url = new URL(route.toString(), location.href);

        // Tell the server to only respond with the page's
        // contents, not the full page.
        url.searchParams.set('fragment', '');

        // Use `streamDomFragment()` and yield each node.
        const res = await fetch(url);
        for await (const frag of streamDomFragment(res)) {
            yield frag.cloneContent();
        }
    }
}

// Don't forget to define the custom element!
customElements.define('my-router', Router);
```

Things work as expected. Each line streams individually and is displayed
immediately. You can even navigate among the other routes and the content will
continue to stream in the background.

```video
{
    "type": "demo",
    "urls": ["demos/5-streaming.mp4"],
    "size": [1920, 1080]
}
```

However, there are two non-obvious problems that arise.

### Mutating a Streaming Document

The previous demo started on the home page and did a same-page navigation to the
streaming page. This means the router is requesting the HTML fragment from the
server and streaming it into its `<router-outlet>`. This is use case 1.
mentioned above. However, on my first attempt, this broke down for use case 3.,
where we start on the streaming page and navigate away. Streaming ended up
appending to the new route!

```video
{
    "type": "demo",
    "urls": ["demos/6-streaming-to-wrong-route.mp4"],
    "size": [1920, 1080]
}
```

The reason for this is that on an initial navigation the browser itself is
controlling the streaming, yet a subsequent navigation to a new route causes the
router to mutate the DOM _while_ the browser is still streaming the initial
navigation. When the first line streams in, the DOM looks like:

```html
<router-outlet>
    <div id="1">Hello from line #1.</div>
</router-outlet>
```

Then, the user triggers a navigation, the `<div>` is swapped out and moved into
the cache, while the outlet now renders the new page.

```html
<router-outlet>
    <h2>Hello from the home page!</h2>
</router-outlet>
```

But the stream from the initial navigation continues. While `div#1` has been
removed, the `<router-outlet>` still exists, so the browser will append `div#2`
to it, even though its content has changed. The HTML parser keeps a reference to
the parsed parent node. As child nodes are parsed, they are appended to that
parent node, regardless of where that parent is or how it has changed since it
was parsed. This means you end up with:

```html
<router-outlet>
    <h2>Hello from the home page!</h2>
    <div>Hello from line #2.</div>
</router-outlet>
```

We've now corrupted the home route with content from streaming route. Our
self-driving car missed the turn coming in to the neighborhood and is going
straight into a river! AAAAAAAH!

Since this streaming behavior is implemented by the browser, the router cannot
control it. We can't _prevent_ the browser from appending streamed content to
the `<router-outlet>` after a navigation. Instead, the solution is to accept
that behavior and use it to our advantage.

The original implementation "swapped out" the route content by removing all the
child nodes from the `<router-outlet>` element and appending new ones. This is
how `div#1` got removed and the `<h2>` tag got added. However, because the
`<router-outlet>` is unchanged, it continues receiving streamed content from the
initial navigation by the browser. We can actually fix this by removing
`<router-outlet>` along with `div#1` and putting it into the cache. The browser
doesn't actually care that `<router-outlet>` is even attached to the DOM, it
will continue to stream new content into it. So if we cache the
`<router-outlet>` directly, all subsequently streamed content will be appended
to that cache, not the DOM displayed to the user.

This means we actually need to create a new `<router-outlet>` for the home page.
In fact, each route gets its own parent `<router-outlet>` element and these
nodes are replaced with each other whenever the page changes. That is a bit of a
strange way to use an outlet in my opinion and I would naively expect the outlet
to remain unchanged between routes. However swapping out the outlet allows this
streaming behavior to work as expected.

```typescript
// Wrong! Streamed elements from the old route will continue
// to append to `outlet`!
function swapPageContentBad(
        outlet: Element, newContent: DocumentFragment): void {
    const cacheFragment = document.createDocumentFragment();
    cacheFragment.append(...outlet.childNodes);
    addToCache(cacheFragment);

    outlet.append(...newContent.childNodes);
}

// Right! `outlet` is moved into the cache. Streamed elements
// from the old route will append to `outlet`, not `newOutlet`!
function swapPageContentGood(
        outlet: Element, newContent: DocumentFragment): void {
    const newOutlet = document.createElement('router-outlet');
    newOutlet.append(...newContent.childNodes);
    outlet.replaceWith(newOutlet);
    addToCache(outlet);
}
```

Ultimately `BaseRouter` will manage this automatically as part of its cache, so
there's nothing you as a user of this router need to worry about here. I just
thought it was an interesting enough bug to talk about here and I hope it led to
understanding HTML parsing just a little bit better.

### Streaming a Single Root Element

The second problem you do have to worry about. Let's restructure the streamed
content to be a little more "semantic" and use HTML list elements.

```html
<ul>
    <li><div id="1">Hello from line #1.</div></li>
    <!-- Wait 1 second. -->
    <li><div id="2">Hello from line #2.</div></li>
</ul>
```

Load this route in the initial navigation and it will stream just fine. But load
a different route first, then navigate to this one, and you'll see it "stream"
in one big chunk. That's not how it's supposed to work!

```video
{
    "type": "demo",
    "urls": ["demos/7-streaming-single-chunk.mp4"],
    "size": [1920, 1080]
}
```

The problem here is that the browser and HTML fragments use very different
streaming models. The browser on the initial page navigation has no problem
streaming an entire document, conceptualized as a single root node with
descendants. However, HTML fragments use a different approach based on
[streaming top-level nodes](/posts/streamable-html-fragments/#streaming-complete-chunks).
Each node and all its descendants are fully parsed before they are appended to
the DOM. This is different from the browser, which will append a node as soon as
its open tag is parsed and then continue to append to that node as its children
are parsed.

This incompatibility is an issue here, because there is only one top-level
element, the `<ul>` tag! While the fragment can be streamed, it can't display
anything until the `</ul>` close tag is parsed, meaning we have to wait the full
second before we can even display `div#1`.

We could drop the `<ul>` and just render the `<li>` tags, this way we have
multiple top-level nodes to stream.

```html
<li><div id="1">Hello from line #1.</div></li>
<!-- Wait 1 second. -->
<li><div id="2">Hello from line #2.</div></li>
```

But these `<li>` tags will be rendered directly into the `<router-outlet>`
without a `<ul>` parent, which
[isn't valid HTML](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/li).

In my original streaming post, I tackled this problem by [rendering the `<ul>`
and `<li>` tags client side](/posts/streamable-html-fragments/#conclusion),
since `streamDomFragment()` returns an `AsyncGenerator` which can be composed,
so let's try that. We'll let the server return the items in the previous format
without a `<ul>` or `<li>` tag and instead render those directly in the router.

```typescript
import { streamDomFragment, BaseRouter, Route } from './lib/dom.js';

class Router extends BaseRouter {
    protected override async route(route: Route):
            Promise<DocumentFragment> {
        const url = new URL(route.toString(), location.href);
        url.searchParams.set('fragment', '');
        const res = await fetch(url);

        // Create a `DocumentFragment` and append a new
        // `<ul>` tag to it.
        const frag = document.createDocumentFragment();
        const list = document.createElement('ul');
        frag.append(list);

        // Stream content in the background and wrap each
        // top-level node in an `<li>` and append it to the
        // `<ul>` element.
        (async () => {
            for await (const node of streamDomFragment(res)) {
                const listItem = document.createElement('li');
                listItem.append(node.cloneContent());
                list.append(listItem);
            }
        })();

        // Return the fragment with only its initial content
        // for now. As more streams in, we'll asynchronously
        // update the fragment via the above IIFE.
        return frag;
    }
}

customElements.define('my-router', Router);
```

This does stream as expected. Open the home page and navigate to the streaming
route and the `<ul>` element is created immediately, while `<li>` tags are added
as the content is streamed in. However, refresh on the streaming page you'll
see that the `<ul>` and `<li>` are completely missing!

```html
<!DOCTYPE html>
<html>
    <body>
        <router-outlet>
            <!-- No `<ul>` or `<li>` tags! -->
            <div id="1">Hello from line #1.</div>
            <div id="2">Hello from line #2.</div>
        </router-outlet>
    </body>
</html>
```

Since we're rendering those elements in the router on the client, the initial
page load won't have them, how inaccessible of us!

The core reason for this discrepancy is that HTML fragments doesn't stream the
same way a browser does natively. Browsers stream a complete HTML document, a
hierarchy of nodes. Meanwhile HTML fragments stream a list of independent nodes.
Rendering the `<ul>` tag on the server breaks HTML fragments, but _not_
rendering the `<ul>` tag breaks browser streaming on the initial navigation.

The only way to resolve this discrepancy is to render the two cases differently.
We need the `<ul>` tag for the initial render of a streaming route, but omit the
tag for a fragment render of the same route. The sever can do this based on the
`?fragment` query parameter:

```typescript
function serveStreamingPage(request: Request): Response {
    const isRequestingFragment =
        new URL(request.url).searchParams.has('fragment');
    if (isRequestingFragment) {
        // For fragment requests, just stream the `<div>` tags.
        // `Response` actually requires a `ReadableStream`,
        // not an `AsyncGenerator`, but please forgive my sins.
        return new Response(streamItems());
    } else {
        // For full page requests, wrap the `<div>` tags in
        // the `<ul>` and `<li>` tags.
        return new Response(
            renderPageFrame(renderList(streamItems())));
    }
}

async function* streamItems(): AsyncGenerator<string, void, void> {
    yield '<div id="1">Hello from line #1.</div>';
    await timeout(1_000);
    yield '<div id="2">Hello from line #2.</div>';
}

async function* renderList(items: AsyncGenerator<string, void, void>):
        AsyncGenerator<string, void, void> {
    yield '<ul>';
    for await (const item of items) {
        yield `<li>${item}</li>`;
    }
    yield '</ul>';
}
```

In combination with the client-side list rendering in the router, this does
actually work in both cases. All the streaming requirements are satisfied.

```video
{
    "type": "demo",
    "urls": ["demos/8-streaming-list.mp4"],
    "size": [1920, 1080]
}
```

The downside of this is that it duplicates list rendering in two places which
can easily fall out of sync and result in very hard to find bugs. It's also two
different code paths to test, further adding to the complexity.

### Router Loading Timing

One other very minor caveat is that in order to meet requirement 3. (initial
page load followed by a navigation should continue streaming in the background),
we need to make sure the router JavaScript is not blocked on rendering. For
example consider the following document:

```html
<!DOCTYPE html>
<html>
    <head>
        <script src="/router.js" type="module"></script>
    </head>
    <body>
        <my-router>
            <!-- ... -->
        </my-router>
    </body>
</html>
```

This has a bug, or at least a confusing behavior. If we load this page initially
and then click a link to navigate while streaming, then navigate back to the
initial page, the stream restarts. It's not preserved!

The reason for this is actually `type="module"`. ES module scripts are
[implicitly `defer`-ed](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-defer).
Deferred scripts execute after the full document has been downloaded and parsed,
meaning it won't execute until _after_ the page is fully loaded. By clicking a
link during streaming, the user is triggering a navigation before the `Router`
class has been defined or the `my-router` custom element has been upgraded. As a
result, the timeline of events looks like:

1.  User navigates to `/streaming`.
1.  Browser begins downloading the page and streaming it into the document.
1.  Browser sees `<script src="/router.js" type="module"></script>`, defers the
    script and does not execute it.
1.  User clicks a link to `/home`.
1.  `my-router` has not been defined yet, so the browser handles the navigation.
1.  Browser navigates to `/home` and makes a full page request to the server.
1.  Browser sees a new `<script src="/router.js" type="module"></script>`,
    defers the script and does not execute it.
1.  The `/home` page finishes downloading, deferred scripts are executed.
1.  `/router.js` is executed and `my-router` is defined.
1.  User clicks a link back to `/streaming`.
1.  `my-router` intercepts the click and performs a same-page navigation to
    `/streaming`.
1.  `/streaming` is not in the fragment cache, so a new HTML fragment request is
    sent to the server, restarting the stream.

Ironically this is exactly the right fallback behavior to use in cases where the
router is failing or slow to load and results in the ideal user experience. Most
users likely wouldn't notice that the stream was lost, and if the original route
didn't use streaming, it wouldn't really be observable to the user at all. There
would only be a small performance hit because the user has to re-download the
whole page, rather than just the new route. Any user data held in page memory
would be lost, but in such a situation the router hasn't loaded yet anyways, so
the user probably hasn't input any information which could be lost by doing a
hard navigation.

That said, we would still want to load the router as soon as it can for
streaming use cases. To fix this behavior we need to avoid blocking `/router.js`
on fully parsing the document. We can do this by adding
[`async`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-async)
to the script:

```html
<script src="/router.js" type="module" async></script>
```

I'd known about this attribute for a while but don't think I really understood
it until now. `defer`, and by extension `type="module"`, pushes out script
execution until the page is fully parsed, meaning they will never execute on a
document while it is still streaming. In practice, I think this is usually what
you want. It's good for the user and also means that as a developer you don't
need to worry about cases where the document isn't fully downloaded (no need to
listen for `DOMContentLoaded`).

`async` means that the script is executed _as soon as it is downloaded_. An
`async` script does _not_ block HTML parsing like a plain `<script>` tag does,
but also HTML parsing does _not_ block `async` scripts like it blocks deferred
scripts. Marking the router `async` means that it will execute even before the
page is fully downloaded if it happens to download first, meaning it can catch
events which happen during streaming.

I think what confused me about `async` is that it actually makes deferred
scripts execute _sooner_, but makes non-deferred scripts execute _later_. Either
of these outcomes would be easy to understand in isolation, but the conflicting
timing effects from the same attribute make it a bit harder to understand as a
singular concept. Hopefully this helps explain when and where you would want to
use `async`.

Alternatively, if you're not using native ES modules you can drop
`type="module"` and make the `<script>` block the parser to force `my-router`
to load first. Although that would slow down parsing and degrade the user
experience causing [Alex Russel](https://infrequently.org/) to inject 50MBs of
JavaScript into your dreams, so maybe _don't_ take that approach. 😉

I think that's enough about streaming. The takeaway is that it works, it just
has some nuances to keep in mind.

## Limitations

Beyond that, it is important to remember that this router just a
proof-of-concept and is not fully-featured. There are plenty of features this
router would need to be viable in scalable production application:

*   The fragment cache currently grows unbounded on each navigation. If the user
    navigates through a large number of product pages, they would continually
    grow the cache until their browser ran out of memory.
*   Fragments requests are never canceled and instead work under the assumption
    that they should download in the background in case the user wants to return
    to that route. Ideally there would be some way to decide when to cancel the
    request and restart it on a return navigation.
*   Lots of other standard router features aren't included, such as:
    *   Route guards.
    *   404 routes.
    *   Route redirects.
*   Currently the router captures all descendent link clicks to trigger
    same-page navigations. I doubt this is the right mechanism, but it was good
    enough for this demo.
*   All the routing logic is centralized directly in the router. There is no
    directly supported way to split this logic per-route.

Hopefully this is an interesting demo, but there is a reason I didn't publish
this as an immediately usable NPM package. So maybe leave it as just a demo for
now.

All that said, thank you for joining me on this journey and I hope you learned
something along the way. Check out the [running demo][Demo] to see everything in
action or look at the [GitHub repository][Repo] for the source code.

## Service Worker Server

**Bonus mini blog post:** While developing this demo, I wanted to ship a
deployed version for readers to play around with, so they wouldn't have to clone
the repository and run a local build. Unfortunately, the demo is all about
server-side rendering, and I was too cheap to pay for a real, everlasting server
to run a demo for a single blog post. Sorry, you're just not worth a $5/month
charge for the rest of my life.

So instead, I decided to host the server _inside a
[service worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)_.
This means the initial page load downloads a static page which serves the sole
purpose of registering a service worker, and then triggers a refresh. That
refresh goes to the service worker, which applies all the server-side rendering
logic for the real application. It's like SSR, but everything happens client
side. This particular server implementation is also aware of the `?fragment`
query parameter, and implements it for you.

[Building a server looks like:](https://github.com/dgp1130/html-fragments-routing-demo/blob/blog-post/src/app-server.ts)

```typescript
import { ServiceWorkerServer } from './sw-server.js';

/** Render the full page frame around the given page content. */
function renderFrame(_req: Request, content: string): string {
    return `
<!DOCTYPE html>
<html>
    <head>
        <script src="/my-router.js" type="module" async></script>
    </head>
    <body>
        <my-router>
            <nav>...</nav>
            <main>
                <router-outlet>${content}</router-outlet>
            </main>
        </my-router>
    </body>
</html>
    `.trim();
}

function renderHome(): string {
    return '<h2>Hello from the home page!</h2>';
}

function renderAbout(): string {
    return `<h2>Hello from the about page!</h2>`;
}

/**
 * Build the application server from all routes. Automatically
 * handles `?fragment` and calls `renderFrame` appropriately.
 */
const server = ServiceWorkerServer.fromRoutes(
    renderFrame,
    // Map of routes. Any requests not in these routes are
    // proxied to the actual backend. Meaning static files
    // like JS, CSS, or images still load as expected.
    new Map(Object.entries({
        '/': renderHome,
        '/about/': renderAbout,
    })),
);

// Proxy all outgoing browser requests through the server.
self.addEventListener('fetch', (event) => {
    event.respondWith(server.serve(event.request));
});
```

There's also the small
[bootstrap script](https://github.com/dgp1130/html-fragments-routing-demo/blob/blog-post/src/index.ts)
which is needed to register the service worker and reload the page. This exists
in a static HTML page which is hosted on a CDN.

```typescript
await navigator.serviceWorker.register('/service-worker.js', { type: 'module' });

location.reload();
```

You can observe this in the network tab, especially if you uninstall the service
worker or set it to automatically update on reload. For the purposes of this
demo you can mostly ignore it, and just pretend the service worker is a real
server.

I don't see a lot of value in SSR-ing from a service worker outside of
self-contained SSR demos. If I find myself using it a lot, maybe I'll make a
real library for it. Although thinking about it, [shipping a service worker in a
web bundle could lead to a truly serverless web
application](https://tweets.dwac.dev/1571759598910214144/)... No, nope, not
gonna happen. I don't have time to follow that rabbit hole right now. There's
been too many divergences already and we gotta wrap this up.

The point is that by ~ab~using a service worker like this, I can effectively
host a server-side rendered application on a static CDN. And since Netlify gives
free hosting for static sites, that's $5/month I no longer have to pay! Now if
you'll excuse me, I'll be off enjoying my $5.

```video
{
    "type": "gif",
    "urls": ["make-it-rain.mp4"],
    "size": [640, 360]
}
```

[Demo]: https://html-fragments-routing-demo.dwac.dev/
[Repo]: https://github.com/dgp1130/html-fragments-routing-demo/
