---
tags: posts
layout: pages/post
title: Construct Better
date: 2020-11-14T12:00:00-07:00
excerpt: |
  Can programming languages design better constructors? Let us explore modern
  constructor design, its flaws, and some potential improvements.
---

* TODO: A better mixin example? Maybe Simpsons-based?
* TODO: Line length of code examples for mobile devices.

# Construct Better

::: timestamp :::

Constructors are really weird. No, seriously, have you ever taken a moment to
*really* think about them? Why they work the way they do? You probably learned
about constructors in school or on some online course and just accepted that is
the way objects are created. At some point you probably heard about the
[factory pattern](https://en.wikipedia.org/wiki/Factory_method_pattern) and use
that from time to time. For the most part, the development community has largely
accepted what a constructor looks like and how it works. But are constructors
really a solved problem? Or have we just plastered over the issues that come
with them via unnecessary workarounds?

## Limitations of Constructors

While this varies across languages, consider the number of things constructors
generally cannot do:

* Return `null`.
* Be asynchronous.
* Return a subclass.
* Return an already existing object.

Many languages also use the `new` keyword as an operator to invoke a
constructor, however the act of constructing a new object is entirely an
implementation detail. Whether a function returns a new instance of an object or
an existing one is mostly irrelevant to callers, but if it is implemented as a
public constructor, then it leaks the implementation detail of constructing a
new object. It means the function is now forced into the above restrictions and
cannot opt-out of them without breaking its API contract.

Factories solve a lot of these problems, and countless engineers have written
"best practices" docs and books espousing the factory pattern. However factories
have their own limitations. They do not play well with subclassing and
inheritance in general, because subclasses cannot extend an object returned by
another factory, they simply do not compose as one would hope. Factories also do
not work well with frameworks which often need hooks into constructors or need
to own them entirely and have to implement their own lifecycle methods instead.

## Syntactical Exceptions

Beyond the feature limitations of constructors, consider all the syntactical
exceptions programming languages make to support this system. Consider this
trivial [TypeScript](https://www.typescriptlang.org/) class (while I am picking
on TypeScript here and languages do vary, many of these points apply to *most*
general purpose object-oriented languages):

```typescript
class Cat extends Animal {
  private readonly firstName: string;

  public constructor(firstName: string, lastName: string) {
    super(firstName + ' ' + lastName);
    this.firstName = firstName;
  }
}
```

Let me list out of the exceptions developers need to keep in mind when writing
constructors in TypeScript:

* Constructors do *not* have a declared return type, it is implied to be the
  same class.
  * When else do you not specify a return type to what is clearly a function?
* Constructors are declared with the special keyword `constructor()`. Other
  languages commonly use the same name as their class.
  * When else does the name of something affect its behavior?
* `super()` *must* be executed before `this` can be used.
  * You also cannot use `this` in the `super()` expression itself.
  * When else does a particular named binding come into scope part way through a
    block?
* Code which does not reference `this` can come before `super()`, but doing so
  means you
  [cannot use field initializers, parameter properties, or native private fields](https://github.com/microsoft/TypeScript/issues/945#issuecomment-60419937).
  * If you want those features, `super()` **must** be the first statement of
    your constructor.
  * This means that the following is not ok, despite the fact that it would
    compile to the exact same thing!
    ```typescript
    class Cat extends Animal {
      private readonly firstName: string;
      // Any field initializer means `super()` must come first!
      private readonly age: number|null = null;

      public constructor(firstName: string, lastName: string) {
        const fullName = firstName + ' ' + lastName;
        super(fullName); // ERR: `super()` must be the first statement.
        this.firstName = firstName;
      }
    }
    ```
  * How often have you made a `static` function just to perform some arbitrary
    computation in order to inline it into a `super()` call?
* Normally you cannot assign to a `readonly` variable, but in constructors you
  can. However this can only be done if the compiler is sure that the variable
  is only assigned once.
  * How often have you turned an `if` statement into a ternary expression or a
    `static` function call in order to get things to compile?
* Constructors do not require a `return;` statement, because a `return this;` is
  implied. However, if you wish to return early, you should use `return;`
  without `this`, as if it were a `void` function. Wat?
  * JavaScript throws another wrench into this because `return 'foo';` will
    actually use `'foo'` instead of the constructed class. Except
    `return undefined;` is the same as `return;`, so the constructed class will
    be used instead. It also means that calling `new Cat()` may not *actually*
    create a new `Cat`, so that keyword can just lie sometimes.

Most of these restrictions have valid reasons for existing. It makes logical
sense that `this` cannot be used before `super()` is called, or else it would
not represent anything meaningful. However the language has to bend over
backwards for a syntax that kinda-sorta makes sense with these restrictions.

Most developers just get used to these restrictions and do not really think
about them, but recall when you first learned constructors, or if you have ever
had to teach them to someone else. There is so much unnecessary complexity for
something that should be as simple as "make an object and return it".

Many languages fix specific parts of these issues. Dart has named constructors.
C# uses a `: base()` syntax to pull the `super()` call out of the body of the
function, which avoids the scope problems of `this`. C++ uses initializer lists
to set `const` fields, so `this->constField = ...` is never valid as would be
expected. Kotlin omits the `new` operator entirely, making object construction a
private implementation detail.

These languages show that many of these individual issues can be addressed with
better syntax, but a lot of them are also integral to the way constructors are
conceptualized. So what is wrong with the core concept that leads to all this
weirdness?

## Constructor Flaws

I see three root mistakes that lead to this strange syntax and behavior:

### Constructors are a user-level construct

In most OO languages, constructors are hand-written by developers for classes
they own. Some languages provide default constructors or auto-generate them, but
almost universally developers have hooks to create their own constructors when
necessary.

Contrast this with Smalltalk, which has no explicit concept of a "constructor".
Instead, a "constructor" is simply a method that returns an object. The language
generates one with the name `new` by default, developers just wrap that as
necessary using the existing features of the language.

### Constructors couple data allocation with initialization

Constructors generally serve the dual purpose of allocating memory for an object
and initializing it with some input, often with additional validation. However,
*allocating* an object and *initializing* an object are two very different
operations with distinct requirements. The former merely needs to know the size
of the object to allocate, while the latter needs to know the actual inputs and
their semantics to set the object to a valid state.

Contrast this with standard C, where allocation is a completely separate step
from initialization. In C,
[`malloc()`](https://en.cppreference.com/w/c/memory/malloc) allocates the memory
for a `struct`, while developers use the existing features of the language to
set the object to a valid state. Often a static function will take the required
inputs, validate them, allocate the `struct`, and set the data on it before
returning in a simplistic form of a constructor.

### A superclass and a subclass are constructed at the same time

Calling `new` on a subclass which extends a separate superclass will invoke both
constructors at the same time, with no opportunity to do anything else in
between. For example, it is generally impossible to write something like:

```typescript
var ollieAnimal = Animal.constructor("Ollie Parker");
print("Successfully invoked Animal part of constructor.");
var ollieCat = Cat.constructor(ollieAnimal, "Ollie");
print("Successfully invoked Cat part of constructor.");
```

Because the executions of the two constructors are inherently coupled it
fundamentally limits the flexibility of constructors as a concept. It also makes
factories hard to compose and often have to bend over backwards in order to work
around this limitation, trying to present a nice API built on awkward
constructor behaviors.

Contrast this with JavaScript, which can use its prototypical inheritance to
decouple the creation of prototype objects. Note: I am not advocating for
writing code this way, just using it to illustrate a point.

```typescript
const ollie = new Animal("Ollie Parker");
console.log("Successfully invoked Animal part of constructor.");
Cat.apply(ollie, [ "Ollie" ]); // Manually invoke Cat constructor.
Object.setPrototypeOf(ollie, Cat.prototype); // Manually assign methods.
console.log("Successfully invoked Cat part of constructor.");
```

Based on these limitations, I believe **the modern concept of constructors is
fundamentally flawed**. I believe we can design languages which provides more
flexibility and in a much simpler conceptual model that what we currently have
today.

## A Better Constructor

So if modern constructors are so bad and have such awkward limitations attached
to them, then what might be a better system for serving the same purpose? Since
constructors are so painful, the simple answer is: "Don't use them", or at
least: "Use them as little as possible".

I call this philosophy: **minimal constructors**.

So what is the "minimal" usage of a constructor? While they serve many purposes,
there is one thing constructors can do which (generally) nothing else can:
allocate memory. As a result, we can define the term "minimal constructor":

> A minimal constructor allocates memory and does nothing more.

Instead of seeing constructors as a feature of classes to be implemented and
leveraged, constructors should be thought of as a core primitive of a
programming language, much like built-in data types and operations. Since
constructors only allocate memory, it makes sense that developers should not
*implement* constructors, but merely *invoke* them.

From this core concept, we can build up to a equivalent feature set of modern
constructors. Saving developers from authoring constructors immediately removes
90% of the syntax problems from earlier. If developers do not write
constructors, then there is no need for a coherent or consistent constructor
syntax. However, this means that the compiler must generate constructors under
the hood, so how might a developer use such a constructor? Consider the
following TypeScript-like snippet for how this could work:

```typescript
class Cat {
  public static create(): Cat {
    return new Cat();
  }
}
```

In this example, there are no user-defined constructors, no `constructor`
keyword. `new Cat()` works just like default constructors in TypeScript, except
that is the **only** constructor. The `new` keyword is still used to actually
invoke this auto-generated constructor, but it is actually closer to a C-style
`malloc()` call. It really just allocates the memory necessary for `Cat` and
type casts it to the relevant type. We can also restrict the `new` keyword to
**only** be callback within its own class. Hence the following would **not**
compile:

```typescript
class Cat { /* ... */ }

// COMPILE ERR: `new Cat` cannot be used outside the `Cat` class.
console.log(new Cat());
```

This prevents the `new` keyword from leaking outside the class itself. It also
means we must lean into the factory concept as a `public static` method is
**required** to ever instantiate a class. Of course, you probably should **not**
name the factory `new()` or `create()` or else you will leak that implementation
detail anyways. I generally recommend `of()` or `from()` to avoid implying that
a new object is created, however
[both of those are reserved keywords in TypeScript](https://github.com/microsoft/TypeScript/issues/2536#issuecomment-87194347-permalink:~:text=type-,from,of,-%F0%9F%91%8D),
so for readability and simplicity I will use `create()`, even though you should
probably not use that in real use cases.

All the logic that traditionally goes inside constructors can be handled by this
factory instead. The constructor is only responsible for allocating memory and
assigning field members. This nicely separates concerns, as factories are
responsible for validating and initializing the object's data.

```typescript
class Cat {
  private readonly myFirstName: string;
  private readonly myLastName: string;

  public static create(firstName: string, lastName: string): Cat {
    return new Cat({
      myFirstName: firstName,
      myLastName: lastName,
    });
  }
}
```

The auto-generated constructor accepts its class fields as parameters, setting
the initial value. Depending on the language, this structure can be tweaked as
well; if a field is omitted, then it could be set to a default value specified
by the initializer for that field. If no initializer is present either, then it
could fall back to its default primitive value or `null`/`undefined`. More
`null`-safe languages might require *all* values to be provided as a constructor
argument or include a field initializer.

At this point we are somewhat stretching the definition of "minimal", as we are
allocating memory, type casting the result, and arguably initializing the class
all at once. However these simply follow from the conventions of modern
memory-managed languages. In such languages, typically all values must have a
type and data cannot be uninitialized. These two minor additions allow
constructors to fit into the existing semantics of strongly-typed,
memory-managed programming languages.

The advantage of doing all initialization in a factory is that any logic you
might want to put in a constructor is pulled out to a higher level in the
factory which avoids many of the syntactic problems found earlier. Consider
`readonly` variables, which "just work" with `if` statements, `for` loops, or
any other construct:

```typescript
class Cat {
  private readonly owner?: Person;

  public static create(people: Person[], ownerName: string): Cat {
    for (const person of people) {
      if (ownerName === person.name) return new Cat({ owner: person });
    }

    return new Cat({ owner: undefined });
  }
}
```

This is much cleaner because `readonly` variables are initialized at the instant
the object is constructed. There is no special case where
`this.myReadonlyVar = ...` can work. Instead, `readonly` variables can *never*
be assigned to with no exceptions. No more need for ternary operators or
separate `static` functions just to work with `readonly`.

### Inheritance

While these initial examples work quite well for simple cases, they do not
handle
[inheritance](https://en.wikipedia.org/wiki/Inheritance_(object-oriented_programming)),
which brings its own set of requirements.

The immediate problem with using minimal constructors for inheritance is that
invoking a constructor is considered a private implementation detail and is
`private` to the class being constructed. This is great for creating an
abstraction but makes inheritance impossible because a subclass does not know
the parameters to provide to its superclass' constructor. Factories provide a
public API for creating an object, however as we learned earlier, factories do
not work well with inheritance.

Since factories perform the actual business logic associated with creating an
object, factories themselves must be *composable*, that is, a subclass factory
should be able to wrap a superclass factory. Since a superclass factory cannot
return an instance of the superclass (or else it would already be constructed),
it must return some other type. We can call this type `ctor<T>`.

`ctor<T>` is a self-contained, primitive type which represents an object that
can create an instance of type `T`. This has two core uses, it can defer the
construction of an object to a later time, or it can be extended by a subclass.

The first use case is the simplest, as `ctor<T>` has a `.construct()` method to
create an actual instance of `T`.

```typescript
class Cat {
  private myFirstName: string;

  public static create(firstName: string): ctor<Cat> {
    return new ctor<Cat>({ myFirstName: firstName });
  }

  public print(): void {
    console.log(this.myFirstName);
  }
}

const ollieCtor: ctor<Cat> = Cat.create('Ollie');
ollieCtor.print(); // ERR: print() does not exist on ctor<Cat>

const ollie: Cat = ollieCtor.construct();
ollie.print(); // 'Ollie'
```

`ctor<T>` is a distinct type, so it does not have access to the methods of `T`;
after all `T` has not been constructed yet, so it does not make sense to call
any methods on it. `ctor<T>` has only one method, `.construct()`, which creates
and returns the instance of `T` from its existing data.

While deferred construction is nice, `ctor<T>` has one other key feature: it can
be extended. Consider a `from` keyword that can be used in combination with
`new`. This will allow a subclass to extend a particular instance of a
superclass' `ctor<T>`.

```typescript
class Animal {
  private myName: string;

  public static create(name: string): ctor<Animal> {
    return new ctor<Animal>({ myName: name });
  }

  public print(): void {
    console.log(this.myName);
  }
}

class Cat extends Animal {
  private myFirstName: string;

  public static createAndPrint(firstName: string, lastName: string): void {
    const animalCtor: ctor<Animal> = Animal.create(firstName + ' ' + lastName);

    // Construct a new `Cat` using the `Animal` from `animalCtor`.
    const cat: Cat = new Cat({ myFirstName: firstName }) from animalCtor;

    cat.print(); // Success
  }
}
```

In the above example, the `Animal` is not constructed directly, but rather made
into a `ctor<Animal>` which simply holds the `myName` field as it was provided.
Once `Cat.create()` has the `ctor<Animal>` it constructs a `Cat` on it using the
`from` keyword.

This structure decouples superclass construction from subclass construction.
Constructor parameters are nicely abstracted behind a factory and do not leak
into the subclass. Any number of operations or function calls could be made
between the `new` invocations. The `ctor<Animal>` could be passed in and out of
functions, saved to a `Map`, retrieved at later time, and then finally
instantiated into a `Cat`.

This also provides simple implementations of class
modifiers. Using `new` on an `abstract` class can *only* create a `ctor<T>`
which does not support a direct `.construct()` call. While using `new` on a
closed (`final`) creates a `ctor<T>` which can *never* be used in a `from`
expression. These could be more accurate modeled with `abstractCtor<T>` or
`closedCtor<T>` types, though for simplicity I will just use `ctor<T>` in this
post.

This decoupling also removes confusion around `this`. In TypeScript, `super()`
must be executed before `this` comes into scope, because the object has not been
created until `super()` is invoked. This awkward foot gun is now impossible
because a reference to `this` refers to the factory context, which is either a
`static` method, a loose function, or an independent class instance. `this` in a
factory will never refer to the constructed object, and it is impossible to get
a reference to the constructed object until after it is properly constructed
and in a consistent state.

Now at this point we have a system which is roughly equivalent to most
object-oriented type systems like Java or C#. We can construct objects and
inherit from other classes using `ctor<T>`. With a few tweaks in how developers
design their code using `ctor<T>`, it can be used as a mostly drop-in
replacement of modern constructors. However, there are a few interesting
"features" this system can provide which are worth discussing. These certainly
are not required to gain the benefits of `ctor<T>` and I am not totally
convinced these are good ideas to begin with. However, I do believe they are at
least *interesting*, and it would be a disservice not to talk about them. With
that disclaimer out of the way...

### Extending interfaces

It was long ago decided in the computer science hive mind that
[multiple inheritance](https://en.wikipedia.org/wiki/Multiple_inheritance) is a
bad idea. There are many reasons for this which I will not go into here, however
most modern object-oriented languages choose to use a single-inheritance model
as an alternative. This is much simpler, but provides less flexibility, so
[interfaces](https://en.wikipedia.org/wiki/Interface_(computing)#In_object-oriented_languages:~:text=In%20object%2Doriented%20languages,-%5B)
are often touted as the single-inheritance answer to most multiple-inheritance
use cases.

However, many developers (myself included) feel that interfaces do not fully
satisfy all the use cases for multiple-inheritance. Interfaces provide
[polymorphism](https://en.wikipedia.org/wiki/Polymorphism_(computer_science)),
enabling one class to "masquerade" as another. However interfaces generally do
not enable multiple implementations of an interface to share code, nor do they
allow defining local data on an implementation. An interface is an API contract,
not a feature or functionality which is shared between many classes. Some
languages fill in this gap via a trait (ex. Rust) or mixin (ex. Dart) system.

However, `ctor<T>` has some interesting implications regarding interfaces. A
core property of using `ctor<T>`, is that a subclass is no longer responsible
for invoking the superclass constructor via `super()`. The chained `ctor<T>`
objects are responsible for holding class fields and setting them on the final
constructed object. One interesting side effect of not relying on a subclass to
invoke its superclass' constructor, is that the subclass does *not* require a
direct reference to its superclass. This has some unique implications regarding
interfaces, most notably that **extending a class only requires knowledge of a
supported interface, not the implementation itself.**

Take for example, the following TypeScript-like code:

TODO: Can we get a better example here?

```typescript
interface Animal {
  think(): string;
}

// We "extend" an interface. This can be thought of as `Cat` extending an
// unknown implementation of `Animal`. `Cat` has no knowledge of what superclass
// it actually has, it only knows that the superclass implements `Animal`.
class Cat extends Animal {
  public say(): string {
    // Child can invoke `think()` because it knows its superclass implements it.
    return 'Meow... ' + this.think();
  }

  // Constructs off some `ctor<Animal>`. Any implementation of `Animal` can be
  // provided here and it will be extended to make a `Cat`.
  public static create<TParent extends Animal>(parentCtor: ctor<TParent>): Cat {
    return new Cat() from parentCtor;
  }
}

// Make an implementation of `Animal`.
class AmericanAnimal implements Animal {
  // Satisfies the interface.
  public think(): string {
    return 'USA! USA!';
  }

  public static create(): ctor<AmericanAnimal> {
    return new ctor<AmericanAnimal>();
  }
}

// `Cat` can now extend from `AmericanAnimal`, without having knowledge of it.
const americanCtor: ctor<AmericanAnimal> = AmericanAnimal.create();
const cat: Cat = Cat.create(americanCtor);
console.log(cat.think()); // 'USA! USA!' - Satisfies the interface.
console.log(cat.say()); // 'Meow... USA! USA!' - `Cat` can call its superclass.
```

The idea of "extending an unknown implementation of a known interface" provides
much more power and flexibility to the traditional concept of interfaces. It
still provides polymorphism, as `Cat` and `AmericanAnimal` can both be cast to
`Animal`. It also allows `Cat` to rely on its superclass to provide the `Animal`
interface, meaning the implementation of `think()` can be shared across multiple
subclasses who extend the `Animal` interface. Both `Cat` and `AmericanAnimal`
also own their own factories, meaning they can both declare their own fields and
encapsulate their own relevant state. This is far more powerful than a
traditional single-inheritance interface.

### Dynamic inheritance hierarchy

There is an interesting consequence of allowing a class to extend an unknown
implementation of an interface, that a class can extend multiple superclasses,
chosen dynamically at runtime. This has a few, far-reaching effects.

On the one hand, it means that a class can dynamically choose its superclass at
runtime, via its own condition or having that superclass provided as an input to
a factory. Take for example a simple `Set` use case. Here, we want two
implementations, one optimized for very small sets, and another optimized for
very large sets. Then, we want to have a `MutableSet` that provides some
mutability features on top of this. How can we design this to reuse the size
optimizations?

```typescript
interface Set { /* ... */ }

// Two implementations of Set, one optimized for a small set, and another for a
// large set.
class SparseSet implements Set { /* ... */ }
class DenseSet implements Set { /* ... */ }

// A simple function to choose the ideal implementation of a Set based on the
// size of its input.
function createSet(items: number[]): ctor<Set> {
  if (items.length < 100) {
    return SparseSet.create(items);
  } else {
    return DenseSet.create(items);
  }
}

// Extend any implementation of `Set`.
class MutableSet extends Set {
  public static create(items: number[]): MutableSet {
    // Dynamically choose the optimal set implementation as a superclass.
    return new MutableSet() from createSet(items);
  }

  // ...
}
```

Here, `MutableSet` is dynamically choosing at runtime whether to extend a
`SparseSet` or a `DenseSet`, implicitly taking advantage of any optimizations
they provide for the size of the input. Since `MutableSet` extends an unknown
implementation of `Set`, it is not intrinsically bound to any particular
superclass. This reduces overall coupling between the classes and nicely reuses
the existing optimizations.

This is a really useful feature, as this same design would be quite difficult to
achieve with traditional class hierarchies. You would either need a
`MutableSparseSet` and a `MutableDenseSet` as distinct subclasses with
duplicated functionality or you would need to refactor the whole thing to use a
mixin or trait system, if you are lucky enough to use a language which supports
them.

On the other hand, this means that class hierarchies are not statically known at
compile-time. Any open implementation of a particular interface could
potentially be used as a superclass which extends that interface. While
everything is still reasonably typed and can be checked at compile-time, the
precise class hierarchy may vary at runtime, and could even differ between
different instances of the same class. A `MutableSet` with 10 items will extend
`SparseSet`, while a different `MutableSet` with 1000 items will extend
`DenseSet` and could exist in the same program and even interact with each
other. This makes reasoning about `MutableSet` a bit harder, as any
`super.method()` could refer to any implementation of `Set` rather than a fixed
superclass.

### Mixins

The idea of "extending an unknown implementation" is basically the definition of
a [mixin](https://en.wikipedia.org/wiki/Mixin). Languages vary widely in their
support of a mixin mechanism, and those that do often have their own problems
with constructors. Take a TypeScript example, which often implements mixins as
a function which converts a class definition into an anonymous class with the
mixin behavior included.

```typescript
type Constructor = new (...args: any[]) => {};
function American<TBase extends Constructor>(Base: TBase) {
  // Return a new class which extends the one provided.
  return class extends Base {
    // Add mixin functionality.
    public think(): string {
      return 'USA! USA!';
    }
  };
}
```

While this works great for simple cases, it starts to break down with
constructors. Consider changing this so the `'USA! USA!'` string literal was
provided as a constructor parameter.

```typescript
type Constructor = new (...args: any[]) => {};
function American<TBase extends Constructor>(Base: TBase) {
  // Return a new class which extends the one provided.
  return class extends Base {
    public myThought: string;

    // ERR: A mixin class must have a constructor with a single rest parameter
    // of type 'any[]'
    public constructor(thought: string, ...args: any[]) {
      super(...args);
      this.myThought = thought;
    }

    // Add mixin functionality.
    public mixin(): string {
      return this.myThought;
    }
  };
}
```

We run into a problem with constructor arguments. This is because a mixin, by
definition, does not have knowledge of its superclass and has no way of knowing
what to provide. TypeScript actually requires that mixins like this declare
their constructors with `...args: any[]` specifically for this reason. Other
limitations of constructors from the `super()` syntax further complicate this to
make it very difficult to extract the first argument as the mixin string and
pass through the rest to the superclass. The end result here, is that it is
near-impossible to pass in a value to a mixin through its constructor.

With `ctor<T>`, a mixin pattern works just like extending an interface:

```typescript
// A mixin simply extends an unknown type parameter. We do not need to know what
// `TParent` is at compile-time, because we do not need a value reference to its
// implementation. This is only used to type-check the `from` clause.
class American<TParent> extends TParent {
  private readonly myThought: string;

  public think(): string {
    return this.myThought;
  }

  // Construct from any given `ctor<T>`. Must use a function-specific generic
  // because as a static function, `TParent` is not in scope or known at this
  // time.
  public static create<TSuper>(parentCtor: ctor<TSuper>, thought: string):
      ctor<American<TSuper>> {
    return new ctor<American<TSuper>>({ myThought: thought }) from parentCtor;
  }
}

// Define a simple parent class, with no knowledge of `Mixin`.
class Animal {
  public move(): void {
    // Moves...
  }

  public static create(): ctor<Animal> {
    return new ctor<Animal>();
  }
}

// `Cat` extends `Animal` mixed with `American`.
class Cat extends American<Animal> {
  public say(): string {
    // `Cat` can reference both `American` and `Animal` members.
    this.move();
    return this.think() + ' Meow...';
  }

  public static create(): Cat {
    // Call `American` factory with a `ctor<Animal>`.
    const animalCtor: ctor<Animal> = Animal.create();
    const americanCtor: ctor<American<Animal>> =
        American.create(animalCtor, 'USA! USA!');
    return new Cat() from americanCtor;
  }
}

console.log(Cat.create().say()); // 'USA! USA! Meow...'
```

With `ctor<T>`, we are able to define a mixin as simply a class that will extend
any given superclass. This is done by simply allowing a class to extend its own
type parameter, since all "extending" does is simply type check the `from`
clause of a `new` expression. In a structural type system like TypeScript, this
could be implemented by simply having `American.create()` return
`American & TParent`, intersecting the types to merge their definitions,
removing the need to extend a generic type parameter at the class level.

Using mixins with `ctor<T>` composes factories smoothly and allows each mixin to
own its own constructor parameters. You can even introduce type constraints on
the classes that can be used with a given mixin simply by adding those
constraints to the generic:

```typescript
class Animal { /* ... */ }
class American<T extends Animal> extends T { /* ... */ }
class Bird<T extends Animal> extends T { /* ... */ }

class BaldEagle extends Bird<American<Animal>> {
  public static create(): BaldEagle {
    const animalCtor: ctor<Animal>
        = Animal.create(/* ... */);

    const americanCtor: ctor<American<Animal>>
        = American.create(animalCtor, /* ... */);

    const birdCtor: ctor<Bird<American<Animal>>>
        = Bird.create(americanCtor, /* ... */);

    return new BaldEagle() from birdCtor;
  }
}
```

Note that not much needs to change to support mixins, as they mostly "just
work"ᵗᵐ. This shows the power and flexibility of `ctor<T>` and decoupling a
superclass from its subclasses, which is all enabled with the use of minimal
constructors.

## Experimental implementation

While authoring this post, I wanted to actually play around with these ideas and
make sure they worked as well as I hoped. A proper implementation would require
a custom compiler, or at least a compiler plugin, however a library could be
"good enough" for small experiments. As a result, I published
[`ctor-exp`](https://github.com/dgp1130/ctor-exp), a simple TypeScript library
which implements many of the ideas here.

TypeScript has a powerful enough type system to emulate a lot of the core
concepts without strictly requiring a compiler plugin. This library is able to
implement most of the critical features, just with less-than-ideal syntax and
only a 3-star safety rating. The repository explains how to use it in detail,
but here is a rough translation with the idealized system described above:

```typescript
import { ctor, from, Implementation } from 'ctor-exp';

class Animal {
  private readonly myName: string;

  // Constructors must be hand-written and follow this format.
  // Must be `public`, but should not be called outside the class.
  public constructor({ myName }: { myName: string }) {
    this.myName = myName;
  }

  public static create(name: string): Animal {
    // Equivalent to: `new Animal({ myName: name })`.
    return ctor.new(Animal, { myName: name }).construct();
  }

  public static extend(name: string): ctor<Animal> {
    // Equivalent to: `new ctor<Animal>({ myName: name })`.
    return ctor.new(Animal, { myName: name });
  }
}

// Extend `Implementation<SuperClass>()` rather than `SuperClass` directly.
class Cat extends Implementation<Animal>() {
  private readonly myFirstName: string;

  // Subclass constructors are the same, but with an empty `super()` call.
  public constructor({ myFirstName }: { myFirstName: string }) {
    super();
    this.myFirstName = myFirstName;
  }

  public static create(firstName: string, lastName: string): Cat {
    // Equivalent to: `new Cat({ myFirstName: firstName }) from Animal.extend(firstName + ' ' + lastName)`.
    return from(Animal.extend(firstName + ' ' + lastName))
        .new(Cat, { myFirstName: firstName })
        .construct();
  }
}
```

Hopefully this provides a close-enough approximation to a real implementation
for devs to experiment with. There are also a number of
[examples of real world use cases](https://github.com/dgp1130/ctor-exp#examples)
to compare a `ctor<T>` approach with traditional constructors, including some of
the more out-there features like dynamically choosing a superclass at runtime.
Check it out and let me know how well some real world examples hold up!

## What about builders?

An astute reader may pose the question: "Isn't this just the builder pattern?
`ctor<T>` is just a `Builder<T>` type." To which my response is: *Why yes it is
Mr. and/or Ms. Smarty Pants, way to steal my thunder here.* More seriously,
while a `ctor<T>` type (or something very similar to it) can be implemented with
a traditional builder class, there are a few core differences with `ctor<T>`:

* `ctor<T>` and "minimal constructors" is more about re-conceptualizing the
  *concept* of a constructor, forcing developers to think more in terms of
  factories. It decouples memory allocation (constructors) from initialization
  and validation (factories). While this can be done with builders, it is not
  inherent in the builder design pattern.
* Composing builders throughout an inheritance hierarchy can be quite complex
  (though not impossible) and requires coordination between different classes in
  the hierarchy as well as adherence to custom API contracts, such as subclass
  constructors propagating black-boxed data to the superclass. `ctor<T>`
  provides a much cleaner and more uniform interface to this concept.
* With `ctor<T>`, the compiler **requires** developers to always use this
  pattern, preventing devs from cornering themselves into a bad design which is
  difficult to get out of without breaking API contracts.
* The compiler automatically generates all the required builder code, as this is
  far too much boilerplate to be practical in most languages without direct
  compiler support.

So while the `ctor<T>` implementation of minimal constructors is *technically* a
special case of the builder design pattern, "minimal constructors" refers to a
more general paradigm of thinking and interacting with constructors which is
much more clearly expressed via `ctor<T>`.

## Drawbacks

While I definitely see this new concept of constructors as an improvement over
existing methodologies, there are a few caveats to consider. Not all of these
apply to the minimal implementation of `ctor<T>` and inheritance, so the extent
to which a language uses the concepts described in this post will vary the kind
and extent of these drawbacks it encounters.

### Extending a sibling

Consider the following class hierarchy:

```typescript
interface Animal { /* ... */ }

class Dog extends Animal {
  public static create(parentCtor: ctor<Animal>): ctor<Dog> {
    return new ctor<Dog>() from parentCtor;
  }

  // ...
}

class Cat extends Animal {
  public static create(parentCtor: ctor<Animal>): Cat {
    return new Cat() from parentCtor;
  }

  // ...
}
```

Because `Animal` is an interface, both `Cat` and `Dog` are capable of extending
any class which satisfies the `Animal` interface. While this provides a lot of
flexibility, it also means the following is possible:

```typescript
// `Dog` extends some `Animal` implementation.
const animalCtor: ctor<Animal> = // ...
const dogCtor: ctor<Dog> = Dog.create(animalCtor);

// `Cat` extends `Dog`, which satisfies the `Animal` interface?!?!
const cat: Cat = Cat.create(dogCtor);
```

Since `Dog` satisfies the `Animal` interface and `Cat` needs a `ctor<Animal>`,
this is satisfied by `ctor<Dog>` and will compile successfully. We have now
created a `Cat` which extends a `Dog` in a way the programmer definitely did not
intend when they first authored the `Cat` and `Dog` classes. This was clearly
intended to be a sibling relationship but has turned into a parent-child
relationship and we have created [CatDog](https://en.wikipedia.org/wiki/CatDog).

While this does speak to the flexibility and power of the concept of extending
interfaces, it also shows a way it can be misused. Ultimately there is really no
way for the language to know whether two classes are intended to be siblings or
not. If `Dog` were declared as closed/`final`, then this would be compile-time
error. However if there are other, legitimate uses of extending `Dog`, then
there is no way to prevent `Cat` from incorrectly extending it.

This is a significant foot-gun which developers would need to be aware of and
watch out for. It also highlights the advantage of simply extending a known
superclass, rather than an unknown implementation of a known interface. For this
reason, it is likely better to extend a known superclass whenever the features
of extending an interface are not required. This would restrict the class
hierarchy and reduce the possibility of bugs. Devs should only extend an
interface when there is an actual design need and benefit to doing so.

### Construction-time execution

One possible concern with `ctor<T>` that superclasses do not have any hook which
executes at construction-time (when the final concrete subclass invokes `new`).
This means that superclasses cannot perform any initialization or validation at
construction-time, only at factory-invocation-time.

This has one positive side effect in that it is impossible for a superclass to
call an abstract method implemented by a subclass during construction. This is
possible in TypeScript and Java, but heavily discouraged because it means the
subclass' implementation of that abstract method will be invoked before its
constructor has a chance to initialize it. That benefit makes me believe that
the lack of construction-time execution in a superclass is actually an
improvement rather than a drawback.

However, if the lack of construction-time computations really became an issue,
some kind of `onConstruct()` method could be called which would enable the class
to do whatever it needed to. I would try to avoid this if possible as I think
many classes would be better designed without this feature, but it may be
impractical to avoid in many use cases.

### Memory fragmentation

In many natively compiled languages like C++, member fields of a subclass are
colocated alongside member fields of a superclass, with a reference to the
[virtual method table (vtable)](https://en.wikipedia.org/wiki/Virtual_method_table).
In such languages, `new` can only be invoked on the concrete subclass being
constructed, and because the inheritance hierarchy is statically known, the
total size of the subclass is also known and the entire class can be allocated
all at once.

A `ctor<T>`-based system would likely be impossible to implement this way due to
the lack of a direct reference to a known, constant superclass. The total size
of a given subclass simply is not known at compile-time. Even for uses that
actually do extend a known, constant superclass would not be enough. A
particular `new ctor<T>()` call for the superclass could eventually be
instantiated into any one of many different subclasses of `T`, with no way of
knowing which it will become, or how much memory to allocate. Even the vtable
could encounter implementation hurdles due to the dynamic nature of the
inheritance hierarchy.

There are certainly ways around this issue. The compiler could separate the
superclass' memory from the subclass, simply leaving pointers to get from one to
the other, this means the size of the entire hierarchy is not needed, but would
have negative runtime impact due to additional pointer indirections and may
require runtime type reflection to know when an indirection is needed.
Alternatively, the compiler could use this indirection strategy for `ctor<T>`
types and then copy them into a single contiguous space when `.construct()` is
called. This means accessing fields of a parent class do not require pointer
indirection or runtime type reflection, but additional copying would be
necessary in the implementation of `.construct()`. There are also other means of
method dispatch than vtables, though they come with their own costs.

The real point here is that using `ctor<T>` as a drop-in replacement for a
natively-compiled language like C++ would probably encounter a lot of
implementation challenges. An interpreted language would likely have a much
easier time implementing this model.

### Symbol conflicts

Mixing two unrelated classes together in an inheritance hierarchy also comes
with the possibility of symbol conflicts. Take the following example:

```typescript
class Animal { /* ... */ }

class Cat<T> extends T {
  public say(): string {
    return 'Meow...';
  }

  // ...
}

class American<T> extends T {
  public say(): string {
    return 'USA! USA!';
  }

  // ...
}

const americanCat: American<Cat<Animal>> = // ...
americanCat.say(); // Returns what?
```

Since `ctor<T>`'s implementation of mixins does not actually break
single-inheritance, there is a clear winner. The type `American<Cat<Animal>>`
means that `American` extends `Cat` which extends `Animal`, and thus method
dispatch would occur in that order, returning `'USA! USA!'`.

If the user wanted to call the implementation on `Cat`, there would need to be a
special syntax to allow it. Something like `americanCat.<Cat<Animal>>say()`
could qualify the method invocation to use a specific type in the inheritance
hierarchy.

This also means that the order of inheritance does matter, as a
`Cat<American<Animal>>` is a distinct type and calling `.say()` on it would
return `'Meow...'`. Of course, if your usage of mixins depends on their
ordering, it is quite likely to inheritance hierarchy has larger design
problems.

Public symbols can at least be resolved unambiguously due to single-inheritance,
but there is still additional complexity and the possibility of bugs as a
result. Fortunately, if the language is
[nominally typed](https://en.wikipedia.org/wiki/Nominal_type_system), `private`
symbols can always be resolved unambiguously, so this only really applies to
`public` and `protected` symbols.

### Re-using a `ctor<T>`

There is also the question of whether or not it is possible to reuse a `ctor<T>`
to construct multiple subclasses. I would argue that conceptually it is fine, as
there is nothing semantically wrong with that idea, but it might take extra work
in the compiler to support that depending on how it is implemented under the
hood.

Being able to reuse a `ctor<T>` would mean the compiler could not construct the
object in-place which may impact optimizations. It could also be possible to
have a distinct `reusableCtor<T>` type, though that comes with additional
cognitive overhead.

Relatedly, some users might reasonably ask to read or mutate the fields on a
`ctor<T>` after it is created. I do not see any major concerns with reading the
data, though immutability can be desirable. Again, a distinct `mutableCtor<T>`
could be made, though composing it with `reusableCtor<T>` starts to scale
somewhat poorly.

## Conclusion

Looking at constructors in modern object-oriented languages, I see quite a few
inconsistencies and unnecessary complexities which can be improved upon. What is
presented here is a different paradigm for thinking and interacting with
constructors with one possible alternative implementation to consider. There are
likely other means of implementing minimal constructors without using `ctor<T>`,
and a language designer should think of its constructor mechanisms within the
context of the language as a whole rather than forcing a particular
implementation or ideology onto a language it does not integrate with.

It is actually possible to follow the minimal constructor concept in existing OO
languages. All that is really necessary is to limit constructor definitions to
merely assign local data and defer all other logic to a factory. Some languages
make this easier or harder than others, particularly when inheritance comes into
play.

What I really want to bring up is that constructors as a concept have simply not
had much innovation for the last few decades. New languages experiment with lots
of established systems, and I would love to see more innovation in the
constructor space. I think there is a lot of room for growth and improvement in
an area that has been largely static as long as I can remember. We can
`.construct()` something better.
