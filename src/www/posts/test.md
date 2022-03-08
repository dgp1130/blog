---
# tags: posts # Don't include posts tag so this does not show on the home page.
layout: pages/post
title: Hello World!
date: 2020-07-01T12:00:00-07:00
excerpt: |
    Say hello to the world in a really long excerpt which takes multiple lines
    to get to the end of.
languages: [ typescript ]
additional_styles: [ tweet ]
---

# H1 Hello World!

```timestamp
```

This is a *post* which says **hello** to the world. I hope the world responds
~~positively~~, because I can't take any more rejection.

## H2

H2 content.

### H3

H3 content.

#### H4

H4 content.

##### H5

H5 content.

###### H6

H6 content.

Time for a list!

* This is a bullet.
* This is another bullet.
    * This is a sub-bullet.
    * This is a really long bullet which line wraps at the edge of the screen
    once it gets that far and I'm definitely not just stalling here.

How about an ordered list?

1. This is an ordered bullet.
1. This is another ordered bullet.
    1. How about an ordered sub-bullet?

Would you like to do some math: z = x<sub>1</sub> + y<sup>2</sup>

Check out this [link](https://google.com/)!

> This is a block-quote. It is very blocky. It is so blocky, that it blocks the
> main thread!

Here's a tweet!

```tweet
{
  "url": "https://twitter.com/develwoutacause/status/1452082837075607553",
  "author": "Doug Parker",
  "username": "develwoutacause",
  "avatars": [ "/res/img/profile.avif", "/res/img/profile.webp", "/res/img/profile.jpg" ],
  "timestamp": "2021-10-23T18:21:00-0700",
  "content": "I really wish it were possible to serve an SSR'd #HTML fragment (with #CSS and #JS), and be able to directly insert it into the #DOM securely.\\n\\nHow many web sites could drop a client side framework if SSR'd web components could work like this?"
}
```

How about some inline `code`? What do you think of
`FooModuleFactoryProducerManagerProvider`?

```typescript
// Some TypeScript code.

export async function doSomething(input: string): string {
  console.log(`Does a thing with ${input.trim()}`);
  return new class {
    constructor(private readonly input: string) { }

    public do() {
      return this.input.split('').reverse().join('');
    }
  }(input).do();
}

type Foo<T> = Record<string, T>;
const test = 100;

function mixin<T extends LitElement>(element: T): Class<T> {
  return class extends element {
    protected foo(): boolean {
      return /^[a-zA-Z0-9_-$]+$/.test('foo');
    }
  }
}

@customElement('dwac-bar')
class Bar<T extends Foo<number>> extends mixin(LitElement) {
  @internalProperty({ attribute: false })
  protected name: string;

  render(): TemplateResult | void {
    return html`
      <h2>Hello ${this.name}!</h2>
    `;
  }
}
```

All hail Yaktocat!

![Image of Yaktocat](https://octodex.github.com/images/yaktocat.png)

| Key   | Value                        |
| ----- | ---------------------------- |
| Hello | World                        |
| Foo   | Bar                          |
| Baz   | I don't know a fourth value. |
