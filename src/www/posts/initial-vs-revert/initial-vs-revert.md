---
tags: posts
layout: pages/post
# TODO: Home page escaping? Needs `<code>` I think?
title: Isolating CSS Inheritance
date: 2025-08-29T12:00:00-07:00 # TODO
excerpt: |
  TODO
# TODO: CSS
languages: [ html ]
---

# Isolating CSS Inheritance

I was recently looking into tackling CSS isolation between multiple applications
running on the same web page and came away with a much better understanding of
the CSS `initial` and `revert` keywords which I wanted to share.

## The Problem

When running multiple applications, built at different commits and deployed at
arbitrary times on the same web page, we need to take care that CSS styling does
not leak from app into the other. This is extra complicated because one
application may be rendered _inside_ another, meaning CSS properties may inherit
from one app to another.

<figure>
    <figcaption>Example TODO: Leaking Properties.</figcaption>

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
<div id="parent-root" style="color: red;">
    <div>I'm red, just like I expected!</div>

    <!-- Child application -->
    <div id="child-root">
        <div>I'm red? I expected to default to black.</div>
    </div>
</div>
```

</figure>

In this scenario, since the child app is independently built and deployed from
the parent app, they should be very well isolated from each other, and arbitrary
internal changes in one app (such as text color) should not affect the other.

However in this case, the parent's `color: red;` style is inherited into the
child app and color its text. This style is effectively _leaked_ across
applications.

Now there are numerous ways styles can leak from application to another, all of
which require unique solutions. But for this post, we'll just focus on CSS
inheritance. So what can we do to isolate these two apps from each other?

(And if your immediate thought is "Use shadow DOM!" I'm afraid that actually
[does not help at all here](#shadow-dom).)

## `all`

The immediately obvious answer is to override `color: black;` on the child app
root.

<figure>
    <figcaption>Example TODO: Overriding <code>color</code>.</figcaption>

```html
<div id="parent-root" style="color: red;">
    <div id="child-root" style="color: black;">
        <div>I'm black!</div>
    </div>
</div>
```

```inline-html
<div id="parent-root" style="color: red;">
    <div id="child-root" style="color: black;">
        <div>I'm black!</div>
    </div>
</div>
```

</figure>

But listing out every CSS property and its default value would be quite
complicated and tedious.

Fortunately, CSS has a useful property for this very problem.
[<code>all</code>](https://developer.mozilla.org/en-US/docs/Web/CSS/all) applies
a single value to _all_ CSS properties (with some exceptions) for a particular
element.

Each CSS property has a different type, meaning there is no specific value you
can provide which is meaningful to _every_ property. But there are CSS base
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

So that leaves us with `initial` and `revert` as potential candidates, let's
look at each.

## `initial`

[From MDN:](https://developer.mozilla.org/en-US/docs/Web/CSS/initial)

> The `initial` CSS keyword applies the initial (or default) value of a property
to an element.

Ok, seems straightforward. Every CSS property has a default value and setting it
to `initial` uses that default value.

Let's look at `display` as an example.
[MDN will tell you](https://developer.mozilla.org/en-US/docs/Web/CSS/display#formal_definition)
that the default value of `display` according to the CSS spec is `inline`. So
setting `display: initial;` is really just using `display: inline;`, simple as
that.

If `inline` sounds weird because you expected `block` to be the default, that's
likely because you're thinking of `div`, which is an exception we'll get to
shortly. Create an element with an arbitrary tag name like `my-random-element`
and check DevTools and you can confirm the default is indeed `display: inline;`.

The context of `all`, we're using the default value for every property as
specified by the CSS standard.

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

### The User-Agent Stylesheet

Every browser includes a
["user-agent stylesheet"](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascade/Cascade#user-agent_stylesheets),
(UA stylesheet) this is an additional set of CSS selectors applied to all web
pages with some browser specific styling.

This stylesheet is why a plain `<button>` element with no CSS looks just a
_little_ different between browsers in order to match the system UI users expect
on their particular platform. For example, consider the visual design of a
default button on desktop Windows vs mobile iOS.

This is literally a stylesheet, and one you can observe in DevTools or just
looking at browser source code (TODO: link to Chrome's user-agent stylesheet).
This is also how the `div` exception gets handled. Browsers include in their
user-agent stylesheet:

```css
div {
    display: block;
}
```

This is why `div` elements always default to `block`, even though the initial
value of `display` is actually `inline`.

Some browsers / extensions even allow you to modify the user-agent stylesheet
to apply some CSS to every page you visit.

Ideally, we want to respect the user's intent and configured settings. If they
have configured their browser with something like `div { color: magenta; }`
because they genuinely find that easier to read, then more power to them, and
our website should follow that preference.

Stepping back to `revert`, recall that it resets to the "user agent set value",
meaning it resets a CSS property to the default
_after taking the user-agent stylesheet into account_.

We can demonstrate the difference with `initial` using the `div` example:

<figure>
    <figcaption>
        Example TODO: <code>display: initial;</code> vs
        <code>display: revert;</code>.
    </figcaption>

```html
<!-- Two elements stack horizontally because they're inline. -->
<div style="display: initial;">I'm `inline`!</div>
<div style="display: initial;">I'm to the side!</div>

<br><br>

<!-- Two elements stacked vertically because they're block. -->
<div style="display: revert;">I'm `block`!</div>
<div style="display: revert;">I'm underneath!</div>
```

```inline-html
<!-- Two elements stack horizontally because they're inline. -->
<div style="display: initial;">I'm `inline`!</div>
<div style="display: initial;">I'm to the side!</div>

<br><br>

<!-- Two elements stacked vertically because they're block. -->
<div style="display: revert;">I'm `block`!</div>
<div style="display: revert;">I'm underneath!</div>
```

</figure>

Based on this description and our desire to respect the user-agent stylesheet,
it seems like the obvious answer to isolating CSS inheritance is `revert`, but
it's surprisingly more nuanced than that.

Recall that the goal here is to isolate multiple apps such that inherited
properties from one don't leak into the other. But let's break down a few
sub-cases and see what actually happens in practice.

## Non-Inherited Properties

Let's start with non-inherited properties. Much like how every property has a
defined `initial` value, each property is defined as either inherited or not.
`display` for instance is
[not inherited](https://developer.mozilla.org/en-US/docs/Web/CSS/display#formal_definition).

<figure>
    <figcaption>Example TODO: Non-Inherited CSS.</figcaption>

```html
<div id="parent-root" style="display: inline-block;">
    <div id="child-root-initial" style="all: initial;">
        <div>`initial`: I'm still `block`!</div>
        <div>I'm underneath the block.</div>
    </div>

    <br>

    <div id="child-root-revert" style="all: revert;">
        <div>`revert`: I'm still `block`!</div>
        <div>I'm also underneath the block.</div>
    </div>
</div>
```

```inline-html
<div id="parent-root" style="display: inline-block;">
    <div id="child-root-initial" style="all: initial;">
        <div>`initial`: I'm still `block`!</div>
        <div>I'm underneath the block.</div>
    </div>

    <br>

    <div id="child-root-revert" style="all: revert;">
        <div>`revert`: I'm still `block`!</div>
        <div>I'm also underneath the block.</div>
    </div>
</div>
```

</figure>

In this case, `initial` vs `revert` doesn't actually make a difference! Other,
inherited styles like `font-size` are different which we'll get to in a moment,
but the important part here is that `display` is the same.

Since `display` isn't inherited, the `inline-block` on `#parent-root` _only_
applies to that element. All leaf `<div>` elements ultimately use `block`.

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

## Inherited Properties not in the UA Stylesheet

TODO

## Inherited Properties in the UA Stylesheet

TODO

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
    <figcaption>Example TODO: Shadow DOM Inheritance.</figcaption>

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
<div id="parent-root" style="color: red;">
    <template shadowrootmode="open">
        <div id="child-root">Still red. :(</div>
    </template>
</div>
```

</figure>

Shadow DOM simply solves a different CSS isolation problem than the one
described here.

### `revert-layer`

TODO: We can hypothetically generate each app's CSS in an `@layer` and then
revert that CSS. However that reverts the _selector_, not the inherited
property. You'd need to `revert-layer` on the _parent_ element the selector
applied to, which would break the parent's styling.

### The Case Against User-Agent Stylesheets

TODO: Worth ranting about why user-agent stylesheets are kinda dumb? Could a new
browser reasonably set `div { display: inline; }`? If a new platform adds a new
stylesheet, there's no guarantee it will look good. They're just unreliable
defaults. CSS resets are clearly necessary.
