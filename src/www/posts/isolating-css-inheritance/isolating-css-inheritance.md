---
tags: posts
layout: pages/post
title: Isolating CSS Inheritance
date: 2025-08-29T12:00:00-07:00 # TODO
excerpt: |
  TODO
# TODO: CSS
languages: [ html ]
additional_styles: [ isolating-css-inheritance ]
---

# Isolating CSS Inheritance

TODO: Test Firefox / Safari and/or call out Chrome-specific UA.

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
<div style="color: red;">
    <div>I'm red, just like I expected!</div>

    <!-- Child application -->
    <div>
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

Also if you're first thought was to reach for shadow DOM nor `@scope`, I'm
afraid neither are viable alternatives for this particular problem due to the
focus on CSS inheritance specifically (explanation of
[shadow DOM](#shadow-dom) and [<code>@scope</code>](#scope) insufficiencies).

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
<div style="color: red;">
    <div style="color: black;">
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
looking at
[browser source code](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/html/resources/html.css;drc=5606f221713df59faee4d92851998db4d9d15aeb).
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
<div style="display: inline-block;">
    <div style="all: initial;">
        <div>`initial`: I'm still `block`!</div>
        <div>I'm underneath the block.</div>
    </div>

    <br>

    <div style="all: revert;">
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

## Inherited Properties _on_ UA Elements

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
    <figcaption>Example TODO: Inherited on UA Element</figcaption>

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

TODO: Showing link chip on demo `h1` tags.

Since the UA stylesheet explicitly defines `font-weight: bold;` through an
`h1` selector, the property is applied _directly_ to the `h1` element.
Therefore, there is no need for the browser to check ancestors and no way to
accidentally inherit another value.

## Inherited Properties _from_ UA Elements

The last and most complicated example inverts the previous one. Instead of
putting `initial` or `revert` directly _on_ an element with an inherited UA
style, we reset an element which inherits _from_ another element with a UA
style.

<figure>
    <figcaption>Example TODO: Inherited from UA Element</figcaption>

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

This is one difference which matters for this multi-app use case and begs the
question: Do we _want_ the child app to be bold in this scenario?

I can actually see an argument for both. Since the parent and child applications
are intended to be independently developed by different teams and deployed with
minimal coupling, there is no way for the child app to know whether or not it
will be loaded in a bold `h1` tag or any other tag. This presents a hazard,
where the parent might incorrectly render the child in a context it did not
expect and the UA styles from that context break the UI of the child
application. `initial` solves this problem and keeps the child application
looking the way its developers intended.

The alternative argument is that the parent has decided to render the child
application inside an `h1` tag, explicitly believing this child to make sense in
that context. If the child app is genuinely just rendering some title text, then
`revert` would correctly retain the desired bold behavior. The parent app is
somewhat implicitly configuring the child app to fix the desired UX.

This is a bit of an academic argument, since it is hard to imagine a valid use
case for rendering a completely different application inside an `h1` tag.
Skimming over other styles in Chrome's UA stylesheet, there's honestly not many
inherited properties in there, and the ones which are present tend to be on
"leaf" elements like `<input>` or `<select>`. So the practical situations in
which this matters are unlikely to ever come up in practice.

Of course Chrome is only one browser, and others may use more inherited
properties or some user / tools may expressly customize their UA stylesheet with
more inherited properties where this might be more of a practical issue.

## Non-UA Inherited Properties

You might have noticed that I didn't use `color` in any of the above demos,
despite typically being the most immediately obvious inherited property. That's
because
[<code>color</code>](https://developer.mozilla.org/en-US/docs/Web/CSS/color)
hits a different edge case I want to discuss here.

If we try the same demo with `color`, we notice that `revert` doesn't actually
revert anything.

<figure>
    <figcaption>Example TODO: Non-UA Inherited Properties.</figcaption>

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

This `revert` ain't reverting, so what's going on? Well, let's look at the
[definition of `revert`](https://developer.mozilla.org/en-US/docs/Web/CSS/revert)
once more (emphasis mine):

> \[`revert`\] resets the property either to user agent set value, to user set
value, **to its inherited value (if it is inheritable)**, or to initial value.

So `revert` prefers the UA stylesheet when it configures the property, but for
any properties _not_ set through the UA stylesheet, it will inherit from its
ancestors before using the `initial` value.

You might expect something like `html { color: black; }` in the UA stylesheet,
but this is not the case.
[Chrome](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/html/resources/html.css;drc=5606f221713df59faee4d92851998db4d9d15aeb)
has some usage of `color` in certain form elements, but no general "use `black`
as the default text color" style. The default value of `color` is handled
through a different abstraction than UA stylesheets.

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

## Takeaways

Ultimately, we decided to go with `all: initial;` to reset styles. The risk of
breaking another application's UI based on where you render it seemed like the
bigger issue. If a child app wants to support such a "bold" use case, it should
expose this functionality as an explicit option configured by the parent
application.

My biggest surprise from this investigation was how little the difference
between `initial` and `revert` actually is. The only two cases this comes into
play is:
1. when inheriting a style from an element with a UA style (which is a that
situation just doesn't come up as often as you might think).
2. when a style is _not_ in the UA stylesheet.

If you're trying to reset a specific property on a specific element, I suspect
`revert` is likely closer to what you'd want most of the time.

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

So I wonder if there would be value in a property which actually does that. Not
to introduce even more confusion into this space, but what if we had a
`revert-initial` value which just skips the inheritance step of `revert`:

> `revert-initial` resets the property either to user agent set value, to
user set value, ~~to its inherited value (if it is inheritable),~~ or to initial
value.

I'm sure there is a reason for why the spec authors chose to use inheritance
before the `initial` value and likely my use case just isn't quite what the
original intent of `revert` was.

But `revert-initial` as I'm describing it would eliminate the issue for non-UA
styles mentioned above and I think simplify the intent of the feature. For any
developer who wants to "use the default value, while taking the UA stylesheet
into account" would likely not expect inheritance to come into play and
`revert-initial` is likely closer to what they actually want.

I also think the above argument for `initial` over `revert` is noticeably
weakened when we switch to debating `initial` vs `revert-initial`. I'm still not
entirely sure `revert-initial` would be better for this use case due to the
issue of [inheriting from UA elements](#inherited-properties-from-ua-elements)
still being present, but I think it may turn into more of a value judgement call
rather than a clear technical decision.

## Acknowledgements

**HUGE** shout out to
[Jeremy Elbourn](https://bsky.app/profile/jelbourn.bsky.social) who initially
caught that `all: revert;` was the wrong solution for this problem and for
several deeply technical conversations on the topic to help me understand the
nuances here. I definitely could not have figured this out without him.

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
prevents a different form of CSS leaking by limiting selectors to a specific
subtree.

```css
@scope (#parent-root) to (#child-root) {
  div {
    color: red;
  }
}
```

The above example ensures the `div` selector is only against elements within the
parent app, but it does nothing to prevent the `color: red;` style from
inheriting down into the child application. `@scope` is just solving a different
problem than the one we have here.

`@scope` is also not supported in all browsers just yet, but I'm excited to see
broader support for it and suspect it will be useful for the wider CSS isolation
story once it becomes Baseline.

### CSS Variables

`all` applies to all CSS properties (with minor exceptions), but does _not_
apply to CSS variables. As a foundational primitive, it makes sense to support
resetting all CSS properties while still allowing CSS variables to inherit.
However for this use case of CSS isolation between multiple apps, this
limitation is actually _incredibly_ frustrating, as there is no equivalent
property which does apply to CSS variables. This forces us into an entirely
different and much more complicated solution to isolate CSS variables.

I really wish there was some kind of `all-vars: initial;` property which would
do this, but unfortunately the web platform just doesn't have the right
primitives to make this viable right now.

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
    <figcaption>Example TODO: <code>@layer</code>.</figcaption>

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
does only resets styles for the particular elements matched by its selector.
This reset the entire property for that element, it does not prevent inheritance
for an arbitrary descendant.

The correct usage would be:

```css
@layer parent {
    /* Revert on the `#parent-root` element. */
    #parent-root {
        font-weight: revert-layer;
    }
}
```

This does revert the style and renders `font-weight: normal;` as a result,
however this gets applied to the `#parent-root` element, meaning we've broken
the `font-weight` styling for the _parent app_.

I suppose that's one way to isolate the child app.

The net result is that you can't use `revert-layer` as a mechanism to prevent
CSS inheritance. This is somewhat to be expected really, it reverts layers, not
inheritance.

### The Case Against User-Agent Stylesheets

Hot take: I'm not convinced user-agent stylesheets are a good idea.

I understand the general goal for UA stylesheets and I'm enough of a proponent
of the open web to want to support different browsers innovating in different
ways, or users customizing their interfaces to fit their personal preferences or
accessibility needs.

But I struggle to see how these can practically be practically managed as a web
developer.

I mentioned earlier how `div { display: block; }` is actually in the UA
stylesheet, despite the fact most developers would perceive this as plain
default behavior for `div`. It turns out, nothing in the HTML standard actually
specifies that `div` _must_ be `block`. This only appears as a
["suggestion"](https://html.spec.whatwg.org/multipage/rendering.html#rendering)
in how
[flow content should be rendered](https://html.spec.whatwg.org/multipage/rendering.html#flow-content-3).

Therefore I believe it would technically be consistent with the spec for a
browser to set something like `div { display: flex; }` in the UA stylesheet.
Imagine how breaking that would be on the entirety of the web! Is there any
viable world in which the browser vendor could argue, "Meh, the fact that this
web page renders incorrectly with `div { display: flex; }` in the UA stylesheet
is a bug in that page, it's relying on the non-standard `block` default." No one
would support that browser and users would justifiably complain until the vendor
relented and switched to `block`.

More realistically, if a vendor creates a new device with its own UX standard
and tweaks the UA stylesheet to fit their design (think Android or iOS), what
guarantee is there that this design will look in any way reasonable or even just
not visibly break layouts when applied to the vast majority of existing
applications with their own custom styling?

When each browser has a different "default stylesheet", it just makes for
unreliable default values. It is quite common for developers to use a
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
