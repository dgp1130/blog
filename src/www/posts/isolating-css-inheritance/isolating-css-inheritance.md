---
tags:
  - posts
  - series/design-docs
layout: pages/post
title: Isolating CSS Inheritance
date: 2025-09-07T12:00:00-07:00
excerpt: |
  How can we prevent styles from leaking between multiple microfrontend
  applications on the same page?
languages: [ html, css ]
additional_styles: [ isolating-css-inheritance ]
---

# Isolating CSS Inheritance

I was recently looking into CSS isolation between multiple applications running
on the same web page and it turned into a deep dive of the CSS `initial` and
`revert` keywords which I wanted to share in a short post on the subject (short
for my blog anyways).

## The Problem

I was tasked with running multiple web applications on the same page at the same
time. These applications are decoupled from one another, developed by different
teams, deployed independently at different times, and built from different
commits. Effectively a [microfrontend](https://micro-frontends.org/) deployment.

Given this setup, how can we ensure that internal CSS styling from one app does
not unexpectedly leak into the other? To make this even more complicated, this
particular use case allows one application to be rendered _inside_ another,
meaning CSS properties may inherit across applications.

The team building the "parent" application might write:

```html
<div id="parent-root" style="color: red;">
    <div>I'm red, just like I expected!</div>

    ${renderChildApp()}
</div>
```

And then the team maintaining the "child" application might write:

```html
<div id="child-root">
    <div>I expect to default to black.</div>
<div>
```

In isolation, both of these look perfectly reasonable. But when rendered
together, we can see:

<figure>
    <figcaption>Example 1: Leaking Properties.</figcaption>

```html
<!-- Parent application -->
<div id="parent-root" style="color: red;">
    <div>I'm red, just like I expected!</div>

    <!-- Child application -->
    <div id="child-root">
        <div>I'm red? I expected to default to black.</div>
    </div>
</div>
```

```inline-html
<!-- Parent application -->
<div style="color: red;">
    <div>I'm red, just like I expected!</div>

    <!-- Child application -->
    <div>
        <div>I'm red? I expected to default to black.</div>
    </div>
</div>
```

</figure>

Because these apps are independently built and deployed, they should be
generally isolated from each other, and arbitrary internal changes in one app
(such as text color) should not affect the other.

However in this case, the parent's `color: red;` style is inherited into the
child app and colors its text. This style is effectively _leaked_ across
applications.

Now there are numerous ways styles can leak from application to another, all of
which require unique solutions. But for this post, we'll just focus on CSS
inheritance. So what can we do to _isolate_ these two apps from each other?

Also if your first thought was to reach for shadow DOM or `@scope`, I'm afraid
neither are viable alternatives for this particular problem due to the focus on
CSS inheritance specifically (explanation of
[shadow DOM](#shadow-dom) and [<code>@scope</code>](#scope) insufficiencies).

## Overrides

The immediately obvious answer is to override `color: black;` on the child app
root.

<figure>
    <figcaption>Example 2: Overriding <code>color</code>.</figcaption>

```html
<div id="parent-root" style="color: red;">
    <div id="child-root" style="color: black;">
        <div>I'm black!</div>
    </div>
</div>
```

```inline-html
<div style="color: red;">
    <div style="color: black;">
        <div>I'm black!</div>
    </div>
</div>
```

</figure>

But listing out every CSS property and its default value is quite complicated
and tedious.

## `all`

Fortunately, CSS has a useful property for this very problem.
[<code>all</code>](https://developer.mozilla.org/en-US/docs/Web/CSS/all) applies
a single value to _all_ CSS properties (with some minor exceptions) for a
particular element.

Each CSS property has a different type, meaning there is no specific value you
can provide which is meaningful to _every_ property. But there a few CSS base
keywords you can use which do apply to every property.

* [<code>initial</code>](https://developer.mozilla.org/en-US/docs/Web/CSS/initial)
* [<code>inherit</code>](https://developer.mozilla.org/en-US/docs/Web/CSS/inherit)
* [<code>unset</code>](https://developer.mozilla.org/en-US/docs/Web/CSS/unset)
* [<code>revert</code>](https://developer.mozilla.org/en-US/docs/Web/CSS/revert)
* [<code>revert-layer</code>](https://developer.mozilla.org/en-US/docs/Web/CSS/revert-layer)

So which of these would be appropriate in this scenario? A few can be
immediately excluded.

`inherit` explicitly opts in to the inheritance behavior we _don't_ want.

`unset` is equivalent to `inherit` when applied to inherited properties, and
equivalent to `initial` for non-inherited properties. Again, this explicitly
opts in to inheritance we're trying to avoid. And if the `initial` behavior is
what we want, we should just use that directly.

`revert-layer` lets you roll back styles from an `@layer`. This is actually
closer to workable than you might initially think, but ultimately
[does not fit this use case](#revert-layer).

So that leaves us with `initial` and `revert` as potential candidates. Let's
look at each.

## `initial`

[From MDN:](https://developer.mozilla.org/en-US/docs/Web/CSS/initial)

> The `initial` CSS keyword applies the initial (or default) value of a property
to an element.

Every CSS property has a default value and setting it to `initial` uses the
default value for its associated property.

Let's look at `display` as an example. The default value of `display`
[according to the CSS spec](https://developer.mozilla.org/en-US/docs/Web/CSS/display#formal_definition)
is `inline`. So setting `display: initial;` is equivalent to `display: inline;`.

You might be surprised to hear that `inline` is the default and not `block`,
however that's likely because you're thinking of `div`, which is an exception
we'll get to shortly. Create an element with an arbitrary tag name like
`my-random-element` and check DevTools. You can confirm the default is indeed
`display: inline;`. This is the reason so many components include
`:host { display: block; }` in their styles.

In the context of `all: initial;`, we're using the default value for every
property as specified by the CSS standard.

## `revert`

So what about `revert`?

[Also from MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/revert):

> The `revert` CSS keyword reverts the cascaded value of the property from its
current value to the value the property would have had if no changes had been
made by the current style origin to the current element. Thus, it resets the
property either to user agent set value, to user set value, to its inherited
value (if it is inheritable), or to initial value.

And that's a little more involved... Let me try and break this down a bit.

This description mentions a "user agent set value", and to understand that, we
need to first discuss the user-agent stylesheet.

### Style Origins

The first definition to understand here is "style origin". This refers to the
different locations CSS can come from.

> if no changes had been made by the current style origin to the current element

This is talking about styles originating from the current document, basically
all the CSS you think of as your application's styles, anything in a `<style>`
or `<link rel="stylesheet">` you've inserted into the page. `revert` pretends
none of these application styles exist and instead reverts to...

### The User-Agent Stylesheet

Every browser includes a
["user-agent stylesheet"](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascade/Cascade#user-agent_stylesheets)
(UA stylesheet), this is an additional set of CSS styles applied to all web
pages with some browser-specific styling.

This stylesheet is why a plain `<button>` element with no CSS looks just a
_little_ different between browsers in order to match the system UI users expect
on their particular platform. For example, consider the visual design of a
default button on desktop Windows vs mobile iOS. Those differences are managed
by the UA stylesheet.

These UA styles are literally defined as a stylesheet, and you can observe it in
DevTools or by just looking at
[browser source code](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/html/resources/html.css;drc=5606f221713df59faee4d92851998db4d9d15aeb).
This is also how the `display` exception for `div` exception gets handled.
Browsers include in their user-agent stylesheet:

```css
div {
    display: block;
}
```

The UA stylesheet is why `div` elements always default to `block`, even though
the `initial` value of `display` is actually `inline`.

There is also a "user" style origin where browsers and extensions allow you to
apply your own stylesheet to every page you visit.

In building our microfrontend web application, we want to respect the user's
intent and configured settings. If they have configured their browser with
something like `h1 { color: magenta; }` because they like their headers to be
really bright and colorful, then more power to them, and our website should
follow that preference.

Stepping back to `revert`, recall that it resets to the "user agent set value",
meaning it resets a CSS property to its default
_after taking the user-agent stylesheet into account_.

We can demonstrate the difference with `initial` using the `div` example:

<figure>
    <figcaption>
        Example 3: <code>display: initial;</code> vs
        <code>display: revert;</code>.
    </figcaption>

```html
<!-- Two elements stack horizontally because they're `inline`. -->
<div style="display: initial;">I'm <code>inline</code>!</div>
<div style="display: initial;">I'm to the side!</div>

<br><br>

<!-- Two elements stack vertically because they're `block`. -->
<div style="display: revert;">I'm <code>block</code>!</div>
<div style="display: revert;">I'm underneath!</div>
```

```inline-html
<div style="display: initial;">I'm <code>inline</code>!</div>
<div style="display: initial;">I'm to the side!</div>

<br><br>

<div style="display: revert;">I'm <code>block</code>!</div>
<div style="display: revert;">I'm underneath!</div>
```

</figure>

Based on this description and our desire to respect the user-agent stylesheet,
it seems like the obvious answer to isolating CSS inheritance is `all: revert;`
rather than `all: initial;`, right?

![A meme of Anakin and Padme from Star Wars, Attack of the Clones. The two sit
in a field as Anakin states matter-of-factly "`all: revert;` sounds reasonable."
Padme responds with a smile, "So this blog post is done, right?" Anakin sits
silently for a moment as Padme's expression changes to one of worry and repeats,
"So this blog post is done, right?"](./post-done.avif)(./post-done.webp)

## `initial` vs `revert`

Well, let's break down a few sub-cases and see what actually happens in
practice.

### Non-Inherited Properties

Let's start with non-inherited properties. Much like how every property has a
defined `initial` value, each property is defined as either inherited or not.
`display` for instance is
[not inherited](https://developer.mozilla.org/en-US/docs/Web/CSS/display#formal_definition).

<figure>
    <figcaption>Example 4: Non-Inherited CSS.</figcaption>

```html
<div id="parent-root" style="display: inline-block;">
    <div id="child-root-initial" style="all: initial;">
        <div>
            <code>initial</code>: I'm still
            <code>block</code>!
        </div>
        <div>I'm underneath the block.</div>
    </div>

    <br>

    <div id="child-root-revert" style="all: revert;">
        <div>
            <code>revert</code>: I'm still
            <code>block</code>!
        </div>
        <div>I'm also underneath the block.</div>
    </div>
</div>
```

```inline-html
<div style="display: inline-block;">
    <div style="all: initial;">
        <div>
            <code>initial</code>: I'm still
            <code>block</code>!
        </div>
        <div>I'm underneath the block.</div>
    </div>

    <br>

    <div style="all: revert;">
        <div>
            <code>revert</code>: I'm still
            <code>block</code>!
        </div>
        <div>I'm also underneath the block.</div>
    </div>
</div>
```

</figure>

In this case, `initial` vs `revert` doesn't actually make a difference! Since
`display` isn't inherited, the `inline-block` on `#parent-root` _only_ applies
to that element. All leaf `<div>` elements ultimately use `block`.

The one difference is that `#child-root-initial` is actually `inline` (uses the
default value of `display`), while `#child-root-revert` is `block` (uses the UA
stylesheet). But ultimately this is just the container element intended to
divide the two apps and we can use whatever display value we want. We could just
as easily get the opposite behavior by explicitly specifying `display`:

```html
<div id="child-root-initial"
        style="all: initial; display: block;">
    <!-- ... -->
</div>

<div id="child-root-revert"
        style="all: revert; display: inline;">
    <!-- ... -->
</div>
```

Either approach flips the `display` value of the container without affecting any
descendant elements. So from an isolation perspective, this is a fairly
irrelevant difference.

So there is no meaningful difference between `initial` and `revert` with respect
to non-inherited properties. Inherited properties get a bit more complicated, so
let's break down a few more use cases.

### Inherited Properties _on_ UA Elements

The next case to consider are inherited properties on elements directly affected
by the UA stylesheet. For example,
[Chrome defines](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/html/resources/html.css;l=175;drc=5606f221713df59faee4d92851998db4d9d15aeb):

```css
h1 {
    font-weight: bold;
}
```

Note that
[<code>font-weight</code>](https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight)
is an inherited property with an `initial` value of `normal`.

So how do ancestor styles affect `font-weight` on an `h1` tag? Actually not at
all.

<figure>
    <figcaption>Example 5: Inherited on UA Element</figcaption>

```html
<div style="font-weight: normal;">
    <h1>I'm bold!</h1>
</div>
```

```inline-html
<div style="font-weight: normal;">
    <!-- The title of the post is already an h1 tag, so we don't want to confuse
    search engines with a second. `role="none"` should address that. -->
    <h1 role="none">I'm bold!</h1>
</div>
```

</figure>

Since the UA stylesheet explicitly defines `font-weight: bold;` through an
`h1` selector, the property is applied _directly_ to the `h1` element.
Therefore, there is no need for the browser to check ancestors and no way to
accidentally inherit another value.

So there is no difference between `initial` and `revert` for inherited
properties _on_ elements with UA styles, as inheritance doesn't affect this use
case at all.

### Inherited Properties _from_ UA Elements

The next example inverts the previous one. Instead of putting `initial` or
`revert` directly _on_ an element with an inherited UA style, we reset an
element which inherits _from_ an ancestor element with a UA style.

<figure>
    <figcaption>Example 6: Inherited from UA Element</figcaption>

```html
<div id="parent-root">
    <h1>
        <div>Parent: I inherited bold!</div>

        <div id="child-root-initial"
                style="font-weight: initial;">
            <div><code>initial</code> child: I'm <em>not</em> bold!</div>
        </div>

        <div id="child-root-revert"
                style="font-weight: revert;">
            <div><code>revert</code> child: I'm still bold!</div>
        </div>
    </h1>
</div>
```

```inline-html
<div>
    <!-- The title of the post is already an h1 tag, so we don't want to confuse
    search engines with a second. `role="none"` should address that. -->
    <h1 role="none">
        <div>Parent: I inherited bold!</div>

        <div style="font-weight: initial;">
            <div><code>initial</code> child: I'm <em>not</em> bold!</div>
        </div>

        <div style="font-weight: revert;">
            <div><code>revert</code> child: I'm still bold!</div>
        </div>
    </h1>
</div>
```

</figure>

This example begs the question: Do we _want_ the child app to be bold in this
scenario?

I can actually see arguments for yes and no. Since the parent and child
applications are intended to be independently developed by different teams and
deployed with minimal coupling, there is no way for the child app to know
whether or not it will be loaded in a bold `h1` tag or any other tag. This
presents a hazard, where the parent might incorrectly render the child in a
context it did not expect and the UA styles from that context break the intended
styling of the child application. `initial` solves this problem and keeps the
child application looking the way its developers intended.

The alternative argument is that the parent has decided to render the child
application inside an `h1` tag, explicitly believing this child to make sense in
that context. If the child app is genuinely just rendering some title text, then
`revert` would correctly retain the user's desired bold behavior. The parent app
is somewhat implicitly configuring the child app to follow the UA's styling.

This is a bit of an academic argument, since it is hard to imagine a valid use
case for rendering a completely different application inside an `h1` tag.
Skimming over other styles in Chrome's UA stylesheet, there's honestly not many
inherited properties in there, and the ones which are present tend to be on
"leaf" elements like `<input>` or `<select>`. So the practical situations in
which this matters are unlikely to ever come up in practice.

Of course, Chrome is only one browser, and others may use more inherited
properties or some users / tools may expressly customize their UA stylesheet
with more inherited properties where this might be more of a practical issue.

### Non-UA Inherited Properties

You might have noticed that I didn't use `color` in any of the above demos,
despite typically being the most immediately obvious inherited property. That's
because
[<code>color</code>](https://developer.mozilla.org/en-US/docs/Web/CSS/color)
hits one final use case I want to discuss here.

Let's try the same demo with `color`:

<figure>
    <figcaption>Example 7: Non-UA Inherited Properties.</figcaption>

```html
<div id="parent-root" style="color: red;">
    <div>Parent: I inherit red!</div>

    <div id="child-root-initial" style="color: initial;">
        <div><code>initial</code> child: I default to black.</div>
    </div>

    <div id="child-root-revert" style="color: revert;">
        <div><code>revert</code> child: I inherit red?!</div>
    </div>
</div>
```

```inline-html
<div style="color: red;">
    <div>Parent: I inherit red!</div>

    <div style="color: initial;">
        <div><code>initial</code> child: I default to black.</div>
    </div>

    <div style="color: revert;">
        <div><code>revert</code> child: I inherit red?!</div>
    </div>
</div>
```

</figure>

`initial` seems to be doing its job and isolating from the parent's
`color: red;` style.

However, this `revert` ain't reverting, so what's going on? Well, let's look at
the
[definition of <code>revert</code>](https://developer.mozilla.org/en-US/docs/Web/CSS/revert)
once more (emphasis mine):

> \[`revert`\] resets the property either to user agent set value, to user set
value, **to its inherited value (if it is inheritable)**, or to initial value.

So `revert` prefers the UA stylesheet when it configures the property, but for
any properties _not_ set through the UA stylesheet, it will inherit from its
ancestors before using the `initial` value.

You might expect something like `html { color: black; }` in the UA stylesheet,
but this is not the case.
[Chrome's UA stylesheet](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/html/resources/html.css;drc=5606f221713df59faee4d92851998db4d9d15aeb)
has some usage of `color` in certain form elements, but there is no general
"use `black` as the default text color" style. The default value of `color` is
handled through a different abstraction than UA stylesheets. So it is
effectively defaulting to its `initial` behavior, how does that work for
`color`?

The `initial` value of `color` is something called `CanvasText`, one of many
["system colors"](https://css-tricks.com/system-things/) in the browser. This
one essentially represents the current text color. The actual observed default
value is typically `black`, but this can vary based on configuration. For
example, if you enable
[automatic dark theme](https://developer.chrome.com/blog/auto-dark-theme) in
Chrome, `CanvasText` switches to `white`, while `Canvas` (basically the
background color) switches from `white` to `black` to create a dark theme.

Since this default `color` value is managed at a different layer, it does not
appear in the UA stylesheet, therefore `revert` moves on to check if the
property is inherited. Since `color` is inherited, `revert` chooses to inherit
the value rather than reset it to its `initial`. Therefore in the above example,
the child app incorrectly inherits the `red` color from its parent rather than
using the default `black`.

So `revert` does not isolate any inherited properties inherited from outside the
UA stylesheet.

## Takeaways

After building a deeper understanding of the nuances here, it is clear that
`all: initial;` is the best approach to reset styles and isolate applications.

My biggest surprise from this investigation was how little the difference
between `initial` and `revert` actually is. The only two cases this comes into
play is:
1.  Inheriting a property _from_ an ancestor element with a UA style.
    *   Such a situation just doesn't come up as often as you might think given
        the general lack of inherited properties in the UA stylesheet.
2.  Inheriting a property which is _not_ in the UA stylesheet for any ancestor
    elements.

If you're trying to reset a specific property on a specific element, I suspect
`revert` is likely closer to what you'd want most of the time, given the way it
respects the UA stylesheet.

But if you're trying to reset all properties (and thus, likely trying to isolate
a subtree from CSS inheritance), you really want `initial` largely because
`revert` just becomes `inherit` for any non-UA styles.

### Could we Create a Better Option?

Writing this out now, it seems counter-intuitive that `revert` effectively acts
like `inherit` for anything not in the UA stylesheet, especially since any
well-behaved web page generally should not require knowledge of the UA
stylesheet and remain compatible with whatever an arbitrary browser might use.
But if you're using `revert`, you are likely trying to opt-out of inheritance in
particular and reset a given property to its "default" value (in this case,
interpreting "default" as including the UA stylesheet).

So I wonder if there would be value in a CSS keyword which actually does that.
Not to introduce even more confusion into this space, but what if we had a
(tentatively named) `revert-initial` keyword which is identical to `revert`
except that it just skips the inheritance step:

> `revert-initial` resets the property either to user agent set value, to
user set value, ~~to its inherited value (if it is inheritable),~~ or to initial
value.

I'm sure there is a reason for why the spec authors chose to use inheritance
before the `initial` value and likely my use case just isn't quite what the
original intent of `revert` was.

But `revert-initial` as I'm describing it would eliminate the issue for non-UA
styles mentioned above and I think simplify the intent of the feature. Any
developer who wants to "use the default value after taking the UA stylesheet
into account" would likely not expect inheritance to come into play and
`revert-initial` is probably closer to what they actually want.

I'm still not entirely sure `revert-initial` would be better for this use case
due to the issue of
[inheriting from UA elements](#inherited-properties-from-ua-elements)
still being present, but I think it may turn into more of a value judgement call
rather than a clear technical decision.

But until something like that happens, `all: initial;` is the clear winner
whenever you need to isolate CSS inheritance.

## Acknowledgements

**Huge** shout out to
[Jeremy Elbourn](https://bsky.app/profile/jelbourn.bsky.social) for reviewing
this blog post and initially catching that `all: revert;` was the wrong solution
for this problem. I definitely could not have figured this all out without his
patience through several deeply technical conversations on the topic to help me
understand the nuances at play.

Also a big thank you to [Una Kravets](https://una.im/) for clarifying what was
happening with `color` and how Chrome manages these properties under the hood.

## Appendix

A few related topics for your reading pleasure:

### Shadow DOM

Whenever CSS isolation comes up in conversation, the immediate answer many devs
jump to is
[shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM).
CSS leakage takes several different forms, and shadow DOM is a particularly
useful tool for preventing CSS _selectors_ from leaking into or out of a
particular shadow root. However, it does not prevent CSS _inheritance_, meaning
it does not apply to this particular problem.

<figure>
    <figcaption>Example 8: Shadow DOM Inheritance.</figcaption>

<aside>
Note: This demo relies on declarative shadow DOM which
<a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLTemplateElement/shadowRootMode"
    target="_blank"
    rel="noopener">isn't <em>quite</em> baseline yet</a>,
so older browsers might not render it correctly.
</aside>

```html
<div id="parent-root" style="color: red;">
    #shadowRoot
        <div id="child-root">Still red. :(</div>
    #/shadowRoot
</div>
```

```inline-html
<div style="color: red;">
    <template shadowrootmode="open">
        <div>Still red. :(</div>
    </template>
</div>
```

</figure>

Shadow DOM simply solves a different CSS isolation problem than the one
described here.

### `@scope`

Similar to [shadow DOM](#shadow-dom),
[<code>@scope</code>](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope)
also prevents CSS selectors from leaking out of a specific subtree:

```css
@scope (#parent-root) to (#child-root) {
  div {
    color: red;
  }
}
```

The above example ensures the `div` selector only matches elements within the
parent app, but it does nothing to prevent the `color: red;` style from
inheriting down into the child application.

![A meme of an crude MS Paint paint drawing in which a character dressed as a
kind of shark (I dunno) who says "No, see, that solution is for a different
problem than the one I have."
](./different-problem.avif)(./different-problem.webp)

`@scope` is also not supported in all browsers just yet, but I'm excited to see
broader support for it and suspect it will be useful for the wider CSS isolation
story once it becomes Baseline.

### `revert-layer`

So `revert-layer` is a really unique alternative to `initial` and `revert`. Its
intended use case to revert the styles only in a specific CSS `@layer`. This
could hypothetically be used to revert the styles from a parent application in
all the child application's elements.

I won't go too far into specifics, because I promised myself this would be
shorter than my average blog post, but you can put each application's styles
into their own `@layer`, and then have the child app container revert the parent
app's layer.

<figure>
    <figcaption>Example 9: <code>@layer</code>.</figcaption>

```css
@layer parent {
    /* Parent application styles... */
    #parent-root {
        font-weight: bold;
    }
}

@layer child {
    /* Child application styles... */
}

/* Revert the parent layer on the child root element. */
@layer parent {
    #child-root {
        font-weight: revert-layer;
    }
}
```

```html
<div id="parent-root">
    <div>I'm bold!</div>

    <div id="child-root">
        <div>I'm still bold?</div>
    </div>
</div>
```

```inline-html
<div id="revert-layer-demo" class="parent-root">
    <div>I'm bold!</div>

    <div class="child-root">
        <div>I'm still bold?</div>
    </div>
</div>
```

</figure>

This _feels_ like it would work, but actually doesn't, because `revert-layer`
only resets styles for the particular elements matched by its selector. This
resets the entire property for that element, it does not prevent inheritance for
an arbitrary descendant.

The correct usage would be:

```css
@layer parent {
    /* Revert on the `#parent-root` element. */
    #parent-root {
        font-weight: revert-layer;
    }
}
```

This does revert the style and renders with `font-weight: normal;` as a result,
however this gets applied to the `#parent-root` element, meaning we've broken
the `font-weight` styling for the _parent app_.

I suppose that's one way to isolate an application, just break the styling of
all the other apps on the page so their CSS can never leak into you. 😈

The net result is that you can't use `revert-layer` as a mechanism to prevent
CSS inheritance. This is somewhat to be expected really, it reverts layers, not
inheritance.

### CSS Variables

`all` applies to all CSS properties (with minor exceptions), but does _not_
apply to CSS variables. As a foundational primitive, it makes sense to support
resetting all CSS properties while still allowing CSS variables to inherit.
However, for this use case of CSS isolation between multiple apps, preventing
variable inheritance is equally as important. The fact that `all` does not apply
to variables is actually _incredibly_ frustrating, as there is no equivalent
property which does. This forces us into an entirely different and much more
complicated solution to isolate CSS variables. One which potentially deserves
its own blog post, but that's for another time. Stay focused here, Devel.

[Lea Verou](https://lea.verou.me/) has
[a great post](https://lea.verou.me/blog/2025/style-observer/) on the history of
observing CSS variables and the current state-of-the-art solution. But even that
solution requires up front knowledge of all the variables you want to observe,
which isn't really viable for this use case, and isn't really compatible with
SSR without a form of DOM emulation.

I really wish there was some kind of `all-vars: initial;` property which would
do this. But as of now, the web platform lacks the right primitives to isolate
CSS variables. 😢

### The Case Against User-Agent Stylesheets

Hot take: I'm not convinced user-agent stylesheets are a good idea.

I understand the general goal for UA stylesheets and I'm enough of a proponent
of the open web to want to support different browsers innovating with different
presentations, or users customizing their interfaces to fit their personal
preferences or accessibility needs.

But I struggle to see how these can be practically managed as a web developer.

I mentioned earlier how `div { display: block; }` is actually in the UA
stylesheet, despite the fact most developers would perceive this as plain
default behavior for `div`. However, as far as I can tell, nothing in the HTML
standard actually specifies that `div` _must_ be `block`.

This appears as a
["suggestion"](https://html.spec.whatwg.org/multipage/rendering.html#rendering)
in how
[flow content should be rendered](https://html.spec.whatwg.org/multipage/rendering.html#flow-content-3).
It
[also says](https://html.spec.whatwg.org/multipage/infrastructure.html#renderingUA)
user agents "_may_ be designated... as supporting the suggested default
rendering" and that they are "encouraged to offer settings that override this
default".

Therefore, I believe (spec authors feel free to correct me) that it would
technically be consistent with the spec for a browser to set something like
`div { display: inline-flex; }` in the UA stylesheet. Imagine how breaking that
would be on the entirety of the web! Is there any viable world in which the
browser vendor could argue, "Meh, the fact that all these web pages render
incorrectly with our innovative `inline-flex` UA stylesheet are bugs in those
pages, they're relying on the non-standard `block` default." No one would
support that browser and users would justifiably complain until the vendor
relented and switched to `block`.

More realistically, if a vendor creates a new device with its own UX standard
and tweaks the UA stylesheet to fit their design (think a new platform like
Android or iOS), what guarantee is there that this design will look in any way
reasonable or even just not visibly break layouts when applied to the vast
majority of existing applications with their own custom styling?

When each browser has a different "default stylesheet", it just makes for
unreliable default values. Many developers use a
[CSS reset](https://en.wikipedia.org/wiki/Reset_style_sheet) specifically to
normalize these kinds of browser differences into a uniform default state,
effectively negating the intent behind UA styles in the first place.

I can see a slightly stronger accessibility argument in favor of UA styles,
where users might want to tweak or configure their browser to work better for
them, but I'm not convinced this is really the right solution. The web has
plenty of accessibility hooks from dark theme, to high contrast mode, to
configurable font sizes, with more being added every day. These can be added to
the platform without necessarily relying on unpredictable UA stylesheets, though
I'm certainly no expert and would be interested to hear if there are more
accessibility use cases with a harder dependency on UA stylesheets than I'm
aware of.

Anyways, thanks for coming to my Ted talk.
