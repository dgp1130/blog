---
tags: posts
layout: pages/post
title: Construct Better
date: 2020-10-30T12:00:00-07:00
excerpt: |
  Can programming languages design better constructors? Let us explore modern
  constructor design, its flaws, and what can be done better.
---

* TODO: `ctor<T>` is the name of this implementation, X is a conceptual name?
* TODO: Use TypeScript throughout?
* TODO: Limitations of constructor interfaces vs a function that returns
  `ctor<T>`?
* TODO: Don't use `Model`, give less abstract examples?
* TODO: Cut case studies in favor of the library tests?
* TODO: Does this break encapsulation too much? Is it reasonable to allow
  consumers to provide a superclass implementation?
* TODO: Choosing a parent class at construction time means there could be public
  symbol conflicts.
* TODO: Framework use case example?

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
class Model extends SuperModel {
  private readonly bar: number;

  public constructor(halfFoo: int, bar: int) {
    super(halfFoo * 2);
    this.bar = bar;
  }
}
```

Let me list out of the exceptions developers need to keep in mind when writing
constructors in TypeScript:

* Constructors do *not* have a declared return type, it is implied to be the
  same class.
  * When else do you not specify a return type to what is clearly a method?
* Constructors are declared with the special keyword `constructor()`. Other
  languages commonly use the same name as their class.
  * When else does the name of something affect its behavior?
* `super()` *must* be executed before `this` can be used.
  * You also cannot use `this` in the `super()` expression itself.
  * When else does a particular binding not come into scope until part way
    through a block?
* Code which does not reference `this` can come before `super()`, but doing so
  means you
  [cannot use field initializers, parameter properties, or native private fields](https://github.com/microsoft/TypeScript/issues/945#issuecomment-60419937).
  * If you want those features, `super()` **must** be the first statement of
    your constructor.
  * This means that the following is not ok, despite the fact that it would
    compile to the exact same thing!
    ```typescript
    class Model extends SuperModel {
      private readonly bar: number;
      // Any field initializer means `super()` must come first!
      private readonly unrelatedInitializer: number = 0;

      public constructor(halfFoo: number, bar: number) {
        const foo = halfFoo * 2;
        super(foo); // ERR: `super()` must be first statement in constructor.
        this.bar = bar;
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
    be used instead. It also means that calling `new Model()` may not *actually*
    create a new object, so that keyword can just lie sometimes.

Most of the restrictions have valid reasons for existing. It makes logical sense
that `this` cannot be used before `super()` is called, or else it would not
represent anything meaningful. However the language has to bend over backwards
for a syntax that kinda-sorta makes sense with these restrictions.

Most developers just get used to these restrictions and do not really think
about them, but recall when you first learned constructors, or if you have ever
had to teach them to someone else. There is so much unnecessary complexity for
something that should be as simple as "make an object and return it".

Many languages fix specific parts of these issues. Dart has named constructors.
C# uses a `: base()` syntax to pull the `super()` call out of the body of the
function, which avoids the scope problems of `this`. C++ uses initializer lists
to set `const` fields, so `this->constField = //. ..` is never valid as would be
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
var mySuperClass = SuperClass.constructor();
print("Successfully invoked SuperClass part of constructor.");
var mySubClass = SubClass.constructor(mySuperClass);
```

Because the executions of the two constructors are inherently coupled it
fundamentally limits the flexibility of constructors as a concept. It also makes
factories hard to compose and often have to bend over backwards in order to work
around this limitation, trying to present a nice API built on awkward
constructor behaviors.

Contrast this with JavaScript, which (while uncommon) can use its prototypical
inheritence to decouple the creation of prototype objects. Note: I am not
advocating for writting code this way, just using it to illustrate a point.

```typescript
const mySuperClass = { foo: "foo" };
console.log("Successfully constructed SuperClass.");
const mySubClass = { bar: "bar" };
Object.setPrototypeOf(mySubClass, mySuperClass);
```

Based on these limitations, I believe **the modern concept of constructors is
fundamentally flawed**. I believe we can design languages which provides more
flexibility and in a much simpler conceptual model that what we currently have
today.

## A Better Constructor

So if modern constructors are so bad, then what might be a better system for
serving the same purpose? There is one core philosophical difference from which
everything else can follow:

TODO: Something more quotable? More pizazz?

> Minimize the work performed by constructors as much as possible.

Since constructors have such awkward limitations attached to them, we should
change the way we think about constructors. Rather than seeing them as a feature
of classes to implemented and leveraged, constructors should be thought of as a
core primitive in the language, much like built-in data types and operations.

From this core principle, it follows that developers should not *implement*
constructors, rather, devs should only *invoke* them.

This immediately removes 90% of the syntax problems from earlier. If developers
do not write constructors, then there is no need for a coherent constructor
syntax. This means that the compiler must generate constructors under the hood,
so how might a developer use such a constructor? Consider the following
TypeScript-like snippet for how this could work:

```typescript
class Model {
  public static create(): Model {
    return new Model();
  }
}
```

In this example, there are no user-defined constructors, no `constructor`
keyword. This works just like default constructors in TypeScript, except it is
the **only** constructor. The `new` keyword is still used to actually invoke
this auto-generated constructor, but it is actually closer to a C-style
`malloc()` call. It really just allocates the memory necessary for `Model` and
type casts it to the relevant type. We can also restrict the `new` keyword to
**only** be callback within its own class. Hence the following would **not**
compile:

```typescript
class Model { }

// COMPILE ERR: `new Model` cannot be used outside the `Model` class.
console.log(new Model().toString());
```

This prevents the `new` keyword from leaking outside the class itself. It also
means we must lean into the factory concept as a `public static` method is
**required** to ever instantiate a class (of course, you probably should **not**
name the factory `new()` or `create()` or else you will leak that implementation
detail anyways).

All the logic that traditionally goes inside constructors can be handled by this
factory instead. This nicely separates concerns, as a constructor's only purpose
is to allocate memory and assign values to class field members, while factories
are responsible for validating and intializing the object's data.

```typescript
class Model {
  private readonly myFoo: number;
  private readonly myBar: number;

  public static from(foo: number, bar: number): Model {
    return new Model({
      myFoo: foo,
      myBar: bar,
    });
  }
}
```

The auto-generated constructor accepts its class fields as parameters, setting
the initial value. Depending on the language, this structure can be tweaked as
well; if a field is omitted, then it could be set to a default value specified
by the intiailizer for that field. If no initializer is present either, then it
could fall back to its default primitive value or `null`/`undefined`. More
`null`-safe languages might require *all* values to be provided as a constructor
argument or include a field initializer.

The advantage of doing all initialization in a factory is that any logic you
might want to put in a constructor is pulled out to a higher level in the
factory which avoids many of the syntactic problems found earlier. Consider
`readonly` variables, which "just work" with `if` statements, `for` loops, or
any other construct:

```typescript
class Model {
  private readonly myItem?: Item;
  public static from(items: Item[], id: number): Model {
    for (const item of items) {
      if (id === item.id) return new Model({ myItem: item });
    }

    return new Model({ myItem: undefined });
  }
}
```

This is much cleaner because `readonly` variables are initialized at the instant
the object is constructed. There is no special case where
`this.myReadonlyVar = // ...` can work. Instead, `readonly` variables can
*never* be assigned to with no exceptions. No more need for ternary operators or
separate `static` functions just to work with `readonly`.

### Inheritance

While these initial examples work quite well for simple cases, they do not
handle inheritence, which brings its own set of requirements.

The first issue with inheritence is that by calling a superclass' factory, the
object has already been instantiated. This makes abstract classes impossible,
and requires concrete superclasses to be extended *after* they have been
constructed, which does not make a whole lot of sense. This problems comes from
the tight coupling of subclass and superclass construction. Since the core rule
is to do as little as possible in a constructor, they are currently defined as
only allocating and assigning class fields. This implies that a subclass
constructor should also only assign class fields, relying on factories to
provide the meaningful initialization and validation logic.

Since factories perform the actual business logic associated with creating an
object, factories themselves must be *composable*, that is, a subclass factory
should be able to wrap a superclass factory. Since a superclass factory cannot
return an instance of the superclass, it must return some other type. We can
call this type `ctor<T>`.

`ctor<T>` is a self-contained, primitive type which represents an object that
can create an instance of type `T`. This has two core uses, it can defer the
construction of an object to a later time, or it can be extended by a subclass.

TODO: Fix `#method` syntax.
TODO: Check for `int` syntax.
TODO: Check Java is not referenced anywhere it shouldn't be.

The first use case is the simplest, as `ctor<T>` has a `.construct()` method to
create an actual instance of `T`.

```typescript
class Model {
  private myFoo: number;
  public static from(foo: number): ctor<Model> {
    return new ctor<Model>({ myFoo: foo });
  }

  public print(): void {
    System.out.println(this.myFoo);
  }
}

const myCtor: ctor<Model> = Model.from();
myCtor.print(); // ERR: print() does not exist on ctor<Model>

const model: Model = myCtor.construct();
model.print(); // Success
```

`ctor<T>` is a distinct type, so it does not have access to the methods of `T`,
after all `T` has not been constructed yet, so it does not make sense to call
any methods on it. It only has one method `.construct()`, which creates and
returns the intance of `T` from its existing data.

`ctor<T>` has one key feature, it can be extended. Consider a `from` keyword
that can be used with `new`. This will allow a subclass to extend a particular
instance of a superclass' `ctor<T>`.

```typescript
abstract class SuperModel {
  private myFoo: number;
  public static from(foo: number): ctor<SuperModel> {
    return new ctor<SuperModel>({ myFoo: foo });
  }

  public print(): void {
    System.out.println(this.myFoo);
  }
}

class Model extends SuperModel {
  private myBar: number;
  public static createAndPrint(foo: number, bar: number): void {
    const smCtor: ctor<SuperModel> = SuperModel.from(foo);

    // Construct a new `Model` using the `SuperModel` from `smCtor`.
    const model: Model = new Model(myBar = bar) from smCtor;

    model.print(); // Success
  }
}
```

In the above example, the superclass is not constructed directly, but rather
made into a `ctor<SuperModel>` which simply holds the `myFoo` field as it was
provided. Once `Model.create()` has the `ctor<SuperModel>` it constructs a
`Model` on it using the `from` keyword.

This structure decouples superclass construction from subclass construction. Any
number of operations or function calls could be made between the two. The
`ctor<SuperModel>` could be passed in and out of functions, saved to a `Map`,
retrieved at later time, and then instantiated into a `Model`. `abstract`
classes can *only* become a `ctor<T>` and do not support a direct `#construct()`
call, while `final` classes can *never* be used in a `from` expression.

This decoupling also removes confusion around `this`. In TypeScript, `super()`
must be executed before `this` comes into scope, because the object has not been
created until `super()` is invoked. This awkward foot gun is now impossible
because a reference to `this` refers to the factory context, which is either a
`static` method, a loose function, or an independent class. `this` in a factory
will never refer to the constructed object, and it is impossible to get a
reference to the constructed class until after it is properly constructed.

## Case Studies

To flesh out the details of the approach, consider the following case studies of
common real-world problems and how `ctor<T>` can do a better job than
traditional constructors.

### Constructor overloading

Another added benefit is that the `ctor<SuperModel>` can be provided as an input
to the `Model` factory, which can be useful for dependency injection and to
reduce coupling between the two classes. Consider another pure-Java example:

```java
public abstract class SuperModel {
  private int myLength;

  // Construct from either a string or an integer.
  public SuperModel(int length) {
    this.myLength = length;
  }
  public SuperModel(String str) {
    this.myLength = str.length;
  }
}

public class Model extends SuperModel {
  private int myIndex;

  // Need two constructors here, even though they do the same thing.
  public Model(int length, int index) {
    super(length);
    this.myIndex = index;
  }
  public Model(String str, int index) {
    super(str);
    this.myIndex = index;
  }
}

// Usage:
new Model(1, 2);
new Model("test", 2);
```

In this example, `SuperModel` can construct itself from either an `int` or a
`String` and `Model` only needs a single `int`. Despite this, `Model` needs to
define two constructors, one for each constructor of `SuperModel` in order to be
compatible with both use cases, even though `Model` does not actually care which
of the two is used.

Contrast this with an implementation using the proposed constructor system:

```java
public abstract class SuperModel {
  private int myLength;
  public static ctor<SuperModel> fromLength(int length) {
    return new ctor<SuperModel>(myLength = length);
  }

  public static ctor<SuperModel> fromString(String str) {
    return new ctor<SuperModel>(myLength = str.length);
  }
}

public class Model extends SuperModel {
  private int myIndex;
  public static Model fromIndex(ctor<SuperModel> smCtor, int index) {
    return new Model(myIndex = index) from smCtor;
  }
}

// Usage:
Model.fromIndex(SuperModel.fromLength(1), 2);
Model.fromIndex(SuperModel.fromString("test"), 2);
```

Because the `ctor<SuperModel>` is passed in as an input, the calling code can
decide which factory to use, increasing flexibility and removing the need to
duplicate constructors in `Model`, reducing unnecessary coupling with the
superclass.

### Cloning

I have used the term "factory" to describe functions which return a new instance
of a class or a `ctor` of a class. In Java-land, "factories" are typically
static methods or distinct classes, but that is not a requirement. One static
factory would be required to get a single instance of the class, but subsequent
instances can be created off the first. Consider:

```java
public abstract class SuperModel {
  private int myFoo;

  protected static ctor<SuperModel> create(int foo) {
    return new ctor<SuperModel>(myFoo = foo);
  }

  protected ctor<SuperModel> clone() {
    return new ctor<SuperModel>(myFoo = this.myFoo);
  }
}

public class Model extends SuperModel {
  private int myBar;

  public static Model create(int foo, int bar) {
    return new Model(myBar = bar) from SuperModel.create(foo);
  }

  public Model clone() {
    return new Model(myBar = this.bar) from super.clone();
  }
}
```

Notice how the instance method `clone()` is used to copy the class' data into a
new instance. This is done in a much more abstracted way than is currently
possible using traditional constructors. `SuperModel#clone()` is responsible for
cloning only its own data while `Model#clone()` only copies its own information,
simply calling out to `SuperModel` without any extra knowledge or effort of what
that does. The `Model.create()` and `Model#clone()` factories are able to easily
and effective compose their `SuperModel` equivalents in an intuitive fashion.
Recall how this must be done in Java today:

```java
public abstract class SuperModel {
  private int myFoo;

  public SuperModel(int foo) {
    this.myFoo = foo;
  }

  protected SuperModel(SuperModel other) {
    this.myFoo = other.myFoo;
  }

  public abstract SuperModel clone();
}

public class Model {
  private int myBar;

  public Model(int foo, int bar) {
    super(foo);
    this.myBar = bar;
  }

  private Model(Model other) {
    super(other);
    this.myBar = other.myBar;
  }

  @Override
  public Model clone() {
    return new Model(this);
  }
}
```

The use of copy constructors is **required** for this kind of problem despite
being unrelated to the developer's intent of cloning an object. If you have
never heard the term "copy constructor" or did not recognize it here, the use is
very unintuitive and unexpected. Most experienced programmers are used to this,
but try explaining to a beginner and its complexity becomes immediately obvious.

This same problem also occurs in other contexts, any time a class heirarchy
needs to abstract creation of the hierarchy on a class-by-class basis.
Deserialization is one example that has the same requirements and also benefits
from this design.

## Experimental implementation

While authoring this post, I wanted to actually play around with these ideas and
make sure it worked as well as I hoped it would. A proper implementation would
require a custom compiler, or at least a compiler plugin, however a library
could be "good enough" for small experiments. As a result, I published
[`ctor-exp`](https://github.com/dgp1130/ctor-exp), a simple TypeScript library
which implements many of the ideas here.

TypeScript has a powerful enough type system to emulate a lot of the core
concepts without strictly requiring a compiler plugin. This library is able to
implement most of the critical features, just with less-than-ideal syntax and
only a 3-star safety rating. The repository explains how to use it in detail,
but here is a rough translation with the idealized system described above:

```typescript
import { ctor, from } from 'ctor-exp';

class Foo {
  private readonly myFoo: string;

  // Constructors must be hand-written and follow this format.
  public constructor({ myFoo }: { myFoo: string }) {
    this.myFoo = myFoo;
  }

  public static createFoo(foo: string): Foo {
    // Equivalent to: `new Foo(myFoo = foo)`.
    return ctor.new(Foo, { myFoo: foo }).construct();
  }

  public static extendFoo(foo: string): ctor<Foo> {
    // Equivalent to: `new ctor<Foo>(myFoo = foo)`.
    return ctor.new(Foo, { myFoo: foo });
  }
}

class Bar extends Foo {
  private readonly myBar: string;

  // Subclass constructors must propagate inputs to the `super()` call.
  public constructor(
    superParams: ConstructorParameters<typeof Foo>,
    { myBar }: { myBar: string },
  ) {
    super(...superParams);
    this.myBar = myBar;
  }

  public static createBar(foo: string, bar: string): Bar {
    // Equivalent to: `new Bar(myBar = bar) from Foo.extendFoo(foo)`.
    return from(Foo.extendFoo(foo))
        .new(Bar, { myBar: bar }).construct();
  }
}
```

Hopefully this provides a close-enough approximation to a real implementation
for devs to experiment with. There are also a number of
[examples of real world use cases](https://github.com/dgp1130/ctor-exp#examples)
to compare a `ctor<T>` approach with traditional constructors. Check it out and
let me know how well some real world examples hold up!

## Drawbacks

While I definitely see this new concept of constructors as an improvement over
existing methodologies, there are a few caveats to consider.

### Construction-time execution

One possible concern is that superclasses do not have any hook which executes at
construction-time (when the final concrete subclass invokes `new`). This means
that superclasses cannot perform any initialization or validation at
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

This system would also be tricky to implement in compilers which colocate
subclass and superclass memory together. Typically, `new` is only ever invoked
on the concrete subclass of a given inheritence hierarchy. This means it is
known at compile-time how large the class is and how much memory to allocate for
any given `new` operation.

With this new construction model, a particular `new ctor<T>()` could be
instantiated into any one of many different subclasses of `T` with no way of
knowing which it will become. This would be an issue as the compiler would not
know how much memory to allocate for the object in advance.

There are certainly ways around this issue. The compiler could separate the
superclass' memory from the subclass, simply leaving pointers to get from one to
the other, this means the size of the entire hierarchy is not needed, but would
have negative runtime impact due to additional pointer indirections and may
require runtime type reflection to know when an indirection is needed.
Alternatively, the compiler could use this indirection strategy for `ctor<T>`
types and then copy them into a single contiguous space when `.construct()` is
called. This means accessing fields of a parent class do not require pointer
indirection or runtime type reflection, but additional copying would be
necessary in the implementation of `.construct()`.

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

## What about builders?

An astute reader may pose the question: "Isn't this just the builder pattern?
`ctor<T>` is just a `Builder<T>` type." To which my response is: *Why yes it is
Mr. and/or Ms. Smarty Pants, way to steal my thunder here.* More seriously, a
`ctor<T>` can be effectively implemented with a traditional builder class.
There are a few core differences with `ctor<T>`:

* `ctor<T>` is more about reconceptualizing the *concept* of a constructor,
  forcing developers to think more in terms of factories. It decouples memory
  allocation (constructors) from initialization and varlidation (factories).
  While this can be done with builders, it is not inherent in the builder design
  pattern.
* With `ctor<T>`, the compiler **requires** developers to always use this
  pattern, preventing devs from cornering themselves into a bad design which is
  difficult to get out of without breaking API contracts.
* The language automatically generates all the required builder code, as this is
  far too much boilerplate to be practical in most languages without direct
  compiler support.

So while the `ctor<T>` methodology is *technically* a special case of the
builder design pattern, `ctor<T>` refers to a more general paradigm of thinking
and interacting with constructors.

## Conclusion

Looking at constructors in modern object-oriented languages, I see quite a few
inconsistencies and unnecessary complexities which can be improved upon. What is
presented here is one possible alternative implementation to consider. However,
this is really an area that simply has not had much innovation for the last few
decades. New languages experiment with lots of established systems, and I would
love to see more innovation in the constructor space. I think there is a lot of
room for growth and improvement in an area that has been largely static as long
as I can remember. We can `.construct()` something better.

## Mixin with known superclass

```java
public class Parent {
  public static ctor<Parent> from() {
    return new ctor<Parent>();
  }
}

// Could add `T implements Foo`.
// Could add `T extends Bar`.
public class Mixin<T> {
  public static ctor<Mixin<T>> from(ctor<T> parent) {
    return new ctor<Mixin<T>> from parent;
  }
}

public class Child extends Mixin<Parent> {
  public static Child from() {
    ctor<Parent> parentCtor = Parent.from();
    ctor<Mixin<Parent>> mixinCtor = Mixin.from(parentCtor);
    return new Child() from mixinCtor;
  }
}
```

## Mixin with interface

```java
public interface Actor {
  public void act();
}

public class StageActor implements Actor {
  private String myPlay;

  public void act() {
    System.out.println(myPlay + " by visionary directory William Shakespeare.");
    System.out.println("Curtains");
  }

  public static ctor<StageActor> from(String play) {
    return new ctor<StageActor>(myPlay = play);
  }
}

public class MovieActor implements Actor {
  private String myMovie;

  public void act() {
    System.out.println(myMovie + " - In theaters Friday.");
    System.out.println("Credits");
  }

  public static ctor<MovieActor> fromMovie(String movie) {
    return new ctor<MovieActor>(myMovie = movie);
  }
}

public class TvActor implements Actor {
  private String myNetwork;

  public void act() {
    System.out.println("This Sunday on " + myNetwork + ".");
    System.out.println("Smile");
  }

  public static ctor<TvActor> fromNetwork(String network) {
    return new ctor<TvActor>(myNetwork = network);
  }
}

// `extends Interface` means "extends some implementation of the interface".
public class Bob extends Actor {
  public void audition() {
    this.act();
    System.out.println("Bow");
  }

  // Dynamically decide which to inherit from.
  public static Bob fromBoolean(boolean movie) {
    if (movie) {
      return new Bob() from MovieActor.fromMovie("Terminator");
    } else {
      return new Bob() from StageActor.from("Romeo and Juliet");
    }
  }

  // Inject an unknown actor.
  public static Bob fromActor(ctor<Actor> actorCtor) {
    return new Bob() from actorCtor;
  }
}

public class Elsewhere {
  public static void main() {
    Bob stageBob = Bob.fromBoolean(false);
    Bob movieBob = Bob.fromBoolean(true);
    Bob tvBob = Bob.fromActor(TvActor.fromNetwork("CBSABCNBC"));
  }
}
```

## Mixin an unrelated class?

```java
public class Foo {
  private String myFoo;

  public void printFoo() {
    System.out.println(this.myFoo);
  }

  public static ctor<Foo> from(String foo) {
    return new ctor<Foo>(myFoo = foo);
  }
}

public class Bar {
  private String myBar;

  public void printBar() {
    System.out.println(this.myBar);
  }

  // Even explicit support in a class returns an unexpressible type.
  public static Bar & T from<T>(ctor<T> base, String bar) {
    return new Bar(myBar = bar) from base;
  }
}

public class Elsewhere {
  public static void main() {
    ctor<Foo> fooCtor = Foo.from("foo");
    ctor<Bar> barCtor = Bar.from("bar");

    // This is an intersection of Foo & Bar, which is not expressible in Java.
    ctor<Foo, Bar> mixed = mix(fooCtor, barCtor);
    Foo foo = mixed.construct();
    Bar bar = mixed.construct();
  }
}
```

Use cases for changing superclass at construction time:
* Choosing between list implementations based on the initial size.
  ```
  if (items.length < 10) from(SpareList.from()).new({ items }).construct();
  else from(CompactList.from()).new({ items }).construct();
  ```
  * Could then be re-extended by a `MutableList` to add mutability while
    composing the superclass factory decision.
* Adding a mixin of test/dev infra.
    * ie. A `flush()` command.
    * A `logger` metaclass?
