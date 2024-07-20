---
tags: posts
layout: pages/post
title: HTML Whitespace is Broken
date: 2024-07-13T12:00:00-07:00
excerpt: TODO
languages: [ html, typescript ]
additional_styles: [ whitespace ]
---

# HTML Whitespace is Broken

```timestamp
```

Recently I have been working on a project which required a deeper understanding
of how whitespace works in HTML. I was never a fan of HTML's whitespace behavior
before as I've been burned by it a few times. As I dug into it more deeply I
found myself discovering complex design issues that I wanted to explore in a
blog post. This is partially to write down my knowledge in this space for future
reference and partially to vent about how unnecessarily complicated it all is.

## How HTML Whitespace Works

[MDN has a great article](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Whitespace)
explaining whitespace in HTML but I'll try to break it down here.

The quickest way of understanding whitespace in HTML is that it _mostly_ does
not matter. You can indent and space elements as much as you want. However, if
any spaces, tabs, or newlines exist between two elements, they will be reduced
into a single space which is added as a text node between the elements.

This means two adjacent links will render differently based on whether or not
there is a space between them. Newlines and tabs are also interpreted as spaces.

<figure>
    <figcaption>Example 1: No whitespace.</figcaption>

```html
<a href="#">First</a><a href="#">Second</a>
```

```inline-html
<a href="#" class="demo-link">First</a><a href="#" class="demo-link">Second</a>
```

</figure>

<figure>
    <figcaption>Example 2: Single space.</figcaption>

```html
<a href="#">First</a> <a href="#">Second</a>
```

```inline-html
<a href="#" class="demo-link">First</a> <a href="#" class="demo-link">Second</a>
```

</figure>

<figure>
    <figcaption>Example 3: Newline.</figcaption>

```html
<a href="#">First</a>
<a href="#">Second</a>
```

```inline-html
<a href="#" class="demo-link">First</a>
<a href="#" class="demo-link">Second</a>
```

</figure>

This behavior of reducing multiple whitespace characters into a single space is
called whitespace "collapsing". It also means that adding additional spaces has
no effect. It's exactly the same as having one space.

<figure>
    <figcaption>Example 4: Lots of spaces.</figcaption>

```html
<a href="#">First</a>       <a href="#">Second</a>
```

```inline-html
<a href="#" class="demo-link">First</a>       <a href="#" class="demo-link">Second</a>
```

</figure>

This makes some amount of sense to me. The difference between 1. and 2. is clear
in the code, obviously the developer intentionally put a space in 2. and it
follows that 1. would not have any space between its links.

The space between the tags is rendered as an independent text node, meaning it
does not inherit the styles for either of the `<a>` tags. It does not include an
underscore and clicking the whitespace does not trigger either link. Given that
the space is not in either `<a>` tag, that seems pretty reasonable to me.

But let's keep experimenting. If we put this inside an `<span>` tag, then any
leading and trailing whitespace is _not_ preserved.

<figure>
    <figcaption>Example 5: Indented.</figcaption>

```html
<span>
            <a href="#">First</a>
            <a href="#">Second</a>
</span>
```

```inline-html
<span>
            <a href="#" class="demo-link">First</a>
            <a href="#" class="demo-link">Second</a>
</span>
```

</figure>

Even though there are many spaces before the first `<a>` and after the second
`</a>`, they do not render to the user. This is because whitespace at the start
of rendering context (basically whitespace before the first line of a block) is
removed completely.

Typically spaces which are visible to the user are referred to as _significant_,
while spaces which are not rendered are considered _insignificant_. For the
above example, the spaces between the first `</a>` and second `<a>` are
significant because they will be collapsed to a single space and rendered as a
text node. The spaces before the first `<a>` and after the second `</a>` are
insignificant and not displayed to the user.

This also applies to whitespace inside a tag. Consider these examples:

<figure>
    <figcaption>Example 6: Basic link.</figcaption>

```html
Hello, <a href="#">World</a>!
```

```inline-html
Hello, <a href="#" class="demo-link">World</a>!
```

</figure>

<figure>
    <figcaption>Example 7: Spaced link.</figcaption>

```html
Hello, <a href="#"> World </a>!
```

```inline-html
Hello, <a href="#" class="demo-link"> World </a>!
```

</figure>

<figure>
    <figcaption>8. Very spacey link.</figcaption>

```html
Hello, <a href="#">        World          </a>!
```

```inline-html
Hello, <a href="#" class="demo-link">        World          </a>!
```

</figure>

In 7. we can see that the space between "World" and "!" is preserved because the
space includes the underscore from the link and if you click that space
precisely enough you'll actually follow the link.

In fact 7., shows even more collapsing. There are actually _two_ spaces between
"Hello," and "World". One outside the `<a>` tag and the other inside it. You
might expect this to render two spaces, the latter of which is underlined
because it is a part of the link.

However the browser actually collapses both spaces together and only displays
one. The begs the question: Which space is preserved? How does the browser
decide?

In my testing, it seems like the space is always included in the former text. 7.
shows the text is outside the link, so let's swap the ordering in 9. below.

<figure>
    <figcaption>Example 9: Link before text.</figcaption>

```html
<a href="#">Hello, </a> World!
```

```inline-html
<a href="#" class="demo-link">Hello, </a> World!
```

</figure>

Here we see that the space _does_ include the link underscore so the space was
again given to the preceding text node.

This also highlights the most common foot gun I've seen, links with extra
spaces. Consider this example:

<figure>
    <figcaption>Example 10: Long link text.</figcaption>

```html
Hello, <a href="#">
    here is some long link text which I put on its own line
</a> please take a look at it!
```

```inline-html
Hello, <a href="#" class="demo-link">
    here is some long link text which I put on its own line
</a> please take a look at it!
```

</figure>

You'll notice here that the space after the link ends is considered part of the
link and the underscore trails one character farther than you might expect.
Since the link is on its own line, the text ends with a newline character before
the `</a>`. This means the link technically ends with the whitespace. There's
also a space after the `</a>`, but as mentioned the space goes to the preceding
text which is the link in this case. The solution here is to remove the newline
at the end of the `<a>` tag by reformatting it, line length limits be dammed.

<figure>
    <figcaption>Example 11: Single-line link.</figcaption>

```html
Hello,
<a href="#">here is some long link text which I put on its own line</a>
please take a look at it!
```

```inline-html
Hello,
<a href="#" class="demo-link">here is some long link text which I put on its own line</a>
please take a look at it!
```

</figure>

### Block Elements

All of the above applies to _inline_ HTML elements.

_Block_ elements are similar, but preserve less whitespace. Any spaces between
block elements are dropped on the assumption that you don't want any block to
have leading or trailing whitespace and you don't want any blocks of only
whitespace.

<figure>
    <figcaption>Example 12: Block elements without whitespace.</figcaption>

```html
<div>Hello</div><div>World</div>
```

```inline-html
<div>Hello</div><div>World</div>
```

</figure>

<figure>
    <figcaption>Example 13: Block elements with whitespace.</figcaption>

```html
<div>Hello</div>      <div>World</div>
```

```inline-html
<div>Hello</div>      <div>World</div>
```

</figure>

<figure>
    <figcaption>Example 14: Block elements with newline.</figcaption>

```html
<div>Hello</div>
<div>World</div>
```

```inline-html
<div>Hello</div>
<div>World</div>
```

</figure>

In this case there's actually no difference between the examples because all the
whitespace differences are ignored and newlines are placed between the blocks.
Example 12. does not actually contain _any_ whitespace yet the two `<div>` tags
are rendered with a newline between them.

### CSS

So this means HTML's whitespace rules actually _vary_ based on how you're
rendering the text. So let's do a quick pop quiz, how do you expect the
following to render?

<figure>
    <figcaption>Example 15: <code>&lt;aside&gt;</code> without whitespace.</figcaption>

```html
<aside>Hello</aside><aside>World</aside>
```

</figure>

You might intuitively think, "Well `<aside>` is a block element, so it should
follow the same rules as `<div>`. Therefore this will render exactly like
example 12., and there's a newline between them."

That's very well-reasoned of you, and you are correct... _most_ of the time...
This is actually a trick question. `<aside>` is natively a block element, but it
doesn't have to be. Therefore you can actually render different spacing based on
how you _style_ the element.

<figure>
    <figcaption>Example 16: Block <code>&lt;aside&gt;</code>.</figcaption>

```html
<style>aside { display: 'block'; }</style>
<aside>Hello</aside><aside>World</aside>
```

```inline-html
<aside>Hello</aside><aside>World</aside>
```

</figure>

<figure>
    <figcaption>Example 17: Inline <code>&lt;aside&gt;</code>.</figcaption>

```html
<style>aside { display: 'inline'; }</style>
<aside>Hello</aside><aside>World</aside>
```

```inline-html
<aside style="display: inline;">Hello</aside><aside style="display: inline;">World</aside>
```

</figure>

The same HTML can actually lead to different whitespace behavior. That might not
sound too bad, after all this is exactly the layout difference between `block`
and `inline`. However it actually _changes_ the text displayed to the user.
Example 16. displays two strings, "Hello" and "World". While 17. displays a
single string "HelloWorld". There's a semantic difference between those two
options, not just a styling distinction.

You can actually observe this distinction in JavaScript through
[`textContent`](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent)
and
[`innerText`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/innerText)
on a parent element. The former joins the strings together with no spacing in
both cases.

```
> parentOfBlockAsides.textContent
'HelloWorld'
> parentOfInlineAsides.textContent
'HelloWorld'
```

However `innerText` adds a newline for the `block` elements _only_:

```
> parentOfBlockAsides.textContent
'Hello\nWorld'
> parentOfInlineAsides.textContent
'HelloWorld'
```

[Per MDN](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent#differences_from_innertext),
`innerText` is "aware of styling" so it can tell the difference between these
two examples in a way `textContent` cannot.

You can even hear the difference with text-to-speech tools! Windows Narrator on
Chrome treats block elements as different text fields while inline elements are
joined into a single word.

Here I put the word "Refrigerator" split across multiple `<aside>` tags. The
first attempt uses the default `display: block;` while the second is
`display: inline;`.

```video
{
    "type": "demo",
    "urls": ["./demos/1-refrigerator.mp4"],
    "size": [1920, 1080],
    "subtitles": "./demos/1-refrigerator.vtt",
    "audible": true,
    "loop": true
}
```

Narrator treats the first attempt as four different words. It implicitly
converts "fri" to "Friday" (assuming certain semantics on the text) and can't
pronounce "ger" at all, choosing to spell it out instead as "g-e-r".

The second attempt correctly speaks "Refrigerator" even though it has identical
DOM structure to the first attempt. The only difference is the CSS `display`.

This is also interesting because it means that whitespace handling is actually
not done by the HTML parser. The parser must retain all spaces because it's
actually the CSS layer which decides whether or not those spaces are
significant.

This also implies that search engines may index different textual content based
on the CSS, which really bulldozes any idea of separation between the content
(HTML) and presentation (CSS) layers.

### `inline-block`

There's even _more_ nuanced behavior for `inline-block` elements! This starts to
get difficult for me to understand, so instead of trying to explain how it works
I'll just share
[this example from MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Whitespace#example_3)
with a couple boxes.

<figure>
    <figcaption>
        Example 18: <code>&lt;inline-block&gt;</code> with whitespace.
    </figcaption>

```html
<style>
    li {
        display: inline-block;
        width: 2em;
        height: 2em;
        background: red;
        border: 1px solid black;
    }
</style>
<ul>
  <li></li>
  <li></li>
</ul>
```

```inline-html
<ul class="inline-block-list">
  <li></li>
  <li></li>
</ul>
```

</figure>

You should see a small space between the two boxes. I've blown up the font size
to make this space more visible. But where does that space come from? There's no
margin or padding here. In fact, what if we change the HTML ever so slightly...

<figure>
    <figcaption>
        Example 19: <code>&lt;inline-block&gt;</code> without whitespace.
    </figcaption>

```html
<ul>
  <li></li><li></li>
</ul>
```

```inline-html
<ul class="inline-block-list">
  <li></li><li></li>
</ul>
```

</figure>

Since the `<li>` tags are inline blocks the space between them is considered
significant and rendered to the user. Shout out to the developer who had to
debug that spacing issue. And also shout out to Firefox which actually displays
a "whitespace" element in its DevTools to make this somewhat visible.

![Screenshot of Firefox rendering a web page with two pairs of boxes like above.
The first pair does not contain any spacing between them, while the second pair
does. DevTools is open to the "Inspector" panel showing the rendered DOM. It
contains two `<ul>` tags, each containing two `<li>` tags representing each box.
The elements are formatted in this view, so the whitespace around each of them
is meaningless. However between the two `<li>` tags in the second `<ul>` is a
small element labeled "whitespace". The user has clicked on this element and the
spacing between the second pair of boxes is highlighted and marked as `#text`,
indicating exactly where that spacing is coming from.
](./demos/2-ff-whitespace.avif)(./demos/2-ff-whitespace.png)

### Preformatted Text

"But wait!" I hear you say. "If you don't like HTML spacing, just use the
`<pre>` tag!"

Yes, that is a valid point. HTML does have a `<pre>` tag for "preformatted" text
which automatically preserves _all_ whitespace.

<figure>
    <figcaption>Example 20: Preformatted text.</figcaption>

```html
<pre>
Hello world
I am preformatted         text which is interesting.
    I'm indented more than the rest!
</pre>
```

```inline-html
<pre>
Hello world
I am preformatted         text which is interesting.
    I'm indented more than the rest!
</pre>
```

</figure>

No whitespace collapsing occurs and all of it is considered significant, with
one minor exception. There are actually two insignificant spaces. Specifically,
the first newline immediately following the initial `<pre>` (`<pre>\nHello...`)
and the last newline, the one immediately preceding the final `</pre>`
(`than the rest!\n</pre>`).

Neither of these newlines are rendered, there's no blank line at the start or
end of the rendered result. Surprisingly if we check `textContent` we don't see
the first newline, but we _do_ see the second newline, even though it's not
rendered. I have no idea why this is the case.

```
> preElement.textContent
'Hello world\n...than the rest!\n'
```

But if we add spaces between the `<pre>` and `</pre>` and their nearest
newlines... (I'm using `&#32;` to make these spaces visible in code, the
behavior is the same as a literal space character, more on this later).

<figure>
    <figcaption>
        Example 21: Preformatted text with leading/trailing spaces.
    </figcaption>

```html
<pre>&#32;
Hello world
I am preformatted         text which is interesting.
    I'm indented more than the rest!
&#32;</pre>
```

```inline-html
<pre>&#32;
Hello world
I am preformatted         text which is interesting.
    I'm indented more than the rest!
&#32;</pre>
```

</figure>

Now we get the empty lines and the start and end of the block. So the rule seems
to be:

```typescript
function renderPreformattedText(text: string): string {
    if (text.startsWith('\n')) text = text.trimStart();
    if (text.endsWith('\n')) text = text.trimEnd();
    return text;
}
```

Except `.textContent` shows the trailing newline but not the leading newline and
differs from this behavior, but let's not overcomplicate things, this blog would
never do that... 😅

I can see where the spec authors were going here. Usually if you're putting a
`<pre>` tag on the page, you're probably going to put a newline before the
content like so:

```html
<pre>
Some preformatted text
which is multiple lines.
</pre>
```

You're probably not going to do:

```html
<pre>Some preformatted text
which is multiple lines.</pre>
```

Even if that is more accurate when it comes to whitespace handling. The main
takeaway is that even `<pre>` isn't totally straightforward about its whitespace
logic, despite that being kind of the whole point of the tag.

`<pre>` is also just generally unergonomic. While the whitespace behavior is
definitely more intuitive, you can't indent it at all without affecting its
content. Compare these two examples:

<figure>
    <figcaption>Example 22: Indented <code>&lt;pre&gt;</code> tag.</figcaption>

```html
<pre>
    Hello, World!
</pre>
```

```inline-html
<pre>
    Hello, World!
</pre>
```

</figure>

<figure>
    <figcaption>
        Example 23: Double indented <code>&lt;pre&gt;</code> tag.
    </figcaption>

```html
<div>
    <pre>
        Hello, World!
    </pre>
</div>
```

```inline-html
<div>
    <pre>
        Hello, World!
    </pre>
</div>
```

</figure>

These both feel like they should contain the same text "Hello, World!", but 22.
is preceded by 4 spaces while 23. is preceded by 8 spaces and trailed with a
newline and another 4 spaces (because that last indent comes after the newline,
it triggers the trailing newline behavior mentioned earlier and we get a blank
line at the end).

So while `<pre>` does solve a number of whitespace issues I've described, it
causes a whole separate set of developer experience (DX) issues which make it
harder and less ergonomic to use correctly.

#### `white-space`

[The `white-space` CSS property](https://developer.mozilla.org/en-US/docs/Web/CSS/white-space)
adds even more complexity to this. It supports `white-space: pre;` which can
basically opt-in any element to the `<pre>` tag's parsing rules. It also
supports `pre-line`, `pre-wrap` and a few other possible options to further
configure the behavior for specific use cases.

As I mentioned earlier, whitespace processing is handled by CSS, not the HTML
parser so the
[standard which specifies this behavior](https://drafts.csswg.org/css-text/) is
actually maintained by the CSS working group and primarily focuses on the
behavior of the `white-space` property.

### `&nbsp;`

We've all been there. Two elements are right next to each other and you need
just a little spacing between them. What do you do? `&nbsp;`

If you've never understood what this actually is, `&nbsp;` is an
[HTML entity](https://developer.mozilla.org/en-US/docs/Glossary/Entity)
representing a non-breaking space. Specifically it's a space which the browser
will never line wrap on. `Hello&nbsp;World` will never be split up into `Hello`
and `World` on different lines.

This is a useful tool, but is frequently misused. If you need a space between
two elements, especially elements in an inline text context where devs
frequently reach for `&nbsp;`, you probably don't want the non-breaking
behavior. Imagine if the viewport shrinks really narrow such that the two items
you're spacing out can't fit together. Would you want them to wrap and stack
vertically, or would you want them to overflow and create a horizontal
scrollbar? In my experience, usually the wrapping is more desirable, but maybe
that's just coming from my abhorrence of horizontal scroll bars.

Even in cases where the spaced out elements do break on a line (such as two
images), the `&nbsp;` still takes up one space of width and influences line
wrapping. Take this example where I've got two red boxes with an `&nbsp;` in the
middle (colored blue) to space them out. The `&nbsp;` itself needs to exist on
one line or another, so as the viewport narrows it needs to pick a line. If it
doesn't fit on the first line, it will become the first character on the second
line and shift the second box. If it doesn't fit on either line, it will create
its own empty line between the two boxes and introduce undesirable vertical
space.

```video
{
    "type": "demo",
    "urls": ["./demos/3-nbsp-overflow.mp4"],
    "size": [1920, 1080],
    "audible": false,
    "loop": true
}
```

This is a bit of a contrived example, but I suspect most usages of `&nbsp;`
actually wanted a _non-collapsible_ space but landed on a non-breaking space
instead. I have a feeling most developers who write `&nbsp;` do not actually
want the non-breaking behavior but just didn't notice and it's quite possible
most of those usages of `&nbsp;` are incorrect and have line breaking bugs like
the one I just demonstrated above.

TODO: It's not really the non-breaking behavior that's the problem here.

So what so you do instead? I'd like to suggest using a regular space instead of
`&nbsp;`. However the collapsing behavior I've described prevents you just
inserting arbitrary spaces wherever you want, especially if you want multiple
`&nbsp;` characters. To address that, I think the obvious solution would be to
prefer `&#32;` over `&nbsp;`, but that doesn't work either. `&#` lets you choose
a character by its Unicode code point and 32 is the code point for a standard
space. So `&#32;` is literally equivalent to a space
character. Unfortunately it's so equivalent that it's also subject to the same
whitespace collapsing behavior. So you can put as many `&#32;` as you want,
you'll still get at most only one space. My sincerest apologies to the 3 people
reading this who want to put two spaces after the end of a sentence.

<figure>
    <figcaption>Example 24: <code>&amp;#32;</code> spaces.</figcaption>

```html
<div>Hello&#32;&#32;&#32;&#32;&#32;&#32;&#32;World!</div>
```

```inline-html
<div>Hello&#32;&#32;&#32;&#32;&#32;&#32;&#32;World!</div>
```

</figure>

This behavior actually feels objectively wrong to me. Whitespace collapsing is a
solution for the developer experience so you don't have to butcher your HTML
code to get a reasonable output. But if the developer hand-writes `&#32;`, they
clearly care about rendering a space in that slot and are giving up a convenient
DX to do it. Whatever developer writes multiple `&#32;` almost certainly does
not expect them to be collapsed together.

I wasn't able to come up with a compelling reason for why a developer would want
`&#32;` to be collapsible, but I think I do understand the reason for it. As
[mentioned earlier](#css), CSS controls whitespace collapsing, not the HTML
parser. This means the HTML parser needs to convert `&#32;` to literal spaces
and retain _all_ of them for all elements. It's then up to CSS to decide which
spaces are significant. Because of that, CSS can't distinguish between a literal
space and a `&#32;` entity, they're the same thing.

I can see an argument that this actually is desirable for purposes of
consistency. On a certain level, a literal space and `&#32;` _should_ be
indistinguishable and lead to the same behavior. However, I think that's a
stronger argument for how the spaces are observable at runtime, not how the HTML
parser interprets the code. I think it would be reasonable for the HTML parser
to distinguish a space character and a `&#32;` and use different collapsing
behaviors. For example, `<` and `&lt;` are not the same because the former
starts an HTML tag while the later is a text literal for `<` which explicitly
does _not_ start an HTML tag. Unfortunately the HTML parser isn't the one doing
the collapsing, so we've lost that information by the time CSS handles it. This
"bug" with `&#32;` feels like a side effect of the decision to allow CSS to
influence whitespace behavior.

So what's the correct solution for spacing out two elements? Well it's probably
best to do this in CSS with `margin`, `padding`, or any of the other thousand
properties which create spaces and fail to center elements. If you really need
to, a `<pre>` tag or the `white-space` property is probably the best way to have
maximum control over your spacing behavior. However, I honestly can't blame you
if you still end up reaching for `&nbsp;` though, I don't have a great drop-in
solution beyond "do it in CSS".

### How Did We Get Here?

Why exactly does it work this way? Why did we make it so complicated?

I think the core problem here is that all whitespace in HTML is _ambiguous_.
Specifically, it is ambiguous with regard to the developer's intent. For any
given space, did the developer mean for it to be displayed to the user or did
they just want to keep their code under the line length limit? It's impossible
for the browser to know.

To address this, the designers of HTML tried to come up with a set of rules
which would roughly map the HTML code they wanted to write to the rendered
output they wanted to create. So you as a developer have a UI in your head and
write out the HTML to display it, and usually the whitespace "just works".
Honestly, I'm kind of amazed the browser is correct as consistently as it is.

But even that isn't 100% correct. Sometimes the developer doesn't expect
whitespace to behave the way it does and leads to complicated, hard to
understand bugs. `<pre>` tags simplify things and are intended for use cases
where whitespace is significant and needs to be retained, but it makes authoring
those strings in HTML really awkward and overly precise.

Developers are forced to choose between the default syntax that _usually_ works
and is convenient to write or a `<pre>` syntax which can very precisely express
the spacing they want but is incredibly awkward and inconvenient to work with.

Contrast this with basically any other programming language where user visible
strings are syntactically distinct from general whitespace:

```typescript
function sayHello(): string {
    return 'Hello, World!' +
        ' I\'m some text without a newline.' +
        ' and I\'m some text with a trailing newline.\n';
}
```

All the spaces and newlines are explicit. Everything within the quotes is
intended for the end-user and everything outside the quotes is intended for the
developer. This format has its own problems, multiline text can get very awkward
for example. But it's at least unambiguous whether any given space is
significant to the end user or insignificant and intended only for the
developer.

Just imagine working in a language where text didn't need to be quoted:

```
function sayHello(): string {
    return Hello, World! +
         I'm some text without a newline. +
         and I'm some text with a trailing newline.\n;
}
```

That sounds awful and I have no idea how it would work. Except you don't need to
imagine such a situation, because you already write HTML which works exactly
like this and I have no idea how that works either!

## Automated Formatting

Let's take a step away from HTML for a moment to talk about source code
formatting. For as long as we've had code we've had arguments about the best way
to write it. Everyone's got an opinion and all of them except mine are wrong. So
we use tools which automatically format everyone's code into a single,
consistent, agreed-upon format (mine). Sounds great.

The problem with this is that formatting regularly changes whitespace. A long
element can be broken up into multiple lines:

```html
<!-- Before -->
<div class="cool colorful bright awesome">Here is some long text.</div>

<!-- After -->
<div class="cool colorful bright awesome">
    Here is some long text.
</div>
```

Anything affecting indenting can also cause line breaks. For example,
consider adding a wrapper `<div>`.

```html
<!-- Before -->
<div>Here is some long text saying important things.</div>

<!-- After -->
<div class="wrapper">
    <!-- Now it's over the length limit and gets wrapped! -->
    <div>
        Here is some long text saying important things.
    </div>
</div>
```

These formatting changes are intended to be no-ops. They make my life easier as
a developer, but should never change significant whitespace for the user. Except
they do change significant whitespace because they introduce leading and
trailing spaces. In a block rendering context it's probably fine, but you can
consider an inline text scenario like:

<figure>
    <figcaption>25. One-line link.</figcaption>

```html
Check out my <a href="#">web site</a> and read my blog!
```

```inline-html
Check out my <a href="#" class="demo-link">web site</a> and read my blog!
```

</figure>

In this case we have text with a link in the middle. But if this exceeds the
line length limit, formatting the text can introduce line breaks like:

<figure>
    <figcaption>26. Link with overextended underline.</figcaption>

```html
Check out my
<a href="#">
    web site
</a>
and read my blog!
```

```inline-html
Check out my
<a href="#" class="demo-link">
    web site
</a>
and read my blog!
```

</figure>

Now we have that overextended underline again, all because of a single
formatting change!

Prettier actually has an option for this called
[`--html-whitespace-sensitivity`](https://prettier.io/docs/en/options.html#html-whitespace-sensitivity).
Setting this to `ignore` will allow the above change, so the formatted code
looks great, but may break your UI. `strict` will avoid introducing a
significant whitespace change so your UI is safe, but leads to truly "pretty"
HTML code like:

```html
Check out my
<a href="#" class="demo-link"
  >web site</a
>
and read my blog!
```

Prettier can't introduce a newline between `<a>` and `web`, so it has to put the
newline _inside_ the `<a>` start tag since that's the only location it can add
insignificant whitespace. Same for the `</a>` and the following `and`.

Prettier also has an `--html-whitespace-sensitivity css` option which tells it
to "Respect the default value of CSS `display` property." Hopefully after
reading this post you should know what that means! Given a `<div>` tag it can
format with the `ignore` behavior because leading and trailing whitespace aren't
significant in block rendering contexts. `<span>` tags will use `strict`
behavior because the leading and trailing whitespace _is_ significant. This
makes a lot of sense as a useful middle ground between `ignore` and `strict`.

But after reading this post you should also know that's not entirely accurate
and breaks if you do `div { display: inline; }`. Prettier doesn't know anything
about your CSS so it can only infer the default `display` for a given tag, it
can't know the actual `display` value used at runtime.

No shame on Prettier here by the way, I can't blame the tool for formatting HTML
this way. The `css` mode is actually a very useful middle ground for getting the
nicer `ignore` formatting in at least most of the cases where it won't have any
negative effects while still using `strict` where it's likely to be important.

Again, the real problem here is that HTML whitespace is ambiguous and can't tell
that Prettier wants to insert whitespace for the developer's benefit without
affecting the rendered output. The fact that you can't know the actual
whitespace behavior without knowing the CSS `display` and `white-space`
properties is just the cherry on top that cements HTML formatting as a
fundamentally unsolvable problem.

## Internationalization (i18n)

TODO: Whitespace inside translations.

Now let's pivot to another unsolvable problem, i18n. This term encompasses a
wide umbrella of problems, tools, and technologies for localizing web pages so
your site can be accessed by users in many different languages across the world.
This is a complex problem for a number of different reasons, but let's stay
focused on HTML rendering and whitespace.

Typically a site is localized through a process which looks something like this:

1.  A developer writes some form of HTML code:
    ```html
    <div>Hello, World!</div>
    ```
2.  i18n tooling processes this HTML and extracts a list of user-visible
    messages.
    ```
    "Hello, World!"
    ```
3.  These messages are translated to all the supported locales (just `es` for
    this example).
    ```
    "¡Hola, Mundo!"
    ```
4.  The localized messages are inserted back into the deployed site and made
    available to those users.
    ```html
    <div>¡Hola, Mundo!</div>
    ```

Exactly how this works depends on your i18n tooling and the DX of your actual
site, so I won't go into specifics there. But this is the rough process of how a
web site gets localized.

So let's think through the whitespace implications of this. Imagine the
developer writes the following:

```html
<span>
    Hello, World!
</span>
```

The spacing before and after is significant and at least one space needs to be
retained. Remember that whitespace collapsing means multiple spaces don't add
up, we only really need to keep one of them.

So this would naturally extract to `" Hello, World! "`.

The translator looks at that and goes "Wow that's really sloppy that whoever set
this up didn't trim the spaces, but whatever, I got places to be." so they
translate the string to `"¡Hola, Mundo!"` (note the lack of leading and trailing
spaces).

This then gets inserted back into the HTML and we end up with:

```html
<span>¡Hola, Mundo!</span>
```

This does _not_ contain the leading/trailing whitespace and thus renders
differently than the English version. It's also an especially bad bug because
many development teams are going to be primarily focused on testing whatever
language they are developing in (the source locale, English in this case). Most
devs aren't going to test a separate locale every time they alter text.

It's a rough bug, but a solvable one. The trick is to treat leading and trailing
whitespace as significant and keep track of it _outside_ the translation system.
The translator doesn't understand HTML or its whitespace semantics (nor do most
developers) and translated strings shouldn't be unique to the platform their
rendered on anyways. It should be possible to take the same
`"Hello, World" -> "¡Hola, Mundo!"` translation and use it in an Android or iOS
app, even though they don't obey HTML rendering rules.

Essentially, the message should be extracted as `"Hello, World!"` without the
spaces because they don't mean anything to the translator. But when
`"¡Hola, Mundo!"` gets merged back in, we need to remember and reuse the
whitespace provided by the developer:

```html
<span> ¡Hola, Mundo! </span>
```

We could keep the spacing identical or we can apply the whitespace collapsing
rules at this time. As long as we have at least one space before and after the
message, that's enough to retain identical rendering. The key point to
understand here is that we're using the text provided by the translator but
we're respecting the _developer's_ intent regarding whitespace. This way at
least all locales should render the same.

That doesn't sound too bad, except that localization is not this simple. A lot
of data might be coming from a database at runtime and isn't known to the
developer. Consider a server-side rendered HTML template:

```html
<span>Hello, ${(firstName + ' ' + lastName).toLowerCase()}!</span>
```

We don't know what `firstName` or `lastName` is at translation-time as that
information is retrieved at runtime with real user data. Typically this is
solved by creating a "placeholder" of content, meaning the translator sees
something like `"Hello, ${name}!"` and translates it into the Spanish version
`"¡Hola, ${name}!"`.

That doesn't really affect whitespace though, until you look at an even more
complicated message:

```html
<span>
    Hello, <a href="#">
        World
    </a>!
</span>
```

The translator doesn't know or understand `<a>` tags and shouldn't edit them
anyways. The way I've typically seen this done is to convert the `<a>` and
`</a>` pieces into placeholders much like `${name}` above. This means the
translator would see:

```
"Hello, ${linkStart}\n        World\n    ${linkEnd}!"
```

The translator says "Wow, that's even worse, but I can kinda see what you're
going for here at least." and comes back with
`"¡Hola, ${linkStart}Mundo${linkEnd}!"`. This gets merged back into the HTML to
create:

```html
<span> ¡Hola, <a href="#">Mundo</a>! </span>
```

...and we've changed the whitespace again, `"World"` had leading and trailing
whitespace, but `"Mundo"` does not. The UX designer is gonna have a fit as soon
as they realize there are multiple locales they were supposed to design for.

The problem here is that fixing leading and trailing whitespace for a localized
element is not enough, we need to apply that same fix for every descendant
element in the message.

All this means that i18n tooling needs to be acutely aware of HTML's whitespace
rules and apply them correctly to the localized text. In any other language this
wouldn't be nearly as complicated because the message content would have clearly
defined whitespace.

```typescript
console.log(
    'Hello, World!',
);
```

An alternative approach is to define your messages outside your actual view
layer. Android does this with a `strings.xml` file which contains all
user-visible messages and gets translated into various locales.

```html
<resources>
    <!-- %1$s displays the first argument as a string. -->
    <!-- %2$s displays the second argument as a string. -->
    <string name="say_hello">Hello, %1$s %2$s!</string>
</resources>
```

Then you just
reference the string you want to display. In an HTML context, this might look
like:

```html
<span>
    ${i18n('say_hello', 'Doug' /* firstName */, 'Parker' /* lastName */)}
</span>
```

This would find the string named `say_hello`, format it with the given first and
last name and then render the result to the `<span>` tag. This isn't awful and
can avoid some of the whitespace issues since the developer's whitespace (in the
HTML file) is clearly outside the message's whitespace (in the `strings.xml`
file).

However this approach negatively impacts the developer experience since you
can't just inline the content you want to render and also makes it significantly
harder to do child elements such as the `<a href="#">World</a>` use case. In a
pure string templating context it may be possible to replace `${linkStart}` with
`<a href="#">` and `${linkEnd}` with `</a>`, but you'll immediately run into
HTML escaping and XSS challenges. Also if the HTML is being processed in any
kind of more powerful environment which outputs something other than pure text
(ex. Angular), then you can't just shove arbitrary elements into strings without
breaking other parts of your toolchain.

## How Could we Fix This?

Since this is all so complicated and involved, it would be great to fix HTML so
all these whitespace problems go away. Is that possible? What would it look
like?

I don't have a perfect solution in mind, but I do have some thoughts. As I
mentioned earlier, the root problem is that whitespace in HTML is ambiguous,
does a space exist to support the developer authoring their HTML code, or to
display something reasonable to the end user? That question is unanswerable and
the core problem we should fix.

The best way to do that is to change HTML syntax such that significant
whitespace is syntactically distinct from insignificant whitespace. The obvious
approach is to do this just like every other programming language, quote your
strings!

```html
<div>
    "Hello, World! My name is Devel and I've got a bone to"
    " pick with HTML's whitespace behavior.\nIt's super"
    " confusing and no one understands how it works!"
</div>
```

I see your disgusted reaction and honestly, I kinda get it. I don't think this
looks very good either and I wouldn't exactly want to write it. It's not
particularly elegant and I hate the leading spaces necessary on all but the
first line. So inconsistent.

The idea is that all spaces inside the quotes are significant and retained for
the user while all spaces outside the quotes are insignificant and used solely
for the developer. In this proposed syntax, we at least have implicit
concatenation like Python so you don't need `+` signs everywhere. If you really
like angle brackets you could replace the quotes with `<text>` to make text
nodes more explicit, but I probably wouldn't go that particular direction.

TODO: You can't copy paste into an HTML document anyways...

Aside from adding quotes there's a couple other changes which need to be made:
1.  Any text outside of a quoted string is a syntax error.
    *   Exactly how it renders is up to the browser, I really don't care what
        the fallback behavior is given that browsers tend not to throw errors on
        bad HTML.
    *   The main point is that any tool is free to treat unquoted text as a
        syntax error along the lines of `<div <span>>`.
1.  `block` and `inline` elements should use the standard whitespace behavior
    with no differences. `display` has no effect on the text _content_ being
    rendered.
    *   `display` will still affect layout and rendering of course, it just
        won't change the raw text being displayed.
1.  `white-space` needs to be removed/reworked to always use the standard
    whitespace behavior.
    *   It can still control line wrapping and other presentational aspects,
        it's just the raw text content which should be consistent across all
        options.
    *   The `display` and `white-space` changes together remove the dependency
        on CSS to understand how HTML text is parsed, meaning just looking at
        the HTML document is sufficient to understand the precise text it
        contains.
1.  `<pre>` tags should be removed.
    *   All text is preformatted (inside quotes), so having a special tag is no
        longer needed.
    *   Formatting arbitrary user input into a quoted string is not meaningfully
        harder than HTML escaping the string already is today, so there's no
        value in keeping `<pre>` tags around.
    *   You could keep this as a backwards compatibility feature which is an
        exception to the "no unquoted strings" rule, but a purist implementation
        of this proposal would remove it entirely.
1.  `&#32;` is no longer collapsed.
    *   Since we got rid of whitespace collapsing altogether, this is naturally
        fixed, though it isn't really a problem anymore either.

Would this solve the problem? Since whitespace is no longer ambiguous, we don't
need whitespace collapsing anymore. Whitespace outside the quotes is removed
altogether, while whitespace inside the quotes is preserved. No collapsing
needed! Developers can add multiple spaces without needing `&nbsp;`:

```html
<!-- Just works! Indentation is correctly ignored, but
spacing between the words is retained. -->
<span>
    "Hello,        World!"
</span>
```

Prettier and other formatters can adjust the developer side of the whitespace as
much as they want and even join/split the string literals to move them across
lines without changing the rendered output.

```html
<div class="wrapper">
    <div class="container">
        <div id="marketing-made-me-add-this">
            <div>
                <!-- Reformatted text to be shorter. -->
                "Hello, World! My name is Devel and I've"
                " got a bone to pick with HTML's whitespace"
                " behavior.\nIt's super confusing and no"
                " one understands how it works!"
            </div>
        </div>
    </div>
</div>
```

i18n tooling can be greatly simplified as well since there's no whitespace
behavior to understand or preserve. Message extraction relies on parsing the
content inside the text and then replacing it with the translated result.

```html
<!-- English -->
<div>
    "Hello, World!"
</div>

<!-- Spanish -->
<div>
    "¡Hola, Mundo!"
</div>
```

TODO: Raise HTML minification as a problem earlier or remove entirely.

One problem I didn't talk much about is HTML minification, which has many of the
same problems described above since the minifier needs to eliminate all
insignificant whitespace, but it can't know which whitespace is insignificant
because that requires understanding the CSS of the page. Quoted strings would
solve this problem as well, since HTML minifiers would just remove all the
spaces outside quotes and keep the spaces inside quotes.

TODO: Talk about Nunjucks' solution? Doesn't work for internal whitespace.

Since it seems to solve all the problems described, can we ship this?
Unfortunately no.

Shipping a breaking change of this magnitude to HTML would be functionally
impossible and go against many of the core principles of the open web. The best
you could do is introduce a new HTML parsing option which web pages could opt-in
to along the lines of `<!DOCTYPE html6>`. Even then, the ecosystem effects of
this would be incredibly complicated and this is almost certainly a solution
which would be more painful than the problem it's solving.

### Fixing `&#32;`

So what could we ship? The one fix I can think of which would actually be viable
is to make `&#32;` work the way I want it to. It should always be retained and
ignore all whitespace collapsing. Unfortunately, even that is a breaking change,
but I think we can solve two problems at once here.

My suggestion: **Add a new named HTML entity (`&sp;`) as a regular space which
does not get collapsed.**

Creating a new entity solves three problems:
1.  It serves as non-collapsible space in HTML (works like I wish `&#32;`
    worked).
1.  It's not a breaking change, `&#32;` behavior is left exactly the same as it
    is today.
1.  Naming the entity serves as a more discoverable improvement over the current
    misuses of `&nbsp;`.
    *   I think it will be much easier to find and identify `&sp;` as "thing
        that adds a space" without pulling on the baggage of the non-breaking
        behavior.
    *   It would take time, but we cloud slowly see HTML training and help
        content start to suggest `&sp;` instead of `&nbsp;`. Users should only
        find and reach for `&nbsp;` when they specifically want the non-breaking
        behavior.

The downside of this is that it's a bit confusing that `&#32;` and my proposed
`&sp;` would represent the same character (a space) but have different
collapsing semantics. Given that the HTML parser retains all the spaces already
and processes entities, I don't think `&sp;` as a named entity of the space
character would quite be sufficient, CSS still wouldn't be able to the tell the
difference between that and a literal space.

I suspect this would actually require an entirely new Unicode character
representing a "non-collapsible space", distinct from the existing space
character. Except Unicode is used in more than just HTML. In theory, other text
rendering engines may do some form of whitespace collapsing and a
non-collapsible space might be useful in some of those contexts, but I can see
some push back to adding a new character specifically to solve an HTML rendering
bug.

TODO: File an issue?

## Practical Advice

Given that we can't "fix" HTML, what can we do? Understanding the actual
whitespace behavior of HTML goes a long way, but as you've probably figured out,
it's surprisingly complicated and I don't think it really scales to expect
everyone who writes HTML to fully understand this. Fortunately HTML whitespace
does _usually_ work and we can often rely on that, it's mainly about minimizing
edge case behavior where you need to look up a blog post like this. To that end,
I have a few suggestions.

### Avoid Leading and Trailing Whitespace in Links

First, avoid leading and trailing whitespace in `<a>` tags or any other
underlined text.

```html
<div>
    Here is some interesting text with
    <a href="#">a link that exceeds the line length limit</a>
    but I don't care.
</div>
```

Pretty consistently it's links where I see the biggest challenges with
whitespace given that they are underlined by default and it's a common style.
While spacing may be incorrect in many other situations, the underline is
usually where it becomes a problem that needs to be fixed.

As long as `<a>` tags are written with no leading or trailing whitespace, this
isn't an issue and your underlines will always be correct. It does mean that in
some situations you might have to exceed the line length limit, and potentially
fight with your formatter (don't use `--html-whitespace-sensitivity ignore`),
but I think it's worth it given how common of a foot gun this particular use
case is.

### Don't Change Layout Behavior with `display`

Second, avoid changing `display` to a different layout behavior. If you want a
`display: block;` element, pick a tag which uses `display: block;` by default.
This should reduce the possibility of your text content being dependent on CSS,
however it might be difficult when you need a specific semantic tag. Take for
example, if you need an inline `<aside>` tag. There are two ways to do this:

1.  Add a second tag so the one containing the text uses the correct `display`
    value by default, independent of the semantic `<aside>` tag wrapping it.
    ```html
    <aside>
        <span>
            My text content.
        </span>
    </aside>
    ```
2.  Pick a tag with the `display` behavior you want by default (`<div>` or
    `<span>`), and then use `role` to switch it to the semantic element you
    want. There might be other accessibility implications to this though.
    ```html
    <span role="aside">
        My text content.
    </span>
    ```

Both of these approaches work with the `--html-whitespace-sensitivity css`
option and avoid a CSS dependency just to understand the text displayed.

### Avoid Changing Whitespace Collapsing with `white-space`

Third, avoid `white-space: pre;` and prefer a real `<pre>` tag instead. Again,
this reduces dependency on CSS and might not always be possible but hopefully a
decent best practice to follow.

When you need to configure `white-space` to something other than `pre`, I
recommend only setting it on `<pre>` tags. The `<pre>` tag communicates to HTML
tooling that its whitespace should be fully retained because its preformatted.
Even if you're actually using a different `white-space` mode in your CSS, the
`<pre>` tag is at least a key signal to HTML tooling that the whitespace is more
significant here than any other tag.

### Avoid Insignificant Whitespace in `<pre>` Tags

Fourth, always write `<pre>` tags with no leading and trailing whitespace, and
without indentation. They should generally look like:

```html
<div class="outer">
    <div class="inner">
<pre>Some preformatted text
with a new line
and some other content.</pre>
    </div>
</div>
```

Yeah, I don't like the look either. But this approach avoids the confusing
leading/trailing newline behavior and prevents indentation accidentally leaking
into the content.

None of these suggestions really help with the formatting and i18n tooling
issues unfortunately since they still need to deal with whitespace regardless.
But I warned you at the start, this post is partially for sharing knowledge and
partially for venting about how broken HTML is.

Broken? Yes.

Fixable? Not really.

Manageable?

```video
{
    "type": "gif",
    "urls": ["./demos/4-im-gonna-complain.webm", "./demos/4-im-gonna-complain.mp4"],
    "size": [498, 244],
    "loop": true
}
```

TODO: Double check example numbers.
