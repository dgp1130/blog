---
tags: posts
layout: pages/post
title: A Simpler HTML-over-the-Wire
date: 2022-03-19T12:00:00-07:00
excerpt: |
    Is it possible to build an HTML-over-the-wire application with only native
    web technologies? See how far can we go with zero custom tooling, and how
    the web specification can change to support it.
languages: [ html, typescript ]
additional_styles: [ tweet ]
---

# A Simpler HTML-over-the-Wire

```timestamp
```

Recently, I was listening to some debate about client-side rendering (CSR) vs
server-side rendering (SSR) and struggling with how to choose which approach is
best for a particular project. This decision has very far reaching implications
with complex trade offs. CSR often leads to unnecessary tooling complexity with
significant performance implications. However, SSR can limit certain dynamic
experiences on the client. Splitting the difference sounds nice, but often ends
up as the worst of both worlds, having to either duplicate logic between the
client and server or support both platforms within the same codebase.

This question is particularly challenging for use cases which straddle the line.
Take [Twitter](https://twitter.com/) as an example. It just shows a bunch of
static tweets and seems like a great candidate for SSR. That is, until the
product manager comes to you and asks for infinite scrolling, or the ability to
edit a tweet. Neither of these are particularly complicated, but they both
require rendering a tweet after the initial page load , which is a problem for
an SSR-committed application. You either need to commit to a full page reload,
which the PM will never agree to, or you have to CSR the tweet component. Even
if all the stakeholders agree today that Twitter should be totally static and
give a green light to an SSR architecture, we can never know what tomorrow's
requirements will bring.

What I wanted was not so much a silver bullet architecture or framework that
addresses every use case, but rather something which does not require me to
commit to either SSR, CSR, or a hybrid of the two. Is there a way we could keep
things low-commitment and easily changeable? I came out with this thought:

```tweet
{
  "url": "https://tweets.dwac.dev/1452082837075607553/",
  "author": "Doug Parker",
  "username": "develwoutacause",
  "avatars": [ "/res/img/profile.avif", "/res/img/profile.webp", "/res/img/profile.jpg" ],
  "avatarDimensions": [200, 200],
  "timestamp": "2021-10-23T18:21:00-0700",
  "content": "I really wish it were possible to serve an SSR'd #HTML fragment (with #CSS and #JS), and be able to directly insert it into the #DOM securely.\\n\\nHow many web sites could drop a client side framework if SSR'd web components could work like this?"
}
```

I was imagining a web server transferring small chunks of SSR'd HTML fragments
to the client as required, where the browser swaps out the content as necessary
into the existing page. This would provide fairly dynamic features emblematic of
CSR'd pages while keeping rendering responsibilities on the server and avoiding
a hard refresh for each change. This could support reactive functional
requirements, while keeping most of the components only supporting one
environment (the server).

[Web components](https://developer.mozilla.org/en-US/docs/Web/Web_Components)
and [Declarative Shadow DOM](https://web.dev/declarative-shadow-dom/) have
finally made encapsulated, component-ized, framework-less HTML a reality, so I
want to build a server endpoint which returns:

```html
<my-tweet>
    <template shadowroot="open">
        <link rel="stylesheet" href="/tweet.css">
        <span>Here is a tweet!</span>
    </template>
    <script src="/tweet.js" type="module" async></script>
</my-tweet>
```

And be able to append this to the current document to view the content, along
with its associated CSS styles and JS functionality.

I quickly remembered that this already exists, typically referred to as
"HTML-over-the-wire", and pushed by
[a few frameworks](https://dev.to/rajasegar/html-over-the-wire-is-the-future-of-web-development-542c).
As I did more research however, I found that these didn't really encapsulate
what I was looking for. These frameworks seem to require a lot of custom tooling
with heavy requirements on the server itself, often leading to tight coupling
between the client and server. They all felt very high-commitment. I just want
to fetch an encapsulated DOM element, not buy an engagement ring for my server
framework!

Thinking on it some more, servers can return an HTML fragment pretty easily,
it's the client that's lacking the functionality I want. What I really need is a
way to parse that HTML into a DOM node. I then learned that this actually
already exists in the form of
[`DOMParser`](https://developer.mozilla.org/en-US/docs/Web/API/DOMParser)!

I started experimenting to see how close I could get to the developer experience
I wanted using purely native APIs and, after shooting myself in the foot a
couple times, found the result to be surprisingly simple. I eventually
simplified my example to this:

```typescript
import { parseDomFragment } from './dom.js'; // Implementation TBD...

(async () => {
    // Fetch an HTML fragment from the server.
    const res = await fetch(`/tweet?id=${id}`);

    // Parse it into an `HTMLTemplateElement` node.
    const template: HTMLTemplateElement = await parseDomFragment(res);

    // Append to the document.
    document.body.appendChild(template.content.cloneNode(true /* deep */));
})();
```

Using this component is fairly straightforward:

1.  Client requests a tweet.
2.  Server responds with an HTML fragment.
3.  Client parses the HTML fragment into a synthetic `<template />` element with
    the contents of the network response.
4.  Client clones the template and appends it to the document at the appropriate
    location.
5.  Fragment is displayed to the user and automatically loads any CSS or JS
    included.

Most importantly, this is effectively zero commitment! No server framework, no
client framework, no magical tooling. Just a single function.

## Demo

I used this pattern to put together
[a very simple Twitter clone](https://github.com/dgp1130/html-fragments-demo/tree/blog-post/).
It displays a bunch of tweets, lets you load more on demand, and even edit
existing tweets. Each tweet is loaded as a separate API call returning the HTML
fragment required to render it.

![Screenshot of the demo application with Chrome DevTools visible. The
application shows two lines of text as simple stand-ins for two tweets. Both
lines are colored red, indicating that they have been styled. Chrome DevTools
has the network tab open and shows all the requests made by the page. The list
includes general resources for the page, followed by two requests to `/tweet`
with two different IDs given as query parameters. The first of these requests is
currently selected and its HTTP response is displayed. The response contains a
snippet of HTML with a custom element at the root using the tag name "my-tweet"
and containing Declarative Shadow DOM, a linked stylesheet, and a `script` tag.
](demos/1-base.avif)(demos/1-base.png)

Note how DevTools shows that the tweet is transferred as an HTML fragment, using
a custom element and Declarative Shadow DOM with some JS and CSS included for
good measure. The timeline even shows that JS and CSS are lazily loaded the
first time the `<my-tweet />` element is added, but also are _not_ re-loaded
when a second tweet is rendered using the same resources.

Want to implement infinite scroll? How about:

```typescript
import { parseDomFragment } from './dom.js'; // Implementation TBD...
import { whenUserNearBottomOfDocument } from './left-as-an-exercise-to-the-reader.js';

const tweetList = document.getElementById('tweets');

whenUserNearBottomOfDocument(async () => {
    // Fetch a new tweet using our superior ranking algorithm.
    const id = Math.floor(Math.random() * 1000);
    const res = await fetch(`/tweet?id=${id}`);

    // Parse the tweet node from the response.
    const tweetTemplate = await parseDomFragment(res);

    // Add to the end of the list.
    tweetList.appendChild(tweetTemplate.content.cloneNode(true /* deep */));
});
```

Here is a demo which uses this strategy to load a new tweet each time a button
is pressed.

<video src="demos/2-infinite-scroll.mp4" loop autoplay muted></video>

This implements infinite scroll without having to render a tweet on the client,
commit to an HTML-over-the-wire framework, or use any particular server
infrastructure.

You may have noticed that `parseDomFragment()` actually returns an
`HTMLTemplateElement`, this is to allow a single fragment to be reused
throughout the document. We can use this to edit tweets by requesting an SSR'd
`<my-editable-tweet />` component exactly once, and then cloning it any time the
user wants to edit a tweet. We just swap out the existing tweet with an editable
version (@Twitter, you can have this one for free).

```typescript
// Fetches the editable tweet template on startup via an IIFE.
const editableTweetTemplatePromise = (async (): Promise<HTMLTemplateElement> => {
    const res = await fetch('/editable-tweet');
    return await parseDomFragment(res);
})();

/** Clones an editable tweet and returns it as a `DocumentFragment`. */
async function getEditableTweet(tweetId: number, content: string):
        Promise<DocumentFragment> {
    // Clone a new editable tweet fragment.
    const template = await editableTweetTemplatePromise;
    const instance =
        template.content.cloneNode(true /* true */) as DocumentFragment;

    // Set initial data.
    const editableTweet = instance.firstElementChild as MyEditableTweet;
    editableTweet.tweetId = tweetId;
    editableTweet.content = content;
    return instance;
}

class MyTweet extends HTMLElement {
    public tweetId!: number;
    public content!: string;

    private async onEdit(newContent: string): Promise<void> {
        // Replace this DOM element with the editable version.
        const editableTweet =
            await getEditableTweet(this.tweetId, this.content);
        this.replaceWith(editableTweet);
    }

    // ...
}

customElements.define('my-tweet', MyTweet);
```

The editable tweet can be its own custom element with its own behavior. Once we
have displayed the editable version of the tweet and the user saves their edit,
it can `POST` that change to the server which will update the database and
re-render the tweet. All the client has to do is swap the modified result back
into the document.

```typescript
import { parseDomFragment } from './dom.js'; // Implementation TBD...

class MyEditableTweet extends HTMLElement {
    public tweetId!: number;

    private async onEditSaved(newContent: string): Promise<void> {
        // Post the edit to the server, which also returns
        // the same tweet rendered with the new content.
        const res = await fetch(
            `/tweet/edit?id=${this.tweetId}&content=${
                encodeURIComponent(newContent)}`,
            { method: 'POST' },
        );
        const editedTweetTemplate =
            await parseDomFragment(res);

        // Replace this DOM element with the new, edited tweet.
        this.replaceWith(
            editedTweetTemplate.content.cloneNode(true /* deep */)));
    }

    // ...
}

customElements.define('my-editable-tweet', MyEditableTweet);
```

This is able to edit the tweet on the server and get back a freshly rendered
copy to swap into the page over the old version.

<video src="demos/3-edit.mp4" loop autoplay muted></video>

This edit functionality
[reuses the existing tweet render logic](https://github.com/dgp1130/html-fragments-demo/blob/blog-post/server.ts#L62)
on the server, no dual CSR/SSR support needed! One might reasonably think that
client-side rendering would be more appropriate here, and that can be valid
option. However keep in mind that an edit is not truly committed until it
reaches the server, so making a full network request here is actually fairly
reasonable.

Ultimately this approach suffers a lot from the complexity of custom elements;
[more on that later](#custom-elements). You could just as easily CSR the
editable tweet if you would rather. The beauty of this strategy is that it does
not lock you in to any particular framework or methodology, each component can
render wherever makes makes the most sense for it. You can CSR
`<my-editable-tweet />` but always SSR `<my-tweet />` if that makes sense for
your design. I opted to SSR `<my-editable-tweet />` here simply because I
thought that was the more interesting approach, but a CSR solution could work
just as well!

The above code snippets are a bit simplified, so I recommend taking a look at
the [full example](https://github.com/dgp1130/html-fragments-demo/) to see all
the nitty-gritty details and actual implementation of
[`parseDomFragment()`](https://github.com/dgp1130/html-fragments-demo/blob/blog-post/client/dom.ts).

## Standardization

Of course there are existing HTML-over-the-wire frameworks which make this
architecture more usable and handle all these edge cases for you. What really
surprised me though was how much of this worked out of the box with native APIs.
So I am wondering: What more it would take from browsers and the web
specification to make this kind of design easy and intuitive?

When first thinking about this, I considered a new
`Response.prototype.fragment()` function which would parse an HTTP response as
an HTML fragment and return an `HTMLTemplateElement`. This could be protected
with
[Content-Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
and provide an easy means for using SSR'd HTML fragments in an existing
document. I was really excited about this and it was the original motivation for
writing this post.

Like all new ideas, someone's thought of them before. As I kept iterating, I
found myself reminded of
[HTML imports](https://www.html5rocks.com/en/tutorials/webcomponents/imports/),
an attempt at standardizing a means of "importing" component-ized HTML into an
existing document. The proposal was pushed by the Chrome web components team
some years ago (any
[Polymer v1](https://polymer-library.polymer-project.org/1.0/docs/devguide/feature-overview)
devs out there?), but has since been abandoned for a variety of reasons and was
never officially adopted into the web specification.

While researching the proposal more, I discovered
[HTML modules](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/html-modules-explainer.md),
a successor to HTML imports which attempts to resolve some of the flaws of the
original proposal, primarily by integrating the system with ES modules. This
would allow developers to "import" an HTML fragment using a regular ESM `import`
statement or a dynamic `import()` expression. For example, we could write the
infinite scroll example like so:

```typescript
import { whenUserNearBottomOfDocument } from './left-as-an-exercise-to-the-reader.js';

const tweetList = document.getElementById('tweets');

whenUserNearBottomOfDocument(async () => {
    // `import()` a new tweet rather than `fetch()`-ing it.
    const id = Math.floor(Math.random() * 1000);
    const tweetFragment: DocumentFragment =
        await import(`/tweet.html?id=${id}`)
            .then((module) => module.default);

    // Clone the tweet element in the imported fragment.
    const tweetEl =
        tweetFragment.firstElementChild.cloneNode(true /* deep */);

    // Add tweet to the end of the displayed list.
    tweetList.appendChild(tweetEl);
});
```

This approach would provide native platform capability for importing an SSR'd
tweet component and appending it to an existing document. I really like this
direction and think it could be a powerful addition to the web standard. I do
want to call out one interesting difference with my original thinking however.

### Code vs. Content

I originally thought of "using an HTML fragment" as fetching content and parsing
it as a DOM node, while the HTML module authors conceptualized the same thing as
*importing* an HTML fragment into the JS module graph. This is likely because
I'm coming at this proposal from the perspective of "using SSR'd HTML in an
existing document" whereas the original HTML imports proposal was focused on
"importing a web component". An SSR'd fragment contains user data, while a
static web component would receive user data as an input from other sources.

I think this distinction ultimately comes down to whether you see an HTML
fragment as "content" or "code", the former would be fetched with a
user-controlled HTTP request, while the latter would be imported with module
semantics.

Importing an HTML fragment has a lot of benefits. Most clearly to me it makes
web components much easier to use ([more on that later](#custom-elements)),
however it also introduces some restrictions. For example, editing a tweet was
implemented by making a `POST` request to the server, which updates the database
and responds with a newly rendered form of the tweet, all from one HTTP request:

```typescript
import { parseDomFragment } from './dom.js'; // Implementation TBD...

class MyEditableTweet extends HTMLElement {
    public tweetId!: number;

    private async onEditSaved(newContent: string): Promise<void> {
        // Post the edit to the server, which also returns
        // the same tweet rendered with the new content.
        const res = await fetch(
            `/tweet/edit?id=${this.tweetId}&content=${
                encodeURIComponent(newContent)}`,
            { method: 'POST' },
        );
        const editedTweetTemplate =
            await parseDomFragment(res);

        // Replace this DOM element with the new, edited tweet.
        this.replaceWith(
            editedTweetTemplate.content.cloneNode(true /* deep */)));
    }

    // ...
}

customElements.define('my-editable-tweet', MyEditableTweet);
```

This approach isn't really possible using `import()` semantics, since you can't
(and probably shouldn't) make a `POST` request when importing code. That would
imply that user input dictates the structure of your application's executable
code, which is a big security issue. Of course, practically speaking it probably
only modifies the HTML content, while the JS and CSS is still likely authored by
a developer, it still requires trusting the server maintainer to do the right
thing. We already do this for standard SSR'd documents, so it's not that
different here, but again this is all about conceptualization. Do you see an
HTML fragment as "content" or "code"? I think there's a valid debate to be had
there.

A similar problem is that the "HTML fragments as code" concept assumes that HTML
fragment URLs are stable and return consistent content for the lifetime of the
document. For example, `import('/tweet.js')` should always be consistent within
a single page load, but `import('/tweet.html?id=1234')` for an SSR'd fragment
may not because the tweet could be edited at any time. To support this,
importing the module twice should be able to return different results. Similar
to the "content" vs. "code" distinction, should HTML fragments include SSR'd
user data at all? If the returned fragment is a web component with a
hand-authored template that gets used via CSR and has no user data, then the
fragment looks a lot like "code" to me, and definitely isn't "content". I get
the impression HTML modules, as the proposal currently thinks of them, are
intended to be static, which changes the thought process here.

Of course, even if we decide once and for all that HTML fragments are "code" and
should obey JS module import semantics, we can work around some of those
limitations and still *use* them as "content". For the tweet edit use case, we
can break up the single HTTP `POST` request into a `POST` followed by an
`import()` and use a cache busting query parameter to skip module caching.

```typescript
// An additional query parameter which gets incremented for
// every dynamic import to ensure the requested URL is
// *never* in the module cache.
let cacheBust = 0;

class MyEditableTweet extends HTMLElement {
    public tweetId!: number;

    private async onEditSaved(newContent: string): Promise<void> {
        // Post the edit to the server, but we don't care
        // about the response.
        const res = await fetch(
            `/tweet/edit?id=${this.tweetId}&content=${
                encodeURIComponent(newContent)}`,
            { method: 'POST' },
        );

        // Make a separate HTTP request to import the
        // newly-edited tweet fragment. Include the cache
        // busting query parameter to skip the module cache.
        cacheBust++;
        const fragment: DocumentFragment =
            await import(`/tweet.html?id=${
                    this.tweetId}&cachebust=${cacheBust}`)
                .then((module) => module.default);
        const editedTweet =
            fragment.firstElementChild.cloneNode(true /* deep */);

        // Replace this DOM element with the new, edited tweet.
        this.replaceWith(editedTweet);
    }

    // ...
}

customElements.define('my-editable-tweet', MyEditableTweet);
```

Treating HTML fragments as "code" instead of "content" may be the right answer,
but I think it's important for whatever mechanism this scheme uses to have solid
support for SSR'd HTML fragments. This would allow low-commitment
HTML-over-the-wire architectures, which I think would have a lot of value for
web developers everywhere.

A native means of using SSR'd HTML fragments also has some interesting
implications for the broader web ecosystem which I want to call out more
specifically.

### Ecosystem

If something similar to HTML modules does eventually land, it would provide a
unique way of embedding third-party content. Today, this is typically done via a
`<script />` tag linking third-party sources with a custom element that renders
the UI. The limitation of this approach is that third-party libraries cannot
provide any meaningful SSR and require scripting for the most basic features
which shouldn't require it.

With full support of SSR'd HTML fragments, a service could expose an API
endpoint which returns a pre-rendered custom element and encapsulates its own
scripts and styles. Imagine real Twitter providing a URL that returns an SSR'd
tweet with styling in an HTML fragment. All you have to do is append it wherever
you want on the page. Their documentation would just consist of an example which
looks like:

```typescript
const fragment = await import('/tweet.html?id=1234')
    .then((module) => module.default);
const tweet =
    fragment.firstElementChild.cloneNode(true /* deep */);
document.body.appendChild(tweet);
```

Twitter in particular is cool because it does not actually require scripting
capabilities. An SSR'd tweet does not need any JavaScript, so a web site
could embed a tweet with a CSP directive which blocks scripting capabilities
from Twitter and further protects users more than possible today.

Taking this a step further, it's unfortunate that the approach requires
JavaScript at all. What if we could do this directly in HTML? Imagine a new
`<embed />` element, which takes a URL, fetches it with a `GET` request, parses
the result as an HTML fragment, and inserts it directly into the DOM. That means
you could write:

```html
<embed src="/tweet?id=1234" />
```

And the browser would automatically fetch `/tweet?id=1234` and append the
result, no custom JS required! You'd end up with:

```html
<embed src="/tweet?id=1234">
    <my-tweet>
        <template shadowroot="open">
            <link rel="stylesheet" href="/tweet.css">
            <span>Here is a tweet!</span>
        </template>
        <script src="/tweet.js" type="module" async></script>
    </my-tweet>
</embed>
```

I think this is incredibly powerful since it opens up all kinds of cool embed
use cases. Imagine pasting a one line `<embed />` tag into a markdown file and
having it *just work* in a secure, performant, and user-friendly fashion. Again,
this does look a lot like HTML imports, but I think mixing the approach with
SSR'd fragments makes this a much more powerful embed strategy.

The alternative approach to accomplish this today is to embed an `<iframe />`
which links to a Twitter page that renders the tweet. This has the advantage of
truly sandboxing the embed content, which can be very useful. However, it is
also far less performant and harder to use.

True story: That tweet at the top of the page was originally rendered with
[Twitter's embed API](https://developer.twitter.com/en/docs/twitter-for-websites/embedded-tweets/overview)
which uses an `<iframe />`. This one embed:

* Made 22 out of 43 network requests for the page (13 of which were JS files).
* Downloaded 1.6 MB out of 2.6 MB of resources for the page.
* Painted at the ~1 sec mark when largest contentful paint ocurred at 87 ms.
* Appears to have downloaded React (this page does not otherwise use React).

Now I am by no means a web performance expert and this is just one example. I
also want to avoid picking on Twitter too much here, they are by no means the
worst offender. The point is that this is a significant weight for a fairly
simple use case, and it bothered me enough to implement my own version of the
tweet component. SSR-ing an HTML fragment could be a much lighter weight and
easier to use alternative to an `<iframe />` embed. I think this could have a
huge impact on embedded third-party content.

Including HTML modules (in an SSR-compatible way) with `<embed />` as official
additions to the web standard could have significant impact for embedding
third-party content in addition to the low-commitment HTML-over-the-wire
architecture discussed earlier.

Edit: I realized later that one can prototype this `<embed />` tag as a custom
element. [So I did](https://github.com/dgp1130/html-fragments-demo/blob/blog-post/client/em-bed.ts),
and it works
[just as smoothly as I wanted it to](https://github.com/dgp1130/html-fragments-demo/blob/blog-post/client/embedded.html#L11).

![A screenshot of a page title with the header "Embedding a Tweet" which
includes a single tweet along with an open DevTools Network tab showing that
the tweet was fetched as an HTML fragment.](demos/4-embed.avif)(demos/4-embed.webp)(demos/4-embed.png)

So that's the interesting part of this blog post and you can stop reading now. I
also have a [follow-up post](/posts/streamable-html-fragments/) which _streams_
HTML fragments. There were a lot of unexpected nuances and challenges with
making this approach streamable, so check it out!

However, I never really explained how my implementation of `parseDomFragment()`
works. I encountered a few surprising edge cases and learned some interesting
tidbits about the web specification, so if that is your kind of thing, keep
reading.

## Implementation

It turns out that `parseDomFragment()` is only about 40 lines of meaningful
code. Fundamentally, all it does is call:

```typescript
new DOMParser().parseFromString(
    await response.text(),
    'text/html',
)
```

However, there are a couple edge cases it needs to handle. The
[full TypeScript source is here](https://github.com/dgp1130/html-fragments-demo/blob/blog-post/client/dom.ts)
if you just want to get on with your life.
[JS is also here](https://gist.github.com/dgp1130/1283773eb5890fb3cf59005892231211)
if you are too lazy to run `tsc` as well. With that out of the way, let's dive
in to weird edge cases!

### Loading Scripts

My initial implementation simply did not execute any client-side JavaScript.

![A screenshot of the Twitter demo application with Chrome DevTools open. The
application itself looks identical to the first screenshot, with two short demo
tweets. Chrome DevTools shows the network tab. Two of these requests are
highlighted, the first for `/tweet?id=1234` the second for `/tweet.css`. The
highlight is labeled "No tweet.js?", indicating there is no request for
`/tweet.js` as would be expected.
](demos/5-missing-script.avif)(demos/5-missing-script.png)

I looked up the [`DOMParser` spec](https://www.w3.org/TR/DOM-Parsing/) and found
that scripting is
[explicitly disabled](https://www.w3.org/TR/DOM-Parsing/#:~:text=script%20elements%20get%20marked%20unexecutable%20and%20the%20contents%20of%20noscript%20get%20parsed%20as%20markup.)!

> The `parseFromString(str, type)` method must run these steps, depending on type:
> 
> * `"text/html"` - Parse `str` with an HTML parser, and return the newly created document.
>     
>   **The scripting flag must be set to "disabled".**
>
> > NOTE
> > 
> > `script` elements get marked unexecutable and the contents of `noscript` get parsed as markup.

This seemed like a non-starter, but there is a workaround. We don't actually
want `DOMParser` to execute scripts. After all, it generates a new
`DocumentFragment` that will get wrapped in an `HTMLTemplateElement`, so it will
not be directly rendered to the user anyways. We only want the *cloned* HTML
which is actually inserted into the active document to execute scripts.

We can work around this by manually cloning any `<script />` tags and replacing
them in the `DocumentFragment`. This keeps the semantics the same while
effectively making the browser "forget" that they were originally parsed in a
context which had scripting disabled.

```typescript
function replaceScripts(el: Element): void {
    const scripts = Array.from(el.querySelectorAll('script'));
    for (const oldScript of scripts) {
        const newScript = document.createElement('script');
        for (const name of oldScript.getAttributeNames()) {
            const oldAttr = oldScript.getAttribute(name)!;
            newScript.setAttribute(name, oldAttr);
        }
        newScript.textContent = oldScript.textContent;

        oldScript.replaceWith(newScript);
    }
}
```

This works and makes the browser load JavaScript as expected! Except it works a
little too well...

### Duplicated Scripts

At this point I got some strange errors, and I eventually narrowed down the
problem to:

![A screenshot of the demo Twitter application with Chrome DevTools opened to
the console panel. The console shows a message "(2) Running tweet.js..."
followed by an error: "Uncaught DOMException: Failed to execute 'define' on
'CustomElementRegistry': The name 'my-tweet' has already been used with this
registry".](demos/6-double-script.avif)(demos/6-double-script.png)

Note the "2" by the first log statement along with "'my-tweet' has already been
used with this registry", I was loading the same JavaScript file twice! This was
very confusing to me, since the same script tag was just being duplicated in two
different HTML fragments. Each one contained:

```html
<script src="/tweet.js" async></script>
```

Normally, that works just fine. If you duplicate a `<script />` tag in an HTML
document it will only fetch and execute it once.

```html
<script src="/foo.js"></script>
<script src="/foo.js"></script>
```

I ignored the problem for a while and ended up solving it by accident. I wanted
to share the `parseDomFragment()` function and was too lazy to add a bundler, so
I used
[native ESM](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
and found that the problem just went away! It turns out that simply adding
`type="module"` fixed the bug, but why?

```html
<script src="/tweet.js" type="module" async></script>
```

After some spelunking in the HTML spec, I believe the difference comes down to
caching. Fetching a "classic" script
[just makes the HTTP request](https://html.spec.whatwg.org/multipage/webappapis.html#fetch-a-classic-script),
but fetching a "module" script
[checks a module cache first](https://html.spec.whatwg.org/multipage/webappapis.html#fetch-a-single-module-script).
I believe this cache is what stops the second `<script type="module" />` tag
from triggering another network request and execution.

I am not totally clear on why duplicate classic scripts loaded in this manner
are executed multiple times, when traditionally duplicated classic scripts are
still executed only once. If you have any idea,
[let me know](https://twitter.com/develwoutacause/)!

### Loading Styles

I actually lied a little bit in one of my earlier screenshots, did you catch it?
Let me show you a more accurate image, does anything stand out a little weird?

![A screenshot of the Twitter demo application with Chrome DevTools open to the
network tab. In the network, there are two requests for tweet fragments, the
first includes a request for `/tweet?id=1234`, followed by `/tweet.css` and
`/tweet.js`. The second includes a request for `/tweet?id=4321` and is also
followed by a duplicate request to `/tweet.css`.
](demos/7-double-style.avif)(demos/7-double-style.png)

`/tweet.css` got downloaded twice, what gives!? It seems that much like
`<script />` tags, putting the same stylesheet in the document twice actually
fetches it multiple times. The simplest solution I found was to cache the
stylesheet via
[`Cache-Control`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control).
This was enough to avoid re-requesting the file, though it seems weird to me
that it is necessary to do this in the first place. I think it also evaluates
the stylesheet and applies it to the page multiple times, which doesn't seem
ideal, but it's good enough for this demo.

### Declarative Shadow DOM

One other thing that didn't work out of the box is Declarative Shadow DOM. The
HTML fragment would be appended to the document correctly but not render any
children under the shadow root. This is because Declarative Shadow DOM is
defined as a "parser-only" feature, meaning you cannot append a new element with
Declarative Shadow DOM to an existing `Document`, the contents of the template
will just be ignored!

Fortunately, `DOMParser.prototype.parseFromString` has an extra option in
Chrome, `includeShadowRoots`, which does exactly what we need. This makes the
resulting fragment "just work" the way we expect:

```typescript
new DOMParser().parseFromString(html, 'text/html', {
    includeShadowRoots: true
});
```

[This post](https://web.dev/declarative-shadow-dom/#parser-only) has a great
explanation of Declarative Shadow DOM's parser-only nature. The caveat here is
that this option is not present
[in the spec](https://www.w3.org/TR/DOM-Parsing/#the-domparser-interface).
Though Declarative Shadow DOM isn't fully adopted in the spec either and only
supported by Chromium right now anyways, so 🤷‍♂️.

The motivation for this flag seems to be to avoid [XSS vulnerabilities in
existing HTML sanitizers that do not know about Declarative Shadow DOM](https://github.com/whatwg/dom/issues/831#issuecomment-718157132).
So as long as you are using up-to-date sanitizers, I believe this should be safe
to do.

### Custom elements

For this example, I did not want to use a CSR framework, so I used native custom
elements. However, that introduces typical rough edges the community commonly
complains about. Constructing an element in memory is awkward and TypeScript
does not like the lack of strict property initialization in the constructor.
Hydrating from SSR'd content is a bit awkward as well. There are plenty of small
custom element libraries (ie. [Lit Element](https://lit.dev/)) which can make
the authoring experience much smoother, however I believe many are still lacking
a solid hydration story given how new Declarative Shadow DOM is.

The more annoying issue IMHO is that lazy loaded DOM nodes do not fetch scripts
until *after* they are inserted into the DOM. This is good for laziness and the
performance benefits that brings but when combined with a custom element it gets
very awkward. The main problem is that an inserted DOM node is immediately
visible and interactable to the user but the custom element definition has not
been downloaded and the element itself is not upgraded yet. That means you end
up with scenarios like this:

```typescript
// my-editable-tweet.ts

export class MyEditableTweet extends HTMLElement {
    /** Focus on the internal input element. */
    public focus() {
        this.shadowRoot!.querySelector('input')!.focus();
    }
}
```

```typescript
// my-tweet.ts

import type { MyEditableTweet } from './my-editable-tweet';

export class MyTweet extends HTMLElement {
    private async onEdit(): Promise<void> {
        const res = await fetch('/editable-tweet');
        const template = await parseDomFragment(res);
        const content =
            template.content.cloneNode(true /* deep */);

        // WRONG! `MyEditableTweet` is lazy loaded *after*
        // it is first inserted into the document. On first
        // edit, it has not been downloaded yet, so the
        // element is not yet upgraded and none of its
        // functionality exists.
        const editableTweet = content as MyEditableTweet;

        this.replaceWith(editableTweet);
        editableTweet.focus(); // ERR: `focus` is `undefined`.
    }
}
```

You can use
[`customElements.whenDefined('my-editable-tweet')`](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/whenDefined)
to wait for the script to load and then be confident that the node has been
upgraded. However that is an asynchronous operation, and in this particular case
the user could have moved on to do other things so it would be inappropriate to
steal focus, making an "auto-focus on edit" feature difficult to implement.

The core problem here is that the first time an HTML fragment with a custom
element is inserted into the DOM, the element's implementation is *not* yet
executed and you need to wait for it. However, the second time that HTML
fragment is inserted, the element's implementation will *already* have been
executed, so your code needs to be compatible with both timings.

HTML modules and treating fragments as "code" instead of "content" actually
fixes this problem.
[It proposes](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/html-modules-explainer.md#specifying-an-html-modules-exports)
executing all `<script />` tags in the HTML fragment and merging their exports
together as the result of the `import()`. This means that a web component
definition included in an HTML fragment will always be evaluated *before* the
associated DOM element is accessible.

[This example](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/html-modules-explainer.md#example-custom-element-definition-in-an-html-module)
demonstrates how a custom element can be easily defined and loaded. Treating
fragments as code definitely has some benefits in this regard and makes web
components much easier to use.

### Template foot-guns

While implementing this, I also managed to shoot myself in the foot a number of
times using templates. The easiest mistake to make is to forget `.content` like
so:

```typescript
import { parseDomFragment } from './dom.js';

const res = await fetch('/foo');
const template = await parseDomFragment(res);

// Wrong: `element1` is an `HTMLTemplateElement`, which is
// inert when inserted into the document.
const element1 = template.cloneNode(true /* deep */);

// Right: `element2` is a clone of the template's *content*.
const element2 = template.content.cloneNode(true /* deep */);
```

Another easy mistake is to assume that the content is the custom element you
want when it is actually a `DocumentFragment` which *contains* your custom
element.
[`Element.prototype.firstElementChild`](https://developer.mozilla.org/en-US/docs/Web/API/Element/firstElementChild)
is an easy way of accessing the instantiated custom element.

```typescript
import { parseDomFragment } from './dom.js';

const res = await fetch('/tweet?id=1234');
const template = await parseDomFragment(res);
const instance = template.content.cloneNode(true /* deep */);

// WRONG: `instance` is actually a `DocumentFragment`.
const tweet1 = instance as MyTweet;

// RIGHT: `instance` *contains* a `<my-tweet />` element.
const fragment = instance as DocumentFragment;
const tweet2 = fragment.firstElementChild as MyTweet;
```

TypeScript helps for many issues like these, but a lot of the types overlap with
each other and do not give errors in many invalid situations. One annoying edge
case for TypeScript specifically is that
[`DocumentFragment.prototype.cloneNode()`](https://developer.mozilla.org/en-US/docs/Web/API/Node/cloneNode)
returns `Node`, requiring an explicit cast to `DocumentFragment`, and giving a
key opportunity to mistakenly cast to its child node. Ideally,
`DocumentFragment.prototype.cloneNode()` would return a `DocumentFragment` type.
Apparently making this return value generic is
[more complicated than it seems](https://github.com/microsoft/TypeScript/issues/283)
on the surface.

All these challenges lead to my desire to make this a proper part of the web
specification. Designing HTML imports intentionally for this use case would give
an opportunity to fix some of these confusing aspects.

## Conclusion

When I started experimenting with a native HTML-over-the-wire implementation, I
was just curious how complex of a problem it was. What surprised me was how much
is already given by the platform natively. While I cannot recommend this
approach until it becomes an official standard, I'm excited by the direction of
HTML modules and hope we can find a path to using them with SSR. Doing so would
enable low-commitment architectures, where an application can be predominantly
SSR'd while still supporting its occasional reactive use case. All of this can
be done without being forced to commit to a CSR framework, duplicate logic
across CSR and SSR, or use a hybrid rendering solution. It also comes with major
benefits for third-party embed use cases, making such content more secure and
usable.

I think there is a lot of potential here, and I hope web developers get the
opportunity to fully explore it.

**Edit**: If you got this far, you should _definitely_ check out
[the sequel to this post](/posts/streamable-html-fragments/) on
_streaming_ HTML fragments. Lost of interesting nuances, challenges, and "fun"
bugs along the way.
