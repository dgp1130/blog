---
tags: posts
layout: pages/post
title: Weak Refs
date: 2026-09-19T12:00:00-07:00
excerpt: TODO
languages: [ typescript ]
---

# JavaScript `WeakRef` and Garbage Collection

TODO:
* Title
* Date
* Backticks in links.
* Call back to Angular at the end?

Outline:
* Intro/Context
* Primer on GC and `WeakRef`
* `WeakRefMap` API design
* `keys` vs `values` inconsistency
* Testing

```timestamp
```

In my time working on [Angular](https://angular.dev/), I've come across a number
of places where memory management becomes particularly challenging. I tend to
spend a lot of time on our debugging tooling, especially in DevTools, where we
need to track data associated with user-controlled objects, but can't rely on
explicit disposal when that data is no longer necessary.

For example, Angular DevTools displays a graph of all
[signals](https://angular.dev/guide/signals) inside a component. This requires
some tracking extra data about each signal and requires a bunch of debug data
structures. That's all fine, until you remember that signals are never
explicitly disposed. It is a key part of their lifecycle that when you're done
with them, you just drop them. So any internal data structure we maintain will
very easily leak unless we gate them behind weak references on the user's signal
values.

TODO: Screenshot?

This unique set of constraints frequently leads us to rely on weak object
references to clean up our memory and I recently found myself nerd-sniped by a
particular design challenge: How to create serializable weak references?

DevTools extends frequently need to pass data between multiple JavaScript
execution environments, from the page DevTools is inspecting, to a background
service worker, to the DevTools panel rendering the signal graph. These
environments have different memory spaces and cannot share raw object
references, sending only serializable data as messages between them.

> Fun fact: Apparently the technical term for the "execution environment" I'm
> describing is an
> ["agent"](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model#agent_clusters_and_memory_sharing).
> When multiple agents are running in the same "agent cluster", they can pass
> [SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer)
> objects between them. If they are not in the same cluster, their memory is
> completely isolated. Googling "agent cluster" today yields a lot of very
> unrelated results. Thanks, AI!

Passing debug data between different "agents" (god that feels so wrong) presents
a challenge: How can we weakly hold references to signal objects in the Angular
application, but then allow those objects to be referenced by DevTools via a
serializable token?

While the solution is surprisingly simple, I found myself falling down a rabbit
hole of garbage collector complexity, `WeakRef` nuances, and edge cases that I
wanted to share what I learned here and how I came to the precise answer I did.

## Primer

I'm going to assume you already have a decent understanding of the concepts
around garbage collection and strong vs weak references.

However I will give a short primer on the weak primitives in JS, `WeakMap`,
`WeakRef`, and `FinalizationRegistry`. If you are already familiar with those
utilities, you can [skip to the more interesting bits](#weakrefmap).

If you prefer a video format, this excellent
[HTTP 203 video](https://www.youtube.com/watch?v=uygxJ8Wxotc) goes over much of
the same content.

### `WeakMap`

The most common way to manipulate weak references in JavaScript is a
[`WeakMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap).
This allows associating extra data with a specific object, used as the key in
the map.

```typescript
const map = new WeakMap<Signal<unknown>, DebugInfo>();
map.set(someSignal, {id: 1234});

// Some time later...

map.get(someSignal); // {id: 1234}
```

The map itself tracks its keys by weak references, meaning it does not prevent
keys from being garbage collected. If the program drops all strong references on
`someSignal`, the `DebugInfo` object it maps to is now inaccessible. I can no
longer produce the key which will give me that value! `WeakMap` is then smart
enough to drop the `{id: 1234}` object once `someSignal` is reclaimed by the
garbage collector. So even though this example never calls
`map.delete(someSignal)`, it's not actually leaking memory.

`WeakMap` is generally most useful and ergonomic way to manage weak references.
Since its key is the weak reference, the map is always internally consistent. If
you put something in the map and then look for it later with the same key,
you'll always find what you're looking for. It's only _after_ a value is
inaccessible and unobservable that `WeakMap` actually drops it.

This isn't exactly free. There is a performance cost to using `WeakMap` over
`Map` and you notably can't iterate over all keys or values, there's no
`WeakMap.prototype.keys` function. But the API is consistent with how a
developer expects a typical `Map` to behave while providing the weak reference
functionality it requires.

There's also a
[`WeakSet`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakSet),
but that's generally less commonly useful and you can just think of it has a
`WeakMap<T, null>`. It just tells you whether or not it has seen the provided
key before without retaining a strong reference to it.

### `WeakRef`

[`WeakRef`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef)
_sounds_ simpler than a `WeakMap`, since it's just a single reference as opposed
to map including many weak references, but its more primitive nature actually
makes it a lot more complicated to reason about.

A `WeakRef` provides a weak reference to a given target object. Users can then
call
[`WeakRef.prototype.deref`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef/deref)
to attempt to promote that weak reference back into a strong reference. This
will work if the object happens to still be in memory, either because other
strong references still exist, or the garbage collector just hasn't gotten
around to reclaiming it yet. If the object _has_ been reclaimed, then `deref`
returns `undefined`.

```typescript
const ref = new WeakRef({data: 1234});
await someTimeLater();
ref.deref(); // Might be `{data: 1234}` or `undefined`.
```

Garbage collection is a very non-deterministic process. It is highly dependant
on the amount of memory available to a device at a given time and a host of many
other factors (memory layout, age of free-able memory, etc.). As a result,
`WeakRef` is a standard which actually provides very few guarantees:
* Garbage collection can happen at any time, even in the middle of synchronous
  execution, meaning its target can "disappear" at almost any arbitrary point.
* A `WeakRef` might never return `undefined`, even if the object it targets is
  not accessible via strong references. A GC might choose to simply not reclaim
  a particular value if it doesn't need to.

About the only things you can really rely upon are:
* Multiple `WeakRef` objects targeting the same reference, will be consistent
  with each other. As soon as one returns `undefined`, all of them will.
* If a `WeakRef` and `FinalizationRegistry` target the same object, the
  `WeakRef` will always return `undefined` before the `FinalizationRegistry`
  callback is invoked.

`WeakRef` is effectively a magical object which will sometimes lose its target
object at arbitrary times. This unpredictability makes it incredibly hard to
reason about and test in a confident manner.

### `FinalizationRegistry`

The other side of this coin is
[`FinalizationRegistry`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry).
Where `WeakRef` provides a single weak reference which can be polled at any time
to see if the associated object is still there, `FinalizationRegistry`
effectively provides an event listener. It allows a callback to be invoked as
soon as a piece of memory is reclaimed by the garbage collector.

```typescript
// Store some data related to a specific signal.
const map = new Map</* Id */ number, DebugInfo>();
map.set(someSignal.id, {debugName: 'foo'});

const registry = new FinalizationRegistry(
  (/* held value */ id) => {
    // Clean up the data when the signal is reclaimed by GC.
    map.delete(id);
  },
);

// When `someSignal` is reclaimed, invoke the above
// callback with its `id`.
registry.register(someSignal, /* held value */ someSignal.id);
```

This API also has some notable caveats. For instance, you need to pass in the
specific object reference you want to register, but then you also want a "held
value" to be passed as the input to the callback. This is because the
`FinalizationRegistry` is invoked _after_ the target object is reclaimed, so it
cannot provide that object directly in its callback. Therefore it needs
_some other value_ which identifies the object which was reclaimed while also
not keeping a strong reference on that object, or else it never would be
reclaimed in the first place and defeat the whole purpose of the
`FinalizationRegistry`.

Beyond that, much like how `WeakRef` might just retain an object even though no
strong references exist, a `FinalizationRegistry` callback is not guaranteed to
be invoked just because its target is reclaimed by the GC. Again, there are weak
guarantees here which are difficult to reason about.

## `WeakRefMap`

Now that we have the general background on JavaScript's `WeakRef` primitives,
let's go back to the original problem: How to we create a map of signal debug
data which 1. cleans itself up when the associated signal itself and 2. uses
serializable keys, such that other JS agents (still weird) can refer to them in
serializable messages?

My solution to this is [`WeakRefMap`](#TODO), effectively a map of any key type
(potentially serializable) to a `WeakRef` of the value.

If that sounds simple; great, it should! Also, there's a surprising amount of
complexity you might not expect hidden underneath.

Ultimately, the object itself is just `Map<Key, WeakRef<Value>>`,
with a `FinalizationRegistry` to clean up any keys which point to reclaimed
`WeakRef` objects. There are two ways you can write this with some very subtle
differences between them which I'd like to highlight.

### Encapsulate the `WeakRef`

The more interesting approach is to attempt to fully encapsulate the `WeakRef`
in this class, omitting it from the public API entirely. A slightly simplified
version of this looks like:

```typescript
class WeakRefMap<Key, Value extends WeakKey>
    implements Map<Key, Value> {
  // Internal mapping of the `WeakRef` values.
  private readonly map = new Map<Key, WeakRef<Value>>();

  // When a `WeakRef` target is reclaimed by GC,
  // remove its dead `WeakRef` wrapper from the map.
  private readonly registry = new FinalizationRegistry(
    (key: Key) => {
      this.map.delete(key);
    },
  );

  get(key: Key): Value | undefined {
    // Automatically unbox the `WeakRef`.
    return this.map.get(key)?.deref();
  }

  set(key: Key, value: Value): this {
    // Delete the previous value so we unregister the
    // `FinalizationRegistry`.
    this.delete(key);

    this.map.set(key, new WeakRef(value));
    this.registry.register(
      value,
      /* held value */ key,
      /* unregister token */ value,
    );
    return this;
  }

  delete(key: Key): boolean {
    const value = this.map.get(key)?.deref();
    if (value) this.registry.unregister(value);
    return this.map.delete(key);
  }

  // ...
}

const map = new WeakRefMap<number, Signal<unknown>>();
map.set(1234, someSignal);

await someTimeLater();

map.get(1234); // Could be `someSignal` or `undefined`.
```

The ergonomics here are pretty nice, it literally `implements Map<Key, Value>`
and `WeakRef` does not appear in its public API whatsoever. You can just think
of it like a regular `Map`, and for the most part, that works as expected. But
"for the most part" betrays some fundamental design issues.

#### Keys and Values

First, let's check the iteration helpers. Since we can maintain strong
references on the keys, it is actually possible to implement
`Map.prototype.keys`, unlike `WeakMap`, so let's do that:

```typescript
class WeakRefMap<Key, Value extends WeakKey>
    implements Map<Key, Value> {
  // Internal mapping of the `WeakRef` values.
  private readonly map = new Map<Key, WeakRef<Value>>();

  // Return all the keys from the inner map.
  keys(): MapIterator<Key> {
    return this.map.keys();
  }

  // Return all the values from the outer map,
  // unboxing the `WeakRef` values.
  *values(): MapIterator<Value> {
    for (const ref of this.map.values()) {
      const value = ref.deref();
      if (value) yield value;
    }
  }

  // ...
}
```

But this implementation has a bug, or at least a seemingly inconsistent
behavior. Consider this example:

```typescript
const map: WeakRefMap<string, {}> = /* ... */;
const keyCount = Array.from(map.keys()).length;
const valueCount = Array.from(map.values()).length;
keyCount === valueCount; // Should always be `true`, right?
```

One would naturally expect the number of keys to always match the number of
values assuming you don't mutate the map in between. However, if a `WeakRef`
object happens to have its target reclaimed between the `.keys` and `.values`
calls, then they will observe different data. This means the counts of keys and
values might actually be different! Iterating over both at the same time is
likely to cause a misalignment and introduce non-trivial errors into your code.

What's especially interesting is that order actually matters for this example!
If we rewrite to call `.values` first:

```typescript
const map: WeakRefMap<string, {}> = /* ... */;
const valueCount = Array.from(map.values()).length;
const keyCount = Array.from(map.keys()).length;
keyCount === valueCount; // Actually always `true`!
```

This example is always `true`. Why? It turns out that `WeakRef` has a special
consistency behavior. If you call `deref` and receive a strong reference to the
target, that target is now "kept alive" until the end of the current job. Per
[the spec](https://tc39.es/ecma262/multipage/managing-memory.html#sec-weak-ref.prototype.deref):

> If the `WeakRef` returns a target value that is not undefined, then this
> target value should not be garbage collected until the current execution of
> ECMAScript code has completed...
>
> ```typescript
> let target = { foo() {} };
> let weakRef = new WeakRef(target);
>
> // ... later ...
> if (weakRef.deref()) {
>   weakRef.deref().foo();
> }
> ```
>
> In the above example, if the first deref does not evaluate to undefined then
> the second deref cannot either.

Since `.values` effectively polls every object by calling `.deref`, it forces
each one to stay alive until the end of synchronous execution. This means the
subsequent `.keys` call is guaranteed to see all the same `WeakRef` objects that
`.values` did.

This means we can fix the issue by having `.keys` also poll `.deref` for every
object.

```typescript
class WeakRefMap<Key, Value extends WeakKey>
    implements Map<Key, Value> {
  // Internal mapping of the `WeakRef` values.
  private readonly map = new Map<Key, WeakRef<Value>>();

  // Return all the keys from the inner map.
  *keys(): MapIterator<Key> {
    for (const [key, value] of this.map.entries()) {
      // Only yield keys which still have values.
      if (value.deref()) yield key;
    }
  }

  // ...
}
```

While this seems obvious, it works for different reasons than you're probably
envisioning. Filtering out reclaimed `WeakRef` objects does make the `.keys`
call more accurate, but since a `WeakRef` can lose its target at any time in
normal synchronous execution, you would not expect this to help maintain
consistency with `.values`. However, because the spec carves out this special
case and keeps any `.deref` values alive, this _is_ actually sufficient to fix
the bug.

To editorialize a little bit, I find myself very conflicted about this behavior
in the spec. I understand what the authors were going for here, and it does help
with bugs like this. However, I feel this is particular confusing and
unintuitive behavior about a primitive which is already quite unreliable.
Without the "keep alive" behavior, you could never assume multiple `.deref`
calls would give consistent answers, making the system much easier to reason
about with local information. But with the "keep alive" behavior, the result of
one `.deref` call can depend on others in the same synchronous execution, which
includes a lot of non-local information. We've moved from "broken for less
confusing reasons" to "working for _more_ confusing reasons".

I guess "working" is better than "broken", but I feel like optimizing for
legibility and locality would have made more sense. It's much more difficult to
intuit how `WeakRefMap` will behave when I have to take into account this side
effect of every `.deref` call. Ultimately I'm not a garbage collection expert,
and I'm sure smarter people than I were involved in the standardization process,
just sharing my view that this "feature" makes the system overall _harder_ to
reason about.

Invoking `.deref` on all the values is also now a performance cost. It forces
the entire map to be "kept alive" for the rest of the synchronous execution,
keeping the data in memory for potentially longer than necessary.

#### Size Tracking

Second, let's look at the implementation of `size`:

```typescript
class WeakRefMap<Key, Value extends WeakKey>
    implements Map<Key, Value> {
  // Internal mapping of the `WeakRef` values.
  private readonly map = new Map<Key, WeakRef<Value>>();

  // Count all the values.
  get size(): number {
    return Array.from(this.values()).length;
  }

  // Return all the values from the outer map,
  // unboxing the `WeakRef` values.
  *values(): MapIterator<Value> {
    for (const ref of this.map.values()) {
      const value = ref.deref();
      if (value) yield value;
    }
  }

  // ...
}
```

`.size` effectively iterates through all the values in the map, unboxes each
`WeakRef` to the target value, dropping any which have been reclaimed, and then
counts them.

This is a `O(n)` operation, whereas `.size` is typically `O(1)`. Why can't we do
better? Well, `this.map.size` counts `WeakRef` values which may have been
reclaimed. Since `FinalizationRegistry` isn't guaranteed to be called in a
timely manner, we can't assume the internal map is in a pristine state. It tells
you how many `WeakRef` objects are in the map, but not how many backing strong
references you'll actually get from `values()`.

We could count `.set` and `.delete` calls to cache the current size locally, but
this suffers the same problem of not taking into account `WeakRef` targets being
reclaimed or `FinalizationRegistry` callbacks.

We could ignore this and just return `this.map.size`, but then `.size` would be
inconsistent with `.keys` and `.values`!

```typescript
const map: WeakRefMap<string, unknown> = /* ... */;
await someTimeLater();

const size = map.size;
const valueCount = Array.from(this.map.values).length;
size === valueCount; // Might be `false`!
```

So the only internally consistent option is to check that every `WeakRef` still
has its target. That's a `O(n)` check and also a performance de-opt, since it
forces every object to be "kept alive", even though `.size` doesn't actually
care about them.

### Expose the `WeakRef`

For those inconsistencies, I found myself unsatisfied with that implementation.
The core problem is that it attempts to hide the `WeakRef` usage as an
implementation detail. While technically possible, it has non-trivial downstream
effects. More importantly, it is semantically important for the user to
understand the memory implications of the class they're using. Even if they
don't fully grasp the nuances of `WeakRef` and `FinalizationRegistry`, it is
important to understand what data is being retained and in what circumstances.

Therefore, the alternative implementation intentionally _exposes_ that
information. It shifts them mental model from `Map<Key, Value>` to
`Map<Key, WeakRef<Value>>`. It's no longer encapsulating the `WeakRef` concept
and instead exists primarily to configure the `FinalizationRegistry` for you.

We can write the entire implementation in only a few lines:

```typescript
class WeakRefMap<Key, Value extends WeakKey>
    extends Map<Key, WeakRef<Value>> {
  private readonly registryTokens = new Map<Key, Token>();
  private readonly registry = new FinalizationRegistry(
    (key) => {
      this.delete(key);
    },
  );

  override set(key: Key, ref: WeakRef<Value>): this {
    // Unregister any previous value for this key so the
    // `FinalizationRegistry` isn't called when the
    // previous value is reclaimed.
    this.delete(key);

    // If the value is already reclaimed,
    // don't add it to the map.
    const value = ref.deref();
    if (!value) return this;

    // Register the key to be removed when the value
    // falls out of scope.
    const token = {};
    this.registryTokens.set(key, token);
    this.registry.register(value, key, token);

    // Store the weak reference itself.
    super.set(key, ref);

    return this;
  }

  override delete(key: Key): boolean {
    const token = this.registryTokens.get(key);
    if (!token) return false; // Short-circuit missing key.

    // Unregister so the `FinalizationRegistry` isn't
    // called since we won't have any memory to clean.
    this.registry.unregister(token);
    this.registryTokens.delete(key);

    // Drop the weak reference itself.
    return super.delete(key);
  }
}
```

This implementation is actually a lot smaller because we can use
`extends Map<Key, WeakRef<Value>>` rather than `implements`. While this was
always the type of the core implementation, the encapsulated approach
masqueraded as a `Map<Key, Value>` when it technically wasn't.

The solves the consistency problems by largely not solving it. `.keys`,
`.values`, and `.size` all naturally return consistent information, just that
they track the `WeakRef` values, not their targets. `.size` will tell you there
are 5 `WeakRef` objects in the map, but doesn't say anything about whether or
not any of their targets have been reclaimed.

This pushes the problem out to the user of this class, who is now responsible
for calling `.deref`, but makes the contract of the `WeakRefMap` significantly
simpler and more intuitive.

#### Unregistration Tokens

One notable edge case (which actually applies to the previous implementation
too) is that the same `WeakRef` value might be referenced by multiple keys.
Normally, you can use the `WeakRef` target as the "unregistration token",
meaning the object you pass in to unregister the `FinalizationRegistry`.

```typescript
const registry = new FinalizationRegistry(() => { /* ... */ });

const obj = {};
registry.register(
  /* target */ obj,
  /* held value */ 'test',
  /* unregistration token */ obj,
);

await someTimeLater();

registry.unregister(/* unregistration token */ obj);
```

This isn't contradictory like using the target as the held value would be and is
a fairly normal way of unregistering. However, since the same target value can
be registered multiple times for different keys, we also need to be able to
unregister each one separately.

```typescript
const map = new WeakRefMap<string, {}>();

// Map two keys to the same object.
// Calls `register` twice on `obj`.
const obj = {};
map.set('foo', obj);
map.set('bar', obj);

// Should only unregister the `foo` key.
map.delete('foo');
```

To cover that, we create an arbitrary object to serve as an unregistration
token and track that in its own map. This is a little more data we need to
manage, but can do so with the same hooks we've been using.

```typescript
type Token = {}; // Any object will do.

class WeakRefMap<Key, Value extends WeakKey>
    extends Map<Key, WeakRef<Value>> {
  private readonly registryTokens = new Map<Key, Token>();

  override set(key: Key, ref: WeakRef<Value>): this {
    // ...

    // Create a unique token and store it for later.
    const token: Token = {};
    this.registryTokens.set(key, token);
    this.registry.register(value, key, token);

    // ...
  }

  override delete(key: Key): boolean {
    // Get the token for specifically this deleted key.
    const token = this.registryTokens.get(key);
    if (!token) return false; // Nothing in either map.

    // Unregister so the `FinalizationRegistry` isn't
    // called since we won't have any memory to clean.
    this.registry.unregister(token);
    this.registryTokens.delete(key);

    // ...
  }
}
```

### `weak-ref-map`

I published this tiny utility as the
[`weak-ref-map`](https://npmx.dev/package/weak-ref-map/) package. It's fairly
trivial in lines of code, and I would still recommend a regular `WeakMap` over
this for any use case which it can cover. But if this post has taught you
anything, I hope it's that managing weak references is quite complicated and so
consolidating that logic into well-designed and tested modules is a win for the
web ecosystem.

Speaking of testing...

## Testing

The more complex a given piece of code is, the more critical comprehensive
testing becomes. Static analysis only gets you so far in validating program
behavior, and we combined with something as non-deterministic as garbage
collection, it really helps to have automated verification.

Unfortunately, tooling for testing GC behavior is limited and difficult to use.
I want a way to run test cases with arbitrary GC interactions and see if any of
them cause an incorrect behavior or leak memory. Even when you do catch a bug,
it is incredibly difficult to reproduce that bug and verify the fix.

To address this, I built [TODO](#TODO), a library for testing memory leaks. It
leverages
[property-based testing](https://fast-check.dev/docs/introduction/what-is-property-based-testing/),
an approach which relies on defining and validating key properties of a system
and then randomly generating data to test those properties. Using an example
above:

```typescript
const map = new WeakRefMap<string, {}>();
doArbitraryOperationsOn(map);

// No matter what happens, should have same number of keys and values.
const keyCount = Array.from(map.keys()).length;
const valueCount = Array.from(map.values()).length;
expect(keyCount).toBe(valueCount);
```

TODO: More real demo? Show output of a memory leak?

This system intentionally triggers GC operations "randomly" and then validates
the provided properties to ensure no correctness bugs are introduced. With the
right plumbing, this can include whether or not the module leaked memory.

The idea is to make things as random as possible to exercise any potential
failure cases, but _control_ that randomness through a single seed. This makes
tests reproducible, as any failing test prints the seed which failed it, and
then subsequent re-runs with that seed are able to reproduce the same memory
leak consistently.

### How it Works

V8 has an `--expose-gc` flag which provides the `globalThis.gc` function and
allows you manually invoke garbage collection at any time. This will
aggressively reclaim any memory not reachable via strong references, clearing
`WeakRef` targets and scheduling `FinalizationRegistry` callbacks.

While useful, that's a bit too aggressive as it's not realistic of true GC
behavior and can miss bugs which only occur when one particular `WeakRef` target
is dropped or one `FinalizationRegistry` callback is invoked but not another.

So the library wraps `WeakRef` and `FinalizationRegistry` with "deferred"
implementations. They still use the real things under the hood, but adjusted to
be more random and deterministic. `WeakRef` now keeps a _strong_ reference to
the target, and only releases that reference at a specified time as dictated by
the test. This prevents the object from being reclaimed _until_ the test is
ready for it. Once the strong reference is dropped, the next `gc()` call will
reclaim it. This way a single `gc()` call will only reclaim `WeakRef` targets
which the test _allowed_ it to and enables the test to exercise more potential
failure scenarios.

Similarly, the library wraps `FinalizationRegistry` so any callbacks received
from the garbage collector are held in limbo _until_ the test indicates they can
be executed. Again, this allows the test to decide when to run these callbacks,
introducing more controlled randomness.

This implementation isn't perfect. Node doesn't give a ton of control over the
garbage collector, meaning it's not 100% deterministic and there are ways your
code can create memory leaks which this tool is unlikely to catch or which
aren't perfectly reproducible. For instance, in production, a `WeakRef` target
can be reclaimed at any time during synchronous execution, but there's no easy
way to inject `gc()` calls between arbitrary statements. Since this library is
using the real garbage collector, it may randomly decide to reclaim an object at
the perfect time to trigger a bug, but there's no way to cleanly reproduce that
behavior. Those bugs remain hard to squash.

I recommend running Node with some additional flags to force extreme memory
pressure on V8 and further control unpredictability in the GC:

* TODO: Validate
* TODO: Shell syntax highlighting?

```shell
node --expose-gc --gc-interval=100 --jitless \
    --no-concurrent-marking --no-concurrent-sweeping
```

These flags help surface such bugs, but don't completely solve the problem. I
believe this is close to the best you can do with existing tooling, but I would
be curious to see someone smarter than me hack into the allocator and garbage
collector in V8 and swap it out with a completely different implementation
which frees memory based on a seeded pseudo-random algorithm specifically for
testing scenarios like this.

A lot of this was vibe coded. I've validated what I could, but have no doubt
experts would find opportunities to improve overall coverage and
reproducibility. If you are such an expert and have some thoughts, please
suggest improvements in [the repo](#TODO)!

So if you have a potential memory leak you need to address:
1.  First try out regular `WeakMap`! Still prefer that over anything I've shown
    here.
2.  Try out [`weak-ref-map`](#TODO) if you need it.
3.  Consider testing any weak references in your own code with [`TODO`](#TODO).
    I'd love to hear if it helps you find some tricky bugs!
