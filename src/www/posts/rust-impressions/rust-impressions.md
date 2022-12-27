---
tags: posts
layout: pages/post
title: Impressions of Rust
date: 2022-08-06T12:00:00-07:00
excerpt: Some thoughts and meditations on Rust. What it does well, what it can
    do better, and what we can learn from its design.
languages: [ rust, typescript ]
socialImage: https://blog.dwac.dev/posts/rust-impressions/2-actual-debugging.webp
socialImageAlt: A graph with dozens of nodes with arrows connecting them. The
    legend identifies these nodes as "possible solutions", while the arrows are
    "error messages", guiding the developer from one solution to another. At the
    end of the graph is a green node labeled "actual solution" with a single
    path of green arrows leading from the start to that final solution. However,
    the path to that solution is obfuscated by a thick red line labeled "Me".
    This line scribbles all over the graph as it attempts to find the green
    path, but consistently fails. It takes wrong turns, doubles backs, and even
    returns back to the starting node before eventually finding its way to the
    final solution.
---

# Impressions of Rust

```timestamp
```

I recently had an opportunity to write some production Rust code and as a
programming language nerd I was very interested in the opportunity to experience
what Rust development is really like and had a few observations to share.

A few years ago I went through [the Rust book](https://doc.rust-lang.org/book/)
and found a lot to like in the language, but never had an excuse to do much with
it. Now I was working through an issue to
[switch `rules_prerender` CSS bundling to use Parcel](https://github.com/dgp1130/rules_prerender/issues/46/)
and required some changes to
[Parcel's Rust codebase](https://github.com/parcel-bundler/parcel-css/tree/9916cae0499e74ebcfafd5f0367edadbecebf3ca/)
to make that happen. Specifically, I wanted to add support for a custom
resolver, so `@import` statements in CSS could be resolved to arbitrary paths on
the file system in order to be compatible with `bazel-out/` file structure. I
also wanted that resolver to be implementable in JavaScript, so
`rules_prerender` wouldn't need to ship custom Rust code, which would introduce
significant deployment complexity which it wouldn't otherwise need to deal with.

Updating Parcel to support a custom JS resolver pulled on a number of
interesting challenges, including:

*   Working with `async`/`await`
*   Working with multi-threading
*   JavaScript interoperability
*   [Node-API](https://napi.rs/)

Based on this experience, here are a few observations about the Rust language
and ecosystem. Keep in mind that it's my first real foray into Rust (aside from
some toy programs) and I'm coming at this from a web developer perspective, not
a systems programming perspective (I did a lot of C/C++ college but barely
touched it since).

## Borrow Checking

The borrow checker is easily the biggest feature and selling point of the Rust
language, and there's a lot to like there. Having a static analysis tool
directly built into the compiler and the language design which points out memory
safety bugs and how to fix them is truly incredible, especially in an
increasingly security-minded industry. In my entire experience, I never
encountered any runtime failures. I only ever saw one segmentation fault when I
tried to use
[`std::mem::transmute()`](https://doc.rust-lang.org/stable/std/mem/fn.transmute.html)
as a hacky workaround for something it was definitely _not_ supposed to
transmute, so that one is on me.

And it's not just removing segfault errors, but also having the confidence to
know that I'm using any given API correctly. It removes an entire dimension of
documentation around ownership, thread safety, and the responsibilities of the
callee and the caller. This allows the compiler to subtly guide the developer
towards the correct solution to their particular problem.

But while the borrow checker is a huge benefit in comparison to a C++ world, I
do see some significant regressions in comparison to a JavaScript world. As a
web developer in the build tooling space, I frequently hear suggestions that we
rewrite existing tooling in native-compiled languages like Rust or Go. There are
many caveats to that approach, but the one I'll mention here is that moving from
a garbage collected world to a borrow checked world introduces a significant
learning and conceptual overhead bourne by the developer.

There are now a whole new class of potential issues, design considerations, and
challenges that Rust introduces to web developers which I think is often
under-estimated. While writing Rust I frequently heard myself saying: "but I
just _don't care_ about this ownership error, fixing this doesn't help me do
what I actually want to do". Of course, in a Rust program you do care, you
_have_ to care about this stuff.

The mental model is so different from what I'm used to that I'm never 100% sure
I'm actually solving a particular problem the "right" way. Are my lifetimes set
up correctly? Does my ownership make sense? Am I using the right primitives for
this problem? In this context, I was making a PR for a repo I had no prior
relationship with, so I didn't have the luxury of a co-worker whom I could tap
on the shoulder and ask to sanity check this kind of stuff.

These points aren't so much a critique of Rust, as they are the trade-offs it
has made as a language and the level of abstraction the developer sits at. Are
you writing code in which you care about the memory layout, data ownership, and
allocation? If so, Rust is probably a great option in that space. But if not,
it's likely the wrong tool for the job.

I can at least appreciate the strongly opinionated nature of the Rust language
and how clearly it communicates exactly what you're getting into with it: a
world of zero-cost abstractions, minimal runtime, and memory safety. _Rust is
very unapologetically itself_, and I mean that in the best possible way. However
it's also important to recognize that these aren't exactly features, they're
_trade-offs_. And what the language traded for them was complexity in the mental
model. That's not necessarily a bad trade-off, and I'm glad Rust went the
direction it did. However, this is a trade-off to keep in mind whenever faced
with the question "Should we use Rust to solve this problem?"

## Debugging

The Rust compiler itself is great at calling out errors, detailing what's wrong,
why its wrong, and what your options are to fix it. Visualizing this as a graph,
we can model this developer journey like so, where the Rust compiler guides the
developer down of web of flawed solutions to the correct solution.

![A graph with dozens of nodes with arrows connecting them. The legend
identifies these nodes as "possible solutions", while the arrows are "error
messages", guiding the developer from one solution to another. At the end of the
graph is a green node labeled "actual solution" with a single path of green
arrows leading from the start to that final solution.
](./1-ideal-debugging.avif)(./1-ideal-debugging.webp)

This is awesome and often leads to the compiler helping you "discover" aspects
of the problem space that might not have been obvious. Unfortunately the reality
is that the path to success is simply not always clear, and my developer journey
usually looked more like this:

![The same graph as before, but with an additional red line labeled "Me". The
line scribbles all over the graph as it attempts to find the green path, but
consistently fails. It takes wrong turns, doubles backs, and even returns back
to the starting node before eventually finding its way to the final solution.
](./2-actual-debugging.avif)(./2-actual-debugging.webp)

Fixing one ownership issue often just shifts the problem to another place, and
without a strong understanding of this mental model, it can be very difficult to
identify which path from any given node is actually the "right" one, which gets
closer to the real solution.

As a concrete example of this, during my work here I initially tried to
everything synchronous and single-threaded since the codebase was not `async`
and I figured that would make the initial implementation easier. I found that
this actually made things _harder_ because of a
[non-obvious chain of complexity](https://github.com/parcel-bundler/parcel-css/issues/174#issuecomment-1133549664):

1.  Interoperability with JavaScript in this context inherently pulls on
    multi-threading concepts.
    *   The Parcel codebase was already multi-threaded, so everything needed to
        be `Send + Sync` compatible, with no easy "chill compiler, this is just
        a prototype" workaround.
1.  Multi-threading in this context inherently pulls on `async`/`await` issues.
    *   The Rust function exposed to JS _could_ work synchronously, but since I
        had to use thread-safe APIs, they expected the main thread to be free
        for the JS event loop, which is non-trivial to do without
        `async`/`await`.
1.  Using `async`/`await` in this manner in Rust means we need to make the JS
    call `async` as well.

It took several hours to figure out that the problem "`x` is not `Send + Sync`"
effectively _requires_ the solution "Make the JS function `async`" and my
attempts to solve a smaller-scale problem (single-threaded, no `async`/`await`)
were actually making things _harder_, rather than _easier_.

A lack of escape hatches can also make things trickier to debug. If I don't
understand a value in TypeScript, I can usually cast to `any` and
`console.log()` to understand what that value is and how I should be using it.
There's no real equivalent in Rust as far as I can tell. You can
`println!("{:?}", value)` if the type implements `Debug` (Node-API JS types do
not), but there's no easy `as any` or a good way of debugging lifetime issues.
A lot of this is just the different mental model Rust uses, so an `as any`
wouldn't help anyways, and I'm not sure what reasonable approach would allow
ignoring or tweaking invalid lifetimes to get a program that would help you
figure out what their correct lifetimes should be.

On several occasions I found myself with a program which _I_ considered to be
valid and memory-safe, but struggled to convince the Rust compiler that it _is
indeed_ a valid memory-safe program. Sometimes the compiler would point out a
flaw in my understanding and help guide me to the correct solution, but the
compiler just as frequently had a flaw in its own understanding which I was
failing to communicate to it. Those errors are particularly frustrating because
the time and effort spent doesn't feel productive since it isn't about the
problem you actually want to solve, but rather getting the language and its
tooling to _let you_ solve the problem.

Of course, debugging is hard in general, and that's true for any language. A
compiler can never know the exact solution to any particular error, only some
general ideas of a direction you can take that might lead to a fix. I think the
challenge with Rust is that the increased complexity and lower level of
abstraction (compared to JS) makes this a bigger issue than I'm used to.

The flip side of this is that when the compiler _does_ successfully indicate a
flaw in your reasoning and communicates it to you effectively, Rust can feel
incredibly productive. When it all clicks, the compiler teaches you something
about the problem space which you didn't realize, and you successfully follow
that green path on the first try, it feels _amazing_. Those instances are
definitely the most fun I've had programming in a long time. And isn't that what
really matters?

## Documentation

On a more positive note, I absolutely _love_ [docs.rs](https://docs.rs/), which
pulls API documentation from published crates. This is a really cool way of
making documentation consistently available for all crates without having to go
hunting for how each package does things and following types between them.
Clicking through functions and type definitions is so smooth and consistent,
just a fantastic experience all around.

This unfortunately doesn't solve the _writing_ part of writing documentation,
and some crates are certainly under-documented. However I always had that
content immediately at my fingertips which really helped with the process. The
whole thing makes me really jealous and want a similar feature for NPM.

I do wish there was a more standard pattern for enabling features inside crates.
One friction point is that different crates are less up-front about all their
features, what each of them do, and which symbols are hidden behind them. I
would love to see a compiler error which reads "`foo::bar` doesn't exist, but it
is supported by the `foo` crate behind the `bar` feature, consider enabling that
in your `Cargo.toml`."

## Editing

I used VSCode for most of this process and found the editing experience to be
decent, but lacking in comparison to TypeScript (one of the gold standards for
this kind of thing in VSCode at least). A few of the areas which caused me
challenges were:

*   The language service would frequently highlight entire function bodies as
    the cause of an error, which gets noisy and unwieldy.
*   "Go to definition" usually worked from my source code, but I couldn't do the
    same from library code, leading me to visit [docs.rs](https://docs.rs/) even
    more than I really should have needed to.
*   Inspecting types via mouseover was much less helpful than I wanted. It would
    often should the declared type rather than the resolved type. So I would
    see `Future<Output = Self::Output>` rather than `Future<Output = i32>`,
    which made debugging types much harder.

## JavaScript Interoperability

Since the main goal of this work was to expose a JavaScript API for custom
resolvers in Parcel, much of the challenge came from JS interoperability. I was
expecting to have to deal with [WebAssembly](https://webassembly.org/), but
apparently Parcel still uses Node-API for the relevant API since
[WebAssembly doesn't have direct file system access](https://github.com/parcel-bundler/parcel-css/issues/174#issuecomment-1134855878).

If you're not familiar with it, Node-API is the system for building native
NodeJS add-ons and calling them from JavaScript. The biggest constraint with
this system is that JavaScript only ever runs on the main thread, so any
Node-API types like
[`JsString`](https://docs.rs/napi/latest/napi/struct.JsString.html),
[`JsNumber`](https://docs.rs/napi/latest/napi/struct.JsNumber.html), and
[`JsFunction`](https://docs.rs/napi/latest/napi/struct.JsFunction.html) can only
be referenced from the main thread (not sure how JS worker interop works here).
Since Parcel is multi-threaded, most of the challenge came from figuring out how
to use these types only from the main thread.

Fortunately Rust is really helpful here. Its ownership model ports really well
to multithreaded programming. The JS types don't implemented `Send` or `Sync`,
so I would get clear type errors if I ever accidentally referenced something
from the wrong thread, so I never encountered any race conditions (I did kind of
[get a deadlock](#synchronous-callbacks) at one point, more on that later).
Whenever the program compiled, it had a very high chance of actually doing what
I wanted, which I think is a strong indicator of how good the compiler is.

Here are a few interesting details, though if you really want the nitty-gritty
you can look at the
[pull request](https://github.com/parcel-bundler/parcel-css/pull/196).

### `ThreadsafeFunction`

There is a
[`ThreadsafeFunction`](https://docs.rs/napi/latest/napi/threadsafe_function/struct.ThreadsafeFunction.html)
type for calling JS functions from worker threads, though it took me a while to
really understand what this is doing and why the API is structure the way it is.
The [example](https://docs.rs/napi/latest/napi/threadsafe_function/struct.ThreadsafeFunction.html#example)
is the best documentation and also does not explain most of the reasoning for
it.

```rust
use napi::JsFunction;
use napi::threadsafe_function::{
    ErrorStrategy,
    ThreadSafeCallContext,
    ThreadsafeFunction,
    ThreadsafeFunctionCallMode,
};

/// Rust type of the arguments passed to the JS function.
struct JsArgs {
    message: String,
    sender: String,
}

fn test_threadsafe_function(js_func: JsFunction) -> napi::Result<()> {
    // Create a thread-safe reference to a JS function.
    let threadsafe_js_func: ThreadsafeFunction<JsArgs, ErrorStrategy::Fatal> =
        js_func.create_threadsafe_function(
            0 /* max_queue_size (0 means unlimited). */,
            // Invoked on the main thead, converts `JsArgs`
            // to JavaScript values.
            |ctx: ThreadSafeCallContext<JsArgs>| {
                // Return a `Result<Vec<JsUnknown>>` which
                // are passed to the JS function.
                Ok(vec![
                    ctx.env.create_string(&ctx.value.message)?
                        .into_unknown(),
                    ctx.env.create_string(&ctx.value.sender)?
                        .into_unknown(),
                ])
            }
        )?;

    // Invoked on the current thread (may not be main).
    threadsafe_js_func.call(JsArgs {
        message: String::from("Hello!"),
        sender: String::from("Rust"),
    }, ThreadsafeFunctionCallMode::Blocking);

    Ok(())
}
```

This creates a thread-safe function with `JsArgs` declared as its arguments.
This is a Rust type which represents the arguments being passed to the JS
function _before_ they are converted to their JS equivalents. It is constructed
on the worker thread and placed in a queue when `.call()` is invoked. Once the
JS event loop is ready to process the invocation, it pulls the item from this
queue and uses the callback in `.create_threadsafe_function()` to convert
`JsArgs` into `Result<Vec<JsUnknown>>`. That callback is invoked on the main
thread, so you have full access to the JS types. This is a direct result of the
need to limit JS symbols to the main thread and why this API works the way it
does. I think you can actually return `Result<Vec<ToNapiValue>>`, but if you're
returning heterogenous types, this can confuse the compiler. Everything has an
`.into_unknown()` to convert to the base `JsUnknown` type which can make the
type homogenous.

If you want a Rust function to return a `Promise` to JS, you have to use a very
similar looking API called
[`execute_tokio_future()`](https://napi.rs/docs/compat-mode/concepts/tokio).
This has a similar pattern of taking a `Future<Output = SomeRustType>` and a
transformation function running on the main thread which converts the result to
a Node-API JS type.

The general pattern here is that you want to do as much work as you can
_outside_ the callback, so it happens off the main thread. Then use the callback
solely to convert the arguments from Rust types into JS types.

One other thing that tripped me up with `ThreadsafeFunction` in particular is
that Node-API uses
[`ErrorStrategy::CalleeHandled`](https://docs.rs/napi/latest/napi/threadsafe_function/ErrorStrategy/enum.CalleeHandled.html)
by default. This means the JS function should be written to receive the call
like so:

```typescript
function myReceiver(err: any, message: string, sender: string) {
    if (err) {
        doSomethingWithError(err);
        return;
    }

    doSomethingWithSuccess(message, sender);
}
```

This follows NodeJS callback conventions, where an optional error is passed as
the first argument (if the `JsArgs` -> `Result<Vec<JsUnknown>>` conversion
fails), with the actual data following. In my case, there is no use case where
the resolver should be called with an error, so
[`ErrorStrategy::Fatal`](https://docs.rs/napi/latest/napi/threadsafe_function/ErrorStrategy/enum.Fatal.html)
made more sense and would just call the function directly with the
`Result<Vec<JsUnknown>>`.

```typescript
function myReceiver(message: string, sender: string) {
    // No error case to worry about!
    doSomethingWithSuccess(message, sender);
}
```

Unfortunately, `ThreadsafeFunction` doesn't currently seem to have any support
for [capturing return values](https://github.com/napi-rs/napi-rs/blob/548f358fdbaeba43be4a91aaec3b411a404ffb61/crates/napi/src/threadsafe_function.rs#L400).
This means the resolved file path that the resolver returns gets dropped
entirely. My workaround for this was to modify the JS function signature to
instead use a callback to invoke Rust with the response.

```typescript
import * as path from 'path';

function myResolver(
    specifier: string,
    originatingFile: string,
    // Rust callback invoked with the result.
    callback: (err: any, result: string) => void,
) {
    const resolved = path.join(originatingFile, '..', specifier);
    callback(null, resolved);
}
```

The Rust side then used a
[`CallbackFuture`](https://crates.io/crates/callback-future) to wait for this
function to be invoked and capture the result. Since this would be an
un-ergonomic API on the JS side, I added a small adapter which translated a
`Promise` API structure into this callback design.

```typescript
// Wraps the `bundleAsync` export and converts the `resolve`
// option from a Promise API to a callback API.
const { bundleAsync: realBundleAsync } = module.exports;
module.exports.bundleAsync = ({ resolve, ...opts }) => {
    return realBundleAsync({
        ...opts,
        resolve: normalizeJsCallback(resolve),
    })
};

// The version of `resolve` exposed to JS implementations
// which returns a `Promise`.
type PromiseBasedResolve = (
    specifier: string,
    originatingFile: string,
) => Promise<string>;

// The version of `resolve` which invokes the Rust callback.
type CallbackBasedResolve = (
    specifier: string,
    originatingFile: string,
    rustCallback: (err: any, result: string) => void,
) => void;

// Converts the Promise-based of `resolve` to the
// callback-based version.
function normalizeJsCallback(userResolve: PromiseBasedResolve): CallbackBasedResolve {
    return (
        specifier: string,
        originatingFile: string,
        rustCallback: (err: any, result: string) => void,
    ) {
        Promise.resolve(userResolve(specifier, originatingFile)).then(
            (result) => rustCallback(null, result),
            (err) => rustCallback(err, null),
        );
    };
}

// Example usage with the `Promise`-based API.
module.exports.bundleAsync({
    resolve(specifier: string, originatingFile: string) {
        const resolved =
            path.join(originatingFile, '..', specifier);
        return Promise.resolve(resolved);
    },
    // ...
})
```

This gives JS implementations of `resolve()` a fully `Promise` based API, hiding
the ugly callback under the hood.

### Synchronous Callbacks

Parcel's `bundle()` function which I wanted to add a custom resolver to was
actually synchronous, meaning a resolver which returns a `Promise` can't really
work. However, file resolution _might not_ be asynchronous, such as the
`path.join()` implementation above. So in theory, a synchronous `bundle()`
_should_ be possible as long as the custom resolver is synchronous, right?

```typescript
import { bundle } from '@parcel/css';

bundle({
    // Synchronous implementation, should work.
    resolve(specifier: string, originatingFile: string) {
        return path.join(originatingFile, '..', specifier);
    },

    // ...
});
```

However this isn't possible with `ThreadsafeFunction`. As mentioned earlier,
`ThreadsafeFunction` actually queues an invocation and waits for the main thread
to become available, effectively scheduling an event on the
[JavaScript event loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop).
If the main thread is always blocked, then the invocation will never happen.
Since the main thread is executing the Rust implementation of `bundle()`, it
never has an opportunity to invoke the JS event loop and `resolve()` will never
be invoked. I had effectively blocked the main thread waiting for an event to
trigger, but an event can never trigger because the main thread is blocked.
Deadlocked!

The function call is still queued, so I found calling the JS function but not
blocking on it and then adding an asynchronous timeout to the end of the
function allowed `resolve()` to be invoked (albeit after `bundle()` had already
returned).

```typescript
import { bundle } from '@parcel/css';

// Rust call to JS `resolve()` gets scheduled here, but can't happen because the
// main thread is still in this function.
bundle({
    resolve(specifier: string, originatingFile: string) {
        console.log(`Resolving ${specifier} from ${originatingFile}.`);
        return path.join(originatingFile, '..', specifier);
    },

    // ...
});

// Yields to the event loop, so *now* `resolve()` gets invoked and prints.
await new Promise((resolve) => {
    setTimeout(() => resolve(), 1_000);
});
```

The shared main thread makes a synchronous callback with `ThreadsafeFunction`
quite tricky. In Parcel's case, the main thread doesn't need to do anything
special and mostly waits for worker threads / acts as its own worker thread. I
believe it is still possible to manually free the main thread with your own
"event loop" and process cross-thread JS function invocations while waiting for
worker threads. I don't think `ThreadsafeFunction` actually has any API to
support this, so you'd basically have to re-implement your own version of
`ThreadsafeFunction` to do it.

To summarize, `ThreadsafeFunction` doesn't support synchronous callbacks to
JavaScript from worker threads. The easiest solution is to make the callback
asynchronous so the main thread returns a `Promise` with
[`execute_tokio_future()`](https://napi.rs/docs/compat-mode/concepts/tokio).

## Functional Design

Moving away from Node-API and back to traditional Rust: I had a lot of fun with
Rust's functional design patterns. Iterators work really smoothly, `Option` and
`Result` are fantastic, pattern matching is really expressive and intuitive, and
enums work perfectly. I've done some of this before in other contexts like
Haskell, but this was my first opportunity to use APIs which are actually
_designed_ to use `Option` and `Result`, with first class language support for
monadic operations like `?`.

Many of these concepts are pretty easy to add into any language, but the great
part about Rust is that
[it has powerful, standardized primitives](https://tweets.dwac.dev/1554266879950065665/)
which the whole ecosystem can leverage. No unexpected runtime errors and no
unchecked nulls. This should really be the standard for all future languages and
I would love to see a stronger effort to migrate towards these patterns in
existing languages.

The one unfortunate part is that it sometimes felt like every API was returning
`Result` and it littered most of the code with `?` operators after every call.
It's not that big a deal since `?` is such a lightweight addition, but I wonder
how different this really is from traditional error handling if they just get
propagated 99% of the time anyways.

### Unions

I was also a little sad that there's no equivalent to TypeScripts union operator
(`|`) in Rust. This means that have a function return one of multiple things
requires a named enum type and can't be anonymously constructed from a union of
existing types.

```typescript
function numberOrString(value: number | string): void {
    console.log(`Value: ${value}`);
}

numberOrString(1); // Value: 1
numberOrString('test'); // Value: test
```

```rust
// Must declare the enum and give it an explicit name name.
enum NumberOrString {
    IsNumber(i32),
    IsString(String),
}

fn number_or_string(value: NumberOrString) {
    match value {
        NumberOrString::IsNumber(num) =>
            println!("Value: {}", num),
        NumberOrString::IsString(str) =>
            println!("Value: {}", str),
    }
}

fn main() {
    number_or_string(NumberOrString::IsNumber(1)); // Value: 1
    number_or_string(NumberOrString::IsString(
        String::from("test"))); // Value: test
}
```

I thought it would bother me more than it did, but it actually didn't come up
too often, so it's a relatively minor complaint. You could use an implementation
of [`Either`](https://docs.rs/either/latest/either/), though there doesn't seem
to be a standard version and it doesn't scale too well. I do know that
`number | string` in TypeScript is not discriminated (no data telling me which
type is in the variable, I'd have to `typeof` it). By contrast, `NumberOrString`
is discriminated which allows `match` to work as well as does. That said, I
would still love to see some kind of union operator in Rust to make this a
little lighter-weight for simple cases.

### Mixing `Option` and `?`

One particularly annoying challenge I came across was mapping `Option` types
with operations that might fail and how they interact with the `?` operator:

```rust
fn main() -> Result<(), ()> {
    // Works: `?` is great!
    println!("{}", maybe_concat("First", " Second")?);

    // error[E0277]: the `?` operator can only be used in a
    // closure that returns `Result` or `Option`
    let result = Some("Hello")
        .map(|value| maybe_concat(&value, " World")?);
    println!("{:?}", result);

    Ok(())
}

fn maybe_concat(first: &str, second: &str) -> Result<String, ()> {
    Ok(String::from(first) + second)
}
```

Since the `?` is used in a closure within `Option.map()`, is isn't able to make
an early return from `main()` on failure. I couldn't find a good workaround to
this which used `.map()`, so the best I could come up with was to avoid the
closure altogether:

```rust
fn main() -> Result<(), ()> {
    // Inline the `.map()` call with a `match`.
    // Avoids the closure, so `?` still works.
    let result = match Some("hello") {
        Some(value) => Some(maybe_concat(&value, " world")?),
        None => None,
    };
    println!("{:?}", result);

    Ok(())
}
```

This works but just **screams** at me to use a `.map()` call. That `None => None`
and `Some(value) => Some(fn(value))` is _exactly_ what a `.map()` function is
for. I'm not sure what the right solution to this would be beyond the Rust
compiler magically jumping out of `main()`, which is _maybe_ possible, but
definitely sounds like a bad idea.

## Deployment

Most of the effort here was trying to get Parcel to support custom resolvers
implemented in JavaScript. However I was very easily able to set up a custom
resolver implemented in Rust. I could have stopped there and just written my own
usage in Rust rather than JavaScript. I did consider this option but ultimately
decided against it because my use case was itself a JS library for others to
consume (called
[`rules_prerender`](https://github.com/dgp1130/rules_prerender/), you should
check it out if you're into Bazel or static site generators). I could have
written a resolver there in Rust, but then I would run into the problem of
deployment, how do users depend on the Rust part of the library?

This would have required cross-compiling my Rust resolver and Parcel into a
bunch of different architectures, shipping them on NPM, installing the right
one, and then invoking it. This was a lot of complexity I didn't want to address
for a 5-line resolver, but was trivial for a JS resolver. So instead of solving
that problem, I decided to go through all this multi-threaded, async Node-API
stuff contributed to a library I don't own, and write a way-too-long blog post
about it.

![The "stonks" meme featuring a man in a suit with a blank mannequin head
looking confidently at a line graph moving up and to the right with a bunch of
meaningless numbers in the background. The subtitle reads: "Efficiency".
](./3-efficiency.avif)(./3-efficiency.webp)

## Adapters

An area I struggled a lot with were discovering and choosing between the many
different versions of the same operation which had slightly different semantics
or names. For example, what kind of `Fn` or `.iter()` operation should I do? I
eventually came to understand that these have direct parallels to Rust's
ownership model:

|               | Own            | Borrow    | Mutate        |
| ------------- | -------------- | --------- | ------------- |
| **Language**  | `foo`          | `&foo`    | `&mut foo`    |
| **Functions** | `FnOnce`       | `Fn`      | `FnMut`       |
| **Iterators** | `.into_iter()` | `.iter()` | `.iter_mut()` |

Once I understood that correlation, I had a much easier time understanding which
of these I should be using for any particular problem. Some useful references
for both of these are:

*   [Finding Closure in Rust](https://huonw.github.io/blog/2015/05/finding-closure-in-rust/)
*   [Effectively Using Iterators in Rust](https://hermanradtke.com/2015/06/22/effectively-using-iterators-in-rust.html)

This also helped teach me a few common conventions:

*   `.into_*()` means "convert and take ownership".
*   `.ok_*()` means "convert into a `Result` type".
    * Except for `Result` which confusingly converts into an `Option`.
*   `unwrap_*()` means "extract from the object".
*   `unwrap()` means "extract from the object or panic because I don't want to
    deal with error handling right now".
*   `.expect()` means "assert that I got a valid result".
*   `.try_*()` means "does things with `Result` types".

These conventions took some time for me to get used to and I haven't seen them
written down explicitly in this kind of format together, so hopefully this is
helpful to someone out there (also may not be 100% accurate).

One adapter in particular that tripped me up was `.clone()`, specifically
`&str.clone()` and `&PathBuf.clone()`. Both of these are fairly useless IMHO
because they will take a borrowed reference to an object, clone it, and then
return another borrowed reference. Eventually I discovered `.to_owned()` which
clones the string and returns an owned version of the new object, which is
almost always what you would want in that situation.

`map()` functions also had some inconsistencies between types which I found
quite confusing. For example:

*   [`Iterator`](https://doc.rust-lang.org/std/iter/trait.Iterator.html) uses
    [`.map()`](https://doc.rust-lang.org/std/iter/trait.Iterator.html#method.map) and
    [`.flat_map()`](https://doc.rust-lang.org/std/iter/trait.Iterator.html#method.flat_map).
*   [`Option`](https://doc.rust-lang.org/std/option/enum.Option.html) uses
    [`.map()`](https://doc.rust-lang.org/std/option/enum.Option.html#method.map),
    [`.and_then()`](https://doc.rust-lang.org/std/option/enum.Option.html#method.and_then),
    and [`.or_else()`](https://doc.rust-lang.org/std/option/enum.Option.html#method.or_else).
*   [`Result`](https://doc.rust-lang.org/std/result/enum.Result.html) uses
    [`.map()`](https://doc.rust-lang.org/std/result/enum.Result.html#method.map),
    [`.and_then()`](https://doc.rust-lang.org/std/result/enum.Result.html#method.and_then), and
    [`.or_else()`](https://doc.rust-lang.org/std/result/enum.Result.html#method.or_else).
*   [`Future`](https://docs.rs/futures/latest/futures/future/trait.FutureExt.html)
    uses [`.map()`](https://docs.rs/futures/latest/futures/future/trait.FutureExt.html#method.map)
    and [`.then()`](https://docs.rs/futures/latest/futures/future/trait.FutureExt.html#method.then).

`Option` and `Result` seem to be mostly aligned, but `Iterator` and `Future`
both disagree on the name of their flat map operation. The lack of function
overloading also makes distinctions like
[`Future.map()`](https://docs.rs/futures/latest/futures/future/trait.FutureExt.html#method.map)
vs [`Future.then()`](https://docs.rs/futures/latest/futures/future/trait.FutureExt.html#method.then)
much more annoying to use than they really should be.

These adapters are also a bit tricky for documentation. Since many of them are
implemented as extension functions, some type documentation is fairly minimal
and unhelpful for typical usage.
[`Future`](https://docs.rs/futures/latest/futures/future/trait.Future.html) is a
good example of this which has a great overview of the primitive and how polling
works, but no details about how to actually use a Future from a practical
perspective. All the functions you really care about are under
[`FutureExt`](https://docs.rs/futures/latest/futures/future/trait.FutureExt.html)
and much harder to find.

This is compounded by adapter types that are never actually referenced and only
ever returned and consumed by adapter functions. For example,
[`Future.map()`](https://docs.rs/futures/latest/futures/future/trait.FutureExt.html#method.map)
makes a lot of sense to me as a function invocation, but
[`futures::future::Map`](https://docs.rs/futures/latest/futures/future/struct.Map.html)
as a _type_ makes no logical sense to me. It doesn't fit a functional mental
model and makes it much harder to work with. I'm sure there's a good reason as
to why these kinds of types need to exist (probably because a `dyn Future` isn't
`Sized`?) but they clutter the API surface and documentation with noise that
really doesn't benefit the user. This is particularly annoying when Googling
"Rust Future map" and finding
[`futures::future::Map`](https://docs.rs/futures/latest/futures/future/struct.Map.html)
instead of the
[`Future.map()`](https://docs.rs/futures/latest/futures/future/trait.FutureExt.html#method.map)
function that you actually wanted.

## `async` / `await`

I'll admit I was a bit scared to jump into `async` / `await` stuff when the need
arose, as I was under the impression the feature was still relatively new and
there was no built in runtime. Fortunately I found the experience pretty
straightforward and reasonably well supported. In particular, `await` can mostly
be thought of as syntactic sugar for `Futures`, which closely aligns to how
`await` works with `Promises` in JavaScript and was an easy mental model to pick
up for me.

That said, there are some rough edges, however they are mostly smoothed over by
community crates.
[Async recursion](https://docs.rs/async-recursion/latest/async_recursion/),
[async traits](https://docs.rs/async-trait/latest/async_trait/), and
[async tests](https://docs.rs/tokio/latest/tokio/attr.test.html) are three areas
in particular which stood out to me, but attribute macros mostly make things
"just work" without a whole lot of issues.

Macros in general seem like a really powerful feature, but I'm not totally
convinced they're a good idea yet. Implementations are practically unreadable to
me, generated code is hard to understand or debug, and compile errors become
incredibly noisy. One error I captured looked like this:

```
   Compiling playground v0.0.1 (/playground)
error[E0277]: `std::sync::MutexGuard<'_, &mut Data>` cannot be sent between threads safely
  --> src/main.rs:11:1
   |
11 | #[async_recursion::async_recursion]
   | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ `std::sync::MutexGuard<'_, &mut Data>` cannot be sent between threads safely
   |
   = help: within `futures::stream::futures_ordered::OrderWrapper<impl futures::Future<Output = Data>>`, the trait `std::marker::Send` is not implemented for `std::sync::MutexGuard<'_, &mut Data>`
   = note: required because it appears within the type `for<'r, 's, 't0, 't1, 't2, 't3, 't4, 't5, 't6, 't7, 't8, 't9, 't10, 't11, 't12> {ResumeTy, std::sync::Mutex<&'r mut Data>, &'s std::sync::Mutex<&'t0 mut Data>, Result<std::sync::MutexGuard<'t1, &'t2 mut Data>, PoisonError<std::sync::MutexGuard<'t3, &'t4 mut Data>>>, &'t5 mut std::sync::MutexGuard<'t6, &'t7 mut Data>, std::sync::MutexGuard<'t8, &'t9 mut Data>, &'t10 mut &'t11 mut Data, &'t12 mut Nested, u64, Duration, Sleep, ()}`
   = note: required because it appears within the type `[static generator@src/main.rs:20:91: 35:6]`
   = note: required because it appears within the type `from_generator::GenFuture<[static generator@src/main.rs:20:91: 35:6]>`
   = note: required because it appears within the type `impl futures::Future<Output = Data>`
   = note: required because it appears within the type `futures::stream::futures_ordered::OrderWrapper<impl futures::Future<Output = Data>>`
   = note: required because of the requirements on the impl of `std::marker::Send` for `FuturesUnordered<futures::stream::futures_ordered::OrderWrapper<impl futures::Future<Output = Data>>>`
   = note: required because it appears within the type `FuturesOrdered<impl futures::Future<Output = Data>>`
   = note: required because it appears within the type `Collect<FuturesOrdered<impl futures::Future<Output = Data>>, Vec<Data>>`
   = note: required because it appears within the type `futures::future::join_all::JoinAllKind<impl futures::Future<Output = Data>>`
   = note: required because it appears within the type `JoinAll<impl futures::Future<Output = Data>>`
   = note: required because it appears within the type `for<'r, 's, 't0, 't1, 't2, 't3, 't4, 't5> {ResumeTy, Vec<Data>, &'r mut [Data], std::slice::IterMut<'s, Data>, [closure@src/main.rs:20:78: 35:6], std::iter::Map<std::slice::IterMut<'t2, Data>, [closure@src/main.rs:20:78: 35:6]>, JoinAll<impl futures::Future<Output = Data>>, ()}`
   = note: required because it appears within the type `[static generator@src/main.rs:12:21: 39:2]`
   = note: required because it appears within the type `from_generator::GenFuture<[static generator@src/main.rs:12:21: 39:2]>`
   = note: required because it appears within the type `impl futures::Future<Output = ()>`
   = note: required for the cast to the object type `dyn futures::Future<Output = ()> + std::marker::Send`
   = note: this error originates in the attribute macro `async_recursion::async_recursion` (in Nightly builds, run with -Z macro-backtrace for more info)

For more information about this error, try `rustc --explain E0277`.
error: could not compile `playground` due to previous error
```

This was trying to tell me "`MutexGuard` can't be passed across an `async`
boundary" but exactly which mutex and how the mistake is made is completely lost
in the macro.

While I'm by no means an expert in Rust, I think I have reasonable handle on
most of its concepts to be able to work with them fairly effectively. One
concept I definitely do _not_ understand is
[pinning](https://rust-lang.github.io/async-book/04_pinning/01_chapter.html). It
didn't come up too much in this particular project, but I've encountered plenty
of errors in the past where I have to `Pin` and `Box` all my `Futures` and
wasn't able to find any explanations which really made sense to me. Hopefully
that's something I can get a better handle on eventually.

## Conclusion

So that's a bunch of random thoughts about my experience with Rust. Overall, I
definitely had a lot of fun with it and I think it's a really well designed
language. This experience has convinced me that
**I will never write C++ again**, however
**I'm not ready to abandon TypeScript just yet**. The trade-offs Rust makes are
only really applicable in very particular scenarios, so I don't feel a strong
need to rewrite all our existing web tooling from scratch. It can certainly have
some value in specific circumstances, but I still believe you should profile and
optimize your JavaScript to make sure the language and runtime is _actually_ the
limiting factor and Rust gives significant performance benefits to justify the
increase in complexity. If so, then Rust is a fantastic option to manage that
complexity, just make sure it is _essential_ complexity and not _accidental_
complexity.
